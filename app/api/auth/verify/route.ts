import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { getAdminFirestore } from "@/app/lib/firebaseAdmin";
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

const verifyPassword = async (
    password: string,
    digest: UserRecord
) => {
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
        const snapshot = await db
            .collection("VSusercontrol")
            .where("email", "==", email)
            .limit(1)
            .get();

        const record = snapshot.empty
            ? null
            : (snapshot.docs[0]?.data() as UserRecord);

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

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("[Auth Verify API] credential check failed:", error);
        return NextResponse.json(
            { error: "Unable to verify credentials right now." },
            { status: 500 }
        );
    }
}
