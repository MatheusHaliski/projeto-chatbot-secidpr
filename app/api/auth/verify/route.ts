import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { getAdminFirestore } from "@/app/lib/firebaseAdmin";
import { createSessionToken, setSessionCookie } from "@/app/lib/serverSession";
import { verifyAllowedGoogleIdentity } from "@/app/api/pin/route"
import { consumeRateLimit, resolveClientIp } from "@/app/lib/security/basicRateLimit";
export const runtime = "nodejs";

type AuthPayload = {
    email?: string;
    password?: string;
};

type UserRecord = {
    password?: string;
    passwordHash?: string;
    passwordSalt?: string;
    passwordIterations?: number;
    passwordHashAlgorithm?: string;
};

const HASH_ALGORITHM = "SHA-256";
const APP_PEPPER = "vs-usercontrol-v1";
const AUTH_VERIFY_IP_LIMIT_MAX = Number(
    process.env.AUTH_VERIFY_RATE_LIMIT_IP_MAX ?? "10"
);
const AUTH_VERIFY_EMAIL_LIMIT_MAX = Number(
    process.env.AUTH_VERIFY_RATE_LIMIT_EMAIL_MAX ?? "5"
);
const AUTH_VERIFY_LIMIT_WINDOW_MS = Number(
    process.env.AUTH_VERIFY_RATE_LIMIT_WINDOW_MS ?? "60000"
);

const buildSalt = (saltBase64: string) =>
    Buffer.concat([Buffer.from(saltBase64, "base64"), Buffer.from(APP_PEPPER)]);

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
    const identity = await verifyAllowedGoogleIdentity(request);
    if (!identity.ok) {
        return identity.response;
    }
    let body: AuthPayload = {};
    try {
        body = (await request.json()) as AuthPayload;
    } catch {
        body = {};
    }

    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password?.trim() ?? "";

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
    }

    if (!email || !password) {
        return NextResponse.json(
            { error: "Missing credentials." },
            { status: 400 }
        );
    }

    try {
        const db = getAdminFirestore();
        const snapshot = await db
            .collection("VSusercontrol")
            .where("email", "==", email)
            .limit(1)
            .get();

        const doc = snapshot.empty ? null : snapshot.docs[0];
        const record = doc ? (doc.data() as UserRecord) : null;

        if (!record || !doc) {
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

        const sessionToken = createSessionToken({ sub: doc.id, email });
        const response = NextResponse.json({ ok: true });
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
