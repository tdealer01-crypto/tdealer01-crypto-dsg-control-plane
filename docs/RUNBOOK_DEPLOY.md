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


### Emergency bypass with GitHub Actions (no Vercel Git integration)
If Git integration keeps canceling deployment before build (for example from `Require Verified Commits`), run the manual workflow:
- **GitHub Actions → `Vercel Production CLI Bypass` → Run workflow**
- Input `ref` must be `main` (workflow guardrail blocks non-main refs for production).
- This workflow deploys with Vercel CLI (`vercel pull` + `vercel build` + `vercel deploy --prebuilt --prod`) and does not depend on Vercel Git checks.

Required GitHub repository secrets:
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

Workflow behavior:
1. Fails fast if required secrets are missing.
2. Deploys the selected `main` ref to production.
3. Runs `/api/health` check automatically and requires `ok: true`.
4. Publishes deployment URL + health endpoint in workflow summary.

After workflow success:
1. Capture `Deployment URL` and `Health endpoint` from the workflow summary for incident log/audit.
2. Verify the production alias points to the new deployment (Vercel dashboard or `vercel ls`).
3. Re-check health endpoint manually:

```bash
curl -fsSL "<deployment-url>/api/health"
```

4. Continue with production gate checks (`Production Readiness Check` / `go-no-go`).

#### One-run closeout checklist (recommended)
Use this when Vercel Git integration keeps returning `CANCELED` before build:
1. Run **Vercel Production CLI Bypass** on `main`.
2. Confirm workflow steps complete: `npm ci` → `vercel pull` → `vercel build --prod` → `vercel deploy --prebuilt --prod`.
3. Confirm workflow health gate is green (`/api/health` contains `ok: true`).
4. Record the summary links (`Deployment URL`, `Health endpoint`) in the ticket/incident.

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

### One-command runtime RPC + PostgREST cache recovery
When `rpc_commit` fails because PostgREST cannot find `public.runtime_commit_execution(...)` in schema cache:

```bash
SUPABASE_DB_URL='postgres://...' ./scripts/apply-runtime-rpc-fix.sh
```

This script:
1. Re-applies `20260402_billing_quota_in_rpc.sql`
2. Re-applies `20260404_runtime_spine_rpc_hardening.sql`
3. Sends `NOTIFY pgrst, 'reload schema'`
4. Verifies `runtime_commit_execution` has the expected argument count (>= 17)

You can also run it via npm script:

```bash
SUPABASE_DB_URL='postgres://...' npm run ops:runtime-rpc-fix
```

For Termux auto-install flow, `scripts/termux-deploy-all-in-one.sh` now prompts for `SUPABASE_DB_URL` and runs this fix automatically when provided.
For CI/non-interactive mode, set `SUPABASE_DB_URL` in environment before running `scripts/termux-deploy-all-in-one.sh` (the script will skip the prompt when `CI=true`).

### Runtime RPC drift recovery (`runtime_commit_execution`)
If runtime requests fail with errors indicating missing/invalid runtime commit RPC behavior, recover with a **safe cutover**:

1. Backup current function definition:

```sql
select pg_get_functiondef(p.oid)
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'runtime_commit_execution';
```

2. Rename the current function to keep rollback path:

```sql
alter function public.runtime_commit_execution(
  text,
  text,
  uuid,
  text,
  text,
  jsonb,
  text,
  jsonb,
  integer,
  jsonb,
  jsonb,
  text,
  jsonb,
  numeric,
  timestamp with time zone,
  integer,
  integer
)
rename to runtime_commit_execution_legacy;
```

3. Recreate `public.runtime_commit_execution` using the canonical SQL in
   `supabase/migrations/20260404_runtime_spine_rpc_hardening.sql`.
   Do not `DROP FUNCTION` on the live signature.

4. Re-apply function privileges:

```sql
revoke all on function public.runtime_commit_execution(
  text,
  text,
  uuid,
  text,
  text,
  jsonb,
  text,
  jsonb,
  integer,
  jsonb,
  jsonb,
  text,
  jsonb,
  numeric,
  timestamptz,
  integer,
  integer
) from public;

grant execute on function public.runtime_commit_execution(
  text,
  text,
  uuid,
  text,
  text,
  jsonb,
  text,
  jsonb,
  integer,
  jsonb,
  jsonb,
  text,
  jsonb,
  numeric,
  timestamptz,
  integer,
  integer
) to service_role;
```

5. Verify end-to-end from deployed API:

```bash
curl -sS -X POST "https://tdealer01-crypto-dsg-control-plane.vercel.app/api/spine/execute" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <redacted_live_key>" \
  -d '{"agent_id":"2ea99317-7348-4457-a384-0a3e5990ada7","action":"scan","input":{},"context":{}}' | jq .
```

Pass criteria:
- Response is not `{"error":"Runtime commit RPC is missing. Apply latest Supabase migrations"}`.
- Response is not `{"error":"Invalid agent_id or API key"}`.
- Successful responses should include runtime lineage fields (`request_id`, `ledger_sequence`, `truth_sequence`).

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

## 8) Live E2E flow (no mocks) against Supabase, then staging rerun
Use this flow when validating end-to-end state transitions through the real finance-governance APIs and database.

### Prerequisites
- Playwright browser installed (`npm run test:e2e:install`).
- Live Supabase env vars available in shell:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
- (Optional) Staging deployment credentials for Vercel CLI.

### Step A: Run live E2E locally against real Supabase
```bash
npm run test:e2e:live
```
This executes `tests/e2e/finance-governance-live-supabase.spec.ts` and verifies UI actions plus Supabase persistence.

### Step B: Deploy to staging
```bash
npx vercel deploy --target=preview
```
Capture the generated staging URL.

### Step C: Re-run the same live E2E against staging
```bash
PLAYWRIGHT_BASE_URL=<staging-url> npm run test:e2e:live
```
When `PLAYWRIGHT_BASE_URL` is set, Playwright uses the staging URL and does not start a local dev server.
