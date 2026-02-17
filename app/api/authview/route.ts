import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { getAdminFirestore } from "@/app/lib/firebaseAdmin";

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
): Promise<boolean> => {
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

        const usesDigest = Boolean(result.passwordHash && result.passwordSalt);
        const isValid = usesDigest
            ? await verifyPassword(password, result)
            : result.password === password;

        if (!isValid) {
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
