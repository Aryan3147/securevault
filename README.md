# SecureVault 🔒
### Military-grade encrypted file sharing — MERN Stack

> Upload → Malware Scan → Encrypt → Share Link → Recipient Downloads Directly on App

---

## Quick Start (Local Development)

### Prerequisites
- Node.js 18+ ([nodejs.org](https://nodejs.org))
- MongoDB Atlas account (free) or local MongoDB
- VirusTotal API key (free) — optional, skip for local dev

### 1. Clone & Setup Backend
```bash
cd securevault/backend
npm install
cp .env.example .env
```

Edit `.env`:
```env
PORT=5000
MONGO_URI=mongodb+srv://...your atlas URI...
ENCRYPTION_KEY=<run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
VIRUSTOTAL_API_KEY=your_key_here   # leave as-is to skip scanning locally
CLIENT_URL=http://localhost:3000
```

```bash
npm run dev     # Backend starts on http://localhost:5000
```

### 2. Setup Frontend
```bash
cd securevault/frontend
npm install
cp .env.example .env     # already set to http://localhost:5000
npm start                # Opens http://localhost:3000
```

---

## Deployment (Production)

See **GUIDE.md** for full step-by-step hosting instructions covering:
- MongoDB Atlas setup
- Backend on Railway / Render / VPS
- Frontend on Vercel / Netlify
- Custom domain + SSL
- VirusTotal API key

---

## Feature List

| Feature | Implementation |
|---|---|
| Malware scanning | VirusTotal API v3 (70+ AV engines) |
| File encryption | AES-256-GCM (authenticated encryption) |
| Password protection | bcrypt (12 rounds) |
| Brute force protection | express-rate-limit (5 attempts / 15 min) |
| NoSQL injection | express-mongo-sanitize |
| XSS protection | xss-clean + Helmet CSP |
| Secure headers | helmet.js |
| Input validation | express-validator |
| Auto expiry | MongoDB TTL indexes |
| Download limits | Configurable per upload |
| In-browser receive | Direct download — no email needed |
| Tamper detection | AES-GCM auth tag verification |

---

## Project Structure
```
securevault/
├── backend/
│   ├── server.js
│   ├── models/File.js
│   ├── routes/files.js
│   ├── middleware/security.js
│   └── utils/
│       ├── encryption.js    ← AES-256-GCM
│       └── scanner.js       ← VirusTotal
├── frontend/
│   └── src/
│       ├── App.jsx
│       ├── index.css        ← Obsidian & Gold theme
│       └── pages/
│           ├── UploadPage.jsx
│           ├── ReceivePage.jsx
│           └── HowItWorksPage.jsx
├── GUIDE.md                 ← Full explanation + hosting guide
└── README.md
```

---

## Stack
**MongoDB · Express.js · React · Node.js**  
Encryption: `crypto` (built-in Node.js) · Malware: VirusTotal API  
UI: React + react-dropzone + react-hot-toast · Fonts: Cormorant Garamond + DM Mono
