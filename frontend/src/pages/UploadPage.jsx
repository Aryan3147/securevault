import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import toast from 'react-hot-toast';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const MAX_SIZE_MB = 50;

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export default function UploadPage() {
  const [file, setFile] = useState(null);
  const [password, setPassword] = useState('');
  const [maxDownloads, setMaxDownloads] = useState('');
  const [expiryHours, setExpiryHours] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const onDrop = useCallback((acceptedFiles, rejected) => {
    if (rejected.length > 0) {
      setError(`File rejected: ${rejected[0].errors[0].message}`);
      return;
    }
    const f = acceptedFiles[0];
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File exceeds ${MAX_SIZE_MB}MB limit.`);
      return;
    }
    setFile(f);
    setError('');
    setResult(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    maxSize: MAX_SIZE_MB * 1024 * 1024,
  });

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError('');
    setProgress(10);
    setStage('Scanning for malware…');

    const formData = new FormData();
    formData.append('file', file);
    if (password) formData.append('password', password);
    if (maxDownloads) formData.append('maxDownloads', maxDownloads);
    if (expiryHours) formData.append('expiryHours', expiryHours);

    try {
      setProgress(30);
      const res = await axios.post(`${API}/api/files/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          const pct = Math.round((e.loaded / e.total) * 40);
          setProgress(30 + pct);
          setStage('Uploading & encrypting…');
        },
      });

      setProgress(90);
      setStage('Finalizing…');
      await new Promise((r) => setTimeout(r, 400));
      setProgress(100);

      setResult(res.data);
      toast.success('File secured and ready to share');
    } catch (err) {
      const msg = err?.response?.data?.error || 'Upload failed. Please try again.';
      setError(msg);
      toast.error(msg);
    } finally {
      setUploading(false);
      setStage('');
    }
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(result.shareUrl);
    setCopied(true);
    toast.success('Link copied');
    setTimeout(() => setCopied(false), 2000);
  };

  const reset = () => {
    setFile(null);
    setPassword('');
    setMaxDownloads('');
    setExpiryHours('');
    setResult(null);
    setError('');
    setProgress(0);
  };

  return (
    <div className="container fade-in">
      {/* Hero */}
      <div className="hero">
        <p className="hero-eyebrow">End-to-End Encrypted</p>
        <h1 className="hero-title">
          Share files with<br /><em>absolute confidence</em>
        </h1>
        <p className="hero-subtitle">
          Your files are scanned for malware, encrypted with AES-256-GCM,
          and only decrypted when the recipient downloads them.
        </p>
      </div>

      {!result ? (
        <>
          {/* Upload Card */}
          <div className="card">
            <h2 className="card-title">Upload a File</h2>

            {/* Dropzone */}
            <div
              {...getRootProps()}
              className={`dropzone ${isDragActive ? 'active' : ''} ${file ? 'dropzone-file-selected' : ''}`}
            >
              <input {...getInputProps()} />
              {file ? (
                <>
                  <span className="dropzone-icon">📄</span>
                  <p className="selected-file-name">{file.name}</p>
                  <p className="selected-file-size">{formatBytes(file.size)}</p>
                </>
              ) : (
                <>
                  <span className="dropzone-icon">↑</span>
                  <p className="dropzone-title">Drop your file here</p>
                  <p className="dropzone-sub">or click to browse — max {MAX_SIZE_MB}MB</p>
                </>
              )}
            </div>

            {/* Options */}
            <div style={{ marginTop: 24 }}>
              <div className="form-group">
                <label className="form-label">Password Protection (optional)</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Leave blank for no password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Max Downloads</label>
                  <input
                    type="number"
                    className="form-input form-input-mono"
                    placeholder="Unlimited"
                    min="1"
                    max="100"
                    value={maxDownloads}
                    onChange={(e) => setMaxDownloads(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Expires After (hours)</label>
                  <input
                    type="number"
                    className="form-input form-input-mono"
                    placeholder="Never"
                    min="1"
                    max="720"
                    value={expiryHours}
                    onChange={(e) => setExpiryHours(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Error */}
            {error && <div className="alert alert-error">{error}</div>}

            {/* Progress */}
            {uploading && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)', letterSpacing: '0.1em' }}>
                    {stage}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-gold-dim)' }}>
                    {progress}%
                  </span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}

            {/* Submit */}
            <button
              className="btn btn-primary btn-full"
              onClick={handleUpload}
              disabled={!file || uploading}
            >
              {uploading ? (
                <><span className="spinner" /> Processing…</>
              ) : (
                '→ Scan & Encrypt File'
              )}
            </button>
          </div>

          {/* Feature strip */}
          <div className="features-strip">
            <div className="feature-item">
              <span className="feature-icon">🛡</span>
              <span className="feature-label">70+ AV Engines</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🔒</span>
              <span className="feature-label">AES-256-GCM</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🚫</span>
              <span className="feature-label">NoSQL / XSS Safe</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">⏱</span>
              <span className="feature-label">Auto-Expiry</span>
            </div>
          </div>
        </>
      ) : (
        /* Result Box */
        <div className="result-box">
          <p className="result-title">Your file is ready</p>

          <div className="file-info-grid">
            <div className="file-info-item">
              <p className="file-info-label">File</p>
              <p className="file-info-value">{file.name}</p>
            </div>
            <div className="file-info-item">
              <p className="file-info-label">Security Scan</p>
              <p className="file-info-value">
                <span className={`badge badge-${result.scanStatus}`}>
                  ✓ {result.scanStatus}
                </span>
              </p>
            </div>
            <div className="file-info-item">
              <p className="file-info-label">Password</p>
              <p className="file-info-value">
                {result.isPasswordProtected
                  ? <span className="badge badge-protected">🔑 Protected</span>
                  : <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>None</span>}
              </p>
            </div>
            <div className="file-info-item">
              <p className="file-info-label">Expires</p>
              <p className="file-info-value" style={{ fontSize: 12 }}>
                {result.expiresAt
                  ? new Date(result.expiresAt).toLocaleString()
                  : 'Never'}
              </p>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Share this link</label>
            <div className="share-url-box">
              <span className="share-url-text">{result.shareUrl}</span>
              <button className="btn btn-outline" onClick={copyLink} style={{ padding: '8px 16px' }}>
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="alert alert-success" style={{ marginTop: 16 }}>
            Anyone with this link can receive the file directly on this app — no email needed.
          </div>

          <button className="btn btn-outline btn-full" onClick={reset} style={{ marginTop: 8 }}>
            ← Upload Another File
          </button>
        </div>
      )}
    </div>
  );
}
