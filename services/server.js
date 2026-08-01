require('dotenv').config();
const express = require('express');
const cors = require('cors');
const startImapService = require('./imapService');
const db = require('./database');
const bcrypt = require('bcryptjs');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// API Key Middleware
app.use('/api', (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (!process.env.BACKEND_API_KEY || apiKey !== process.env.BACKEND_API_KEY) {
        return res.status(403).json({ error: "Forbidden: Invalid API Key" });
    }
    next();
});

// Endpoint to get all OTPs, newest first (filtered by userId)
app.get('/api/otps', (req, res) => {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: "userId is required" });

    db.all(`SELECT email FROM email_accounts WHERE user_id = ?`, [userId], (err, emails) => {
        if (err) return res.status(500).json({ error: err.message });
        const emailList = emails.map(e => e.email);
        if (emailList.length === 0) return res.json({ message: "success", data: [] });

        const placeholders = emailList.map(() => '?').join(',');
        const query = `SELECT * FROM netflix_otps WHERE receiver_email IN (${placeholders}) ORDER BY received_at DESC`;
        db.all(query, emailList, (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "success", data: rows });
        });
    });
});

// Endpoint to get OTPs by category, newest first (filtered by userId)
app.get('/api/otps/:category', (req, res) => {
    const category = req.params.category;
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: "userId is required" });

    db.all(`SELECT email FROM email_accounts WHERE user_id = ?`, [userId], (err, emails) => {
        if (err) return res.status(500).json({ error: err.message });
        const emailList = emails.map(e => e.email);
        if (emailList.length === 0) return res.json({ message: "success", data: [] });

        const placeholders = emailList.map(() => '?').join(',');
        const query = `SELECT * FROM netflix_otps WHERE category = ? AND receiver_email IN (${placeholders}) ORDER BY received_at DESC`;
        db.all(query, [category, ...emailList], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "success", data: rows });
        });
    });
});

// Email Account Endpoints
app.get('/api/emails/:userId', (req, res) => {
    db.all(`SELECT id, email, imap_host, created_at FROM email_accounts WHERE user_id = ?`, [req.params.userId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
});

app.post('/api/emails', async (req, res) => {
    const { userId, email, password, imap_host, imap_port } = req.body;
    if (!userId || !email || !password) return res.status(400).json({ error: "Missing fields" });

    const host = (imap_host || 'imap.gmail.com').trim();
    const port = imap_port ? parseInt(imap_port.toString().trim(), 10) : 993;

    try {
        const { ImapFlow } = require('imapflow');
        const client = new ImapFlow({
            host: host,
            port: port,
            secure: true,
            auth: {
                user: email,
                pass: password
            },
            logger: false
        });
        await client.connect();
        await client.logout();
    } catch (err) {
        return res.status(400).json({ error: "Gagal login ke server email: " + err.message });
    }

    // SMTP Configuration for Welcome Email
    const nodemailer = require('nodemailer');
    let smtpHost = host;
    if (host === 'imap.gmail.com') smtpHost = 'smtp.gmail.com';
    else if (host.startsWith('imap.')) smtpHost = host.replace('imap.', 'smtp.');

    try {
        const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: 465, // Standard secure SMTP port
            secure: true,
            auth: {
                user: email,
                pass: password
            }
        });
        
        db.get(`SELECT username FROM users WHERE id = ?`, [userId], (err, user) => {
            const accountName = user ? user.username : 'Pengguna';
            const mailOptions = {
                from: email,
                to: email,
                subject: 'Email Berhasil Terhubung ke HouseholdOTP ✅',
                html: `
                  <div style="font-family: sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #e50914;">Netflix OTP Center</h2>
                    <p>Halo,</p>
                    <p>Selamat! Alamat email <strong>${email}</strong> telah <b>BERHASIL (Bind Successfully)</b> ditambahkan dan terhubung dengan akun HouseholdOTP <strong>${accountName}</strong> Anda.</p>
                    <p>Sistem akan memantau kode OTP Netflix yang masuk secara otomatis dan menampilkannya di Dashboard web.</p>
                    <br/>
                    <p>Salam,<br/>Tim HouseholdOTP</p>
                  </div>
                `
            };
            transporter.sendMail(mailOptions).catch(e => console.error("SMTP Send error:", e.message));
        });
    } catch (smtpErr) {
        console.error("Gagal memicu SMTP:", smtpErr.message);
    }

    db.run(`INSERT INTO email_accounts (user_id, email, password, imap_host, imap_port) VALUES (?, ?, ?, ?, ?)`, 
      [userId, email, password, host, port], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, id: this.lastID });
    });
});

app.delete('/api/emails/:id', (req, res) => {
    db.run(`DELETE FROM email_accounts WHERE id = ?`, [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// User Login Endpoint
app.post('/api/users/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: "Username and password required" });
    }

    db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(401).json({ error: "Invalid credentials" });

        const isValid = bcrypt.compareSync(password, user.password);
        if (!isValid) return res.status(401).json({ error: "Invalid credentials" });

        if (user.two_factor_enabled) {
            const { twoFactorToken } = req.body;
            if (!twoFactorToken) {
                return res.status(401).json({ error: "2FA_REQUIRED" });
            }
            const verified = speakeasy.totp.verify({
                secret: user.two_factor_secret,
                encoding: 'base32',
                token: twoFactorToken
            });
            if (!verified) {
                return res.status(401).json({ error: "INVALID_2FA_CODE" });
            }
        }

        let prefs = ["Semua", "Household", "Login", "Verifikasi", "Ubah Email", "Reset Password"];
        if (user.preferences) {
            try {
                prefs = JSON.parse(user.preferences);
            } catch (e) {}
        }
        
        res.json({
            id: user.id.toString(),
            name: user.name,
            role: user.role,
            username: user.username,
            household_only: Boolean(user.household_only),
            preferences: prefs,
            two_factor_enabled: Boolean(user.two_factor_enabled)
        });
    });
});

// User Register Endpoint
app.post('/api/users/register', (req, res) => {
    const { username, password, name, email } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: "Username and password required" });
    }

    db.get(`SELECT id FROM users WHERE username = ?`, [username], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row) return res.status(400).json({ error: "Username already exists" });

        const hash = bcrypt.hashSync(password, 10);
        const displayName = name || username;
        
        db.run(`INSERT INTO users (username, password, name, email, role) VALUES (?, ?, ?, ?, ?)`, 
          [username, hash, displayName, email || null, 'seller'], 
          function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id: this.lastID.toString() });
        });
    });
});

// Generate 2FA Secret
app.post('/api/users/2fa/generate', (req, res) => {
    const { userId, username } = req.body;
    if (!userId || !username) return res.status(400).json({ error: "Missing required fields" });

    const secret = speakeasy.generateSecret({
        name: `HouseholdOTP (${username})`
    });

    db.run(`UPDATE users SET two_factor_secret = ? WHERE id = ?`, [secret.base32, userId], (err) => {
        if (err) return res.status(500).json({ error: err.message });

        QRCode.toDataURL(secret.otpauth_url, (err, data_url) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ secret: secret.base32, qr_code: data_url });
        });
    });
});

// Verify 2FA
app.post('/api/users/2fa/verify', (req, res) => {
    const { userId, token } = req.body;
    if (!userId || !token) return res.status(400).json({ error: "Missing required fields" });

    db.get(`SELECT two_factor_secret FROM users WHERE id = ?`, [userId], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user || !user.two_factor_secret) return res.status(400).json({ error: "2FA not initiated" });

        const verified = speakeasy.totp.verify({
            secret: user.two_factor_secret,
            encoding: 'base32',
            token: token
        });

        if (verified) {
            db.run(`UPDATE users SET two_factor_enabled = 1 WHERE id = ?`, [userId], (err) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ success: true, message: "2FA enabled successfully" });
            });
        } else {
            res.status(400).json({ error: "Kode tidak valid" });
        }
    });
});

// Update User Profile Endpoint
app.put('/api/users/:id', (req, res) => {
    const id = req.params.id;
    const { username, password, household_only, preferences } = req.body;
    
    if (!username) {
        return res.status(400).json({ error: "Username is required" });
    }

    const householdVal = household_only ? 1 : 0;
    const prefStr = preferences ? JSON.stringify(preferences) : '["Semua", "Household", "Login", "Verifikasi", "Ubah Email", "Reset Password"]';

    if (password) {
        const hash = bcrypt.hashSync(password, 10);
        db.run(`UPDATE users SET username = ?, password = ?, household_only = ?, preferences = ? WHERE id = ?`, [username, hash, householdVal, prefStr, id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, message: "Profile and password updated" });
        });
    } else {
        db.run(`UPDATE users SET username = ?, household_only = ?, preferences = ? WHERE id = ?`, [username, householdVal, prefStr, id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, message: "Profile updated" });
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    startImapService();
});
