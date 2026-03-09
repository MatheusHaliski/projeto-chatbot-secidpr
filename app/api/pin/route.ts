import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { consumeRateLimit, resolveClientIp } from "@/app/lib/security/basicRateLimit";
import { getAuth } from "firebase-admin/auth";
import {getAdminFirestore} from "@/app/lib/firebaseAdmin";

const COOKIE_NAME = "restaurantcards_pin";
const TOKEN_TTL_MS = 1000 * 60 * 15;
const ALLOWED_GOOGLE_EMAIL = "matheushaliski@gmail.com";
const PIN_VERIFY_LIMIT_MAX = Number(process.env.PIN_VERIFY_RATE_LIMIT_MAX ?? "6");
const PIN_VERIFY_LIMIT_WINDOW_MS = Number(
    process.env.PIN_VERIFY_RATE_LIMIT_WINDOW_MS ?? "60000"
);
const json = (payload: Record<string, unknown>, status: number) =>
    NextResponse.json(payload, { status });


// HMAC assinatura
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

  return true;
}
const verifyAllowedGoogleIdentity = async (
    request: NextRequest
): Promise<{ ok: true; email: string } | { ok: false; response: Response }> => {
    const authorization = request.headers.get("authorization") ?? "";
    const bearerPrefix = "Bearer ";

    if (!authorization.startsWith(bearerPrefix)) {
        return {
            ok: false,
            response: json(
                { error: "Missing Firebase auth token." },
                401
            ),
        };
    }

    const idToken = authorization.slice(bearerPrefix.length).trim();
    if (!idToken) {
        return {
            ok: false,
            response: json(
                { error: "Missing Firebase auth token." },
                401
            ),
        };
    }

    try {
        getAdminFirestore();
        const decoded = await getAuth().verifyIdToken(idToken);
        const email = decoded.email?.toLowerCase() ?? "";

        if (!email) {
            return {
                ok: false,
                response: json({ error: "Unable to verify account email." }, 403),
            };
        }

        if (email !== ALLOWED_GOOGLE_EMAIL) {
            return {
                ok: false,
                response: json(
                    { error: `Only ${ALLOWED_GOOGLE_EMAIL} is allowed.` },
                    403
                ),
            };
        }

        return { ok: true, email };
    } catch (error) {
        console.error("[PIN API] Firebase token verification failed:", error);
        const message = error instanceof Error ? error.message : "Unknown error";
        return {
            ok: false,
            response: json({ error: `Invalid Firebase auth token. ${message}` }, 401),
        };
    }
};
// Monta header Set-Cookie
export function buildSetCookie(value: string) {
  const parts = [
    `${COOKIE_NAME}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
  ];

  // Só use Secure em HTTPS (produção)
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
    const identity = await verifyAllowedGoogleIdentity(request);
    if (!identity.ok) {
        return identity.response;
    }
    const hash = "$2a$12$uyqScQMO6BwwjGmF9y2Xp.Tit5D/KldHFkY6ufZ7Q1o39GwRyfKWG";
    console.log(hash);
    const secret = process.env.PIN_COOKIE_SECRET;
    console.log(secret);
    // lê PIN do body
    let pin = "";
    try {
      const body = await request.json();
      if (typeof body?.pin === "string") pin = body.pin.trim();
    } catch {
      return json({ ok: false, error: "Invalid JSON payload." }, 400);
    }


    if (!hash) return json({ ok: false, error: "PIN_HASH not configured." }, 500);


    if (!pin) return json({ ok: false, error: "PIN is required." }, 400);
    const clientIp = resolveClientIp(request);
    const rateLimit = consumeRateLimit({
        namespace: "pin-verify",
        key: `${clientIp}:${identity.email}`,
        maxRequests: PIN_VERIFY_LIMIT_MAX,
        windowMs: PIN_VERIFY_LIMIT_WINDOW_MS,
    });

    if (!rateLimit.allowed) {
        const response = json(
            {
                ok: false,
                error: "Too many PIN attempts. Please try again shortly.",
            },
            429
        );
        response.headers.set("Retry-After", String(rateLimit.retryAfterSeconds));
        return response;
    }

    const matches = await bcrypt.compare(pin, hash);
    if (!matches) {
      return json({ ok: false, error: "Invalid PIN." }, 401);
    }
    // cria token e seta cookie via header
    const token = makeToken(String(secret));

    const res = json({ ok: true }, 200);
    res.headers.set("Set-Cookie", buildSetCookie(token));
    return res;
}

export async function GET(request: NextRequest): Promise<Response> {
  const secret = process.env.PIN_COOKIE_SECRET;
  if (!secret) return json({ ok: false }, 500);

  // pega cookie do header
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
