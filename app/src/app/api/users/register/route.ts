
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
    try {
        const { username, password, name, role } = await req.json();
        
        const existing = await adminDb.collection("householdotp_users").where("username", "==", username).get();
        if (!existing.empty) return NextResponse.json({ error: "Username sudah terdaftar" }, { status: 400 });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await adminDb.collection("householdotp_users").add({
            username, password: hashedPassword, name: name || username, role: role || 'user',
            household_only: false, preferences: '["Semua", "Household", "Login", "Verifikasi", "Ubah Email"]',
            two_factor_enabled: false
        });

        return NextResponse.json({ message: "User registered", userId: newUser.id });
    } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
