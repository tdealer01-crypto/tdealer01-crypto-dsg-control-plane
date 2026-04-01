# RUNBOOK: Deployment

## Scope
Control Plane deployment on Vercel + dependency readiness checks for DSG Core and Supabase.

## Preconditions
- Access to Vercel project linked to this repository.
- Supabase project credentials and migration privileges.
- DSG Core service deployed and reachable.

## 1) Deploy Control Plane (Vercel)
1. Merge approved changes to `main`.
2. Trigger production deployment in Vercel (or via Git integration).
3. Confirm deployment status is `Ready` in Vercel dashboard.

## 2) Configure environment variables
Set required production values in Vercel project settings using `.env.example` as source of truth:
- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- DSG Core: `DSG_CORE_URL`, `DSG_CORE_API_KEY`
- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_BUSINESS`
- Billing: `OVERAGE_RATE_USD`
- Access control: `ACCESS_MODE` / `ACCESS_POLICY`

## 3) Apply Supabase migrations
Run migrations for the target environment before traffic cutover.
- Verify new migration files are present and executed in order.
- Validate schema changes via application smoke checks.

## 4) Set Stripe Price IDs (Production)
Use the repository helper script to set production Stripe pricing variables in Vercel:

```bash
./set-vercel-stripe-env.sh
```

Confirm all required `STRIPE_PRICE_*` variables exist after script execution.

## 5) Validate DSG Core readiness
After DSG Core deploy, validate monitor endpoint from Control Plane:

```bash
curl -sS "$CONTROL_PLANE_URL/api/core/monitor"
```

Expected readiness contract:
- HTTP 200
- `readiness_status: "ready"`

## 6) Post-deploy smoke checks
- `GET /api/health`
- `GET /api/core/monitor`
- `GET /api/usage`
- Execute one approved runtime intent path (`/api/intent` -> `/api/execute`)

## Roll-forward criteria
- All checks pass without elevated error rate.
- Core monitor remains stable with `readiness_status: "ready"`.
