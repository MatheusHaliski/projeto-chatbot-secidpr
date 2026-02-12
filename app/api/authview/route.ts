import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/app/lib/firebaseAdmin";

type AuthPayload = {
    email?: string;
    password?: string;
};

export async function POST(request: NextRequest): Promise<Response> {
    let body: AuthPayload = {};
    try {
        body = (await request.json()) as AuthPayload;
    } catch {
        body = {};
    }

    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password?.trim() ?? "";

    if (!email || !password) {
        return NextResponse.json(
            { error: "Missing credentials." },
            { status: 400 }
        );
    }

    try {
        const db = getAdminFirestore();
        const snapshot = await db
            .collection(process.env.NEXT_PUBLIC_DATABASE_NAME!)
            .where("email", "==", email)
            .limit(1)
            .get();

        const result = snapshot.empty
            ? null
            : (snapshot.docs[0]?.data() as UserRecord);

        if (!result) {
            return NextResponse.json(
                { error: "No account was found with these credentials." },
                { status: 401 }
            );
        }

        if (result.password !== password) {
            return NextResponse.json(
                { error: "No account was found with these credentials." },
                { status: 401 }
            );
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("[AuthView API] credential check failed:", error);
        return NextResponse.json(
            { error: "Unable to verify credentials right now." },
            { status: 500 }
        );
    }
}

type UserRecord = {
    password?: string;
};
