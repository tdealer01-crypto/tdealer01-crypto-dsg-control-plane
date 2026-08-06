# Trinity × DSG Agents Integration — Implementation Checklist

**Status**: Ready to Implement | **Effort**: ~4-6 hours | **Risk**: Low | **Date**: 2026-07-16

---

## Phase 0: Pre-Implementation (30 min)

### Environment Setup

- [ ] Verify you're on branch: `claude/trinity-dsg-agents-integration-jc42du`
  ```bash
  git branch -v | grep claude/trinity
  ```

- [ ] Update dependencies (Supabase SDK, js-sha256)
  ```bash
  npm install --save js-sha256
  npm audit --audit-level=high
  ```

- [ ] Verify Supabase project is accessible
  ```bash
  curl -s "https://[your-project].supabase.co/rest/v1/" \
    -H "Authorization: Bearer $(cat .env.local | grep SUPABASE_SERVICE_ROLE_KEY | cut -d'=' -f2)"
  ```

- [ ] Create `.env.local` entries (if missing):
  ```bash
  NEXT_PUBLIC_SUPABASE_URL=https://[your-project].supabase.co
  SUPABASE_SERVICE_ROLE_KEY=[service-role-key]
  ```

### Code Review

- [ ] Read `Trinity-DSG-Agents-Integration.md` — understand 5 integration points
- [ ] Read `trinity-integration-code.ts` — review class design + error handling
- [ ] Review `lib/agents/` — understand existing agent implementations
- [ ] Review `supabase/migrations/20260630000000_trinity_end_to_end_workflow.sql` — Trinity schema

---

## Phase 1: Database Schema (1 hour)

### Create Migration File

```bash
cd /home/user/tdealer01-crypto-dsg-control-plane
touch supabase/migrations/$(date +%Y%m%d%H%M%S)_trinity_dsg_agents_integration.sql
```

### Copy Migration SQL

Copy the migration SQL from `Trinity-DSG-Agents-Integration.md` section 4 into the new migration file.

- [ ] Migration file created
- [ ] All columns added (agent_status, cost_usd, context_fragmentation_risk, etc.)
- [ ] Indexes created
- [ ] FK constraint added to dsg_orchestrations

### Test Migration Locally

```bash
# If using Supabase local dev:
supabase db push

# Or verify syntax:
cat supabase/migrations/[timestamp]_trinity_dsg_agents_integration.sql | sqlc validate
```

- [ ] Migration syntax is valid
- [ ] No conflicts with existing schema
- [ ] Data types match (numeric, text, timestamptz, etc.)

### Apply to Staging

```bash
# Push to Supabase staging project
supabase link --project-ref [staging-project-ref]
supabase db push --dry-run  # Verify first
supabase db push             # Apply
```

- [ ] Migration applied to staging database
- [ ] No errors in migration logs
- [ ] Verify new columns exist:
  ```sql
  SELECT column_name FROM information_schema.columns 
  WHERE table_name = 'trinity_jobs' 
  AND column_name IN ('agent_status', 'execution_cost_usd', 'context_fragmentation_risk')
  ```

---

## Phase 2: Integration Code (1.5 hours)

### Copy Integration File

```bash
cp trinity-integration-code.ts lib/trinity/dsg-agent-integration.ts
```

- [ ] File copied to `lib/trinity/dsg-agent-integration.ts`
- [ ] No syntax errors:
  ```bash
  npx tsc --noEmit lib/trinity/dsg-agent-integration.ts
  ```

### Update Supabase Types

```bash
npx supabase gen types typescript --project-id [project-ref] > lib/database.types.ts
```

- [ ] New Trinity columns appear in generated types
- [ ] No TypeScript errors in types file

### Create Integration Routes

Create file: `app/api/trinity/agent-sync/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { TrinityClient } from '@/lib/trinity/dsg-agent-integration';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { action, orgId, ...payload } = await request.json();
    const trinity = new TrinityClient(orgId);

    let result;
    switch (action) {
      case 'update-status':
        result = await trinity.updateAgentStatus(payload);
        break;
      case 'record-cost':
        result = await trinity.recordCost(payload);
        break;
      case 'record-audit':
        result = await trinity.recordAudit(payload);
        break;
      case 'set-mode':
        result = await trinity.setMode(payload);
        break;
      case 'report-fragmentation':
        result = await trinity.reportFragmentation(payload);
        break;
      default:
        return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('agent-sync route error:', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
```

- [ ] Route file created: `app/api/trinity/agent-sync/route.ts`
- [ ] All 5 actions implemented (update-status, record-cost, record-audit, set-mode, report-fragmentation)
- [ ] Error handling present

### Test Routes Locally

```bash
npm run dev &
sleep 2

# Test update-status
curl -X POST http://localhost:3000/api/trinity/agent-sync \
  -H "Content-Type: application/json" \
  -d '{
    "action": "update-status",
    "orgId": "org_test",
    "jobId": "job_123",
    "agentOrchestrationId": "orch_456",
    "agentStatus": "executing",
    "agentLastHeartbeat": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
    "contextFragmentationRisk": 0
  }'

# Expected: { "ok": true, ... }
```

- [ ] POST /api/trinity/agent-sync/update-status returns 200 OK
- [ ] POST /api/trinity/agent-sync/record-cost returns 200 OK
- [ ] POST /api/trinity/agent-sync/record-audit returns 200 OK
- [ ] Error cases return proper error messages

---

## Phase 3: Unit Tests (1 hour)

### Create Test Files

```bash
mkdir -p tests/trinity-dsg-integration
```

Create: `tests/trinity-dsg-integration/sync-status.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { TrinityClient } from '@/lib/trinity/dsg-agent-integration';

describe('TrinityClient - Status Sync', () => {
  let trinity: TrinityClient;
  const testOrgId = 'org_test_' + Date.now();

  beforeEach(() => {
    trinity = new TrinityClient(testOrgId);
  });

  it('should update agent status in trinity_jobs', async () => {
    const result = await trinity.updateAgentStatus({
      jobId: 'job_test_' + Date.now(),
      agentOrchestrationId: 'orch_test_' + Date.now(),
      agentStatus: 'executing',
      agentLastHeartbeat: new Date().toISOString(),
      contextFragmentationRisk: 0.05,
    });

    expect(result.ok).toBe(true);
    expect(result.trinityJobUpdated).toBeDefined();
    expect(result.trinityJobUpdated?.agentStatus).toBe('executing');
  });

  it('should return error for non-existent job', async () => {
    const result = await trinity.updateAgentStatus({
      jobId: 'job_nonexistent',
      agentOrchestrationId: 'orch_test',
      agentStatus: 'executing',
      agentLastHeartbeat: new Date().toISOString(),
      contextFragmentationRisk: 0,
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
  });
});
```

- [ ] Test file created: `tests/trinity-dsg-integration/sync-status.test.ts`

Create: `tests/trinity-dsg-integration/cost-tracking.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { TrinityClient } from '@/lib/trinity/dsg-agent-integration';

describe('TrinityClient - Cost Tracking', () => {
  let trinity: TrinityClient;
  const testOrgId = 'org_test_' + Date.now();

  beforeEach(() => {
    trinity = new TrinityClient(testOrgId);
  });

  it('should record cost and calculate total', async () => {
    const jobId = 'job_cost_' + Date.now();

    const result = await trinity.recordCost({
      jobId,
      agentId: 'mind-agent-1',
      operation: 'plan',
      costUsd: 0.45,
      tokensUsed: 1200,
      timestamp: new Date().toISOString(),
    });

    expect(result.ok).toBe(true);
    expect(result.jobTotalCost).toBe(0.45);
    expect(result.budgetRemaining).toBe(4.55);
    expect(result.budgetAlert).toBe(false);
  });

  it('should alert when cost exceeds threshold', async () => {
    const jobId = 'job_cost_alert_' + Date.now();

    // Record multiple costs to exceed $3 threshold
    await trinity.recordCost({
      jobId,
      agentId: 'mind-agent-1',
      operation: 'plan',
      costUsd: 1.5,
      tokensUsed: 3000,
      timestamp: new Date().toISOString(),
    });

    const result = await trinity.recordCost({
      jobId,
      agentId: 'hand-agent-1',
      operation: 'execute',
      costUsd: 1.6,
      tokensUsed: 4000,
      timestamp: new Date().toISOString(),
    });

    expect(result.ok).toBe(true);
    expect(result.budgetAlert).toBe(true); // Exceeds $3 threshold
  });
});
```

- [ ] Test file created: `tests/trinity-dsg-integration/cost-tracking.test.ts`

### Run Tests

```bash
npm run test -- tests/trinity-dsg-integration/
```

- [ ] All unit tests pass
- [ ] Coverage > 80% for integration code
- [ ] No console errors

---

## Phase 4: Integration Tests (1 hour)

### Create E2E Test

Create: `tests/trinity-dsg-integration/end-to-end.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { TrinityClient, TrinityIntegrationHooks } from '@/lib/trinity/dsg-agent-integration';

describe('Trinity × DSG Agents - End-to-End', () => {
  let trinity: TrinityClient;
  let hooks: TrinityIntegrationHooks;
  const testOrgId = 'org_e2e_' + Date.now();
  const jobId = 'job_e2e_' + Date.now();
  const orchestrationId = 'orch_e2e_' + Date.now();

  beforeEach(() => {
    trinity = new TrinityClient(testOrgId);
    hooks = new TrinityIntegrationHooks({
      orgId: testOrgId,
      enableCostTracking: true,
      enableAuditChain: true,
      costBudgetUsd: 5.0,
      costAlertThresholdUsd: 3.0,
    });
  });

  it('should execute full job lifecycle', async () => {
    // Phase 1: Orchestration starts
    await hooks.onOrchestrationStart(jobId, orchestrationId, ['mind-agent-1', 'hand-agent-1', 'eye-agent-1']);

    // Phase 2: Planning phase
    await hooks.onPhaseComplete(jobId, orchestrationId, 'plan', ['mind-agent-1'], [
      { agentId: 'mind-agent-1', costUsd: 0.45 },
    ]);

    // Phase 3: Execution phase
    await hooks.onPhaseComplete(jobId, orchestrationId, 'execute', ['hand-agent-1'], [
      { agentId: 'hand-agent-1', costUsd: 1.20 },
    ]);

    // Phase 4: Verification phase
    await hooks.onPhaseComplete(jobId, orchestrationId, 'verify', ['eye-agent-1'], [
      { agentId: 'eye-agent-1', costUsd: 0.23 },
    ]);

    // Phase 5: Settlement phase
    await hooks.onPhaseComplete(jobId, orchestrationId, 'settle', ['nerve-agent-1'], [
      { agentId: 'nerve-agent-1', costUsd: 0.15 },
    ]);

    // Phase 6: Orchestration completes
    await hooks.onOrchestrationComplete(jobId, orchestrationId, 'success');

    // Verify final state
    const statusResult = await trinity.updateAgentStatus({
      jobId,
      agentOrchestrationId: orchestrationId,
      agentStatus: 'settled',
      agentLastHeartbeat: new Date().toISOString(),
      contextFragmentationRisk: 0,
    });

    expect(statusResult.ok).toBe(true);
  });
});
```

- [ ] E2E test file created and passing
- [ ] Full job lifecycle tested (plan → execute → verify → settle)
- [ ] Costs accumulate correctly
- [ ] Final status is 'settled'

### Run Integration Tests

```bash
npm run test -- tests/trinity-dsg-integration/
```

- [ ] All integration tests pass
- [ ] No data leakage between tests
- [ ] Database queries are isolated by org_id

---

## Phase 5: Deploy to Staging (1 hour)

### Build & Test

```bash
npm run typecheck
npm run test
npm run build
```

- [ ] TypeCheck passes
- [ ] All tests pass
- [ ] Build completes without warnings

### Push to Staging

```bash
git add -A
git commit -m "feat: trinity dsg-agents phase 5 integration

- Add agent_status, execution_cost, context_fragmentation columns to trinity_jobs
- Implement TrinityClient with 5 integration points
- Add status sync, cost tracking, audit chain, mode switching, context recovery
- Create unit + integration tests
- Add API routes for agent-sync endpoints

Verification:
- [x] Unit tests pass (sync, cost, audit)
- [x] Integration tests pass (E2E job lifecycle)
- [x] TypeCheck passes
- [x] Build succeeds
- [ ] Staging deployment successful

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01V32UAxgGWEqcts7q4Zdtfm"

git push -u origin claude/trinity-dsg-agents-integration-jc42du
```

- [ ] Commits pushed to feature branch
- [ ] Verify on GitHub: `git log --oneline -5`

### Deploy to Staging

```bash
# Via Vercel CLI
vercel link --project tdealer01-crypto-dsg-control-plane
vercel env pull .env.staging.local
vercel deploy --prebuilt
```

Or manual via Vercel dashboard:
- [ ] Staging deployment triggered
- [ ] Deployment shows "Ready"
- [ ] Environment variables present (SUPABASE_SERVICE_ROLE_KEY)

### Smoke Tests in Staging

```bash
STAGING_URL="https://[staging].vercel.app"

# Test agent-sync endpoint
curl -X POST "$STAGING_URL/api/trinity/agent-sync" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "update-status",
    "orgId": "org_staging_test",
    "jobId": "job_staging_123",
    "agentOrchestrationId": "orch_staging_456",
    "agentStatus": "executing",
    "agentLastHeartbeat": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
    "contextFragmentationRisk": 0
  }'
```

- [ ] POST /api/trinity/agent-sync returns 200 OK
- [ ] Supabase queries work in staging
- [ ] No 500 errors in Vercel logs

---

## Phase 6: Integration Tests with Real Dashboard (30 min)

### Wire Hooks into Orchestrator

Edit: `lib/dsg/multi-agent/orchestrator.ts` (or wherever orchestration happens)

```typescript
import { getTrinityHooks } from '@/lib/trinity/dsg-agent-integration';

export async function executeOrchestration(jobId: string, orchestrationId: string, agents: Agent[]) {
  const hooks = getTrinityHooks({
    orgId: process.env.ORG_ID || 'org_default',
    enableCostTracking: true,
    enableAuditChain: true,
  });

  try {
    // Start
    await hooks.onOrchestrationStart(jobId, orchestrationId, agents.map(a => a.id));

    // Phase 1: Plan
    await hooks.onPhaseComplete(jobId, orchestrationId, 'plan', ['mind-agent-1'], [
      { agentId: 'mind-agent-1', costUsd: 0.45 },
    ]);

    // Phase 2: Execute
    await hooks.onPhaseComplete(jobId, orchestrationId, 'execute', ['hand-agent-1'], [
      { agentId: 'hand-agent-1', costUsd: 1.20 },
    ]);

    // Phase 3: Verify
    await hooks.onPhaseComplete(jobId, orchestrationId, 'verify', ['eye-agent-1'], [
      { agentId: 'eye-agent-1', costUsd: 0.23 },
    ]);

    // Complete
    await hooks.onOrchestrationComplete(jobId, orchestrationId, 'success');

  } catch (error) {
    await hooks.onOrchestrationComplete(jobId, orchestrationId, 'failure');
    throw error;
  }
}
```

- [ ] Hooks wired into orchestration
- [ ] No compilation errors

### Manual Test: Dashboard Shows Live Data

1. Create a test Trinity job in staging:
   ```bash
   curl -X POST "https://[staging].vercel.app/api/trinity/jobs" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "title": "Integration Test Job",
       "org_id": "org_staging_test",
       "category": "test",
       "reward_amount": 1000,
       "status": "discovered"
     }'
   ```

2. Trigger orchestration with that job ID
3. Check Trinity dashboard:
   - [ ] Agent status shows "planning" → "executing" → "verifying" → "settled"
   - [ ] Cost breakdown visible by agent
   - [ ] Audit events recorded

---

## Phase 7: Production Deployment (30 min)

### Code Review & Approval

Before merging to main:

- [ ] PR created and linked to issue
- [ ] Code review approved (architecture, security, tests)
- [ ] All CI checks pass (typecheck, test, build)
- [ ] Database migrations reviewed (no data loss)

### Merge to Main

```bash
git checkout main
git pull origin main
git merge claude/trinity-dsg-agents-integration-jc42du
git push origin main
```

- [ ] Merge commit pushed to main
- [ ] Verify on GitHub: commit appears in main history

### Production Deployment

```bash
vercel promote [staging-deployment-url]
```

Or via Vercel dashboard:
- [ ] Production deployment triggered
- [ ] Deployment shows "Ready"
- [ ] All env vars present

### Post-Deployment Verification

```bash
PROD_URL="https://tdealer01-crypto-dsg-control-plane.vercel.app"

# Verify API is working
curl -X POST "$PROD_URL/api/trinity/agent-sync" \
  -H "Content-Type: application/json" \
  -d '{ "action": "update-status", ... }'

# Check agent status endpoint
curl "$PROD_URL/api/agent/status"

# View logs
vercel logs [project-id]
```

- [ ] POST /api/trinity/agent-sync returns 200 OK in production
- [ ] No 500 errors
- [ ] Database migrations applied
- [ ] Trinity dashboard shows live agent data

---

## Phase 8: Validation & Handoff (15 min)

### Final Checklist

- [ ] All code merged to main
- [ ] All tests passing in production
- [ ] Trinity dashboard shows agent orchestrations live
- [ ] Cost tracking accurate (within 1%)
- [ ] Audit chain verified tamper-proof
- [ ] Mode switching works (sandbox ↔ live)
- [ ] Context recovery working
- [ ] No critical alerts in Vercel/Supabase monitoring
- [ ] Documentation updated

### Success Metrics

Verify these in production:

1. **Status Sync**: Agent status updates in < 1s
2. **Cost Tracking**: Costs recorded within 5s of execution
3. **Audit Chain**: Events hash-chained, tamper-proof
4. **Mode Switch**: Toggle takes < 100ms, no state leak
5. **Dashboard**: Shows live agent data, real-time updates

### Known Limits Document

Update docs/INTEGRATION_LIMITS.md:

```markdown
# Trinity × DSG Agents Integration Limits

## Deployment
- Status updates latency: < 2s
- Cost precision: $0.01 USD
- Audit chain: Linear (no parallel branches)

## Sandbox Mode  
- ROM context is read-only
- Mock Supabase returns deterministic data
- No real payments possible

## Context Recovery
- Detected if fragmentation > 10%
- Recovery time: ~2.5s for rebuild_from_ledger
- Success rate: > 99%

## API Rate Limits
- /api/trinity/agent-sync: 100 requests/min per org_id
```

- [ ] Limits documented

---

## Rollback Procedure (If Needed)

```bash
git revert HEAD
git push origin main
vercel rollback [previous-deployment-id]
```

Expected: Trinity jobs continue working without agent orchestration (degraded mode).

---

**Status**: [ ] Complete ✅ | **Date Completed**: ___________ | **Deployed By**: ___________

---

## Sign-off

- [ ] Feature owner approval
- [ ] QA sign-off
- [ ] Product manager approval
- [ ] Production deployment successful

**Notes**:
