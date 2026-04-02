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

### Vercel + GitHub failure pattern (current known)
If deployment status is `Error` and build logs show:
- `Missing Supabase public environment variables`

Then the project is missing at least one of:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

For server route execution, also verify:
- `SUPABASE_SERVICE_ROLE_KEY`

Quick check with Vercel CLI:
```bash
vercel env ls
```

Add missing values:
```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
```

If using internal DSG core mode in the same repo:
- leave `DSG_CORE_URL` unset, or set `DSG_CORE_MODE=internal`

Then redeploy from the latest GitHub commit:
```bash
vercel --prod
```

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

## 7) Login/Magic-Link troubleshooting (`/login?error=unexpected`)
When users are redirected back to login with an unexpected auth error, validate this sequence in order:

1. **Vercel env vars are complete**
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
2. **Supabase migrations are applied on the same project**
   - `supabase db push --linked` (or equivalent SQL execution in order)
3. **Supabase Email provider is enabled**
   - Authentication → Providers → Email
4. **Supabase URL configuration matches production**
   - Site URL: `https://<your-production-domain>`
   - Redirect URL includes: `https://<your-production-domain>/auth/confirm`
5. **Redeploy Vercel after changes**
   - `vercel --prod`

If these values are incorrect, `createClient()` / admin client initialization can fail and trigger a fallback redirect to `/login?error=unexpected`.

## Roll-forward criteria
- All checks pass without elevated error rate.
- Core monitor remains stable with `readiness_status: "ready"`.
