
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import speakeasy from "speakeasy";
import QRCode from "qrcode";

export async function POST(req: NextRequest) {
    try {
        const { userId } = await req.json();
        const docSnap = await adminDb.collection("householdotp_users").doc(userId).get();
        if (!docSnap.exists) return NextResponse.json({ error: "User not found" }, { status: 404 });
        
        const username = docSnap.data()?.username;
        const secret = speakeasy.generateSecret({ name: `HouseholdOTP (${username})` });
        const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url || '');

        await adminDb.collection("householdotp_users").doc(userId).update({ two_factor_secret: secret.base32 });
        return NextResponse.json({ qrCodeUrl, secret: secret.base32 });
    } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
