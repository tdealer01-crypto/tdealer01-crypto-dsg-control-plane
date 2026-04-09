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

- Supabase:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- App origin:
  - `APP_URL` or `NEXT_PUBLIC_APP_URL`
- DSG Core:
  - `DSG_CORE_MODE`
  - `DSG_CORE_URL` (only when using remote mode)
  - `DSG_CORE_API_KEY` (only when using remote mode)
- Stripe:
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `STRIPE_PRICE_PRO`
  - `STRIPE_PRICE_BUSINESS`
- Billing:
  - `OVERAGE_RATE_USD`
- Access control:
  - `ACCESS_MODE`
  - `ACCESS_POLICY`

### Notes on required env vars
- `APP_URL` or `NEXT_PUBLIC_APP_URL` is required for signup and auth confirmation flows.
- `DSG_CORE_MODE` must be set to either `internal` or `remote`.
- If `DSG_CORE_MODE=internal`, leave `DSG_CORE_URL` unset.
- If `DSG_CORE_MODE=remote`, set both `DSG_CORE_URL` and `DSG_CORE_API_KEY`.

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
vercel env ls production
```

Add missing values:

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add APP_URL production
vercel env add NEXT_PUBLIC_APP_URL production
vercel env add DSG_CORE_MODE production
```

If using internal DSG Core mode in the same repo:
- leave `DSG_CORE_URL` unset
- set `DSG_CORE_MODE=internal`

Then redeploy from the latest GitHub commit:

```bash
vercel --prod
```

### Vercel cron limitation on Hobby plan
If deployment fails with `Hobby accounts are limited to daily cron`, at least one cron schedule is too frequent for Hobby.

- Keep cron expressions at daily cadence (`0 3 * * *`, `15 0 * * *`, etc.).
- If sub-daily cadence is required, move the project to Pro/Enterprise before redeploying.
- This repository keeps cron config in `vercel.json` with a daily schedule to stay Hobby-compatible.

### Deployment canceled before build: `unverified commit`
If Vercel shows:
- `Build Canceled`
- `The Deployment was canceled because it was created with an unverified commit`

this is **not** a build/runtime failure. The deployment is blocked by Vercel Git verification policy before build starts.

Use this checklist:
1. Open the commit on GitHub and confirm it is marked **Verified**.
2. In Vercel: **Project Settings → Git → Require Verified Commits**.
   - If enabled, any unverified commit is auto-canceled.
3. Validate commit identity on the machine/bot that authored the commit:
   - `git config user.name`
   - `git config user.email`
   - ensure email is verified on the linked Git provider account.
4. If commit came from automation (bot/Codex flow), either:
   - create a new commit from an account that can produce verified commits, or
   - temporarily disable `Require Verified Commits` (only with explicit approval).
5. Redeploy only after commit verification is fixed; otherwise cancellation will repeat.

### CLI-first recovery when deployment is canceled
If the unverified commit issue cannot be resolved immediately, use Vercel CLI to deploy directly:

```bash
# 1. Verify CLI access
npx vercel whoami

# 2. Deploy production directly from local files
npx vercel --prod

# 3. Verify deployment
curl -sS https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health

# 4. Check env vars are present
npx vercel env ls production

# 5. Add missing env vars if needed
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
npx vercel env add SUPABASE_SERVICE_ROLE_KEY production
npx vercel env add APP_URL production
npx vercel env add NEXT_PUBLIC_APP_URL production
npx vercel env add DSG_CORE_MODE production

# 6. Redeploy after adding env vars
npx vercel --prod
```

If Vercel CLI is not available or credentials are missing, use Vercel Dashboard:
1. **Project Settings → Git** → disable **Require Verified Commits**
2. **Deployments** → Redeploy latest commit
3. Re-enable **Require Verified Commits** after successful deploy

## 3) Apply Supabase migrations
Run migrations for the target environment before traffic cutover.
- Verify migration files are present and executed in order:

1. `20260323053000_product_loop_scaffold.sql`
2. `20260323054500_product_loop_rls.sql`
3. `20260323110000_billing_checkout_flow.sql`
4. `20260323140000_schema_constraints_hardening.sql`
5. `20260323141000_rls_policy_hardening.sql`
6. `20260330_monitor_stats.sql`
7. `20260331_runtime_spine.sql`
8. `20260331_runtime_spine_rpc.sql`
9. `20260401093000_batch3_enterprise_identity_rollout.sql`
10. `20260401120000_enterprise_access_batch2.sql`
11. `20260401_runtime_rbac.sql`
12. `20260401_schema_policies_table.sql`
13. `20260402_billing_quota_in_rpc.sql`
14. `20260404_runtime_spine_rpc_hardening.sql`

- Validate schema changes via application smoke checks.

Recommended CLI path:

```bash
supabase link --project-ref <PROJECT_REF>
supabase db push
```

If Supabase CLI is not available, execute the SQL files in order in Supabase Dashboard → SQL Editor.

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

### Public smoke check
- `GET /api/health`

### Dependency and monitor checks
- `GET /api/core/monitor`

### Authenticated operator smoke checks
- `GET /api/usage`
- `GET /api/executions`
- Execute one approved runtime intent path (`/api/intent` -> `/api/execute`)

### Notes
- `GET /api/health` is the public probe for baseline availability.
- Do not use `GET /api/usage` as an anonymous/public health check; it is an operator-facing route.
- `/api/execute` is the stable public compatibility entry for the current spine execution handler.
- For deep debugging, compare behavior with the underlying spine route only after auth/runtime prerequisites are satisfied.

## 7) Login/Magic-Link troubleshooting (`/login?error=unexpected`)
When users are redirected back to login with an unexpected auth error, validate this sequence in order:

1. **Vercel env vars are complete**
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `APP_URL` or `NEXT_PUBLIC_APP_URL`
   - `DSG_CORE_MODE`
2. **Supabase migrations are applied on the same project**
   - `supabase db push --linked`
3. **Supabase Email provider is enabled**
   - Authentication → Providers → Email
4. **Supabase URL configuration matches production**
   - Site URL: `https://tdealer01-crypto-dsg-control-plane.vercel.app`
   - Redirect URL includes: `https://tdealer01-crypto-dsg-control-plane.vercel.app/auth/confirm`
5. **Redeploy Vercel after changes**
   - `vercel --prod`

If these values are incorrect, `createClient()` / admin client initialization can fail and trigger a fallback redirect to `/login?error=unexpected`.

## Roll-forward criteria
- All checks pass without elevated error rate.
- Core monitor remains stable with `readiness_status: "ready"`.
