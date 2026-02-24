# Data model analysis (JavaScript/TypeScript)

This document analyzes **data model elements** in the project, focusing on TypeScript/JavaScript syntax and language resources used to describe payloads, entities, session data, and UI prop models.

## 1) Executive summary

- Type aliases found: **41**
- Interfaces found: **3**
- Runtime schemas (`z.object`) found: **1**
- Static types inferred from schemas (`z.infer`) found: **1**

## 2) Variation of data-model styles in this codebase

### A) Structural models with `type` aliases
- Most models are declared with `type Name = { ... }`, especially for API payloads, response wrappers, and React props.
- This style works well with unions/intersections and utility types.

### B) `interface` usage
- `interface` is used in a few places, mostly for component props and global augmentation (`Window`).
- Compared with `type`, `interface` is extendable and supports declaration merging.

### C) Runtime + static model pairing via Zod
- The project uses a runtime schema (`z.object`) and then derives a static TypeScript type using `z.infer<typeof schema>`.
- This avoids drift between validation logic and compile-time types.

### D) Language resources used in model definitions
- `Record<K, V>` occurrences: **9** (dictionary-like keyed models).
- Intersection (`&`) occurrences: **90** (model composition).
- Union (`|`) occurrences: **171** (variant and nullable modeling).
- Optional property markers (`?:`) occurrences: **90** (partial/optional fields).
- `readonly` occurrences: **0** (immutability constraints where needed).

## 3) JavaScript vs TypeScript perspective

- JavaScript has no native static type declarations, so model shapes are implicit at runtime.
- TypeScript adds compile-time model syntax (`type`, `interface`, unions, intersections, utility types).
- Zod complements this by enforcing model constraints at runtime (input validation), then exporting inferred TS types.

## 4) Inventory of declared model elements

### Interface
- `app/components/ui/button.tsx:30` — `ButtonProps` — `export interface ButtonProps`
- `app/gate/auth.ts:35` — `Window` — `interface Window {`
- `components/ui/button.tsx:30` — `ButtonProps` — `export interface ButtonProps`

### Type Alias
- `app/api/auth/reset/route.ts:7` — `ResetPayload` — `type ResetPayload = {`
- `app/api/auth/verify/route.ts:5` — `AuthPayload` — `type AuthPayload = {`
- `app/api/auth/verify/route.ts:10` — `UserRecord` — `type UserRecord = {`
- `app/api/authview/route.ts:7` — `AuthPayload` — `type AuthPayload = {`
- `app/api/authview/route.ts:12` — `UserRecord` — `type UserRecord = {`
- `app/api/restaurants/[id]/reviews/route.ts:9` — `ReviewPayload` — `type ReviewPayload = {`
- `app/api/restaurants/byIds/route.ts:6` — `ByIdsPayload` — `type ByIdsPayload = {`
- `app/api/signup/route.ts:8` — `SignupPayload` — `type SignupPayload = {`
- `app/authview/AuthAdapter.tsx:3` — `AuthUser` — `export type AuthUser = {`
- `app/components/AuthShell.tsx:3` — `AuthShellProps` — `type AuthShellProps = {`
- `app/components/AuthShell2.tsx:3` — `AuthShellProps` — `type AuthShellProps = {`
- `app/components/ui/form.tsx:65` — `FormItemContextValue` — `type FormItemContextValue = {`
- `app/components/ui/input.tsx:5` — `InputProps` — `export type InputProps = React.InputHTMLAttributes<HTMLInputElement>`
- `app/gate/auth.ts:24` — `GoogleCredentialResponse` — `type GoogleCredentialResponse = {`
- `app/gate/auth.ts:29` — `GoogleIdInitializeConfig` — `type GoogleIdInitializeConfig = {`
- `app/gate/auth.ts:49` — `UseAuthGateReturn` — `type UseAuthGateReturn = {`
- `app/gate/firebaseClient.ts:5` — `FirebaseGate` — `export type FirebaseGate = {`
- `app/gate/restaurantpagegate.tsx:6` — `Restaurant` — `export type Restaurant = {`
- `app/gate/restaurantpagegate.tsx:156` — `FlagAsset` — `export type FlagAsset = { alt: string; src: string };`
- `app/lib/authAlerts.ts:3` — `VSModalPagedProps` — `type VSModalPagedProps = {`
- `app/lib/authSession.ts:7` — `ExpiringToken` — `type ExpiringToken = {`
- `app/lib/authSession.ts:23` — `AuthSessionProfile` — `export type AuthSessionProfile = {`
- `app/lib/clientSession.ts:1` — `SessionProfile` — `export type SessionProfile = {`
- `app/lib/devSession.ts:6` — `ExpiringToken` — `type ExpiringToken = {`
- `app/lib/passwordCrypto.ts:24` — `PasswordDigest` — `export type PasswordDigest = {`
- `app/lib/security/basicRateLimit.ts:1` — `BucketState` — `type BucketState = {`
- `app/lib/security/basicRateLimit.ts:6` — `RateLimitResult` — `type RateLimitResult = {`
- `app/lib/serverSession.ts:7` — `SessionClaims` — `type SessionClaims = {`
- `app/lib/useSessionReady.ts:7` — `GetRedirectPath` — `type GetRedirectPath = () => string | null;`
- `app/restaurantcardspage/RestaurantCardsInner.tsx:52` — `RestaurantsCatalogResponse` — `type RestaurantsCatalogResponse = {`
- `app/restaurantcardspage/RestaurantCardsInner.tsx:56` — `RestaurantsByIdsResponse` — `type RestaurantsByIdsResponse = {`
- `app/restaurantinfopage/[id]/RestaurantInfoFront.tsx:22` — `Review` — `type Review = {`
- `app/restaurantinfopage/[id]/RestaurantInfoFront.tsx:33` — `Restaurant` — `type Restaurant = {`
- `app/restaurantinfopage/[id]/RestaurantInfoFront.tsx:49` — `Props` — `type Props = {`
- `app/restaurantinfopage/[id]/page.tsx:5` — `RestaurantRecord` — `type RestaurantRecord = Record<string, unknown> & { id: string };`
- `app/restaurantinfopage/[id]/page.tsx:7` — `ReviewRecord` — `type ReviewRecord = Record<string, unknown> & { id: string };`
- `app/signupview/actions.ts:5` — `SignupResult` — `export type SignupResult = {`
- `app/signupview/schema.ts:43` — `SignupValues` — `export type SignupValues = z.infer<typeof signupSchema>;`
- `components/AuthShell.tsx:4` — `AuthShellProps` — `type AuthShellProps = {`
- `components/ui/form.tsx:65` — `FormItemContextValue` — `type FormItemContextValue = {`
- `components/ui/input.tsx:5` — `InputProps` — `export type InputProps = React.InputHTMLAttributes<HTMLInputElement>`

### Zod Schema
- `app/signupview/schema.ts:7` — `z.object` — `const signupBaseSchema = z.object({`

### Zod Infer
- `app/signupview/schema.ts:43` — `signupSchema` — `export type SignupValues = z.infer<typeof signupSchema>;`

