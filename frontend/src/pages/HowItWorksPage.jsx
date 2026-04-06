import React from 'react';

const steps = [
  {
    num: '01',
    title: 'You upload a file',
    body: 'The file travels from your browser to our server over HTTPS (the same encryption used by banks). It never touches disk in its raw form.',
  },
  {
    num: '02',
    title: 'Malware scan',
    body: 'We compute a SHA-256 fingerprint of your file and check it against VirusTotal — a service that runs 70+ antivirus engines simultaneously (Kaspersky, Norton, Bitdefender, etc.). If any engine flags it as malicious or suspicious, the file is rejected immediately.',
  },
  {
    num: '03',
    title: 'AES-256-GCM Encryption',
    body: 'After passing the scan, the file is encrypted using AES-256-GCM — the same standard used by governments and the military. We generate a unique random key for each file session and a random IV (initialization vector) so the same file encrypted twice looks completely different.',
  },
  {
    num: '04',
    title: 'Stored in MongoDB',
    body: 'Only the encrypted blob, the IV, and an authentication tag are stored in the database. The original file no longer exists on our servers. Even if someone broke into the database, all they\'d find is unreadable ciphertext.',
  },
  {
    num: '05',
    title: 'You share the link',
    body: 'We give you a short unique URL. You send it to your recipient however you like — WhatsApp, email, Telegram. No email account required on either end.',
  },
  {
    num: '06',
    title: 'Recipient opens the link',
    body: 'They open the link in their browser on our website. They see the file name, size, and security scan result. If you set a password, they\'re prompted for it.',
  },
  {
    num: '07',
    title: 'Decryption on download',
    body: 'When they click download, the encrypted data is pulled from MongoDB, decrypted on the server using the AES key, and streamed to their browser. The decrypted file never sits on disk — it lives in memory only during the milliseconds it takes to send it.',
  },
];

const faqs = [
  {
    q: 'Can Anthropic / the server admin read my files?',
    a: 'In this implementation, the encryption key lives on the server, so technically the server admin could decrypt files. For true zero-knowledge encryption, the key would need to be derived from a password that never leaves your browser. That is achievable with the Web Crypto API and is a great next step for this project.',
  },
  {
    q: 'What is an IV (Initialization Vector)?',
    a: 'Think of it like a unique random salt for each encryption operation. Without it, encrypting "hello" twice with the same key would produce the same ciphertext — which leaks information. The IV makes every encryption unique, even for identical inputs.',
  },
  {
    q: 'What is the AES authentication tag?',
    a: 'GCM mode produces a 128-bit "signature" of the ciphertext. When decrypting, we verify this tag first. If anyone tampered with the stored ciphertext — even flipping one bit — the tag check fails and we refuse to decrypt it. This is called authenticated encryption.',
  },
  {
    q: 'What does NoSQL injection mean and how is it prevented?',
    a: 'MongoDB queries use operators like $gt (greater than). An attacker could send { "password": { "$gt": "" } } to bypass password checks. We strip all $ and . characters from user inputs using express-mongo-sanitize before they ever reach the database layer.',
  },
  {
    q: 'What is XSS and how is it blocked?',
    a: 'Cross-Site Scripting means injecting <script> tags into user inputs that get stored and later rendered in someone else\'s browser, stealing their session. We sanitize all inputs with xss-clean and set Content-Security-Policy headers that block inline scripts.',
  },
  {
    q: 'What stops someone from hammering the password form?',
    a: 'Rate limiting: after 5 failed password attempts from the same IP in 15 minutes, the endpoint returns an error. This makes brute-forcing a 6-character password take months instead of minutes.',
  },
  {
    q: 'Why does the file size limit exist?',
    a: 'MongoDB has a 16MB document size limit. For files above ~10MB, you\'d store the encrypted data in a file storage service like AWS S3 or Cloudflare R2, and keep only the metadata + storage key in MongoDB. The architecture is the same — only the storage backend changes.',
  },
];

export default function HowItWorksPage() {
  return (
    <div className="container fade-in">
      <div className="hero">
        <p className="hero-eyebrow">Transparent by Design</p>
        <h1 className="hero-title">How <em>SecureVault</em> works</h1>
        <p className="hero-subtitle">
          A plain-language walkthrough of every step — from upload to download.
        </p>
      </div>

      {/* Steps */}
      <div style={{ marginBottom: 64 }}>
        {steps.map((step, i) => (
          <div key={i} style={{ display: 'flex', gap: 28, marginBottom: 32, alignItems: 'flex-start' }}>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--color-gold-dim)',
              letterSpacing: '0.2em',
              minWidth: 28,
              paddingTop: 4,
            }}>
              {step.num}
            </div>
            <div
              style={{
                width: 1,
                background: 'var(--color-border)',
                alignSelf: 'stretch',
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1 }}>
              <h3 style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 300,
                fontSize: 20,
                color: 'var(--color-text)',
                marginBottom: 10,
                letterSpacing: '0.03em',
              }}>
                {step.title}
              </h3>
              <p style={{
                color: 'var(--color-text-muted)',
                fontSize: 13,
                lineHeight: 1.8,
                letterSpacing: '0.02em',
              }}>
                {step.body}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Security Architecture Box */}
      <div className="card" style={{ marginBottom: 48 }}>
        <h2 className="card-title">Security Architecture at a Glance</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>Layer</th>
              <th style={thStyle}>Tool / Technique</th>
              <th style={thStyle}>What it blocks</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Malware Scanning', 'VirusTotal API (70+ engines)', 'Viruses, ransomware, trojans'],
              ['Encryption', 'AES-256-GCM', 'Unauthorized file reading'],
              ['Transport', 'HTTPS / TLS', 'Man-in-the-middle attacks'],
              ['Password Hashing', 'bcrypt (12 rounds)', 'Password database leaks'],
              ['Rate Limiting', 'express-rate-limit', 'Brute force attacks'],
              ['NoSQL Sanitization', 'express-mongo-sanitize', 'Database injection'],
              ['XSS Protection', 'xss-clean + CSP headers', 'Script injection'],
              ['Secure Headers', 'helmet.js', 'Clickjacking, sniffing'],
              ['Input Validation', 'express-validator', 'Malformed / oversized inputs'],
            ].map(([layer, tool, blocks], i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={tdStyle}>{layer}</td>
                <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-gold-dim)' }}>{tool}</td>
                <td style={{ ...tdStyle, color: 'var(--color-text-muted)', fontSize: 12 }}>{blocks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* FAQ */}
      <div style={{ marginBottom: 64 }}>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 300,
          fontSize: 28,
          letterSpacing: '0.04em',
          marginBottom: 32,
          color: 'var(--color-text)',
        }}>
          Frequently Asked Questions
        </h2>
        {faqs.map((faq, i) => (
          <details key={i} style={{
            borderBottom: '1px solid var(--color-border)',
            padding: '20px 0',
          }}>
            <summary style={{
              cursor: 'pointer',
              fontFamily: 'var(--font-display)',
              fontSize: 18,
              fontWeight: 300,
              color: 'var(--color-text)',
              letterSpacing: '0.03em',
              listStyle: 'none',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              {faq.q}
              <span style={{ color: 'var(--color-gold-dim)', fontSize: 20, fontFamily: 'var(--font-mono)' }}>+</span>
            </summary>
            <p style={{
              marginTop: 16,
              color: 'var(--color-text-muted)',
              fontSize: 13,
              lineHeight: 1.9,
              letterSpacing: '0.02em',
              paddingRight: 24,
            }}>
              {faq.a}
            </p>
          </details>
        ))}
      </div>
    </div>
  );
}

const thStyle = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  color: 'var(--color-text-dim)',
  padding: '10px 16px',
  textAlign: 'left',
  borderBottom: '1px solid var(--color-border)',
  fontWeight: 400,
};

const tdStyle = {
  padding: '14px 16px',
  color: 'var(--color-text)',
  fontSize: 13,
  verticalAlign: 'top',
};
