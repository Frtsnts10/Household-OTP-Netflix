const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        db.run(`CREATE TABLE IF NOT EXISTS netflix_otps (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category TEXT CHECK(category IN ('Login', 'Verifikasi', 'Ubah Email', 'Household')),
            otp_code TEXT,
            received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            is_read BOOLEAN DEFAULT 0
        )`, (err) => {
            if (err) {
                console.error('Error creating table', err.message);
            } else {
                // Add receiver_email column safely
                db.run(`ALTER TABLE netflix_otps ADD COLUMN receiver_email TEXT`, (err) => {
                    // Ignore error if column already exists
                });
            }
        });

        // Create users table
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT,
            name TEXT,
            role TEXT,
            household_only BOOLEAN DEFAULT 0,
            preferences TEXT DEFAULT '["Semua", "Household", "Login", "Verifikasi", "Ubah Email"]'
        )`, (err) => {
            if (err) {
                console.error('Error creating table users', err.message);
            } else {
                // Add household_only column safely to existing table
                db.run(`ALTER TABLE users ADD COLUMN household_only BOOLEAN DEFAULT 0`, (err) => {});
                
                // Add preferences column safely to existing table
                db.run(`ALTER TABLE users ADD COLUMN preferences TEXT DEFAULT '["Semua", "Household", "Login", "Verifikasi", "Ubah Email"]'`, (err) => {});
                
                // Seed users
                db.get("SELECT count(*) as count FROM users", (err, row) => {
                    if (row && row.count === 0) {
                        console.log("Seeding default users...");
                        const ownerHash = bcrypt.hashSync("passwordowner123", 10);
                        const sellerHash = bcrypt.hashSync("passwordseller123", 10);
                        
                        const stmt = db.prepare("INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)");
                        stmt.run("admin123", ownerHash, "Owner", "owner");
                        stmt.run("seller123", sellerHash, "Seller", "seller");
                        stmt.finalize();
                    }
                });
            }
        });

        // Create email_accounts table
        db.run(`CREATE TABLE IF NOT EXISTS email_accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            email TEXT UNIQUE,
            password TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )`, (err) => {
            if (err) console.error('Error creating table email_accounts', err.message);
        });
    }
});

module.exports = db;
