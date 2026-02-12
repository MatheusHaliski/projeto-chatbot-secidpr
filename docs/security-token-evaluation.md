# Security Evaluation: Session/Auth Token Forgery and Unprotected Auth Endpoints

## Scope reviewed
- Session token creation/verification and cookie behavior.
- Login/token-issuing endpoints.
- Restaurant Cards access control path.

## Findings

### 1) Session cookie tokens are cryptographically signed and not trivially forgeable
`restaurantcards_session` is generated as `base64url(payload).HMAC_SHA256_signature`, validated with `timingSafeEqual`, and rejected when expired.

Implication:
- If `PIN_COOKIE_SECRET` stays secret and strong, direct offline forgery of a valid session cookie is not practical.

Caveat:
- A leaked/weak secret would allow full token forgery.

### 2) There is an unprotected token-issuing path (`POST /api/auth/verify`)
The login endpoint imports `verifyAllowedGoogleIdentity` but does not call it. It accepts email/password directly and issues a fresh server session cookie on success.

Implication:
- Anyone with valid credentials can obtain `restaurantcards_session` without the Google+PIN identity gate.
- This weakens the intended defense model, because the token is secure cryptographically but can still be obtained through a less-protected flow.

### 3) Public signup allows arbitrary account creation with plaintext password storage
`POST /api/signup` has no auth gate and stores `password` directly in `VSusercontrol`.

Implication:
- An attacker can self-register, then authenticate via `/api/auth/verify`, and receive a valid session cookie.
- This effectively means access to protected restaurant endpoints depends on possession of *any* app account, not on the stricter Google+PIN gate.

### 4) Client-side dev gate token is forgeable by design
`devAuthToken` is stored in localStorage and can be set by a user locally. It is used for client routing UX, not server authorization.

Implication:
- It should be treated as convenience state only.
- It does not protect backend resources.

## Direct answers to the questions

### "Can the tokens be forgeable?"
- **Cryptographic session token forgery:** not easily, assuming secret hygiene is good.
- **Practical bypass to obtain real tokens:** yes, through current auth flows (not by HMAC cracking).

### "Is there still an unprotected endpoint that can provide tokens/authentication?"
- **Yes.** `POST /api/auth/verify` issues auth session cookies and does not enforce Google identity verification.
- **Also yes (indirectly).** `POST /api/signup` is open, enabling account creation that can then be used to obtain session cookies.

## Risk level
- **Token cryptography:** Medium-High quality.
- **Authentication flow security:** Medium-Low due to bypassable issuance path.
- **Overall effective protection for `/restaurantcardspage` backend data:** Moderate at best; stronger than no auth, weaker than intended 2-step gate.

## Recommended priority fixes
1. Enforce allowed Google identity (or a proper auth policy) inside `/api/auth/verify` before issuing sessions.
2. Restrict or harden `/api/signup` (invite-only/admin-approval/verified email + anti-abuse).
3. Remove plaintext password fallback and migrate all users to hashed+salted records only.
4. Keep/expand rate limits and add account lockout/CAPTCHA on suspicious behavior.
5. Rotate secrets and set incident response for suspected secret leakage.
