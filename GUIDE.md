# SecureVault — Complete Guide
## For Python developers learning to build and deploy MERN apps

---

## PART 1: How the App Works (Plain Language)

### The Big Picture

Think of SecureVault like a secure post-box:

1. **Sender** puts a letter (file) in the box
2. A **security guard** (VirusTotal) checks the letter for threats
3. The letter is **locked in a vault** (AES-256-GCM encryption)
4. A **key** is handed to the sender (the share URL)
5. **Recipient** uses the key to unlock the vault and get the letter
6. The letter is **burned after delivery** (auto-expiry / download limits)

---

## PART 2: The Tech Stack Explained

### MongoDB (Database)
- Stores encrypted file data, metadata, passwords (hashed)
- Like a Python dict/JSON store — flexible, no rigid table schema
- Cloud-hosted on MongoDB Atlas (free tier available)

### Express.js (Backend Framework)
- Like Python's Flask — handles HTTP requests and routes
- Sits on top of Node.js
- Python equivalent: `from flask import Flask, request`

### React (Frontend)
- JavaScript library for building UIs
- Like Python's Tkinter but for web browsers
- Handles the upload form, dropzone, download page

### Node.js (Runtime)
- Runs JavaScript on the server (not just in the browser)
- Like CPython — it's the engine that executes JS code

---

## PART 3: File Processing Flow (Technical)

```
User selects file
      │
      ▼
Browser → HTTPS POST → Express server (multer parses multipart/form-data)
      │
      ▼
File held in RAM (memoryStorage — never touches disk unencrypted)
      │
      ▼
SHA-256 hash computed → VirusTotal API query
      │
      ├─ Hash found in VT cache → Return results immediately
      └─ Not found → Upload to VT → Poll until 70+ engines finish (≈5-15 sec)
      │
      ├─ MALICIOUS / SUSPICIOUS → Reject with 422 error, wipe from RAM
      └─ CLEAN → Continue
      │
      ▼
crypto.createCipheriv('aes-256-gcm', masterKey, randomIV)
      │
      ▼
Encrypted blob (base64) + IV (hex) + authTag (hex) saved to MongoDB
Original buffer discarded from RAM
      │
      ▼
Password? → bcrypt.hash(password, 12) → store hash (never plaintext)
      │
      ▼
Return share URL to sender

───────────────────────────────────────────────────────────────

Recipient opens /receive/:shareId
      │
      ▼
GET /api/files/:shareId → Returns metadata only (no encrypted data)
      │
      ▼
If password protected → Prompt for password
      │
      ▼
POST /api/files/:shareId/download
      │
      ▼
bcrypt.compare(enteredPassword, storedHash)
      │
      ├─ WRONG → 401 error (rate limited: max 5 attempts/15 min)
      └─ CORRECT → Continue
      │
      ▼
crypto.createDecipheriv('aes-256-gcm', masterKey, storedIV)
decipher.setAuthTag(storedAuthTag)  ← Verifies file wasn't tampered with
      │
      ▼
Decrypt → Stream original bytes to browser as file download
```

---

## PART 4: Security Measures Explained Simply

### 1. AES-256-GCM Encryption
- **AES-256**: The file is scrambled using a 256-bit key (2^256 combinations)
- **GCM**: "Galois/Counter Mode" — also produces an authentication tag
- **Authentication tag**: Proves the file hasn't been modified since encryption
- Python equivalent: `from cryptography.hazmat.primitives.ciphers.aead import AESGCM`

### 2. bcrypt for Passwords
- Never store plaintext passwords — store their hash
- bcrypt is slow ON PURPOSE — makes brute force impractical
- 12 rounds = ~300ms per hash check. Fast for users, brutal for attackers.
- Python: `import bcrypt; bcrypt.hashpw(password, bcrypt.gensalt(12))`

### 3. Rate Limiting
- Like a bouncer: "you've tried 5 times, wait 15 minutes"
- Prevents attackers from guessing passwords at machine speed

### 4. NoSQL Injection
- MongoDB uses operators: `$gt`, `$ne`, `$where`
- Attacker sends: `{ "password": { "$gt": "" } }` → bypasses password
- We strip `$` and `.` from all inputs before they reach MongoDB

### 5. XSS (Cross-Site Scripting)
- Attacker uploads a file named `<script>steal(document.cookie)</script>`
- If we render this name as raw HTML, the script runs in other users' browsers
- We sanitize all text inputs to remove HTML tags

### 6. HTTPS / Helmet.js Headers
- `X-Frame-Options: DENY` → prevents clickjacking
- `X-Content-Type-Options: nosniff` → prevents MIME confusion attacks
- `Content-Security-Policy` → blocks unauthorized scripts

### 7. In-memory Processing (multer memoryStorage)
- File NEVER written to disk in plaintext
- Lives in RAM only during the milliseconds of processing
- Even if attacker gets disk access, no plaintext files exist

---

## PART 5: How to Host the Website

### What You Need to Host
1. **Domain name**: yourdomain.com (bought from Namecheap, GoDaddy, etc.)
2. **Backend hosting**: A server that runs Node.js
3. **Frontend hosting**: A CDN that serves your React app
4. **Database**: MongoDB Atlas (cloud, free tier)
5. **SSL Certificate**: HTTPS (free with Let's Encrypt)

---

### Step 1: Get a Domain Name
```
Go to: namecheap.com or godaddy.com
Search for: yourdomain.com
Price: ₹800–₹1,500/year for a .com domain

After buying:
- You'll get access to DNS settings
- You'll point it at your hosting server later
```

---

### Step 2: Set Up MongoDB Atlas (Free Database)
```
1. Go to: mongodb.com/atlas
2. Create free account → Create free cluster (M0 tier)
3. Create database user: Settings → Database Access → Add New User
4. Allow all IPs: Network Access → Add IP Address → 0.0.0.0/0
5. Get connection string:
   Clusters → Connect → Drivers → Node.js
   Copy: mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/securevault
```

---

### Step 3: Deploy the Backend (Two Options)

#### Option A: Railway (Easiest, Free Tier)
```bash
# Install Railway CLI
npm install -g @railway/cli

# In your backend folder:
railway login
railway init
railway up

# Set environment variables in Railway dashboard:
# MONGO_URI, ENCRYPTION_KEY, VIRUSTOTAL_API_KEY, CLIENT_URL

# Get your backend URL: https://securevault-backend.railway.app
```

#### Option B: Render (Also Free)
```
1. Go to render.com → Sign up with GitHub
2. New → Web Service → Connect your GitHub repo
3. Settings:
   - Build Command: npm install
   - Start Command: node server.js
   - Environment: Node
4. Add environment variables in Render dashboard
5. Deploy → get URL: https://securevault-backend.onrender.com
```

#### Option C: VPS (DigitalOcean/Hetzner — More Control)
```bash
# Buy a $6/month droplet (Ubuntu 22.04)
# SSH into your server:
ssh root@your_server_ip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 (keeps your app running)
npm install -g pm2

# Upload your code (or use git clone)
git clone https://github.com/yourusername/securevault.git
cd securevault/backend
npm install
cp .env.example .env
nano .env  # Fill in your values

# Start with PM2
pm2 start server.js --name securevault-api
pm2 startup  # Auto-restart on reboot
pm2 save

# Install Nginx as reverse proxy
sudo apt install nginx
sudo nano /etc/nginx/sites-available/securevault-api
```

Nginx config for VPS:
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 55M;  # Must be > your file size limit
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/securevault-api /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Free SSL with Certbot
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
```

---

### Step 4: Deploy the Frontend

#### Set your API URL before building:
```bash
# In /frontend, create .env
echo "REACT_APP_API_URL=https://api.yourdomain.com" > .env

# Build the React app
npm run build
# This creates a /build folder of static HTML/CSS/JS
```

#### Option A: Vercel (Recommended, Free)
```bash
npm install -g vercel
cd frontend
vercel
# Follow prompts → deploys to: https://securevault.vercel.app
# Add custom domain in Vercel dashboard: yourdomain.com
```

#### Option B: Netlify (Also Free)
```
1. netlify.com → Sign up → New site from Git
2. Connect your GitHub repo → Set build command: npm run build
3. Set publish directory: build
4. Add env variable: REACT_APP_API_URL
5. Deploy → add custom domain in Netlify settings
```

#### Option C: Nginx on VPS (serve static files)
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    root /var/www/securevault/frontend/build;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;  # React Router needs this
    }
}
```

---

### Step 5: Connect Your Domain to Hosting

In your domain registrar's DNS settings:
```
Type    Host    Value                   TTL
─────────────────────────────────────────────────────────
A       @       your_server_ip          Auto
A       www     your_server_ip          Auto
CNAME   api     securevault.railway.app Auto   (if using Railway for backend)
```

DNS changes take 1-48 hours to propagate worldwide.

---

### Step 6: Get a Free VirusTotal API Key
```
1. Go to: virustotal.com/gui/join-us
2. Create free account
3. Profile → API Key → Copy
4. Free tier: 4 requests/minute, 500/day
   (Enough for a personal/portfolio project)
```

---

### Step 7: Generate Your Encryption Key
```bash
# Run this in Node.js (or any terminal with node installed):
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Output example:
# a3f8c2e1d4b5a6f7e8d9c0b1a2f3e4d5c6b7a8f9e0d1c2b3a4f5e6d7c8b9a0f1
# Paste this as your ENCRYPTION_KEY in .env
```

---

## PART 6: Project Structure Summary

```
securevault/
├── backend/
│   ├── server.js              ← Express app entry point
│   ├── package.json
│   ├── .env                   ← Secret config (never commit to Git!)
│   ├── models/
│   │   └── File.js            ← MongoDB schema
│   ├── routes/
│   │   └── files.js           ← Upload & download routes
│   ├── middleware/
│   │   └── security.js        ← Rate limiting, helmet, sanitizers
│   └── utils/
│       ├── encryption.js      ← AES-256-GCM encrypt/decrypt
│       └── scanner.js         ← VirusTotal API integration
│
└── frontend/
    ├── package.json
    ├── .env                   ← REACT_APP_API_URL
    └── src/
        ├── App.jsx            ← Router + Header + Footer
        ├── index.css          ← Global styles (obsidian/gold theme)
        ├── index.js           ← React entry point
        └── pages/
            ├── UploadPage.jsx     ← Send a file
            ├── ReceivePage.jsx    ← Receive a file
            └── HowItWorksPage.jsx ← Explanations + FAQ
```

---

## PART 7: Running Locally (Development)

```bash
# Terminal 1 — Backend
cd securevault/backend
npm install
cp .env.example .env
# Edit .env with your values
npm run dev   # Starts on http://localhost:5000

# Terminal 2 — Frontend
cd securevault/frontend
npm install
echo "REACT_APP_API_URL=http://localhost:5000" > .env
npm start     # Opens http://localhost:3000
```

---

## PART 8: Python Developer Translation Table

| JavaScript/Node.js          | Python Equivalent                     |
|-----------------------------|---------------------------------------|
| `express`                   | `flask` / `fastapi`                   |
| `mongoose`                  | `pymongo` / `mongoengine`             |
| `multer`                    | `request.files` in Flask              |
| `bcryptjs`                  | `bcrypt` library                      |
| `crypto.createCipheriv`     | `cryptography.hazmat.primitives`      |
| `express-rate-limit`        | `flask-limiter`                       |
| `helmet`                    | `flask-talisman`                      |
| `dotenv`                    | `python-dotenv`                       |
| `npm install`               | `pip install`                         |
| `package.json`              | `requirements.txt`                    |
| `node server.js`            | `python app.py`                       |
| `async/await`               | `async/await` (same in Python 3.5+)   |
| `req.body`                  | `request.json` / `request.form`       |
| `res.json({...})`           | `jsonify({...})`                      |
| `process.env.KEY`           | `os.environ['KEY']`                   |

---

## Part 9: Cost Breakdown (Monthly)

| Service              | Free Tier                        | Paid (if needed)    |
|----------------------|----------------------------------|---------------------|
| MongoDB Atlas        | 512MB storage                    | $9/month (5GB)      |
| Railway / Render     | 500 hours/month                  | $5/month (always on)|
| Vercel / Netlify     | Unlimited static hosting         | Free forever        |
| Domain (.com)        | —                                | ~₹1,200/year        |
| VirusTotal API       | 500 scans/day                    | $0–$350/month       |
| **Total (starter)**  | **$0/month** (within free tiers) | —                   |

---

*SecureVault — Built with MERN stack. Designed for Aryan's portfolio.*
