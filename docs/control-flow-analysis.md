# Control-flow analysis of FOR and IF structures

This document catalogs **all `for` and `if` statements** found in the project source code (`.js`, `.ts`, `.tsx`, `.mjs`, `.cjs`, `.jsx`, excluding `node_modules` and `.next`) and explains their syntax variations in JavaScript/TypeScript.

## 1) Executive summary

- Total `for` statements: **2**.
  - `for...of`: **2**
  - `for...in`: **0**
  - Classic `for (init; condition; increment)`: **0**
- Total `if` statements: **229**.
  - `if`: **229**
  - `else if`: **0**
  - Guard-clause one-liners (`if (...) return ...`): **77**

## 2) FOR structures found in this codebase

### Variation observed

- The codebase currently uses only **`for...of`** loops.
- No `for...in` and no classic C-style `for` loops were found.
- Practical implication: iteration is focused on arrays/lists of rule objects, improving readability and avoiding index math.

### JavaScript/TypeScript syntax notes for `for`

- `for...of` iterates over **values** of iterable objects (arrays, strings, maps, sets).
- `for...in` iterates over **enumerable keys** (mostly object keys) and is less common for arrays.
- `for (init; condition; step)` is useful for indexed iteration and manual control of loop counters.
- In TypeScript, all these forms are JavaScript-compatible; TypeScript adds type-checking for loop variables and iterables.

### Complete FOR inventory

- `app/gate/categories.js:201` — `for...of` — `for (const rule of LOT_REGEX_RULES) {`
- `app/gate/categories.js:268` — `for...of` — `for (const rule of CATEGORY_ICON_RULES) {`

## 3) IF structures found in this codebase

### Variation observed

- The project heavily uses **simple `if` statements** for validation, authentication checks, null/undefined guards, and API error handling.
- No explicit `else if (...)` tokens were found as standalone lines in the scan; branching is usually implemented as:
  - sequential guard clauses (`if (...) return ...`), or
  - independent `if` blocks.
- This style favors early exits and reduced nesting depth.

### JavaScript/TypeScript syntax notes for `if`

- Base form: `if (condition) { ... }` where `condition` is coerced to boolean.
- Extended forms: `if (...) { ... } else { ... }` and `if (...) { ... } else if (...) { ... }` chains.
- Guard clause form: `if (!value) return;` is common in React hooks and API routes to stop invalid flows early.
- In TypeScript, `if` can narrow union types (e.g., checking `typeof x === "string"` narrows `x` inside the block).

### Related JavaScript/TypeScript language resources used with conditions

- `logical OR ||` occurrences: **55**
- `optional chaining ?.` occurrences: **54**
- `nullish coalescing ??` occurrences: **52**
- `logical AND &&` occurrences: **34**
- `ternary ? :` occurrences: **47**
- These operators complement `if` by enabling concise conditional expressions and safe property access.

### Complete IF inventory by file

#### `app/api/auth/reset/route.ts`
- `19` — `if` (block) — `if (!apiKey || !fromEmail) {`
- `42` — `if` (block) — `if (!response.ok) {`
- `59` — `if` (block) — `if (!email) {`
- `74` — `if` (block) — `if (existingSnapshot.empty) {`

#### `app/api/auth/session/route.ts`
- `11` — `if` (block) — `if (!session) {`

#### `app/api/auth/verify/route.ts`
- `40` — `if` (block) — `if (error) {`
- `53` — `if` (block) — `if (`
- `83` — `if` (block) — `if (!email || !password) {`
- `102` — `if` (block) — `if (!record) {`
- `114` — `if` (block) — `if (!isValid) {`

#### `app/api/authview/route.ts`
- `42` — `if` (block) — `if (error) {`
- `55` — `if` (block) — `if (`
- `85` — `if` (block) — `if (!email || !password) {`
- `104` — `if` (block) — `if (!result) {`
- `116` — `if` (block) — `if (!isValid) {`

#### `app/api/pin/route.ts`
- `27` — `if` (guard clause) — `if (parts.length !== 3) return false;`
- `30` — `if` (guard clause) — `if (!issuedAtStr || !nonce || !sig) return false;`
- `37` — `if` (guard clause) — `if (a.length !== b.length) return false;`
- `38` — `if` (block) — `if (!crypto.timingSafeEqual(a, b)) return false;`
- `41` — `if` (block) — `if (!Number.isFinite(issuedAt)) return false;`
- `56` — `if` (block) — `if (process.env.NODE_ENV === "production") parts.push("Secure");`
- `70` — `if` (block) — `if (process.env.NODE_ENV === "production") parts.push("Secure");`
- `86` — `if` (block) — `if (typeof body?.pin === "string") pin = body.pin.trim();`
- `92` — `if` (guard clause) — `if (!hash) return json({ ok: false, error: "PIN_HASH not configured." }, 500);`
- `95` — `if` (guard clause) — `if (!pin) return json({ ok: false, error: "PIN is required." }, 400);`
- `98` — `if` (block) — `if (!matches) {`
- `111` — `if` (guard clause) — `if (!secret) return json({ ok: false }, 500);`
- `121` — `if` (guard clause) — `if (!token) return json({ ok: false }, 401);`
- `124` — `if` (guard clause) — `if (!ok) return json({ ok: false }, 401);`

#### `app/api/restaurants/[id]/reviews/route.ts`
- `22` — `if` (block) — `if (!id) {`
- `38` — `if` (block) — `if (!text) {`
- `45` — `if` (block) — `if (ratingValue < 0 || ratingValue > 5) {`

#### `app/api/restaurants/byIds/route.ts`
- `17` — `if` (block) — `if (!ids.length) {`

#### `app/api/restaurants/route.ts`
- `20` — `if` (block) — `if (cursor) {`

#### `app/api/signup/route.ts`
- `39` — `if` (block) — `if (error) {`
- `57` — `if` (block) — `if (!parsed.success) {`
- `74` — `if` (block) — `if (!existingSnapshot.empty) {`
- `87` — `if` (block) — `if (!existingNameSnapshot.empty) {`

#### `app/auth.ts`
- `16` — `if` (block) — `if (!firebaseApp || !hasFirebaseConfig) {`
- `26` — `if` (guard clause) — `if (!firebaseApp || !hasFirebaseConfig) return;`

#### `app/authview/AuthAdapter.tsx`
- `13` — `if` (guard clause) — `if (!user) return null;`
- `38` — `if` (guard clause) — `if (name) return name;`
- `40` — `if` (guard clause) — `if (email) return email;`

#### `app/authview/AuthViewClient.tsx`
- `22` — `if` (block) — `if (!t) {`
- `29` — `if` (guard clause) — `if (pathname !== "/authview") return;`
- `34` — `if` (guard clause) — `if (submitting) return;`
- `40` — `if` (block) — `if (!normalizedEmail || !normalizedPassword) {`
- `60` — `if` (block) — `if (!response.ok) {`
- `91` — `if` (block) — `if (!devsessiontoken) {`

#### `app/components/ui/form.tsx`
- `49` — `if` (block) — `if (!fieldContext) {`
- `154` — `if` (block) — `if (!body) {`

#### `app/forgetpasswordview/page.tsx`
- `16` — `if` (guard clause) — `if (submitting) return;`
- `19` — `if` (block) — `if (!normalizedEmail) {`
- `37` — `if` (block) — `if (!response.ok) {`

#### `app/gate/RouterTracker.tsx`
- `8` — `if` (guard clause) — `if (typeof window === "undefined") return "";`
- `18` — `if` (block) — `if (!prevRef.current) {`

#### `app/gate/auth.ts`
- `95` — `if` (block) — `if (typeof window !== "undefined" && auth) {`
- `113` — `if` (block) — `if (!auth) {`
- `132` — `if` (guard clause) — `if (!credential) return "";`
- `135` — `if` (guard clause) — `if (!payload) return "";`
- `158` — `if` (block) — `if (!idToken) {`
- `165` — `if` (block) — `if (!normalizedEmail) {`
- `171` — `if` (block) — `if (normalizedEmail !== ALLOWED_GOOGLE_EMAIL) {`
- `192` — `if` (block) — `if (pinLocked) {`
- `198` — `if` (block) — `if (!normalized) {`
- `215` — `if` (block) — `if (!res.ok) {`
- `235` — `if` (block) — `if (!clientId) {`
- `241` — `if` (block) — `if (!window.google?.accounts?.id) {`
- `257` — `if` (block) — `if (window.google?.accounts?.id) {`

#### `app/gate/categories.js`
- `202` — `if` (block) — `if (rule.patterns.some((pattern) => pattern.test(normalized))) {`
- `210` — `if` (guard clause) — `if (!token) return "";`
- `212` — `if` (guard clause) — `if (!t) return "";`
- `213` — `if` (block) — `if (t === t.toUpperCase()) return t;`
- `220` — `if` (guard clause) — `if (!raw) return "";`
- `223` — `if` (block) — `if (FOOD_CATEGORIES.includes(raw)) return raw;`
- `226` — `if` (block) — `if (raw.includes("_")) {`
- `234` — `if` (block) — `if (last && CATEGORY_SUFFIXES.has(last)) tokens.pop();`
- `240` — `if` (block) — `if (FOOD_CATEGORIES.includes(mapped)) return mapped;`
- `244` — `if` (block) — `if (FOOD_CATEGORIES.includes(mappedRaw)) return mappedRaw;`
- `251` — `if` (block) — `if (FOOD_CATEGORIES.includes(mapped)) return mapped;`
- `255` — `if` (block) — `if (r.includes("restaurant") || r.includes("restaurante")) return "Brazilian";`
- `269` — `if` (block) — `if (rule.keywords.some((k) => lotNorm.includes(norm(k)))) return rule.icon;`

#### `app/gate/devauthgate.tsx`
- `32` — `if` (guard clause) — `if (pathname !== "/") return;`
- `40` — `if` (guard clause) — `if (typeof window === "undefined") return;`
- `43` — `if` (guard clause) — `if (!g?.accounts?.id) return; // script ainda não carregou`
- `56` — `if` (guard clause) — `if (!googleAuthed || !pinVerified) return;`
- `58` — `if` (block) — `if (existing) {`
- `69` — `if` (block) — `if (existing && pinVerified) {`

#### `app/gate/firebaseClient.ts`
- `12` — `if` (block) — `if (typeof window === "undefined") {`

#### `app/gate/getDb.ts`
- `10` — `if` (guard clause) — `if (typeof window === "undefined") return null;`
- `12` — `if` (guard clause) — `if (_db) return _db;`
- `15` — `if` (guard clause) — `if (!firebaseApp || !hasFirebaseConfig) return null;`
- `22` — `if` (block) — `if (!db) {`

#### `app/gate/restaurantgate.tsx`
- `4` — `if` (block) — `if (typeof rating === "number" && !Number.isNaN(rating)) return rating;`
- `5` — `if` (block) — `if (typeof rating === "string") {`
- `8` — `if` (block) — `if (match) {`

#### `app/gate/restaurantpagegate.tsx`
- `61` — `if` (block) — `if (sourceAddress && NEW_YORK_ADDRESS_REGEX.test(sourceAddress)) {`
- `80` — `if` (block) — `if (Array.isArray(restaurant.categories)) {`
- `86` — `if` (block) — `if (typeof restaurant.categories === "string") {`
- `93` — `if` (block) — `if (restaurant.category) {`
- `122` — `if` (guard clause) — `if (!fallbackApplied) return null;`
- `123` — `if` (block) — `if (hasSandwichCategory(restaurant)) return "/fallbacksandwich.png";`
- `124` — `if` (block) — `if (hasCafeCategory(restaurant)) return "/fallbackcafe.png";`
- `132` — `if` (block) — `if (typeof rating === "number" && !Number.isNaN(rating)) return rating;`
- `134` — `if` (block) — `if (typeof rating === "string") {`
- `137` — `if` (block) — `if (match) {`
- `182` — `if` (guard clause) — `if (!countryName) return null;`

#### `app/gate/restaurantsRepo.ts`
- `8` — `if` (block) — `if (!db) throw new Error("Firestore is not configured.");`

#### `app/lib/SafeStorage.ts`
- `2` — `if` (guard clause) — `if (typeof window === "undefined") return null;`
- `11` — `if` (guard clause) — `if (typeof window === "undefined") return;`
- `18` — `if` (guard clause) — `if (typeof window === "undefined") return;`

#### `app/lib/authAlerts.ts`
- `64` — `if` (block) — `if (result.isConfirmed) {`
- `65` — `if` (block) — `if (isLast) break;`

#### `app/lib/authSession.ts`
- `13` — `if` (guard clause) — `if (!raw) return null;`
- `16` — `if` (guard clause) — `if (!parsed?.token || typeof parsed.expiresAt !== "number") return null;`
- `29` — `if` (guard clause) — `if (!parsed) return "";`
- `30` — `if` (block) — `if (parsed.expiresAt <= Date.now()) {`
- `52` — `if` (guard clause) — `if (!raw) return {};`

#### `app/lib/clientSession.ts`
- `12` — `if` (guard clause) — `if (!response.ok) return null;`
- `17` — `if` (guard clause) — `if (!payload.ok) return null;`

#### `app/lib/devSession.ts`
- `12` — `if` (guard clause) — `if (!raw) return null;`
- `15` — `if` (guard clause) — `if (!parsed?.token || typeof parsed.expiresAt !== "number") return null;`
- `24` — `if` (guard clause) — `if (!parsed) return "";`
- `25` — `if` (block) — `if (parsed.expiresAt <= Date.now()) {`

#### `app/lib/firebaseAdmin.ts`
- `7` — `if` (guard clause) — `if (firestoreInstance) return firestoreInstance;`
- `16` — `if` (block) — `if (!projectId || !clientEmail || !privateKey) {`
- `20` — `if` (block) — `if (!getApps().length) {`

#### `app/lib/passwordCrypto.ts`
- `77` — `if` (block) — `if (`

#### `app/lib/security/basicRateLimit.ts`
- `19` — `if` (block) — `if (!scopedGlobal[STORAGE_KEY]) {`
- `28` — `if` (block) — `if (forwardedFor) {`
- `30` — `if` (guard clause) — `if (first) return first;`
- `34` — `if` (guard clause) — `if (realIp) return realIp;`
- `57` — `if` (block) — `if (!existing || existing.resetAt <= now) {`
- `66` — `if` (block) — `if (existing.count >= safeMaxRequests) {`

#### `app/lib/serverSession.ts`
- `17` — `if` (block) — `if (!secret) {`
- `45` — `if` (guard clause) — `if (!payload || !signature) return null;`
- `51` — `if` (guard clause) — `if (a.length !== b.length) return null;`
- `52` — `if` (block) — `if (!crypto.timingSafeEqual(a, b)) return null;`
- `56` — `if` (guard clause) — `if (!claims?.sub || !claims?.email || !claims?.exp) return null;`
- `57` — `if` (block) — `if (claims.exp <= Date.now()) return null;`
- `66` — `if` (guard clause) — `if (!token) return null;`

#### `app/lib/useSessionReady.ts`
- `15` — `if` (block) — `if (!existing) {`

#### `app/restaurantcardspage/RestaurantCardsInner.tsx`
- `62` — `if` (block) — `if (!response.ok) {`
- `71` — `if` (block) — `if (!response.ok) {`
- `83` — `if` (block) — `if (!response.ok) {`
- `124` — `if` (block) — `if (selectedCategory === "japanese") {`
- `133` — `if` (block) — `if (selectedCategory === "bakery/cafe") {`
- `142` — `if` (block) — `if (selectedCategory === "fast food") {`
- `151` — `if` (block) — `if (selectedCategory === "desserts") {`
- `160` — `if` (block) — `if (selectedCategory === "italian/pizza") {`
- `169` — `if` (block) — `if (selectedCategory === "chicken shop") {`
- `178` — `if` (block) — `if (selectedCategory === "mexican") {`
- `187` — `if` (block) — `if (selectedCategory === "arabic") {`
- `274` — `if` (block) — `if (!t1) {`
- `285` — `if` (guard clause) — `if (!firebaseApp) return undefined;`
- `298` — `if` (guard clause) — `if (typeof window === "undefined") return;`
- `300` — `if` (guard clause) — `if (event.key !== "restaurantcards_auth_profile") return;`
- `310` — `if` (block) — `if (!firebaseApp) {`
- `337` — `if` (guard clause) — `if (!isMounted) return;`
- `341` — `if` (block) — `if (isMounted) setError("Failed to load restaurants.");`
- `343` — `if` (block) — `if (isMounted) setLoading(false);`
- `355` — `if` (block) — `if (currentPage < totalPages) {`
- `366` — `if` (block) — `if (items.length) {`
- `374` — `if` (block) — `if (items.length !== missingIds.length) {`
- `377` — `if` (block) — `if (missing.length) {`
- `396` — `if` (guard clause) — `if (!missingIds.length) return;`
- `403` — `if` (block) — `if (items.length) {`
- `412` — `if` (block) — `if (items.length !== missingIds.length) {`
- `415` — `if` (block) — `if (missing.length) {`
- `432` — `if` (guard clause) — `if (!pageIds.length) return;`
- `437` — `if` (guard clause) — `if (!missingIds.length) return;`
- `442` — `if` (guard clause) — `if (!isMounted) return;`
- `456` — `if` (block) — `if (pagedRestaurants.length === 0) {`
- `482` — `if` (guard clause) — `if (!candidate) return;`
- `487` — `if` (guard clause) — `if (!isMounted) return;`
- `490` — `if` (block) — `if (preloadUrls.length) {`
- `511` — `if` (guard clause) — `if (country && r.country !== country) return;`
- `512` — `if` (block) — `if (r.state) options.add(r.state);`
- `520` — `if` (guard clause) — `if (country && r.country !== country) return;`
- `521` — `if` (guard clause) — `if (stateValue && r.state !== stateValue) return;`
- `522` — `if` (block) — `if (r.city) options.add(r.city);`
- `533` — `if` (guard clause) — `if (!normalized) return;`
- `535` — `if` (block) — `if (seen.has(key)) return;`
- `563` — `if` (block) — `if (loading || error || filteredIds.length === 0) {`

#### `app/restaurantcardspage/page.tsx`
- `15` — `if` (block) — `if (!existing) {`
- `22` — `if` (block) — `if (!sessionReady) {`

#### `app/restaurantcardspage/selectelement.tsx`
- `49` — `if` (guard clause) — `if (!q) return options;`
- `57` — `if` (guard clause) — `if (!open) return;`
- `61` — `if` (guard clause) — `if (!el) return;`
- `62` — `if` (block) — `if (e.target instanceof Node && !el.contains(e.target)) setOpen(false);`
- `66` — `if` (block) — `if (e.key === "Escape") setOpen(false);`
- `78` — `if` (guard clause) — `if (!open) return;`

#### `app/restaurantinfopage/[id]/RestaurantInfoFront.tsx`
- `86` — `if` (block) — `if (!existing) {`
- `99` — `if` (guard clause) — `if (!localReviews.length) return null;`
- `146` — `if` (block) — `if (!reviewText.trim()) {`
- `159` — `if` (block) — `if (!profileEmail) {`
- `182` — `if` (block) — `if (!response.ok) {`
- `189` — `if` (block) — `if (!newReview) {`

#### `app/restaurantinfopage/[id]/page.tsx`
- `22` — `if` (block) — `if (!id) {`
- `34` — `if` (block) — `if (!restaurantSnap.exists) {`

#### `app/signupview/SignupForm.tsx`
- `49` — `if` (block) — `if (uniqueMessages.length > 1) {`
- `70` — `if` (block) — `if (!parsed.success) {`
- `74` — `if` (block) — `if (uniqueMessages.length > 1) {`
- `96` — `if` (block) — `if (!response.ok) {`

#### `app/signupview/actions.ts`
- `15` — `if` (block) — `if (!parsed.success) {`

#### `app/useAuthGate.ts`
- `82` — `if` (guard clause) — `if (typeof window === "undefined") return;`
- `84` — `if` (guard clause) — `if (event.key !== SESSION_TOKEN_KEY) return;`
- `87` — `if` (block) — `if (!nextToken) {`
- `116` — `if` (guard clause) — `if (!user) return;`
- `119` — `if` (block) — `if (!sessionToken) {`
- `127` — `if` (guard clause) — `if (!user || !db || !hasFirebaseConfig) return;`
- `134` — `if` (guard clause) — `if (!userId) return;`
- `137` — `if` (guard clause) — `if (!isMounted) return;`
- `139` — `if` (block) — `if (blockedSnap.exists()) {`
- `162` — `if` (block) — `if (isMounted) setCheckingBlocked(false);`
- `173` — `if` (block) — `if (!user || isBlocked) {`
- `185` — `if` (guard clause) — `if (!response.ok) return;`
- `186` — `if` (block) — `if (isMounted) {`
- `193` — `if` (block) — `if (isMounted) setPinCheckReady(true);`
- `211` — `if` (block) — `if (normalizedEmail !== ALLOWED_GOOGLE_EMAIL) {`
- `249` — `if` (guard clause) — `if (!user || !db || !hasFirebaseConfig) return;`
- `252` — `if` (guard clause) — `if (!userId) return;`
- `276` — `if` (block) — `if (isBlocked || checkingBlocked) {`
- `282` — `if` (block) — `if (!normalizedInput) {`
- `296` — `if` (block) — `if (!response.ok) {`
- `304` — `if` (block) — `if (response.status === 401) {`
- `307` — `if` (block) — `if (nextAttempts >= 3) {`

#### `components/ui/form.tsx`
- `49` — `if` (block) — `if (!fieldContext) {`
- `154` — `if` (block) — `if (!body) {`

