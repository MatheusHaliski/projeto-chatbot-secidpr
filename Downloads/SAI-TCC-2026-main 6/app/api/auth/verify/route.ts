import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { getAdminFirestore } from "@/app/lib/firebaseAdmin";
import { consumeRateLimit, resolveClientIp } from "@/app/lib/security/basicRateLimit";
import { createSessionToken, setSessionCookie } from "@/app/lib/serverSession";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { syncUserProfileFromAuth } from "@/app/lib/userProfileSync";

export const runtime = "nodejs";
type AuthPayload = {
    email?: string;
    password?: string;
    idToken?: string;
};

type UserRecord = {
    user_id?: string;
    uid?: string;
    name?: string;
    displayName?: string;
    password?: string;
    passwordHash?: string;
    passwordSalt?: string;
    passwordIterations?: number;
    passwordHashAlgorithm?: string;
    provider?: string;
};

const HASH_ALGORITHM = "SHA-256";
const APP_PEPPER = "sai-usercontrol-v1";
const USER_COLLECTION = "sai-usercontrol";
const AUTH_VERIFY_IP_LIMIT_MAX = Number(
    process.env.AUTH_VERIFY_RATE_LIMIT_IP_MAX ?? "10"
);
const AUTH_VERIFY_EMAIL_LIMIT_MAX = Number(
    process.env.AUTH_VERIFY_RATE_LIMIT_EMAIL_MAX ?? "5"
);
const AUTH_VERIFY_EMAIL_GLOBAL_LIMIT_MAX = Number(
    process.env.AUTH_VERIFY_RATE_LIMIT_EMAIL_GLOBAL_MAX ?? "12"
);
const AUTH_VERIFY_LIMIT_WINDOW_MS = Number(
    process.env.AUTH_VERIFY_RATE_LIMIT_WINDOW_MS ?? "60000"
);
const buildSalt = (saltBase64: string) =>
    Buffer.concat([
        Buffer.from(saltBase64, "base64"),
        Buffer.from(APP_PEPPER),
    ]);

const hashPassword = (
    password: string,
    saltBase64: string,
    iterations: number
): Promise<string> =>
    new Promise((resolve, reject) => {
        crypto.pbkdf2(
            password,
            buildSalt(saltBase64),
            iterations,
            32,
            "sha256",
            (error, derivedKey) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(derivedKey.toString("base64"));
            }
        );
    });

const verifyPassword = async (password: string, digest: UserRecord) => {
    if (
        !digest.passwordHash ||
        !digest.passwordSalt ||
        !digest.passwordIterations ||
        (digest.passwordHashAlgorithm &&
            digest.passwordHashAlgorithm !== HASH_ALGORITHM)
    ) {
        return false;
    }

    const candidate = await hashPassword(
        password,
        digest.passwordSalt,
        digest.passwordIterations
    );
    return candidate === digest.passwordHash;
};

export async function POST(request: NextRequest): Promise<Response> {
    let body: AuthPayload = {};
    try {
        body = (await request.json()) as AuthPayload;
    } catch {
        body = {};
    }

    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";
    const idToken = body.idToken?.trim() ?? "";

    const firebaseAdminProjectId = process.env.NEXT_FIREBASE_ADMIN_PROJECT_ID ?? "";
    const firebaseClientProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "";
    const projectMismatch = Boolean(
        firebaseAdminProjectId &&
        firebaseClientProjectId &&
        firebaseAdminProjectId !== firebaseClientProjectId
    );
    if (projectMismatch) {
        console.warn("[Auth Verify API] Firebase project mismatch detected", {
            firebaseAdminProjectId,
            firebaseClientProjectId,
            route: "/api/auth/verify",
        });
    }

    const clientIp = resolveClientIp(request);
    const ipRateLimit = consumeRateLimit({
        namespace: "auth-verify-ip",
        key: clientIp,
        maxRequests: AUTH_VERIFY_IP_LIMIT_MAX,
        windowMs: AUTH_VERIFY_LIMIT_WINDOW_MS,
    });

    if (!ipRateLimit.allowed) {
        const response = NextResponse.json(
            { error: "Too many verification attempts. Please try again shortly." },
            { status: 429 }
        );
        response.headers.set("Retry-After", String(ipRateLimit.retryAfterSeconds));
        return response;
    }

    if (email) {
        const emailRateLimit = consumeRateLimit({
            namespace: "auth-verify-email",
            key: `${clientIp}:${email}`,
            maxRequests: AUTH_VERIFY_EMAIL_LIMIT_MAX,
            windowMs: AUTH_VERIFY_LIMIT_WINDOW_MS,
        });

        if (!emailRateLimit.allowed) {
            const response = NextResponse.json(
                {
                    error:
                        "Too many verification attempts for this account. Please try again shortly.",
                },
                { status: 429 }
            );
            response.headers.set("Retry-After", String(emailRateLimit.retryAfterSeconds));
            return response;
        }

        const emailGlobalRateLimit = consumeRateLimit({
            namespace: "auth-verify-email-global",
            key: email,
            maxRequests: AUTH_VERIFY_EMAIL_GLOBAL_LIMIT_MAX,
            windowMs: AUTH_VERIFY_LIMIT_WINDOW_MS,
        });

        if (!emailGlobalRateLimit.allowed) {
            const response = NextResponse.json(
                {
                    error:
                        "Too many verification attempts for this account. Please try again shortly.",
                },
                { status: 429 }
            );
            response.headers.set(
                "Retry-After",
                String(emailGlobalRateLimit.retryAfterSeconds)
            );
            return response;
        }
    }

    if (!email || !password) {
        return NextResponse.json(
            { error: "Missing credentials." },
            { status: 400 }
        );
    }

    try {
        const db = getAdminFirestore();

        if (idToken) {
            const adminAuth = getAdminAuth();
            const decoded = await adminAuth.verifyIdToken(idToken, true);
            const authUser = await adminAuth.getUser(decoded.uid);
            const authEmail = (authUser.email ?? email).trim().toLowerCase();

            if (authEmail !== email) {
                console.warn("[Auth Verify API] email mismatch for idToken login", {
                    uid: decoded.uid,
                    payloadEmail: email,
                    authEmail,
                });
            }

            await syncUserProfileFromAuth({
                uid: decoded.uid,
                email: authEmail,
                displayName: authUser.displayName ?? "",
                provider: "password",
                db,
            });

            const sessionToken = createSessionToken({
                sub: decoded.uid,
                email: authEmail,
            });

            const response = NextResponse.json({
                ok: true,
                profile: {
                    user_id: decoded.uid,
                    uid: decoded.uid,
                    name: authUser.displayName ?? "",
                    email: authEmail,
                },
            });
            setSessionCookie(response, sessionToken);
            return response;
        }

        const snapshot = await db
            .collection(USER_COLLECTION)
            .where("email", "==", email)
            .limit(1)
            .get();

        const matchedDoc = snapshot.empty ? null : snapshot.docs[0] ?? null;
        const record = matchedDoc ? (matchedDoc.data() as UserRecord) : null;
        const firestoreDocId = matchedDoc?.id ?? "";

        if (!record) {
            return NextResponse.json(
                { error: "No account was found with these credentials." },
                { status: 401 }
            );
        }

        const usesDigest = Boolean(record.passwordHash && record.passwordSalt);
        const isValid = usesDigest
            ? await verifyPassword(password, record)
            : record.password === password;

        if (!isValid) {
            return NextResponse.json(
                { error: "No account was found with these credentials." },
                { status: 401 }
            );
        }

        const canonicalUserId = record.uid?.trim() || firestoreDocId;

        if (matchedDoc && record.user_id !== canonicalUserId) {
            await matchedDoc.ref.set({ user_id: canonicalUserId, uid: canonicalUserId }, { merge: true });
        }

        const sessionToken = createSessionToken({
            sub: canonicalUserId,
            email,
        });

        const response = NextResponse.json({
            ok: true,
            profile: {
                user_id: canonicalUserId,
                name: record.displayName ?? record.name ?? "",
                email,
            },
        });
        setSessionCookie(response, sessionToken);

        return response;
    } catch (error) {
        console.error("[Auth Verify API] credential check failed:", error);
        return NextResponse.json(
            { error: "Unable to verify credentials right now." },
            { status: 500 }
        );
    }
}
