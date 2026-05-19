import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { getAdminFirestore } from "@/app/lib/firebaseAdmin";

export const runtime = "nodejs";
const USER_COLLECTION = "sai-usercontrol";

type ResetPayload = {
    email?: string;
};

const sendResetEmail = async (params: {
    email: string;
    resetLink: string;
}) => {
    const apiKey = process.env.RESEND_API_KEY;
    console.log(apiKey);
    const fromEmail = process.env.RESEND_FROM_EMAIL;

    if (!apiKey || !fromEmail) {
        throw new Error("Email service is not configured.");
    }

    const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            from: fromEmail,
            to: [params.email],
            subject: "Redefine your password",
            html: `
<p>Hello,</p>
<p>We received a request to redefine your password. Click the link below to continue:</p>
<p><a href="${params.resetLink}">Reset your password</a></p>
<p>If you did not request this, you can ignore this email.</p>
`,
        }),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
            `Failed to send reset email: ${response.status} ${errorBody}`
        );
    }
};

export async function POST(request: NextRequest): Promise<Response> {
    let body: ResetPayload = {};
    try {
        body = (await request.json()) as ResetPayload;
    } catch {
        body = {};
    }

    const email = body.email?.trim().toLowerCase() ?? "";
    if (!email) {
        return NextResponse.json(
            { error: "Please provide a valid email address." },
            { status: 400 }
        );
    }

    try {
        const db = getAdminFirestore();
        const existingSnapshot = await db
            .collection(USER_COLLECTION)
            .where("email", "==", email)
            .limit(1)
            .get();

        if (existingSnapshot.empty) {
            return NextResponse.json(
                { error: "No account was found with that email address." },
                { status: 404 }
            );
        }

        const token = crypto.randomUUID();
        const createdAt = new Date();
        const expiresAt = new Date(Date.now() + 1000 * 60 * 60);

        await db.collection("VSpasswordresets").add({
            email,
            token,
            createdAt: createdAt.toISOString(),
            expiresAt: expiresAt.toISOString(),
            used: false,
        });

        const origin =
            process.env.NEXT_PUBLIC_APP_URL ??
            "http://localhost:3000";
        const resetLink = `${origin}/forgetpasswordview?token=${token}`;

        await sendResetEmail({ email, resetLink });

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("[Reset API] Failed to send reset email:", error);
        return NextResponse.json(
            { error: "Unable to send a reset email right now." },
            { status: 500 }
        );
    }
}
