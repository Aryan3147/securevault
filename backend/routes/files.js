/**
 * File Routes
 * POST /api/files/upload   — Upload & encrypt a file
 * GET  /api/files/:id      — Get file metadata (name, size, password protected?)
 * POST /api/files/:id/download — Verify password & download decrypted file
 * GET  /api/files/:id/status   — Get malware scan status (for polling)
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');

const File = require('../models/File');
const { encryptFile, decryptFile } = require('../utils/encryption');
const { scanFile } = require('../utils/scanner');
const { uploadLimiter, passwordLimiter } = require('../middleware/security');

// ── Multer: In-memory storage (file never hits disk unencrypted) ──────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB max
  },
  fileFilter: (req, file, cb) => {
    // Block dangerous file types at the MIME level
    const blockedTypes = [
      'application/x-msdownload',       // .exe
      'application/x-msdos-program',    // .com
      'application/x-bat',              // .bat
      'application/x-sh',               // .sh scripts
    ];
    if (blockedTypes.includes(file.mimetype)) {
      return cb(new Error('File type not permitted for security reasons.'), false);
    }
    cb(null, true);
  },
});

// ── POST /api/files/upload ────────────────────────────────────────────────
router.post(
  '/upload',
  uploadLimiter,
  upload.single('file'),
  [
    body('password').optional().isLength({ min: 4, max: 128 }).trim(),
    body('maxDownloads').optional().isInt({ min: 1, max: 100 }),
    body('expiryHours').optional().isInt({ min: 1, max: 720 }),
  ],
  async (req, res) => {
    // Validate inputs
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file provided.' });
    }

    const { password, maxDownloads, expiryHours } = req.body;
    const fileBuffer = req.file.buffer;

    try {
      // ── Step 1: Malware Scan ──────────────────────────────────────────
      const scanResult = await scanFile(fileBuffer, req.file.originalname);

      if (scanResult.status === 'malicious') {
        return res.status(422).json({
          error: 'File rejected: malware detected.',
          scanDetails: scanResult.details,
        });
      }

      if (scanResult.status === 'suspicious') {
        return res.status(422).json({
          error: 'File rejected: flagged as suspicious by security engines.',
          scanDetails: scanResult.details,
        });
      }

      // ── Step 2: Encrypt the file ──────────────────────────────────────
      const { encryptedData, iv, authTag } = encryptFile(fileBuffer);

      // ── Step 3: Hash password (if provided) ──────────────────────────
      let passwordHash = null;
      if (password) {
        passwordHash = await bcrypt.hash(password, 12);
      }

      // ── Step 4: Compute expiry ────────────────────────────────────────
      let expiresAt = null;
      if (expiryHours) {
        expiresAt = new Date(Date.now() + parseInt(expiryHours) * 60 * 60 * 1000);
      }

      // ── Step 5: Save to MongoDB ───────────────────────────────────────
      const shareId = uuidv4().replace(/-/g, '').slice(0, 16); // Short unique ID

      const fileDoc = await File.create({
        shareId,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        sizeBytes: fileBuffer.length,
        encryptedData,
        iv,
        authTag,
        passwordHash,
        isPasswordProtected: !!password,
        maxDownloads: maxDownloads ? parseInt(maxDownloads) : null,
        expiresAt,
        scanStatus: scanResult.status,
        scanDetails: scanResult.details,
        uploaderIp: req.ip,
      });

      return res.status(201).json({
        success: true,
        shareId: fileDoc.shareId,
        shareUrl: `${process.env.CLIENT_URL}/receive/${fileDoc.shareId}`,
        expiresAt: fileDoc.expiresAt,
        isPasswordProtected: fileDoc.isPasswordProtected,
        scanStatus: fileDoc.scanStatus,
      });
    } catch (err) {
      console.error('[UPLOAD]', err);
      return res.status(500).json({ error: 'Upload failed. Please try again.' });
    }
  }
);

// ── GET /api/files/:id ────────────────────────────────────────────────────
// Returns metadata only — never the encrypted data
router.get('/:id', async (req, res) => {
  try {
    const file = await File.findOne(
      { shareId: req.params.id },
      'originalName mimeType sizeBytes isPasswordProtected expiresAt downloadCount maxDownloads scanStatus uploadedAt'
    );

    if (!file) {
      return res.status(404).json({ error: 'File not found or link has expired.' });
    }

    // Check expiry
    if (file.expiresAt && file.expiresAt < new Date()) {
      await File.deleteOne({ _id: file._id });
      return res.status(404).json({ error: 'This link has expired.' });
    }

    // Check download limit
    if (file.maxDownloads && file.downloadCount >= file.maxDownloads) {
      return res.status(410).json({ error: 'Download limit reached for this file.' });
    }

    return res.json({
      originalName: file.originalName,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      isPasswordProtected: file.isPasswordProtected,
      expiresAt: file.expiresAt,
      downloadCount: file.downloadCount,
      maxDownloads: file.maxDownloads,
      scanStatus: file.scanStatus,
      uploadedAt: file.uploadedAt,
    });
  } catch (err) {
    console.error('[GET FILE]', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ── POST /api/files/:id/download ─────────────────────────────────────────
router.post('/:id/download', passwordLimiter, async (req, res) => {
  try {
    const file = await File.findOne({ shareId: req.params.id });

    if (!file) {
      return res.status(404).json({ error: 'File not found or link has expired.' });
    }

    // Check expiry
    if (file.expiresAt && file.expiresAt < new Date()) {
      await File.deleteOne({ _id: file._id });
      return res.status(404).json({ error: 'This link has expired.' });
    }

    // Check download limit
    if (file.maxDownloads && file.downloadCount >= file.maxDownloads) {
      return res.status(410).json({ error: 'Download limit reached.' });
    }

    // Verify password if required
    if (file.isPasswordProtected) {
      const { password } = req.body;
      if (!password) {
        return res.status(401).json({ error: 'Password required.' });
      }
      const valid = await bcrypt.compare(password, file.passwordHash);
      if (!valid) {
        return res.status(401).json({ error: 'Incorrect password.' });
      }
    }

    // Decrypt the file
    const decryptedBuffer = decryptFile(file.encryptedData, file.iv, file.authTag);

    // Increment download count
    file.downloadCount += 1;
    await file.save();

    // Send the file as a download
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.originalName)}"`);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Length', decryptedBuffer.length);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.send(decryptedBuffer);
  } catch (err) {
    console.error('[DOWNLOAD]', err);
    if (err.message && err.message.includes('auth')) {
      return res.status(422).json({ error: 'File integrity check failed. The file may have been tampered with.' });
    }
    return res.status(500).json({ error: 'Download failed.' });
  }
});

module.exports = router;
