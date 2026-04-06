const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  shareId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  originalName: {
    type: String,
    required: true,
    maxlength: 255,
  },
  mimeType: {
    type: String,
    required: true,
  },
  sizeBytes: {
    type: Number,
    required: true,
  },
  // Encrypted file stored as base64 in DB (for files up to ~10MB)
  // For larger files, store path to encrypted file on disk/S3
  encryptedData: {
    type: String,
    required: true,
  },
  iv: {                     // Initialization vector for AES-GCM decryption
    type: String,
    required: true,
  },
  authTag: {                // AES-GCM authentication tag
    type: String,
    required: true,
  },
  passwordHash: {           // bcrypt hash — null means no password
    type: String,
    default: null,
  },
  isPasswordProtected: {
    type: Boolean,
    default: false,
  },
  downloadCount: {
    type: Number,
    default: 0,
  },
  maxDownloads: {           // null = unlimited
    type: Number,
    default: null,
  },
  expiresAt: {              // null = never expires
    type: Date,
    default: null,
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
  // Malware scan results
  scanStatus: {
    type: String,
    enum: ['pending', 'clean', 'malicious', 'suspicious', 'error'],
    default: 'pending',
  },
  scanDetails: {
    type: Object,
    default: null,
  },
  uploaderIp: {
    type: String,
    default: null,
  },
});

// Auto-delete expired files (MongoDB TTL index)
fileSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, sparse: true });

module.exports = mongoose.model('File', fileSchema);
