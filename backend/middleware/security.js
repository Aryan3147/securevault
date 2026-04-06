/**
 * Security Middleware Stack
 * All security layers applied before any route logic runs.
 */

const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xssClean = require('xss-clean');

// ── 1. Helmet: Sets secure HTTP headers ────────────────────────────────────
// Prevents clickjacking, sniffing, and other header-based attacks
const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
});

// ── 2. Rate Limiters ────────────────────────────────────────────────────────

// General API limiter: 100 requests per 15 minutes per IP
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please wait and try again.' },
});

// Upload limiter: 10 uploads per 15 minutes per IP (prevent abuse)
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Upload limit reached. Try again in 15 minutes.' },
});

// Download password limiter: 5 attempts per 15 minutes (brute force protection)
const passwordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    error: 'Too many failed attempts. The link is temporarily locked.',
  },
});

// ── 3. NoSQL Injection Sanitizer ───────────────────────────────────────────
// Strips $ and . from user inputs — prevents MongoDB operator injection
// Example attack blocked: { "password": { "$gt": "" } }
const mongoSanitizer = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`[SECURITY] Sanitized NoSQL injection attempt: key="${key}" IP=${req.ip}`);
  },
});

// ── 4. XSS Cleaner ────────────────────────────────────────────────────────
// Sanitizes HTML/JS in request bodies, preventing stored XSS
// Example attack blocked: <script>document.cookie</script>
const xssCleaner = xssClean();

module.exports = {
  helmetMiddleware,
  generalLimiter,
  uploadLimiter,
  passwordLimiter,
  mongoSanitizer,
  xssCleaner,
};
