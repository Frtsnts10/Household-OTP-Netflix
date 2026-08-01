
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    try {
        // Fetch emails for user
        const emailsSnap = await adminDb.collection("householdotp_emails").where("user_id", "==", userId).get();
        if (emailsSnap.empty) return NextResponse.json({ message: "success", data: [] });
        
        const emails = [];
        emailsSnap.forEach(doc => emails.push(doc.data().email));

        // Since Firestore IN queries support up to 30 elements
        const otpsSnap = await adminDb.collection("netflix_otps")
            .where("receiver_email", "in", emails)
            .orderBy("received_at", "desc")
            .limit(100)
            .get();

        const otps = [];
        otpsSnap.forEach(doc => {
            const data = doc.data();
            otps.push({ id: doc.id, ...data, received_at: data.received_at?.toDate()?.toISOString() });
        });
        return NextResponse.json({ message: "success", data: otps });
    } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
