
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const doc = await adminDb.collection("householdotp_users").doc(id).get();
        if (!doc.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json({ preferences: doc.data()?.preferences });
    } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const { preferences } = await req.json();
        await adminDb.collection("householdotp_users").doc(id).update({ preferences: JSON.stringify(preferences) });
        return NextResponse.json({ success: true, message: "Profile updated" });
    } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
