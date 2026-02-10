import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const COOKIE_NAME = "restaurantcards_pin";
const TOKEN_TTL_MS = 1000 * 60 * 15;

const json = (payload: Record<string, unknown>, status: number) =>
    NextResponse.json(payload, { status });

export function sign(value: string, secret: string) {
    return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

export function makeToken(secret: string) {
    const issuedAt = Date.now();
    const nonce = crypto.randomBytes(16).toString("base64url");
    const payload = `${issuedAt}.${nonce}`;
    const sig = sign(payload, secret);
    return `${payload}.${sig}`;
}

export function verifyToken(token: string, secret: string) {
    const parts = token.split(".");
    if (parts.length !== 3) return false;

    const [issuedAtStr, nonce, sig] = parts;
    if (!issuedAtStr || !nonce || !sig) return false;

    const payload = `${issuedAtStr}.${nonce}`;
    const expected = sign(payload, secret);

    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    if (!crypto.timingSafeEqual(a, b)) return false;

    const issuedAt = Number(issuedAtStr);
    if (!Number.isFinite(issuedAt)) return false;
    if (Date.now() - issuedAt > TOKEN_TTL_MS) return false;

    return true;
}

export function buildSetCookie(value: string) {
    const parts = [
        `${COOKIE_NAME}=${value}`,
        "Path=/",
        "HttpOnly",
        "SameSite=Lax",
    ];

    if (process.env.NODE_ENV === "production") parts.push("Secure");

    return parts.join("; ");
}

function buildClearCookie() {
    const parts = [
        `${COOKIE_NAME}=`,
        "Max-Age=0",
        "Path=/",
        "HttpOnly",
        "SameSite=Lax",
    ];

    if (process.env.NODE_ENV === "production") parts.push("Secure");

    return parts.join("; ");
}

export async function POST(request: NextRequest): Promise<Response> {
    const hash = process.env.PIN_HASH;
    const secret = process.env.PIN_COOKIE_SECRET;

    if (!hash) return json({ ok: false, error: "PIN_HASH not configured." }, 500);
    if (!secret) {
        return json({ ok: false, error: "PIN_COOKIE_SECRET not configured." }, 500);
    }

    let pin = "";
    try {
        const body = await request.json();
        if (typeof body?.pin === "string") pin = body.pin.trim();
    } catch {
        return json({ ok: false, error: "Invalid JSON payload." }, 400);
    }

    if (!pin) return json({ ok: false, error: "PIN is required." }, 400);

    const matches = await bcrypt.compare(pin, hash);
    if (!matches) {
        return json({ ok: false, error: "Invalid PIN." }, 401);
    }

    const token = makeToken(secret);

    const res = json({ ok: true }, 200);
    res.headers.set("Set-Cookie", buildSetCookie(token));
    return res;
}

export async function GET(request: NextRequest): Promise<Response> {
    const secret = process.env.PIN_COOKIE_SECRET;
    if (!secret) return json({ ok: false }, 500);

    const cookieHeader = request.headers.get("cookie") ?? "";
    const token = cookieHeader
        .split(";")
        .map((c) => c.trim())
        .find((c) => c.startsWith(`${COOKIE_NAME}=`))
        ?.slice(`${COOKIE_NAME}=`.length);

    if (!token) return json({ ok: false }, 401);

    const ok = verifyToken(token, secret);
    if (!ok) return json({ ok: false }, 401);

    return json({ ok: true }, 200);
}

export async function DELETE(): Promise<Response> {
    const res = json({ ok: true }, 200);
    res.headers.set("Set-Cookie", buildClearCookie());
    return res;
}
