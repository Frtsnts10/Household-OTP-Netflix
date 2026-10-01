const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
const { ImapFlow } = require("imapflow");
const simpleParser = require("mailparser").simpleParser;

admin.initializeApp();
const db = admin.firestore();

exports.checkEmails = onSchedule("* * * * *", async (event) => {
    console.log('[Cron] Checking all email accounts...');
    
    try {
        const snapshot = await db.collection("email_accounts").get();
        if (snapshot.empty) {
            console.log('[Cron] No email accounts registered.');
            return;
        }

        const accounts = [];
        snapshot.forEach(doc => {
            accounts.push({ id: doc.id, ...doc.data() });
        });

        // Process all accounts concurrently
        await Promise.allSettled(accounts.map(account => 
            checkEmailAccount(account.email, account.password, account.imap_host, account.imap_port)
        ));
    } catch (err) {
        console.error('[Cron] Error fetching email accounts:', err.message);
    }
});

const checkEmailAccount = async (email, password, imap_host, imap_port) => {
    const client = new ImapFlow({
        host: imap_host || 'imap.gmail.com',
        port: parseInt(imap_port || '993', 10),
        secure: true,
        auth: {
            user: email,
            pass: password
        },
        logger: false
    });

    client.on('error', err => {
        console.error(`[IMAP Client Error - ${email}]:`, err.message);
    });

    try {
        await client.connect();
        let lock = await client.getMailboxLock('INBOX');
        try {
            const messages = client.fetch({ seen: false }, { source: true, envelope: true });
            
            for await (let msg of messages) {
                const envelope = msg.envelope;
                const fromAddress = envelope.from && envelope.from[0] ? envelope.from[0].address : '';
                const fromName = envelope.from && envelope.from[0] ? envelope.from[0].name : '';
                
                if (!fromAddress.toLowerCase().includes('netflix') && !(fromName && fromName.toLowerCase().includes('netflix'))) {
                    continue; 
                }
                
                const parsed = await simpleParser(msg.source);
                const subject = (parsed.subject || '').toLowerCase();
                const body = parsed.text || parsed.html || '';

                let category = 'Lainnya';
                if (subject.includes('kode akses sementara') || subject.includes('temporary access') || subject.includes('household')) {
                    category = 'Household';
                } else if (subject.includes('kode masukmu') || subject.includes('sign-in code') || subject.includes('sign in')) {
                    category = 'Login';
                } else if (subject.includes('kode verifikasi') || subject.includes('verification code') || subject.includes('verify')) {
                    category = 'Verifikasi';
                } else if (subject.includes('ubah email') || subject.includes('update email') || subject.includes('change email')) {
                    category = 'Ubah Email';
                } else if (subject.includes('reset password') || subject.includes('lupa sandi') || subject.includes('forgot password') || subject.includes('atur ulang sandi') || subject.includes('reset sandi')) {
                    category = 'Reset Password';
                }

                if (category) {
                    let otpCode = null;
                    const codeMatch = body.match(/\b\d{4,6}\b/);
                    if (codeMatch) {
                        otpCode = codeMatch[0];
                    } else {
                        const linkMatch = body.match(/https?:\/\/[^\s\])"'>]+/);
                        if (linkMatch) {
                            otpCode = linkMatch[0];
                            if (category === 'Lainnya' && (otpCode.includes('phonenumber') || otpCode.includes('verify'))) {
                                category = 'Verifikasi';
                            }
                        }
                    }

                    if (otpCode) {
                        // Check for recent duplicate
                        const twoHoursAgo = new Date();
                        twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);

                        const existingOtps = await db.collection("netflix_otps")
                            .where("receiver_email", "==", email)
                            .where("otp_code", "==", otpCode)
                            .where("received_at", ">", twoHoursAgo)
                            .get();

                        if (existingOtps.empty) {
                            await db.collection("netflix_otps").add({
                                category,
                                otp_code: otpCode,
                                receiver_email: email,
                                received_at: admin.firestore.FieldValue.serverTimestamp(),
                                is_read: false
                            });
                            console.log(`[IMAP - ${email}] Saved OTP: ${category} - ${otpCode}`);
                        } else {
                            console.log(`[IMAP - ${email}] Skipping duplicate OTP/Link`);
                        }
                    }
                }

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
