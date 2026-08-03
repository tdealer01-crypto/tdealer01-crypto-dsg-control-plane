# Phase 5: Automated Production GO/NO-GO Gate

## Overview

Phase 5 automates the production deployment gate. It transforms manual, checklist-driven readiness verification into a systematic, auditable GO/NO-GO decision system.

**Goal**: Prevent unready code from reaching production by enforcing automated pre-deployment verification.

**Scope**: 
- 8-point production readiness check
- Automated decision gate (GO/NO-GO/REVIEW)
- Audit trail recording in Supabase
- GitHub Actions integration for CI/CD pipeline
- Manual and scheduled gate runs

## Architecture

### Gate Decision Flow

```
Merge to main
   ↓
[GitHub Actions: production-go-nogo.yml]
   ├─ Vercel deployment status check
   ├─ Public health probe (/api/health)
   ├─ Readiness probe (/api/readiness)
   ├─ Agent status probe (/api/agent/status)
   ├─ Supabase migration state check
   ├─ Database connectivity check
   ├─ Environment variables check
   └─ Cache health check (optional)
   ↓
Decision: GO / NO-GO / REVIEW
   ↓
Record gate decision to deployment_gates table
   ↓
Post results to GitHub issue/PR
   ↓
Block deployment if NO-GO
```

### Check Order (Fail-Fast)

Checks execute in order; failures are recorded and aggregated:

1. **Environment Variables** (fastest, 0ms):
   - SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY
   - ANTHROPIC_API_KEY

2. **Public Health Probe** (~100-500ms):
   - GET `/api/health` → expect 200 OK

3. **Readiness Probe** (~100-500ms):
   - GET `/api/readiness` → expect 200 OK + `ready: true`

4. **Agent Status Probe** (~100-500ms):
   - GET `/api/agent/status` → expect 200 OK + commit/version/environment fields

5. **Database Connectivity** (~200-1000ms):
   - Query Supabase via service role key
   - Simple SELECT test against `orgs` table

6. **Supabase Migration State** (~200-1000ms):
   - Query `schema_migrations` table
   - Confirm latest migration is APPLIED

7. **Vercel Deployment Status** (~500-2000ms, optional):
   - Query Vercel API (requires VERCEL_API_TOKEN)
   - Confirm deployment status is READY

8. **Cache Health** (~100-500ms, optional):
   - Verify proof cache is seeded and responding
   - Based on agent status response

## Check Details

### 1. Environment Variables Check

**Purpose**: Confirm all required env vars are configured.

**Variables checked**:
- `SUPABASE_URL` — production database URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — public client key
- `SUPABASE_SERVICE_ROLE_KEY` — admin key (production only)
- `ANTHROPIC_API_KEY` — AI provider key

**Decision**:
- PASS: all vars present
- FAIL: any var missing
- SKIPPED: never skipped

### 2. Public Health Probe

**Purpose**: Confirm HTTP connectivity and basic server health.

**Request**: `GET https://<production-url>/api/health`

**Expected response**:
- Status: 200 OK
- Body: JSON with health status

**Decision**:
- PASS: 200 status returned
- FAIL: non-200 status
- TIMEOUT: no response within 10s

### 3. Readiness Probe

**Purpose**: Confirm application is in ready state.

**Request**: `GET https://<production-url>/api/readiness`

**Expected response**:
- Status: 200 OK
- Body: `{ "ready": true, ... }`

**Decision**:
- PASS: 200 status + `ready: true`
- FAIL: 200 but `ready !== true`, or non-200 status
- TIMEOUT: no response within 10s

### 4. Agent Status Probe

**Purpose**: Confirm deployed version matches expected commit.

**Request**: `GET https://<production-url>/api/agent/status`

**Expected response**:
- Status: 200 OK
- Body includes: `{ "commit": "sha", "version": "vX.Y.Z", "environment": "production" }`

**Decision**:
- PASS: 200 status + all required fields present
- FAIL: missing fields or non-200 status
- TIMEOUT: no response within 10s

### 5. Database Connectivity

**Purpose**: Confirm Supabase connectivity with service role key.

**Test**: Query Supabase PostgreSQL via supabase-js client

```sql
SELECT id FROM orgs LIMIT 1
```

**Decision**:
- PASS: query succeeds, no errors
- FAIL: query error (permissions, connection, etc.)
- SKIPPED: SUPABASE_SERVICE_ROLE_KEY not provided
- TIMEOUT: query times out (>10s)

### 6. Supabase Migration State

**Purpose**: Confirm all required migrations are applied to production database.

**Test**: Query `schema_migrations` table for latest applied migration

```sql
SELECT version FROM schema_migrations
WHERE success = true
ORDER BY version DESC LIMIT 1
```

**Decision**:
- PASS: latest migration version found and success=true
- FAIL: no successful migrations, or query error
- SKIPPED: SUPABASE_SERVICE_ROLE_KEY not provided
- TIMEOUT: query times out (>10s)

### 7. Vercel Deployment Status

**Purpose**: Confirm Vercel deployment is in READY state.

**API**: Query Vercel API for project deployment status

```bash
GET https://api.vercel.com/v6/deployments?projectId=<slug>
Authorization: Bearer <VERCEL_API_TOKEN>
```

**Decision**:
- PASS: latest deployment status is READY
- FAIL: deployment status is BUILDING, ERROR, or QUEUED
- SKIPPED: VERCEL_API_TOKEN not provided (optional check)
- TIMEOUT: API call times out (>10s)

### 8. Cache Health (Optional)

**Purpose**: Verify proof cache is seeded and responding (Phase 2 integration).

**Test**: Query cache status via agent status or dedicated cache endpoint

**Decision**:
- PASS: cache is accessible and healthy
- FAIL: cache query error or unhealthy
- SKIPPED: cache endpoint not available
- TIMEOUT: cache query times out (>10s)

## Gate Decision Logic

```
IF any check status is FAIL or TIMEOUT:
  decision = NO-GO

ELSE IF any check status is SKIPPED:
  decision = REVIEW (requires manual approval)

ELSE (all checks PASS):
  decision = GO
```

### Decision Meanings

**GO**
- All 8 checks passed
- Production is ready for deployment
- Safe to promote to main/production

**NO-GO**
- One or more checks failed or timed out
- Production deployment is blocked
- Must fix failing checks before retry
- No production code should be promoted

**REVIEW**
- One or more critical checks were skipped (missing credentials)
- Manual review and approval required
- Typically indicates missing VERCEL_API_TOKEN or SUPABASE_SERVICE_ROLE_KEY
- Escalate to DevOps/SRE for investigation

## Using the Gate

### Local Gate Execution

Run the gate check locally before pushing to main:

```bash
npm run go:no-go https://tdealer01-crypto-dsg-control-plane.vercel.app
```

Output:
```
🚀 Phase 5: Production GO/NO-GO Gate v5.0
📍 Target URL: https://tdealer01-crypto-dsg-control-plane.vercel.app
⏱️  Time: 2026-08-02T14:30:45.123Z

Running production gate checks...

  ✅ Environment Variables: PASS
  ✅ Health Probe: PASS (245ms)
  ✅ Readiness Probe: PASS (312ms)
  ✅ Agent Status Probe: PASS (289ms) - commit: abc12345
  ✅ Database Connectivity: PASS (678ms)
  ✅ Migration State: PASS (523ms) - Latest: 20260802000001
  ✅ Vercel Deployment: PASS (1245ms)
  ✅ Cache Health: PASS (167ms)

✅ Production GO: All 8 checks passed.
📋 Decision: GO

--- Machine-readable result (JSON) ---
{
  "decision": "GO",
  "url": "https://tdealer01-crypto-dsg-control-plane.vercel.app",
  "timestamp": "2026-08-02T14:30:45.123Z",
  "gate_version": "v5.0",
  "checks": [...],
  "summary": "✅ Production GO: All 8 checks passed.",
  "decision_rationale": "All production readiness checks passed. Safe to deploy."
}
```

Exit code: 0 (GO) or 1 (NO-GO)

### Automated Gate via GitHub Actions

#### Manual Trigger

```bash
gh workflow run production-go-nogo.yml -f production_url="https://tdealer01-crypto-dsg-control-plane.vercel.app"
```

#### Scheduled Trigger

Default: Daily at 2 AM UTC (defined in workflow cron)

Edit `.github/workflows/production-go-nogo.yml` to change schedule:

```yaml
schedule:
  - cron: '0 2 * * *'  # 2 AM UTC every day
  # - cron: '0 */6 * * *'  # Every 6 hours
  # - cron: '0 9 * * 1-5'  # Weekdays at 9 AM
```

#### Workflow Results

Gate results posted to:
1. GitHub issue (auto-created or updated)
2. Workflow run artifact (`production-gate-result-*.json`)
3. Check run status (pass/fail)

## Database Schema

### deployment_gates Table

Stores all gate decision records (append-only):

```sql
CREATE TABLE deployment_gates (
  id UUID PRIMARY KEY,
  org_id UUID NOT NULL,
  deployment_url TEXT NOT NULL,
  gate_version TEXT NOT NULL,
  
  decision TEXT ('GO', 'NO-GO', 'REVIEW'),
  checks_json JSONB,  -- Full check results
  decision_rationale TEXT,
  
  checked_at TIMESTAMP,
  created_by TEXT,
  created_at TIMESTAMP,
  verified_by TEXT,
  verified_at TIMESTAMP
);
```

### Indexes

- `idx_deployment_gates_org_created` — query by org + time
- `idx_deployment_gates_decision` — query by decision + time
- `idx_deployment_gates_url_checked` — query by URL + check time
- `idx_deployment_gates_gate_version` — query by gate version + time

### RLS Policies

- **Read**: Authenticated users can read gates for their org
- **Insert**: Service role only (GitHub Actions, admin scripts)
- **Update/Delete**: Immutable (enforced by triggers)

## Setup Instructions

### 1. Configure GitHub Secrets

Add these secrets to repository Settings → Secrets and variables → Actions:

```
SUPABASE_URL            # From Supabase settings
SUPABASE_SERVICE_ROLE_KEY  # From Supabase settings (production only)
ANTHROPIC_API_KEY       # From Anthropic dashboard
NEXT_PUBLIC_SUPABASE_ANON_KEY  # From Supabase settings
VERCEL_API_TOKEN        # From Vercel settings (optional)
```

### 2. Apply Supabase Migration

The migration creates the `deployment_gates` table:

```bash
# Local development
supabase migration up

# Staging/Production (via Vercel dashboard or Supabase UI)
# Navigate to SQL editor and run migration 20260802000001
```

### 3. Regenerate TypeScript Types

After migration:

```bash
npm run supabase:types
npm run typecheck
```

### 4. Enable Workflow

The workflow is enabled by default. Verify:

1. Go to repository Actions tab
2. Check "Production GO/NO-GO Gate" workflow is listed
3. Click it to see runs and history

### 5. Test Local Gate

```bash
npm run go:no-go https://tdealer01-crypto-dsg-control-plane.vercel.app
```

Expected output: GO/NO-GO/REVIEW decision with check results.

## Troubleshooting

### Workflow not running?

- [ ] Workflow file exists at `.github/workflows/production-go-nogo.yml`
- [ ] Workflow is enabled (check Actions tab)
- [ ] Cron schedule is valid (see GitHub Actions logs for errors)
- [ ] Manual trigger: use `gh workflow run` or GitHub UI

### Checks timing out?

- [ ] Increase `TIMEOUT_MS` in `scripts/production-gate.ts` (currently 10000ms)
- [ ] Check production URL is accessible (not blocked by firewall)
- [ ] Verify Vercel deployment is healthy
- [ ] Check Supabase is responding (status page: status.supabase.com)

### Database connectivity failing?

- [ ] Verify `SUPABASE_SERVICE_ROLE_KEY` is valid
- [ ] Check `SUPABASE_URL` is correct
- [ ] Confirm service role key has SELECT permissions on `orgs` table
- [ ] Verify RLS policies allow service role queries

### Migration state check failing?

- [ ] Confirm migration 20260802000001 is applied to production
- [ ] Query `schema_migrations` table: `SELECT * FROM schema_migrations WHERE version LIKE '20260802%'`
- [ ] If missing, manually apply migration via Supabase dashboard

### Vercel deployment check skipped?

- [ ] Add `VERCEL_API_TOKEN` to GitHub secrets (optional; check will be skipped if missing)
- [ ] Confirm token has access to the project
- [ ] Verify project slug in token is correct

### Gate always returns NO-GO?

1. **Run locally first**:
   ```bash
   npm run go:no-go https://production-url
   ```

2. **Check each probe individually**:
   ```bash
   curl https://production-url/api/health
   curl https://production-url/api/readiness
   curl https://production-url/api/agent/status
   ```

3. **Verify environment variables**:
   ```bash
   echo $SUPABASE_URL
   echo $SUPABASE_SERVICE_ROLE_KEY  # Should NOT print value
   ```

4. **Check Supabase logs**:
   - Supabase Dashboard → Logs → API logs
   - Look for failed authentication or permission errors

5. **Check Vercel logs**:
   - Vercel Dashboard → Project → Deployments → Logs
   - Look for runtime errors or crashes

### Manual override needed?

If gate incorrectly blocks deployment:

1. Document the issue in the gate result comment
2. Escalate to DevOps/SRE team
3. Manual promotion via Vercel Dashboard after investigation
4. Update gate check to prevent future false positives

## Monitoring

### View Gate Decision History

```sql
SELECT deployment_url, decision, checked_at, decision_rationale
FROM deployment_gates
WHERE org_id = '<your-org-id>'
ORDER BY checked_at DESC
LIMIT 20;
```

### Track NO-GO Frequency

```sql
SELECT decision, COUNT(*) as count
FROM deployment_gates
GROUP BY decision
ORDER BY count DESC;
```

### Find recent failures

```sql
SELECT deployment_url, decision, checks_json
FROM deployment_gates
WHERE decision = 'NO-GO'
AND checked_at > NOW() - INTERVAL '7 days'
ORDER BY checked_at DESC;
```

## Integration with CI/CD

### Pre-deployment check

Before automatic promotion to production:

```bash
#!/bin/bash
RESULT=$(npm run go:no-go $PRODUCTION_URL)
DECISION=$(echo $RESULT | jq -r '.decision')

if [ "$DECISION" != "GO" ]; then
  echo "Gate decision: $DECISION"
  echo "Deployment blocked."
  exit 1
fi

# Continue with deployment
vercel --prod
```

### CI/CD workflow integration

In `.github/workflows/deploy-production.yml`:

```yaml
- name: Run production gate
  run: npm run go:no-go ${{ secrets.PRODUCTION_URL }}

- name: Deploy (only on GO)
  if: needs.gate.outputs.decision == 'GO'
  run: vercel --prod
```

## Known Limitations

- **External integrations**: Gate does NOT audit Stripe, OpenAI, or other third-party services
- **SSL/TLS validation**: Gate does NOT validate certificate validity (Vercel's responsibility)
- **Full E2E tests**: Gate does NOT run comprehensive E2E suite (that's Phase 2 preview DB testing)
- **Multi-region failover**: Gate does NOT check failover readiness (that's Phase 7)
- **Performance SLAs**: Gate does NOT validate latency SLAs (that's Phase 3 load testing)

## Next Steps

After Phase 5 is working:

1. **Phase 6**: Compliance evidence collection to workflows
2. **Phase 7**: Multi-region failover testing and disaster recovery
3. **Phase 8** (optional): Advanced production monitoring and auto-remediation

## References

- Vercel API: https://vercel.com/docs/api
- Supabase Management API: https://supabase.com/docs/reference/api/introduction
- GitHub Actions: https://docs.github.com/en/actions

---

**Questions?** Check `.github/workflows/production-go-nogo.yml` for implementation details.
