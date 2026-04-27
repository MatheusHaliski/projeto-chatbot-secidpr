# FriendlyEats Production

## Social media hub planning

- See `docs/social-media-hub-strategy.md` for high-level product and architecture strategy.

## Code engine tasks implemented

- Firestore social hub models for members, customers, conversations, posts, and catalog.
- RBAC helper and member API that applies Firebase Auth custom claims.
- Conversation inbox API with auto-triage intent tagging and SLA due-time calculation.
- Shopify API routes:
  - `app/api/shopify/webhooks/route.ts` (HMAC verification + event persistence)
  - `app/api/shopify/sync/route.ts` (manual/full sync job queue)
  - `app/api/orders/create/route.ts` (checkout initiation + idempotency key)
- Dashboard pages:
  - `/dashboard/inbox`
  - `/dashboard/people`
  - `/dashboard/analytics`
- Firestore rules scaffold for role-scoped access.

## Human team checklist (hands-on)

- Define social content and campaign guidelines.
- Train attendants and managers on triage/escalation/SLA workflows.
- Configure Shopify store, credentials, and webhook subscriptions.
- Establish KPI review cadence and rollout milestones (30/60/90 days).
