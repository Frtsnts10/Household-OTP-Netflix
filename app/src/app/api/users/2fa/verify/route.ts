
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import speakeasy from "speakeasy";

export async function POST(req: NextRequest) {
    try {
        const { userId, token } = await req.json();
        const docSnap = await adminDb.collection("householdotp_users").doc(userId).get();
        if (!docSnap.exists) return NextResponse.json({ error: "User not found" }, { status: 404 });
        
        const secret = docSnap.data()?.two_factor_secret;
        if (!secret) return NextResponse.json({ error: "2FA not configured" }, { status: 400 });

        const verified = speakeasy.totp.verify({ secret, encoding: 'base32', token, window: 1 });
        if (verified) {
            await adminDb.collection("householdotp_users").doc(userId).update({ two_factor_enabled: true });
            return NextResponse.json({ success: true, message: "2FA diaktifkan" });
        } else {
            return NextResponse.json({ error: "Kode token salah atau sudah kedaluwarsa" }, { status: 400 });
        }
    } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
