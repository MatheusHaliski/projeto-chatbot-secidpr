import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

export const AUTH_COOKIE_NAME = "restaurantcards_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 12;

type SessionClaims = {
    sub: string;
    email: string;
    iat: number;
    exp: number;
    nonce: string;
};

const getSecret = (): string => {
    const secret = process.env.PIN_COOKIE_SECRET;
    if (!secret) {
        throw new Error("AUTH_SESSION_SECRET is not configured.");
    }
    return secret;
};

const toBase64Url = (value: string) => Buffer.from(value, "utf8").toString("base64url");
const fromBase64Url = (value: string) => Buffer.from(value, "base64url").toString("utf8");

const sign = (payload: string, secret: string): string =>
    crypto.createHmac("sha256", secret).update(payload).digest("base64url");

export const createSessionToken = (params: { sub: string; email: string }): string => {
    const now = Date.now();
    const claims: SessionClaims = {
        sub: params.sub,
        email: params.email,
        iat: now,
        exp: now + SESSION_TTL_MS,
        nonce: crypto.randomBytes(16).toString("base64url"),
    };
    const payload = toBase64Url(JSON.stringify(claims));
    const signature = sign(payload, getSecret());
    return `${payload}.${signature}`;
};

export const verifySessionToken = (token: string): SessionClaims | null => {
    const [payload, signature] = token.split(".");
    if (!payload || !signature) return null;

    const expected = sign(payload, getSecret());
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);

    if (a.length !== b.length) return null;
    if (!crypto.timingSafeEqual(a, b)) return null;

    try {
        const claims = JSON.parse(fromBase64Url(payload)) as SessionClaims;
        if (!claims?.sub || !claims?.email || !claims?.exp) return null;
        if (claims.exp <= Date.now()) return null;
        return claims;
    } catch {
        return null;
    }
};

export const readSession = (request: NextRequest): SessionClaims | null => {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return null;
    return verifySessionToken(token);
};

export const requireSession = (request: NextRequest): SessionClaims | null =>
    readSession(request);

export const setSessionCookie = (response: NextResponse, token: string): void => {
    response.cookies.set({
        name: AUTH_COOKIE_NAME,
        value: token,
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: SESSION_TTL_MS / 1000,
    });
};

export const clearSessionCookie = (response: NextResponse): void => {
    response.cookies.set({
        name: AUTH_COOKIE_NAME,
        value: "",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 0,
    });
};

