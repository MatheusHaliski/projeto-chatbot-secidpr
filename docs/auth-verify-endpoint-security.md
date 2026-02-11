# Securing `POST /api/auth/verify`

This document describes practical protections for the login verification endpoint and maps them to your current implementation in `app/api/auth/verify/route.ts`.

## Current state (what is already good)

- Requires an allowed Google identity before processing credentials via `verifyAllowedGoogleIdentity(request)`.
- Uses PBKDF2 (`crypto.pbkdf2`) with salt and iterations for hashed-password records.
- Returns generic credential failure messages (`No account was found with these credentials.`) to reduce account enumeration.
- Creates a server-side session token and sets a cookie after successful auth.

## Gaps to address next

1. **No explicit brute-force/rate-limit control at the endpoint level**.
2. **No lockout/backoff policy per account and per source IP/device**.
3. **String equality comparison is direct (`candidate === digest.passwordHash`) rather than constant-time**.
4. **No explicit anti-automation challenge step after suspicious attempts (CAPTCHA / challenge).**
5. **No dedicated WAF/CDN-level protections documented for DDoS / L7 floods.**

---

## Recommended defense-in-depth model

Think in layers, not one control:

1. **Edge layer (CDN + WAF + bot management)**
   - Put `/api/auth/verify` behind Cloudflare, Fastly, AWS CloudFront+WAF, or Google Cloud Armor.
   - Enable:
     - Managed bot detection.
     - IP reputation / ASN filtering.
     - Geo/risk policy where applicable.
     - Per-path request-rate policies (tight limits specifically on `/api/auth/verify`).
   - This is how large platforms survive volumetric and bot-driven attacks: absorb/drop at the edge before the app origin.

2. **Application rate limits (identity-aware)**
   - Add token-bucket or sliding-window limits keyed by:
     - `ip`
     - `email`
     - `ip+email`
   - Example policy:
     - 10 requests/min per IP
     - 5 failed attempts/15 min per email
     - exponential cooldown after repeated failures
   - Store counters in Redis (preferred) or Firestore with TTL-like expiry semantics.

3. **Progressive friction**
   - After N failures, require CAPTCHA/Turnstile before additional attempts.
   - For high-risk sign-ins, require step-up verification (email OTP, device trust, MFA).

4. **Credential verification hardening**
   - Replace `candidate === digest.passwordHash` with `crypto.timingSafeEqual` on same-length buffers.
   - Keep hash parameters modern and centrally versioned.
   - Consider migration to Argon2id or scrypt for future records.

5. **Session and cookie controls**
   - Ensure session cookies are `HttpOnly`, `Secure`, and `SameSite=Lax` or stricter.
   - Rotate session/token on login.
   - Keep short expiration + refresh strategy.

6. **Abuse visibility and incident response**
   - Log structured security events (failed login, limit hit, challenge required, lockout).
   - Add alerts on spikes and anomaly ratios (failed/success login ratio, unique-IP bursts).
   - Maintain dashboards per path and per country/ASN.

---

## What “real social media” platforms (e.g., Facebook-scale) typically do

Large social platforms do not rely on a single “login API check.” They combine:

- **Massive edge DDoS mitigation** (anycast CDNs, scrubbing centers, connection-level controls).
- **Layer-7 bot defense** (behavioral models, fingerprinting, risk scoring).
- **Dynamic throttling** (real-time policies adjusted by attack telemetry).
- **Risk-based auth** (device reputation, geo-velocity checks, impossible travel, MFA prompts).
- **Credential stuffing detection** (known leaked password and spray-pattern detection).
- **Internal account protection systems** (automated lockouts, challenge escalation).

For your project size, emulate the same architecture pattern with managed services rather than custom-building everything.

---

## Concrete implementation plan for this repo

1. **Put `/api/auth/verify` behind a WAF/CDN rule**
   - Create a specific protected route policy for `POST /api/auth/verify`.

2. **Add Redis-backed login limiter service**
   - New helper module, e.g. `app/lib/security/loginRateLimit.ts`.
   - Enforce per-IP and per-email windows before DB lookup.

3. **Add lockout metadata to user record (or separate security collection)**
   - Track `failedAttempts`, `lastFailedAt`, `lockedUntil`.
   - Deny attempts while `lockedUntil > now`.

4. **Use constant-time compare in password verification path**
   - Compare decoded hash buffers with `crypto.timingSafeEqual`.

5. **Challenge escalation**
   - Require CAPTCHA token after threshold and verify server-side.

6. **Observability**
   - Emit structured logs for all deny reasons and security outcomes.

---

## Minimal baseline policy you can ship quickly

- WAF rule for `/api/auth/verify`
- 10 req/min/IP hard cap
- 5 failed attempts/15 min/email soft lock
- CAPTCHA after 3 consecutive failures
- 15-minute account lock after 10 failures
- Constant-time password hash comparison
- Security alert when failed:success ratio > 10:1 over 5 minutes

This baseline dramatically improves resilience against brute force, credential stuffing, and moderate bot floods.
