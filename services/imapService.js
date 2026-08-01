const { ImapFlow } = require('imapflow');
const cron = require('node-cron');
const simpleParser = require('mailparser').simpleParser;
const db = require('./database');

const startImapService = () => {
    // Run every 1 minute
    cron.schedule('* * * * *', async () => {
        console.log('[Cron] Checking all email accounts...');
        
        db.all(`SELECT id, email, password, imap_host, imap_port FROM email_accounts`, [], async (err, accounts) => {
            if (err) {
                console.error('[Cron] Error fetching email accounts:', err.message);
                return;
            }
            if (!accounts || accounts.length === 0) {
                console.log('[Cron] No email accounts registered.');
                return;
            }

            // Process all accounts concurrently
            await Promise.allSettled(accounts.map(account => checkEmailAccount(account.email, account.password, account.imap_host, account.imap_port)));
        });
    });
};

const checkEmailAccount = async (email, password, imap_host, imap_port) => {
    const client = new ImapFlow({
        host: imap_host || process.env.IMAP_HOST || 'imap.gmail.com',
        port: parseInt(imap_port || process.env.IMAP_PORT || '993', 10),
        secure: process.env.IMAP_SECURE === 'true' || true,
        auth: {
            user: email,
            pass: password
        },
        logger: false // Disable verbose logging
    });

    client.on('error', err => {
        console.error(`[IMAP Client Error - ${email}]:`, err.message);
    });

    try {
        await client.connect();
        // Wait until mailbox lock is acquired
        let lock = await client.getMailboxLock('INBOX');
        try {
            // Search for unread emails
            const messages = client.fetch({ seen: false }, { source: true, envelope: true });
            
            for await (let msg of messages) {
                const envelope = msg.envelope;
                const fromAddress = envelope.from && envelope.from[0] ? envelope.from[0].address : '';
                const fromName = envelope.from && envelope.from[0] ? envelope.from[0].name : '';
                
                // Only process emails from "Netflix"
                if (!fromAddress.toLowerCase().includes('netflix') && !(fromName && fromName.toLowerCase().includes('netflix'))) {
                    continue; 
                }
                
                const parsed = await simpleParser(msg.source);
                const subject = (parsed.subject || '').toLowerCase();
                const body = parsed.text || parsed.html || '';

                let category = 'Lainnya'; // Fallback jika subjek tidak dikenali
                if (subject.includes('kode akses sementara') || subject.includes('temporary access') || subject.includes('household')) {
                    category = 'Household';
                } else if (subject.includes('kode masukmu') || subject.includes('sign-in code') || subject.includes('sign in')) {
                    category = 'Login';
                } else if (subject.includes('kode verifikasi') || subject.includes('verification code') || subject.includes('verify')) {
                    category = 'Verifikasi';
                } else if (subject.includes('ubah email') || subject.includes('update email') || subject.includes('change email')) {
                    category = 'Ubah Email';
                }

                if (category) {
                    let otpCode = null;
                    
                    // Match 4 to 6 digit code
                    const codeMatch = body.match(/\b\d{4,6}\b/);
                    if (codeMatch) {
                        otpCode = codeMatch[0];
                    } else {
                        // fallback to finding a URL (like a sign in link)
                        // Mengecualikan tanda kurung tutup atau kutip di akhir URL
                        const linkMatch = body.match(/https?:\/\/[^\s\])"'>]+/);
                        if (linkMatch) {
                            otpCode = linkMatch[0];
                            // Memaksa kategori menjadi Verifikasi jika berupa link verifikasi HP
                            if (category === 'Lainnya' && (otpCode.includes('phonenumber') || otpCode.includes('verify'))) {
                                category = 'Verifikasi';
                            }
                        }
                    }

                    if (otpCode) {
                        // Mencegah duplikasi data jika gagal di-mark-as-read
                        db.get(
                            `SELECT id FROM netflix_otps WHERE receiver_email = ? AND otp_code = ? AND received_at > datetime('now', '-2 hour')`,
                            [email, otpCode],
                            (err, row) => {
                                if (!err && !row) {
                                    db.run(
                                        `INSERT INTO netflix_otps (category, otp_code, receiver_email) VALUES (?, ?, ?)`,
                                        [category, otpCode, email],
                                        function (err) {
                                            if (err) {
                                                console.error(`[IMAP - ${email}] Error inserting OTP:`, err.message);
                                            } else {
                                                console.log(`[IMAP - ${email}] Saved OTP: ${category} - ${otpCode}`);
                                            }
                                        }
                                    );
                                } else if (row) {
                                    console.log(`[IMAP - ${email}] Skipping duplicate OTP/Link`);
                                }
                            }
                        );
                    }
                }

                // Mark the email as Read (\Seen) on the server so it's not processed again
                await client.messageFlagsAdd(msg.seq, ['\\Seen']);
            }
        } finally {
            lock.release();
        }
        await client.logout();
    } catch (err) {
        console.error(`[IMAP Error - ${email}]:`, err.message);
    }
};

module.exports = startImapService;
