
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    try {
        const snapshot = await adminDb.collection("householdotp_emails").where("user_id", "==", userId).get();
        const emails = [];
        snapshot.forEach(doc => emails.push({ id: doc.id, ...doc.data() }));
        return NextResponse.json(emails);
    } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
    try {
        const { userId, email, password, imap_host, imap_port } = await req.json();
        if (!userId || !email || !password) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

        const host = (imap_host || 'imap.gmail.com').trim();
        const port = imap_port ? parseInt(imap_port.toString().trim(), 10) : 993;

        // IMAP validation
        const { ImapFlow } = require('imapflow');
        const client = new ImapFlow({ host, port, secure: true, auth: { user: email, pass: password }, logger: false });
        await client.connect();
        await client.logout();

        // Save to Firestore
        const newDoc = await adminDb.collection("householdotp_emails").add({
            user_id: userId, email, password, imap_host: host, imap_port: port, created_at: new Date()
        });
        return NextResponse.json({ success: true, id: newDoc.id });
    } catch (err: any) {
        return NextResponse.json({ error: "Gagal login ke server email: " + err.message }, { status: 400 });
    }
}
