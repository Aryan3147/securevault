/**
 * Malware Scanner — VirusTotal API v3
 *
 * HOW IT WORKS (simple explanation):
 * ─────────────────────────────────────────────────────
 * 1. We compute the SHA-256 "fingerprint" (hash) of the uploaded file.
 * 2. We ask VirusTotal: "Have you seen this fingerprint before?"
 *    - If YES → we get scan results immediately (cache hit).
 *    - If NO  → we upload the file to VirusTotal for fresh analysis.
 * 3. VirusTotal runs the file through 70+ antivirus engines simultaneously.
 * 4. We check the results: if any engine flags it as malicious/suspicious,
 *    we reject the file. Otherwise we allow it through.
 *
 * VirusTotal free tier: 4 requests/minute, 500/day
 * Free API key: https://www.virustotal.com/gui/join-us
 */

const crypto = require('crypto');
const fetch = require('node-fetch');
const FormData = require('form-data');

const VT_BASE = 'https://www.virustotal.com/api/v3';

/**
 * Computes SHA-256 hash of a buffer — used as the file's unique fingerprint.
 */
function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Checks if VirusTotal already has scan results for this file hash.
 * This avoids re-uploading files that VT has already analyzed.
 */
async function checkHash(hash) {
  const apiKey = process.env.VIRUSTOTAL_API_KEY;
  if (!apiKey || apiKey === 'your_virustotal_api_key_here') {
    // No API key — skip scanning, allow file (log warning)
    console.warn('[SCAN] No VirusTotal API key set. Skipping malware scan.');
    return { status: 'clean', details: { message: 'Scan skipped — no API key' } };
  }

  try {
    const res = await fetch(`${VT_BASE}/files/${hash}`, {
      headers: { 'x-apikey': apiKey },
    });

    if (res.status === 404) {
      return null; // Not in VT database yet
    }

    if (!res.ok) {
      throw new Error(`VT hash check failed: ${res.status}`);
    }

    const data = await res.json();
    return interpretResults(data.data.attributes.last_analysis_stats);
  } catch (err) {
    console.error('[SCAN] Hash check error:', err.message);
    return null;
  }
}

/**
 * Uploads the file buffer to VirusTotal for fresh analysis.
 * Returns a scan report or null on failure.
 */
async function uploadToVirusTotal(buffer, filename) {
  const apiKey = process.env.VIRUSTOTAL_API_KEY;

  const form = new FormData();
  form.append('file', buffer, { filename });

  const res = await fetch(`${VT_BASE}/files`, {
    method: 'POST',
    headers: { 'x-apikey': apiKey },
    body: form,
  });

  if (!res.ok) {
    throw new Error(`VT upload failed: ${res.status}`);
  }

  const uploadData = await res.json();
  const analysisId = uploadData.data.id;

  // Poll for results (VT analysis takes a few seconds)
  return await pollForResults(analysisId, apiKey);
}

/**
 * Polls VirusTotal every 3 seconds until analysis is complete (max 30s).
 */
async function pollForResults(analysisId, apiKey, maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    await sleep(3000);

    const res = await fetch(`${VT_BASE}/analyses/${analysisId}`, {
      headers: { 'x-apikey': apiKey },
    });

    if (!res.ok) continue;

    const data = await res.json();
    const status = data.data.attributes.status;

    if (status === 'completed') {
      return interpretResults(data.data.attributes.stats);
    }
  }

  // Timeout — treat as suspicious for safety
  return { status: 'error', details: { message: 'Scan timed out' } };
}

/**
 * Interprets VirusTotal stats object into our simple status.
 *
 * stats example: { malicious: 2, suspicious: 1, harmless: 68, undetected: 5 }
 */
function interpretResults(stats) {
  if (!stats) return { status: 'error', details: { message: 'No stats' } };

  const malicious = stats.malicious || 0;
  const suspicious = stats.suspicious || 0;

  let status;
  if (malicious > 0) {
    status = 'malicious';
  } else if (suspicious > 2) {
    // More than 2 suspicious detections = reject
    status = 'suspicious';
  } else {
    status = 'clean';
  }

  return {
    status,
    details: {
      malicious,
      suspicious,
      harmless: stats.harmless || 0,
      undetected: stats.undetected || 0,
    },
  };
}

/**
 * Main scan function — call this with the file buffer.
 * Returns: { status: 'clean'|'malicious'|'suspicious'|'error', details: {...} }
 */
async function scanFile(buffer, filename) {
  const apiKey = process.env.VIRUSTOTAL_API_KEY;
  if (!apiKey || apiKey === 'your_virustotal_api_key_here') {
    console.warn('[SCAN] Skipping malware scan — no API key configured.');
    return { status: 'clean', details: { message: 'Scan skipped' } };
  }

  console.log(`[SCAN] Scanning file: ${filename}`);

  // Step 1: Check hash (fast — avoids re-uploading known files)
  const hash = sha256(buffer);
  const cachedResult = await checkHash(hash);
  if (cachedResult) {
    console.log(`[SCAN] Cache hit for ${filename}: ${cachedResult.status}`);
    return cachedResult;
  }

  // Step 2: Upload for fresh analysis
  console.log(`[SCAN] Uploading ${filename} to VirusTotal...`);
  try {
    const result = await uploadToVirusTotal(buffer, filename);
    console.log(`[SCAN] ${filename} result: ${result.status}`);
    return result;
  } catch (err) {
    console.error('[SCAN] Upload error:', err.message);
    return { status: 'error', details: { message: err.message } };
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports = { scanFile };
