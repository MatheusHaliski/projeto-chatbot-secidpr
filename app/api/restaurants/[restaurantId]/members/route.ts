import { NextRequest, NextResponse } from "next/server";

import { getAdminAuth, getAdminFirestore } from "@/app/lib/firebaseAdmin";
import type { MemberRecord, StaffRole } from "@/app/lib/hubModels";
import { rolePermissions } from "@/app/lib/rbac";

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ restaurantId: string }> }
): Promise<Response> {
    try {
        const { restaurantId } = await params;
        const db = getAdminFirestore();
        const snapshot = await db.collection("restaurants").doc(restaurantId).collection("members").get();

        const members = snapshot.docs.map((doc) => ({ uid: doc.id, ...(doc.data() as Omit<MemberRecord, "uid">) }));
        return NextResponse.json({ members });
    } catch (error) {
        console.error("[Members API] unable to load members", error);
        return NextResponse.json({ error: "Unable to load members." }, { status: 500 });
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ restaurantId: string }> }
): Promise<Response> {
    try {
        const { restaurantId } = await params;
        const payload = (await request.json()) as {
            uid: string;
            role: StaffRole;
            displayName?: string;
            email?: string;
            active?: boolean;
        };

        if (!payload.uid || !payload.role) {
            return NextResponse.json({ error: "uid and role are required." }, { status: 400 });
        }

        const memberRef = getAdminFirestore()
            .collection("restaurants")
            .doc(restaurantId)
            .collection("members")
            .doc(payload.uid);

        const now = Date.now();
        const member: MemberRecord = {
            uid: payload.uid,
            role: payload.role,
            active: payload.active ?? true,
            permissions: rolePermissions[payload.role],
            displayName: payload.displayName,
            email: payload.email,
            joinedAt: now,
        };

        await memberRef.set(member, { merge: true });
        await getAdminAuth().setCustomUserClaims(payload.uid, {
            restaurantRole: payload.role,
            restaurantId,
        });

        return NextResponse.json({ ok: true, member });
    } catch (error) {
        console.error("[Members API] unable to upsert member", error);
        return NextResponse.json({ error: "Unable to save member." }, { status: 500 });
    }
}
