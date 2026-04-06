import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function formatBytes(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export default function ReceivePage() {
  const { shareId } = useParams();
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const res = await axios.get(`${API}/api/files/${shareId}`);
        setMeta(res.data);
      } catch (err) {
        setError(err?.response?.data?.error || 'File not found or link has expired.');
      } finally {
        setLoading(false);
      }
    };
    fetchMeta();
  }, [shareId]);

  const handleDownload = async () => {
    setDownloading(true);
    setDownloadError('');

    try {
      const res = await axios.post(
        `${API}/api/files/${shareId}/download`,
        { password: password || undefined },
        { responseType: 'blob' }
      );

      // Trigger browser download
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', meta.originalName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('File downloaded and decrypted successfully');
    } catch (err) {
      const msg = err?.response?.data?.error
        || (await err?.response?.data?.text?.())
        || 'Download failed.';
      setDownloadError(msg);
      toast.error(msg);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', paddingTop: 80 }}>
        <span className="spinner" style={{ width: 28, height: 28 }} />
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)', marginTop: 20, letterSpacing: '0.15em' }}>
          RETRIEVING FILE…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container fade-in" style={{ maxWidth: 500, paddingTop: 60 }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 20 }}>🔒</div>
          <h2 className="card-title" style={{ textAlign: 'center' }}>File Unavailable</h2>
          <div className="alert alert-error">{error}</div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-dim)', letterSpacing: '0.1em' }}>
            The link may have expired or the file has been deleted.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container fade-in" style={{ maxWidth: 560 }}>
      <div className="hero" style={{ paddingTop: 48, paddingBottom: 40 }}>
        <p className="hero-eyebrow">Secure File Received</p>
        <h1 className="hero-title" style={{ fontSize: 'clamp(28px, 5vw, 44px)' }}>
          Ready to <em>decrypt</em>
        </h1>
      </div>

      <div className="card">
        {/* File Info */}
        <div className="file-info-grid" style={{ marginBottom: 24 }}>
          <div className="file-info-item">
            <p className="file-info-label">Filename</p>
            <p className="file-info-value">{meta.originalName}</p>
          </div>
          <div className="file-info-item">
            <p className="file-info-label">Size</p>
            <p className="file-info-value">{formatBytes(meta.sizeBytes)}</p>
          </div>
          <div className="file-info-item">
            <p className="file-info-label">Security Scan</p>
            <p className="file-info-value">
              <span className={`badge badge-${meta.scanStatus}`}>
                ✓ {meta.scanStatus}
              </span>
            </p>
          </div>
          <div className="file-info-item">
            <p className="file-info-label">Downloads</p>
            <p className="file-info-value">
              {meta.downloadCount}
              {meta.maxDownloads ? ` / ${meta.maxDownloads}` : ' / ∞'}
            </p>
          </div>
          {meta.expiresAt && (
            <div className="file-info-item" style={{ gridColumn: 'span 2' }}>
              <p className="file-info-label">Expires</p>
              <p className="file-info-value">{new Date(meta.expiresAt).toLocaleString()}</p>
            </div>
          )}
        </div>

        {/* Password field */}
        {meta.isPasswordProtected && (
          <>
            <div className="divider">Password Required</div>
            <div className="form-group">
              <label className="form-label">Enter Password to Decrypt</label>
              <input
                type="password"
                className="form-input"
                placeholder="Enter the password set by the sender"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleDownload()}
                autoFocus
              />
            </div>
          </>
        )}

        {/* Errors */}
        {downloadError && <div className="alert alert-error">{downloadError}</div>}

        {/* Download button */}
        <button
          className="btn btn-primary btn-full"
          onClick={handleDownload}
          disabled={downloading || (meta.isPasswordProtected && !password)}
        >
          {downloading ? (
            <><span className="spinner" /> Decrypting…</>
          ) : (
            '↓ Download & Decrypt File'
          )}
        </button>

        <p style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: 'var(--color-text-dim)',
          textAlign: 'center',
          marginTop: 16,
          letterSpacing: '0.1em',
          lineHeight: 1.8,
        }}>
          This file was scanned by 70+ antivirus engines and encrypted with AES-256-GCM.<br />
          It is decrypted only at the moment of download.
        </p>
      </div>
    </div>
  );
}
