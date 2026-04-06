/**
 * SecureVault — Express Server
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

const {
  helmetMiddleware,
  generalLimiter,
  mongoSanitizer,
  xssCleaner,
} = require('./middleware/security');
const fileRoutes = require('./routes/files');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Security Middleware ───────────────────────────────────────────────────
app.use(helmetMiddleware);
app.use(generalLimiter);

// ── CORS ─────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
    credentials: false,
  })
);

// ── Body Parsers ──────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));   // JSON body (not for file uploads)
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ── Input Sanitization ────────────────────────────────────────────────────
app.use(mongoSanitizer);
app.use(xssCleaner);

// ── Routes ────────────────────────────────────────────────────────────────
app.use('/api/files', fileRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    env: process.env.NODE_ENV,
  });
});

// 404 handler for unknown API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// ── MongoDB Connection ────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('✅  MongoDB connected');
    app.listen(PORT, () => {
      console.log(`🚀  SecureVault backend running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌  MongoDB connection failed:', err.message);
    process.exit(1);
  });

// ── Global error handler ──────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal server error.' });
});