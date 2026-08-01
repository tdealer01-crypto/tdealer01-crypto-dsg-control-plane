# Phase 2: Neon + Z3 Formal Proof Integration Plan

**Branch:** `phase2-test`  
**Status:** In Progress  
**Target:** Week 9+ (2026-08-XX)

## Overview

Phase 2 expands DSG ONE from Supabase-only to a dual-database architecture (Supabase + Neon) and integrates Z3 formal proof for deterministic gate decisions at scale. This plan coordinates:

1. **Neon Infrastructure** — PostgreSQL on Neon with multi-tenant RLS
2. **Z3 Formal Proof** — Apply dsg_gate_decisions table and solver integration
3. **Load Testing** — 1000 concurrent agents on Phase 2 infrastructure
4. **GitHub Integration** — Automated PR database branching

---

## Phase 2 Milestones

### Milestone 1: Neon Setup (This Week)
- [ ] Create Neon project and obtain connection string
- [ ] Create Phase 2 Neon migrations (org_members, audit_batch_metadata, dsg_gate_decisions)
- [ ] Set up multi-tenant RLS policies on Neon
- [ ] Verify connection pooling and performance baseline

### Milestone 2: Z3 Integration
- [ ] Review and refine dsg_gate_decisions migration (address 7 open blockers)
- [ ] Apply migration to both Supabase and Neon
- [ ] Create app-layer route at `POST /api/dsg/v1/gates/evaluate` (currently scaffold only)
- [ ] Wire solver invocation to the decision recording flow

### Milestone 3: Load Testing
- [ ] Create load test harness (k6 / Locust script for 1000 concurrent agents)
- [ ] Benchmark Phase 2 infrastructure under load
- [ ] Measure gate decision latency, throughput, and error rates
- [ ] Compare Supabase vs Neon performance

### Milestone 4: GitHub Branching Integration
- [ ] Create GitHub Action for automated PR database branching
- [ ] Configure Neon Preview Branches for each PR
- [ ] Set up branch lifecycle (create on PR, destroy on close/merge)

---

## Current Status

### ✅ Phase 1 Complete (Merged PR #1032)
- Multi-tenant audit trail with hash-chain integrity
- RLS recursion prevention via SECURITY DEFINER functions
- Cross-org isolation enforcement
- Chain deletion evidence preservation via ON DELETE RESTRICT

### ⏳ Phase 2 Readiness
- dsg_gate_decisions migration drafted (NOT YET APPLIED)
- Z3 solver contract validated (external-solver.ts)
- 10 blockers tracked (3 CRITICAL resolved, 7 remaining open)
- App-layer route `/api/dsg/v1/gates/evaluate` exists as scaffold

### 📋 Open Blockers (from 20260730000005_DRAFT_dsg_gate_decisions_phase2.sql)
1. ✅ Governance model misalignment (RESOLVED)
2. ✅ Z3 output format validation (RESOLVED)
3. ✅ RLS policy immutability (RESOLVED)
4. ⏳ Proof verification approach (cached vs live Z3 call per decision)
5. ⏳ Index requirements review (DBA validation needed)
6. ⏳ Archive/retention strategy (evidence_retention_until column exists but no job)
7. ⏳ FK to organizations table (bare org_id UUID, no referential integrity)
8. ⏳ FK to policy_version table (bare UUID, no constraint)
9. ⏳ parent_decision_id lineage cycle/cross-org protection
10. ⏳ App-layer route handler (record_z3_gate_decision() unused in code)

---

## Neon Setup Checklist

### Step 1: Credentials
- [ ] Create Neon project at https://console.neon.tech
- [ ] Obtain connection string (postgresql://...)
- [ ] Store in `.env.local` as `NEON_DATABASE_URL`
- [ ] Do NOT commit to repo

### Step 2: Migrations
- [ ] Create `supabase/migrations/20260801000001_phase2_neon_org_members.sql`
- [ ] Create `supabase/migrations/20260801000002_phase2_neon_audit_batch.sql`
- [ ] Create `supabase/migrations/20260801000003_phase2_neon_gate_decisions.sql`
- [ ] Apply migrations to Neon via psql or Neon dashboard

### Step 3: RLS & Security
- [ ] Enable RLS on org_members, audit_batch_metadata, dsg_gate_decisions
- [ ] Copy RLS policies from Supabase to Neon
- [ ] Create SECURITY DEFINER functions (get_user_orgs, verify_audit_batch_chain, etc.)
- [ ] Verify RLS enforcement via test queries

### Step 4: Performance Baseline
- [ ] Create basic query execution plans for each table
- [ ] Measure connection pool latency
- [ ] Document baseline metrics in `docs/PHASE2_BENCHMARKS.md`

---

## Load Testing Plan

### Test Harness
```bash
# 1000 concurrent agents
# Ramp-up: 0-60s
# Duration: 300s
# Endpoints to test:
#   POST /api/spine/execute (main execution)
#   POST /api/dsg/v1/gates/evaluate (deterministic gate)
#   GET /api/audit (audit trail read)
```

### Metrics to Capture
- Latency (p50, p95, p99)
- Throughput (requests/sec)
- Error rate
- Gate decision distribution (ALLOW/BLOCK/REVIEW/UNSUPPORTED)
- Database connection pool utilization

### Success Criteria
- p99 latency < 2s
- Error rate < 0.1%
- Throughput >= 500 req/sec per instance
- Connection pool stable (no exhaustion)

---

## GitHub Branching Integration

### Expected Flow
1. User opens PR on `main`
2. GitHub Action creates Neon Preview Branch
3. Migrations run on preview branch
4. PR preview URL includes database connection to preview
5. On PR close/merge, preview branch destroyed

### Action Configuration
```yaml
name: Neon Preview Branch
on:
  pull_request:
    types: [opened, closed]

jobs:
  manage_branch:
    runs-on: ubuntu-latest
    steps:
      - uses: neondatabase/actions@v1
        with:
          project_id: ${{ secrets.NEON_PROJECT_ID }}
          api_key: ${{ secrets.NEON_API_KEY }}
          action: create_branch
          branch_name: pr-${{ github.event.pull_request.number }}
```

---

## Risk & Mitigation

| Risk | Mitigation |
|------|-----------|
| Neon connection pooling overhead | Baseline test early; may need PgBouncer tuning |
| Z3 solver timeout on large constraints | Cache proof results; implement timeout fallback to REVIEW |
| Cross-org data leakage in RLS policies | Apply same policies to Neon as Supabase; test with multi-org queries |
| Load test overwhelms shared Neon project | Use preview branches for isolation; implement rate limiting |
| GitHub Action failures break PR flow | Use conditional deployment; alert on action failures |

---

## Timeline

- **This week**: Neon setup + baseline benchmarks
- **Week 2**: Z3 integration + dsg_gate_decisions application
- **Week 3**: Load testing + GitHub branching integration
- **Week 4**: Production readiness review + cutover planning

---

## Verification Commands

```bash
# Verify Neon connectivity
psql $NEON_DATABASE_URL -c "SELECT version();"

# Verify migrations applied
psql $NEON_DATABASE_URL -c "\dt org_members audit_batch_metadata dsg_gate_decisions"

# Verify RLS policies
psql $NEON_DATABASE_URL -c "SELECT * FROM pg_policies WHERE tablename IN ('org_members', 'audit_batch_metadata', 'dsg_gate_decisions');"

# Run load test locally
npm run test:load -- --duration 60s --vus 100 --target neon

# Check PR preview branching
gh api repos/:owner/:repo/actions/workflows
```

---

## Next Steps

1. Create Neon project and obtain credentials
2. Create Phase 2 migration files in `supabase/migrations/`
3. Apply migrations and verify RLS
4. Create load testing harness
5. Set up GitHub Actions for preview branching
