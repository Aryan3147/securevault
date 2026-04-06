import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, NavLink } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import UploadPage from './pages/UploadPage';
import ReceivePage from './pages/ReceivePage';
import HowItWorksPage from './pages/HowItWorksPage';

function Header() {
  return (
    <header className="header">
      <div className="container">
        <div className="header-inner">
          <Link to="/" className="logo">
            <span className="logo-name">Secure<span>Vault</span></span>
            <span className="logo-tag">Encrypted</span>
          </Link>
          <nav className="nav-links">
            <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              Send
            </NavLink>
            <NavLink to="/how-it-works" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              How It Works
            </NavLink>
          </nav>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-inner">
          <span className="footer-text">© {new Date().getFullYear()} SecureVault — AES-256-GCM End-to-End Encryption</span>
          <span className="footer-text">Files scanned by 70+ antivirus engines</span>
        </div>
      </div>
    </footer>
  );
}

function App() {
  return (
    <Router>
      <div className="app-wrapper">
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#161616',
              color: '#e8e4dc',
              border: '1px solid #252525',
              fontFamily: "'DM Mono', monospace",
              fontSize: '12px',
              letterSpacing: '0.05em',
            },
          }}
        />
        <Header />
        <main style={{ flex: 1, padding: '40px 0' }}>
          <Routes>
            <Route path="/" element={<UploadPage />} />
            <Route path="/receive/:shareId" element={<ReceivePage />} />
            <Route path="/how-it-works" element={<HowItWorksPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
