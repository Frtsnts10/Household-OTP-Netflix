require('dotenv').config();
const express = require('express');
const cors = require('cors');
const startImapService = require('./imapService');
const db = require('./database');
const bcrypt = require('bcryptjs');

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

app.post('/api/emails', (req, res) => {
    const { userId, email, password, imap_host, imap_port } = req.body;
    if (!userId || !email || !password) return res.status(400).json({ error: "Missing fields" });

    const host = imap_host || 'imap.gmail.com';
    const port = imap_port ? parseInt(imap_port, 10) : 993;

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

        let prefs = ["Semua", "Household", "Login", "Verifikasi", "Ubah Email"];
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
            preferences: prefs
        });
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
    const prefStr = preferences ? JSON.stringify(preferences) : '["Semua", "Household", "Login", "Verifikasi", "Ubah Email"]';

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
