# DSG Control Plane Production Readiness

This document turns the current blueprint into a production rollout plan.

## Current status

The current repository is **not yet production ready**.

Reasons:
- The README explicitly states that the repository currently contains blueprint endpoints and UI for handoff, and that the next milestone is wiring Supabase and Stripe for real persistence and billing.
- The latest Vercel deployment fails during type checking in `app/api/executions/route.ts` because `createClient()` from `lib/supabase/server.ts` is async and is being used without `await`.
- Some API routes currently use the admin Supabase client directly and expose organization-wide data without authenticated user scoping.

## P0 — must fix before any public production deploy

### 1. Fix build failure in `app/api/executions/route.ts`
Current code:

```ts
const supabase = createClient();
const {
  data: { user },
  error: userError,
} = await supabase.auth.getUser();
```

Required fix:

```ts
const supabase = await createClient();
const {
  data: { user },
  error: userError,
} = await supabase.auth.getUser();
```

### 2. Audit every route that calls `createClient()`
Search for any usage of `createClient()` from `lib/supabase/server.ts` and ensure it is awaited.

### 3. Lock down all data-returning API routes
Any route that returns organization data must:
- authenticate the user
- resolve the user profile
- scope every query to `org_id`
- return `401` for unauthenticated requests
- return `403` for inactive or unauthorized users

### 4. Protect admin-only operations
Routes that create agents, list all agents, access billing data, or export audit data must not run off the service-role client without auth and role checks.

### 5. Validate all required environment variables at boot
Required variables must be checked before the app starts:
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_PRO`
- `STRIPE_PRICE_BUSINESS`
- `WORKOS_API_KEY`
- `WORKOS_CLIENT_ID`
- `RESEND_API_KEY`
- `DSG_DEFAULT_POLICY_ID`

The app should fail fast with a clear startup error when any required secret is missing.

## P1 — production hardening

### 6. Add middleware-based auth guard for dashboard routes
Protect these routes with authenticated sessions:
- `/dashboard`
- `/dashboard/agents`
- `/dashboard/executions`
- `/dashboard/policies`
- `/dashboard/billing`
- `/dashboard/audit`

### 7. Add rate limiting and idempotency
For `/api/execute`:
- rate limit per API key and per org
- accept an idempotency key to prevent duplicate writes
- reject replays with a deterministic error response

### 8. Add structured logging and request correlation
Every API route should log:
- request id
- org id
- agent id
- route name
- decision
- latency
- error type

### 9. Add monitoring and alerting
Minimum production monitors:
- `/api/health`
- DSG core reachability
- execution failure rate
- Stripe webhook failures
- Supabase query failures
- Vercel deployment failures

### 10. Add migration-verified database rollout
Before go-live, verify schema for:
- `users`
- `agents`
- `executions`
- `audit_logs`
- `usage_events`
- `usage_counters`
- subscriptions and billing tables

## P2 — product readiness

### 11. Replace placeholder positioning with enterprise-ready product language
Use:
- Control, verify, and audit AI actions before they hit real systems.
- Runtime governance for enterprise AI agents.
- Proof, replay, and ledger-backed audit trails.

### 12. Make dashboard operator-first
The dashboard should lead with:
- Decisions today
- Allow / Stabilize / Block counts
- Active agents
- Average latency
- Replay incidents prevented
- Latest execution stream
- Proof + ledger detail panel

### 13. Add onboarding flow
The minimum usable onboarding path:
1. login
2. create organization
3. create first agent
4. generate API key
5. copy sample request
6. execute test request
7. view proof and ledger entry

## Release gate — required for go-live
The product can only be called production ready when all of the following are true:
- Vercel production deployment is green
- protected routes require auth
- org scoping is enforced server-side
- Stripe billing is wired and tested in test mode
- DSG core health checks pass in production
- audit export works
- replay prevention is verified
- error monitoring is live
- dashboard loads without placeholder or mock-only data

## Suggested rollout order
1. Fix build and auth boundary issues
2. Deploy protected staging environment
3. Validate Supabase and Stripe flows end to end
4. Run one internal pilot organization
5. Enable production domain and monitoring
6. Start paid pilot sales
