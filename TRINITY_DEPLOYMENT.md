# Trinity Revenue System Deployment Guide

Setup for automatic revenue generation from Trinity agent costs.

## Runtime boundary: Render, not Vercel

Production for the control plane runs on **Render**:

```
https://tdealer01-crypto-dsg-control-plane.onrender.com
```

Verified 2026-08-17 — `/api/health`, `/api/readiness`, and `/api/agent/status` all
return HTTP 200 with `db_ok: true` and every readiness check passing.

The Vercel origin still named in some older docs
(`tdealer01-crypto-dsg-control-plane.vercel.app`) returns **HTTP 402
`DEPLOYMENT_DISABLED`** and must not be used for verification or as a cron
target.

The scheduler is **not** a Vercel cron. `.github/workflows/revenue-autopilot.yml`
runs every 10 minutes, authenticates to Render with a GitHub OIDC token, and
calls `/api/cron/revenue-autopilot`, which then fans out to each due job —
including `trinity-revenue-sync`. Moving off Vercel therefore does not affect
scheduling.

## Blocking issue: `CRON_SECRET` is not set on Render

**The revenue autopilot has never executed a job.** Every scheduled run fails:

```
{"ok":false,"error":"cron_secret_required_for_internal_jobs"}
##[error]Revenue autopilot returned HTTP 503
```

OIDC authentication succeeds. The route then aborts because it needs
`CRON_SECRET` to call child jobs (`authorization: Bearer ${cronSecret}` in
`app/api/cron/revenue-autopilot/route.ts`). An unauthenticated probe of the
deployed route returns `{"error":"cron_secret_required"}`, which
`lib/security/cron-auth.ts` emits only when no cron secret is configured at all
— a wrong token would return 401 instead.

Until `CRON_SECRET` is set in the Render service environment, no revenue sync
will run regardless of the rest of this guide. Set it first:

```
Render dashboard -> tdealer01-crypto-dsg-control-plane -> Environment
  CRON_SECRET = <output of: openssl rand -base64 32>
```

Then confirm the next scheduled run of `DSG Revenue Autopilot` returns 200.

`/api/cron/trinity-revenue-sync` currently returns **404** on Render, because
the branch adding it has not been merged to `main` yet. Merging is a
prerequisite for the job to exist at all.

## Deployment Steps

### 1. Deploy Trinity API Service to Render

A blueprint is committed at `trinity-api-service/render.yaml`. Apply it from
the Render dashboard: **New → Blueprint**, select this repo, and set the
blueprint path to `trinity-api-service/render.yaml`.

It provisions only the Trinity service. The control-plane service is
dashboard-managed and is deliberately not declared in that blueprint, so
applying it cannot reconfigure production.

After deployment, record the URL:

```
TRINITY_API_URL=https://trinity-api-service.onrender.com
```

Note the service binds Render's injected `PORT` (falling back to 3001 locally),
and exposes `/health` for Render's health check.

### 2. Generate JWT Token

```bash
# Generate secure JWT token for Trinity authentication
HEADER=$(echo -n '{"alg":"HS256","typ":"JWT"}' | base64)
PAYLOAD=$(echo -n '{"iss":"trinity-dsg","sub":"revenue-sync","aud":"dsg-control-plane","exp":'$(($(date +%s) + 31536000))'}' | base64)
SIGNATURE=$(echo -n "$HEADER.$PAYLOAD" | openssl dgst -sha256 -hmac "your-trinity-secret-key" -binary | base64)
TRINITY_JWT_TOKEN="$HEADER.$PAYLOAD.$SIGNATURE"

echo "Save this token securely:"
echo $TRINITY_JWT_TOKEN
```

### 3. Configure GitHub Secrets

Set these secrets in the repository:

```bash
# Trinity API Configuration
TRINITY_API_URL=https://trinity-api-dsg.onrender.com
TRINITY_JWT_TOKEN=<generated-token>

# Cron Authorization
CRON_SECRET=<generate-strong-random-secret>

# Example (replace with real values):
# CRON_SECRET=$(openssl rand -base64 32)
```

Using GitHub CLI:
```bash
gh secret set TRINITY_API_URL --repo tdealer01-crypto/tdealer01-crypto-dsg-control-plane --body "https://trinity-api-dsg.onrender.com"
gh secret set TRINITY_JWT_TOKEN --repo tdealer01-crypto/tdealer01-crypto-dsg-control-plane --body "<token>"
gh secret set CRON_SECRET --repo tdealer01-crypto/tdealer01-crypto-dsg-control-plane --body "<secret>"
```

### 4. Apply Supabase Migration

Run migration on production database:

```bash
# Using Supabase CLI:
supabase migration up --project-id <project-id>

# Or via Dashboard:
# 1. Go to SQL Editor
# 2. Open supabase/migrations/20260817_trinity_revenue_tables.sql
# 3. Run the migration
```

Verify tables created:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE 'trinity%';
```

Expected tables:
- `trinity_revenue_records`
- `trinity_revenue_agents`
- `trinity_revenue_sync_state`

### 5. Regenerate Database Types

```bash
npx supabase gen types typescript --project-id <project-id> > lib/database.types.ts
npm run typecheck
```

### 6. Verify Cron Endpoint

```bash
# Test with authentication against the Render origin
curl -X GET \
  "https://tdealer01-crypto-dsg-control-plane.onrender.com/api/cron/trinity-revenue-sync?period=24h" \
  -H "Authorization: Bearer $CRON_SECRET"

# Expected response:
# {
#   "ok": true,
#   "period": "24h",
#   "recordsCreated": 1,
#   "totalCost": 1245.30,
#   "agentCount": 3,
#   "errorCount": 0
# }
```

## Automation

Revenue sync runs on schedule defined in:
- `lib/revenue/autopilot-schedule.ts` - hourly cadence
- `.github/workflows/` - CI/CD automation

### Manual Trigger

```bash
BASE=https://tdealer01-crypto-dsg-control-plane.onrender.com

# Trigger sync for last 24 hours
curl -X GET "$BASE/api/cron/trinity-revenue-sync?period=24h" \
  -H "Authorization: Bearer $CRON_SECRET"

# Trigger sync for last hour
curl -X GET "$BASE/api/cron/trinity-revenue-sync?period=1h" \
  -H "Authorization: Bearer $CRON_SECRET"
```

## Monitoring

Check revenue records:

```sql
-- Latest revenue records
SELECT 
  id, organization_id, period_start, period_end, 
  total_amount_usd, agent_count, status, created_at
FROM trinity_revenue_records
ORDER BY created_at DESC
LIMIT 10;

-- Agent breakdown
SELECT 
  agent_name, jobs_processed, cpu_usage, agent_cost_usd, created_at
FROM trinity_revenue_agents
ORDER BY created_at DESC
LIMIT 20;

-- Sync state
SELECT * FROM trinity_revenue_sync_state;
```

## Health Checks

### Trinity API Health
```bash
curl -s https://trinity-api-service.onrender.com/health | jq .
```

### Revenue Sync Health
Check `lib/trinity/revenue-sync.ts`:
- `checkTrinityRevenueHealth()` - health check function
- Returns `{trinity_api: boolean, database: boolean, healthy: boolean}`

## Troubleshooting

### "Database not configured"
- Check `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` env vars
- Verify Supabase project is reachable

### "Trinity API unreachable"
- Check `TRINITY_API_URL` is correct and deployed
- Verify `TRINITY_JWT_TOKEN` is valid
- Test: `curl -H "Authorization: Bearer $TOKEN" https://trinity-api-url/api/trinity/costs`

### "Migration not applied"
- Verify tables exist in Supabase dashboard
- Run migration again via Dashboard → SQL Editor

### "Unauthorized" on cron endpoint
- Check `CRON_SECRET` is set in GitHub secrets
- Verify Authorization header: `Authorization: Bearer $CRON_SECRET`

## Architecture

```
Trinity Agents (real cost data)
         ↓
Trinity API Service (port 3001)
         ↓
Trinity MCP Server (Claude integration)
         ↓
Revenue Sync Service (/api/cron/trinity-revenue-sync)
         ↓
Supabase Database (trinity_revenue_* tables)
         ↓
Revenue Records (for billing/analytics)
```

## Status

Verified:

- Supabase migration applied to project `dsg-control-plane-dev`. Confirmed by
  query: 3 tables, 5 custom indexes, RLS enabled with one `service_role` policy
  each. A write/read/cascade-delete probe round-tripped and was removed.
- Control plane live on Render — health, readiness, and agent status all 200.

Not yet done:

- [ ] Set `CRON_SECRET` on the Render service — **blocks everything below**
- [ ] Merge the branch so `/api/cron/trinity-revenue-sync` stops returning 404
- [ ] Deploy Trinity API Service to Render via the committed blueprint
- [ ] Generate and set `TRINITY_API_URL` / `TRINITY_JWT_TOKEN`
- [ ] Observe one successful autopilot run (HTTP 200, not 503)
- [ ] Confirm rows land in `trinity_revenue_records`
- [ ] Regenerate `lib/database.types.ts` (no `trinity_revenue_*` types yet)
- [ ] Configure Stripe metering (optional, future)

No end-to-end sync has run against a deployed Trinity backend. The contract
between `lib/trinity/revenue-sync.ts` and the service was verified against a
locally running instance only.

## Support

- Trinity API docs: `/trinity-api-service/README.md`
- MCP Server docs: `/trinity-mcp-server/README.md`
- Revenue Sync docs: `/lib/trinity/README.md`
