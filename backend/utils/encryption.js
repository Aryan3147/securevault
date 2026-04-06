/**
 * Encryption Utility — AES-256-GCM
 *
 * Why AES-256-GCM?
 *   - AES-256: Military-grade symmetric encryption, 256-bit key
 *   - GCM mode: Provides both encryption AND authentication (detects tampering)
 *   - Each file gets a unique random IV (initialization vector) so encrypting
 *     the same file twice produces different ciphertext — prevents pattern analysis
 */

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits

/**
 * Derives a 32-byte key from the hex string in .env
 */
function getMasterKey() {
  const hexKey = process.env.ENCRYPTION_KEY;
  if (!hexKey || hexKey.length < 64) {
    throw new Error('ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
  }
  return Buffer.from(hexKey.slice(0, 64), 'hex');
}

/**
 * Encrypts a buffer of file data.
 * Returns: { encryptedData (base64), iv (hex), authTag (hex) }
 */
function encryptFile(fileBuffer) {
  const key = getMasterKey();
  const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(fileBuffer),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag(); // 16-byte authentication tag

  return {
    encryptedData: encrypted.toString('base64'),
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
  };
}

/**
 * Decrypts previously encrypted file data.
 * Returns: Buffer of original file bytes
 */
function decryptFile(encryptedData, ivHex, authTagHex) {
  const key = getMasterKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const encryptedBuffer = Buffer.from(encryptedData, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag); // Will throw if file was tampered with

  const decrypted = Buffer.concat([
    decipher.update(encryptedBuffer),
    decipher.final(),
  ]);

  return decrypted;
}

module.exports = { encryptFile, decryptFile };
