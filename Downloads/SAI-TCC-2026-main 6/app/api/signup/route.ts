import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminFirestore } from "@/app/lib/firebaseAdmin";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { createSessionToken, setSessionCookie } from "@/app/lib/serverSession";
import { syncUserProfileFromAuth } from "@/app/lib/userProfileSync";
import {
    GOOGLE_CLIENT_ID_ERROR_MESSAGE,
    assertValidGoogleClientId,
    getGoogleOAuthDiagnostics,
    maskClientId,
} from "@/app/lib/googleOAuthConfig";

export const runtime = "nodejs";

const signupSyncSchema = z.object({
    uid: z.string().trim().min(1).optional(),
    name: z.string().trim().min(1).optional(),
    email: z.string().email(),
    provider: z.enum(["password", "google", "facebook"]).default("password"),
    idToken: z.string().trim().min(1),
});

export async function POST(request: NextRequest): Promise<Response> {
    let body: unknown = {};
    try {
        body = await request.json();
    } catch {
        body = {};
    }

    const parsed = signupSyncSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: "Invalid signup payload." },
            { status: 400 }
        );
    }

    const normalizedEmail = parsed.data.email.trim().toLowerCase();

    console.info("[Signup API] profile sync started", {
        provider: parsed.data.provider,
        normalizedEmail,
    });

    if (parsed.data.provider === "google") {
        const oauthDiagnostics = getGoogleOAuthDiagnostics();
        console.info("[Signup API] Google OAuth client diagnostics", oauthDiagnostics);
        if (oauthDiagnostics.serverClientIdMasked && oauthDiagnostics.publicClientIdMasked && !oauthDiagnostics.idsMatch) {
            console.warn("[Signup API] Google OAuth client ID mismatch between server and public env vars", {
                serverClientIdMasked: oauthDiagnostics.serverClientIdMasked,
                publicClientIdMasked: oauthDiagnostics.publicClientIdMasked,
            });
        }

        try {
            const validatedClientId = assertValidGoogleClientId();
            console.info("[Signup API] Google OAuth client ID in use", {
                clientIdMasked: maskClientId(validatedClientId),
                route: "/api/signup",
            });
        } catch (error) {
            console.error("[Signup API] Invalid Google OAuth client configuration", {
                message: error instanceof Error ? error.message : GOOGLE_CLIENT_ID_ERROR_MESSAGE,
                route: "/api/signup",
            });

            return NextResponse.json(
                { error: GOOGLE_CLIENT_ID_ERROR_MESSAGE },
                { status: 500 }
            );
        }
    }

    try {
        const db = getAdminFirestore();
        const adminAuth = getAdminAuth();
        const decodedToken = await adminAuth.verifyIdToken(parsed.data.idToken, true);
        const authUser = await adminAuth.getUser(decodedToken.uid);
        const uid = authUser.uid;
        const authEmail = (authUser.email ?? normalizedEmail).trim().toLowerCase();
        const displayName = (authUser.displayName ?? parsed.data.name ?? "").trim();

        if (parsed.data.uid && parsed.data.uid !== uid) {
            return NextResponse.json(
                { error: "Token/user mismatch detected." },
                { status: 401 }
            );
        }

        if (authEmail !== normalizedEmail) {
            console.warn("[Signup API] email mismatch between token and payload", {
                uid,
                payloadEmail: normalizedEmail,
                authEmail,
            });
        }

        await syncUserProfileFromAuth({
            uid,
            email: authEmail,
            displayName,
            provider: parsed.data.provider,
            db,
        });

        console.info("[Signup API] profile sync completed", {
            uid,
            email: authEmail,
            provider: parsed.data.provider,
        });

        const sessionToken = createSessionToken({
            sub: uid,
            email: authEmail,
        });

        const response = NextResponse.json({
            ok: true,
            profile: {
                user_id: uid,
                uid,
                name: displayName,
                displayName,
                email: authEmail,
                provider: parsed.data.provider,
            },
        });
        setSessionCookie(response, sessionToken);

        return response;
    } catch (error) {
        const asRecord = (error ?? {}) as { code?: string; message?: string };
        console.error("[Signup API] profile sync failed", {
            code: asRecord.code ?? "unknown",
            message: asRecord.message ?? "Unexpected signup sync error.",
            normalizedEmail,
        });
        return NextResponse.json(
            { error: "Unable to finish signup profile sync right now." },
            { status: 500 }
        );
    }
}
