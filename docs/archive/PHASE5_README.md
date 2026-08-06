# Phase 5: Automated Production Deployment GO/NO-GO Gate — Quick Start

Welcome to Phase 5! This phase automates your production deployment readiness verification.

## What is Phase 5?

Phase 5 is an automated production gate that systematically checks 8 critical readiness criteria before deployment. It transforms manual checklist verification into a structured, auditable GO/NO-GO decision.

**What it checks:**
1. Environment variables (SUPABASE_URL, API keys, etc.)
2. Public health endpoint (/api/health)
3. Readiness endpoint (/api/readiness)
4. Agent status endpoint (/api/agent/status)
5. Database connectivity (Supabase)
6. Migration state (schema_migrations table)
7. Vercel deployment status (optional)
8. Cache health (optional)

**Decision outcomes:**
- **GO**: All checks passed → safe to deploy
- **NO-GO**: One or more checks failed → deployment blocked
- **REVIEW**: Some checks skipped (missing credentials) → manual approval needed

## Quick Setup (10 minutes)

### 1. Apply Supabase Migration
```bash
# Via CLI (development)
supabase migration up

# Via Dashboard (production)
# Navigate to SQL Editor and run: supabase/migrations/20260802000001_deployment_gates.sql
```

### 2. Add GitHub Secrets
Repository Settings → Secrets and variables → Actions:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `VERCEL_API_TOKEN` (optional)

### 3. Regenerate TypeScript Types
```bash
npm run supabase:types
npm run typecheck
```

### 4. Test the Gate Locally
```bash
npm run go:no-go https://tdealer01-crypto-dsg-control-plane.vercel.app
```

### 5. Check Automated Workflow
- Go to repository **Actions** tab
- Verify **Production GO/NO-GO Gate** workflow is listed and enabled

## Using Phase 5

### Run Locally Before Pushing
```bash
npm run go:no-go https://your-production-url
```

Output example:
```
🚀 Phase 5: Production GO/NO-GO Gate v5.0
📍 Target URL: https://tdealer01-crypto-dsg-control-plane.vercel.app
⏱️  Time: 2026-08-02T14:30:45.123Z

Running production gate checks...

  ✅ Environment Variables: PASS
  ✅ Health Probe: PASS (245ms)
  ✅ Readiness Probe: PASS (312ms)
  ✅ Agent Status Probe: PASS (289ms)
  ✅ Database Connectivity: PASS (678ms)
  ✅ Migration State: PASS (523ms)
  ✅ Vercel Deployment: PASS (1245ms)
  ✅ Cache Health: PASS (167ms)

✅ Production GO: All 8 checks passed.
📋 Decision: GO
```

### Automated Workflow
1. Merge code to `main`
2. Vercel auto-deploys
3. Gate workflow runs automatically at 2 AM UTC (or on manual trigger)
4. Results posted to GitHub issue
5. Check status indicator shows GO/NO-GO decision

**Manual trigger:**
```bash
gh workflow run production-go-nogo.yml -f production_url="https://your-url"
```

## Files Changed in Phase 5

### New Files
- `supabase/migrations/20260802000001_deployment_gates.sql` — Database schema for gate decisions
- `scripts/production-gate.ts` — TypeScript implementation of 8-point gate check
- `.github/workflows/production-go-nogo.yml` — GitHub Actions automation
- `docs/PHASE5_PRODUCTION_GATE.md` — Detailed architecture documentation
- `docs/PHASE5_SETUP_GUIDE.md` — Step-by-step setup instructions
- `tests/unit/production-gate.test.ts` — Unit tests for gate logic

### Modified Files
- `scripts/go-no-go-gate.sh` — Updated to call Phase 5 implementation

## Architecture Overview

```
User runs: npm run go:no-go <url>
   ↓
scripts/go-no-go-gate.sh wrapper
   ↓
scripts/production-gate.ts (TypeScript)
   ├─ Check 1: Environment Variables
   ├─ Check 2: Health Probe
   ├─ Check 3: Readiness Probe
   ├─ Check 4: Agent Status
   ├─ Check 5: DB Connectivity
   ├─ Check 6: Migration State
   ├─ Check 7: Vercel Status
   └─ Check 8: Cache Health
   ↓
Aggregate Results
   ├─ All PASS → GO
   ├─ Any FAIL/TIMEOUT → NO-GO
   └─ Any SKIPPED → REVIEW
   ↓
Output: JSON + Summary + Decision
   ↓
(Optional) GitHub Actions records to deployment_gates table
```

## Next Steps

1. **Immediate**: Run `npm run go:no-go <url>` to verify the gate works
2. **Setup**: Configure GitHub secrets for automation
3. **Integration**: Add gate check to your CI/CD pipeline
4. **Monitoring**: Track gate decision trends in Supabase
5. **Phase 6**: Collect compliance evidence from gate workflow

## Troubleshooting

**Gate timeouts?**
- Check production URL is reachable: `curl https://your-url/api/health`
- Increase timeout in `scripts/production-gate.ts` (line 11: `TIMEOUT_MS = 30000`)

**NO-GO decision?**
- Review gate output for which check failed
- Fix the underlying issue (e.g., health endpoint returning error)
- Re-run gate check

**Workflow not running?**
- Verify secrets are set in GitHub Settings
- Check workflow file: `.github/workflows/production-go-nogo.yml`
- Manually trigger via GitHub Actions UI

## Documentation

- **Architecture**: See `docs/PHASE5_PRODUCTION_GATE.md`
- **Setup details**: See `docs/PHASE5_SETUP_GUIDE.md`
- **Implementation**: See `scripts/production-gate.ts`

## Key Metrics

- **Gate version**: v5.0
- **Number of checks**: 8
- **Timeout per check**: 10 seconds (configurable)
- **Total gate execution**: ~5-10 seconds typical
- **Database table**: `deployment_gates` (append-only)
- **Audit trail**: Full check results stored for each gate run

## Production Safety

- ✅ Gate blocks NO-GO deployments automatically
- ✅ All decisions recorded in Supabase for audit trail
- ✅ RLS policies enforce org-scoped access
- ✅ Append-only table prevents tampering
- ✅ Machine-readable JSON output for CI/CD integration

## Support

Questions? See:
- `docs/PHASE5_PRODUCTION_GATE.md` — architecture & detailed checks
- `docs/PHASE5_SETUP_GUIDE.md` — troubleshooting & advanced config

---

**Ready?** Start with: `npm run go:no-go https://your-production-url`

Phase 5 is complete when:
- ✅ Local gate runs successfully
- ✅ GitHub secrets configured
- ✅ Automated workflow enabled
- ✅ Gate decision records appear in Supabase
