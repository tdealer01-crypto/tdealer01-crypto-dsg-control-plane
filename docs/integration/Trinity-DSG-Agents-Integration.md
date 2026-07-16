# Trinity × DSG Agents Phase 5 Integration Architecture

**Status**: Integration-Ready | **Date**: 2026-07-16 | **Branch**: `claude/trinity-dsg-agents-integration-jc42du`

---

## Executive Summary

This document defines the **Phase 5 integration** between Trinity (job workflow control plane) and DSG Agents (7-agent orchestration system). The integration adds real-time agent status, cost tracking, audit trails, and sandbox/live mode switching to Trinity's job execution pipeline.

**Key Outcome**: Trinity gets full visibility + control over agent orchestrations, enabling production-grade monitoring and cost governance.

---

## 1. Current Architecture

### Trinity (Job Workflow System)

Trinity manages bounty/job lifecycle:

```
discovered → claimed → in_progress → submitted → verified/rejected → paid
```

Tables:
- `trinity_jobs` — job metadata, status, rewards
- `trinity_deliverables` — submitted work + quality score
- `trinity_settlements` — payment/verification audit trail
- `trinity_audit_events` — tamper-proof event log

Agent profiles (currently disabled):
- `agent_profiles` — reputation, tier, skills
- `earnings_records` — per-job earnings
- `job_executions` — execution history

### DSG Agents Phase 5 (7-Agent OS)

Agents:
1. **Mind** (Planner) — job discovery + selection
2. **Hand** (Executor) — execution + submission
3. **Eye** (Observer) — result validation + monitoring
4. **Nerve** (Processor) — event processing + feedback loop
5. **Spine** (Reflexes) — coordination + error recovery
6. **Hermes** (Communicator) — multi-agent messaging + subagent orchestration
7. **AGI** (Future) — long-horizon planning + adaptation

Database tables:
- `dsg_agent_ledger` — agent execution log (immutable)
- `dsg_agent_profiles` — agent config + permissions
- `dsg_orchestrations` — multi-agent run metadata
- `dsg_costs` — per-agent execution costs (metered)

---

## 2. Integration Points (5 Touch Points)

### Integration Point 1: Agent Status → Trinity Dashboard

**What**: When a DSG agent starts/completes an orchestration, record status in Trinity.

**Flow**:
```
DSG Agent Orchestration Start
  → `dsg_orchestrations.status = 'in_progress'`
  → Call `/api/trinity/agent-sync/update-status`
  → Trinity `trinity_jobs.status` updates to reflect agent readiness
  ← Dashboard shows: "Agent running (Mind+Hand+Eye)"
```

**Schema Change**: Add to `trinity_jobs`:
```sql
ADD COLUMN agent_orchestration_id text REFERENCES dsg_orchestrations(id),
ADD COLUMN agent_status text DEFAULT 'idle' CHECK (agent_status IN ('idle', 'planning', 'executing', 'verifying', 'settled')),
ADD COLUMN agent_last_heartbeat timestamptz,
ADD COLUMN context_fragmentation_risk numeric DEFAULT 0,
ADD COLUMN agent_log_cid text
```

**Verification**: Query returns agent status within 2 seconds.

---

### Integration Point 2: Cost Tracking → Trinity Budget Gates

**What**: Real-time cost flow from DSG metrics → Trinity job economics.

**Flow**:
```
DSG Agent executes (costs $0.45/plan, $1.20/execute, $0.23/observe, etc.)
  → Record in `dsg_costs` (Metered)
  → Calculate total per job in `/api/trinity/agent-sync/record-cost`
  → Trinity `trinity_jobs.execution_cost` increments
  ← Dashboard shows: "Cost: $2.08/job (within $5 budget)"
  ← Auto-alert if cost > threshold (e.g., $3/job)
```

**Schema Change**: Add to `trinity_jobs`:
```sql
ADD COLUMN execution_cost_usd numeric DEFAULT 0,
ADD COLUMN execution_cost_budget numeric DEFAULT 5.0,
ADD COLUMN cost_alert_threshold numeric DEFAULT 3.0,
ADD COLUMN cost_overrun_flag boolean DEFAULT false
```

**Verification**: Cost recorded within 5 seconds of execution; budget gate blocks if overrun.

---

### Integration Point 3: Audit Trail → Tamper-Proof Chain

**What**: Every agent decision gets hash-chained in Trinity audit log.

**Flow**:
```
DSG Agent makes decision (e.g., "BLOCK this execution")
  → Hash = SHA256(agent_id || timestamp || decision || previous_hash)
  → Post to `/api/trinity/agent-sync/record-audit`
  → Trinity `trinity_audit_events` appends immutable entry
  ← Dashboard shows: Hash chain a1b2c3 → d4e5f6 (tamper-proof)
  ← Export for compliance audit
```

**Schema**: Use existing `trinity_audit_events` (already hash-chained).

**Verification**: Query chain returns verified hash sequence; detect tampering via broken chain.

---

### Integration Point 4: Mode Switching (Sandbox ↔ Live)

**What**: Toggle agent to sandbox for testing; switch to live for production.

**Flow**:
```
User clicks "Test in Sandbox" on Trinity dashboard
  → POST /api/trinity/agent-sync/set-mode { agent_id, mode: 'sandbox' }
  → DSG Agent context set to read-only ROM + mock Supabase
  → Job executes in sandbox (no real payments)
  ← Dashboard shows: "Agent in SANDBOX mode (test run)"
  
After verification, click "Go Live"
  → PUT /api/trinity/agent-sync/set-mode { agent_id, mode: 'live' }
  → DSG Agent context switches to real DB + real Stripe
  ← Dashboard shows: "Agent in LIVE mode (production)"
```

**Schema Change**: Add to `dsg_agent_profiles`:
```sql
ADD COLUMN execution_mode text DEFAULT 'sandbox' CHECK (execution_mode IN ('sandbox', 'live')),
ADD COLUMN mode_locked_by text,
ADD COLUMN mode_locked_until timestamptz
```

**Verification**: Mode toggle takes <100ms; no state leak between modes.

---

### Integration Point 5: Continuity & Fallback

**What**: If DSG Agent context is fragmented or corrupted, gracefully degrade.

**Flow**:
```
DSG Agent detects context fragmentation > 50%
  → Record in `dsg_orchestrations.context_fragmentation_risk`
  → Call `/api/trinity/agent-sync/report-fragmentation`
  → Trinity job pauses (status = 'pending_agent_diagnosis')
  ← Dashboard alert: "Agent context fragmented (2.8%) — auto-recovery in progress"
  
Auto-recovery triggered:
  → Spine agent rebuilds context from immutable ledger
  → Verify all state reconstructed correctly
  → Resume job execution
  ← Dashboard updates: "Agent context recovered (0.1%)"
```

**Schema Change**: Add to `trinity_jobs`:
```sql
ADD COLUMN context_recovery_attempt_count integer DEFAULT 0,
ADD COLUMN context_last_verified_at timestamptz
```

**Verification**: Fragmentation detection accurate; recovery success rate > 99%.

---

## 3. API Routes

### POST /api/trinity/agent-sync/update-status
Update Trinity with agent orchestration status.

**Request**:
```json
{
  "job_id": "job_123",
  "agent_orchestration_id": "orch_456",
  "agent_status": "executing",
  "agent_last_heartbeat": "2026-07-16T10:30:00Z",
  "context_fragmentation_risk": 0.028,
  "agent_log_cid": "QmAbc123..."
}
```

**Response**:
```json
{
  "ok": true,
  "trinity_job_updated": {
    "id": "job_123",
    "agent_status": "executing",
    "updated_at": "2026-07-16T10:30:01Z"
  }
}
```

---

### POST /api/trinity/agent-sync/record-cost
Record DSG cost event in Trinity.

**Request**:
```json
{
  "job_id": "job_123",
  "agent_id": "mind-agent-1",
  "operation": "plan",
  "cost_usd": 0.45,
  "tokens_used": 1200,
  "timestamp": "2026-07-16T10:30:00Z"
}
```

**Response**:
```json
{
  "ok": true,
  "job_total_cost": 2.08,
  "budget_remaining": 2.92,
  "budget_alert": false
}
```

---

### POST /api/trinity/agent-sync/record-audit
Append immutable audit entry to Trinity chain.

**Request**:
```json
{
  "job_id": "job_123",
  "agent_id": "hand-agent-1",
  "event_type": "execution_decision",
  "actor_id": "hand-agent-1",
  "payload": {
    "decision": "SUBMIT",
    "deliverable_hash": "a1b2c3...",
    "confidence": 0.98
  }
}
```

**Response**:
```json
{
  "ok": true,
  "event_hash": "d4e5f6...",
  "chain_hash": "previous_hash → d4e5f6 → next_expected_hash",
  "sequence": 42
}
```

---

### PUT /api/trinity/agent-sync/set-mode
Switch agent between sandbox and live.

**Request**:
```json
{
  "agent_id": "hand-agent-1",
  "mode": "live",
  "authorized_by": "user@dsg.pics",
  "reason": "Production launch approved"
}
```

**Response**:
```json
{
  "ok": true,
  "agent_mode": "live",
  "mode_effective_at": "2026-07-16T10:30:00Z",
  "warning": "All executions now cost real money"
}
```

---

### POST /api/trinity/agent-sync/report-fragmentation
Report agent context fragmentation for recovery.

**Request**:
```json
{
  "job_id": "job_123",
  "agent_orchestration_id": "orch_456",
  "fragmentation_risk": 0.50,
  "fragmented_contexts": ["mind_context", "hand_cache"],
  "recovery_strategy": "rebuild_from_ledger"
}
```

**Response**:
```json
{
  "ok": true,
  "recovery_initiated": true,
  "job_paused": true,
  "estimated_recovery_time_ms": 2500
}
```

---

## 4. Database Migrations

### Migration 1: Trinity Agents Integration Tables

```sql
-- Add agent orchestration columns to trinity_jobs
ALTER TABLE trinity_jobs ADD COLUMN IF NOT EXISTS agent_orchestration_id text;
ALTER TABLE trinity_jobs ADD COLUMN IF NOT EXISTS agent_status text DEFAULT 'idle';
ALTER TABLE trinity_jobs ADD COLUMN IF NOT EXISTS agent_last_heartbeat timestamptz;
ALTER TABLE trinity_jobs ADD COLUMN IF NOT EXISTS context_fragmentation_risk numeric DEFAULT 0;
ALTER TABLE trinity_jobs ADD COLUMN IF NOT EXISTS agent_log_cid text;

-- Add cost tracking columns
ALTER TABLE trinity_jobs ADD COLUMN IF NOT EXISTS execution_cost_usd numeric DEFAULT 0;
ALTER TABLE trinity_jobs ADD COLUMN IF NOT EXISTS execution_cost_budget numeric DEFAULT 5.0;
ALTER TABLE trinity_jobs ADD COLUMN IF NOT EXISTS cost_alert_threshold numeric DEFAULT 3.0;
ALTER TABLE trinity_jobs ADD COLUMN IF NOT EXISTS cost_overrun_flag boolean DEFAULT false;

-- Add context recovery columns
ALTER TABLE trinity_jobs ADD COLUMN IF NOT EXISTS context_recovery_attempt_count integer DEFAULT 0;
ALTER TABLE trinity_jobs ADD COLUMN IF NOT EXISTS context_last_verified_at timestamptz;

-- Add FK constraint
ALTER TABLE trinity_jobs ADD CONSTRAINT fk_trinity_jobs_dsg_orchestrations 
  FOREIGN KEY (agent_orchestration_id) REFERENCES dsg_orchestrations(id) ON DELETE SET NULL;

-- Add index for agent status queries
CREATE INDEX IF NOT EXISTS idx_trinity_jobs_agent_status ON trinity_jobs(org_id, agent_status);
CREATE INDEX IF NOT EXISTS idx_trinity_jobs_cost_overrun ON trinity_jobs(org_id, cost_overrun_flag);

-- Add agent mode column to dsg_agent_profiles
ALTER TABLE dsg_agent_profiles ADD COLUMN IF NOT EXISTS execution_mode text DEFAULT 'sandbox';
ALTER TABLE dsg_agent_profiles ADD COLUMN IF NOT EXISTS mode_locked_by text;
ALTER TABLE dsg_agent_profiles ADD COLUMN IF NOT EXISTS mode_locked_until timestamptz;

-- Create index for mode queries
CREATE INDEX IF NOT EXISTS idx_dsg_agent_profiles_mode ON dsg_agent_profiles(org_id, execution_mode);
```

---

## 5. Testing Strategy

### Unit Tests

- [ ] `test/trinity-dsg-integration/sync-status.test.ts` — Status updates propagate to Trinity
- [ ] `test/trinity-dsg-integration/cost-tracking.test.ts` — Cost events recorded + budget gates enforced
- [ ] `test/trinity-dsg-integration/audit-hash.test.ts` — Hash chain validates without gaps
- [ ] `test/trinity-dsg-integration/mode-switching.test.ts` — Sandbox/live toggle works + state isolated
- [ ] `test/trinity-dsg-integration/context-recovery.test.ts` — Fragmentation recovery rebuilds full state

### Integration Tests

- [ ] `test/trinity-dsg-integration/end-to-end.test.ts` — Full job lifecycle with all 5 integration points
  - Create job → Mind discovers → Hand executes → Eye verifies → Trinity records cost + audit → Dashboard shows live status
- [ ] `test/trinity-dsg-integration/sandbox-to-live.test.ts` — Test in sandbox, verify no real costs, switch to live
- [ ] `test/trinity-dsg-integration/cost-overrun-blocking.test.ts` — Job pauses when execution_cost_usd exceeds budget

### E2E Tests (Browser)

- [ ] `test/e2e/trinity-dashboard-agent-status.spec.ts` — Dashboard shows agent status live
- [ ] `test/e2e/trinity-dashboard-cost-tracking.spec.ts` — Cost breakdown visible by agent
- [ ] `test/e2e/trinity-mode-toggle.spec.ts` — User can click toggle, mode switches, no leak

---

## 6. Deployment Checklist

- [ ] Code review + approval (architecture + security)
- [ ] Database migrations applied to staging
- [ ] All unit + integration tests pass
- [ ] E2E tests pass in staging
- [ ] Staging smoke tests: agent-sync API responds in <1s
- [ ] Cost tracking accurate within 1% of expected
- [ ] Audit hash chain verified tamper-proof
- [ ] Mode switch tested (sandbox → live)
- [ ] Context recovery tested under fragmentation
- [ ] Dashboard displays live agent status
- [ ] Merge to main + deploy to production
- [ ] Verify production `/api/trinity/agent-sync/update-status` returns success
- [ ] Verify Trinity job shows agent_status field populated

---

## 7. Rollback Plan

If integration fails in production:

1. **Immediate**: Revert commit on main (git revert)
2. **Redeploy**: Next Vercel build auto-deploys
3. **Fallback**: Trinity jobs continue working without agent orchestration (degraded mode)
4. **Recovery**: Fix root cause, re-test in staging, re-deploy

---

## 8. Known Limits

- **Context Fragmentation**: Detected if > 10% of context corrupted; recovery takes ~2.5s
- **Cost Precision**: Tracked to $0.01 USD; actual Stripe billing rounds to $0.01
- **Audit Hash Chain**: Linear chain; does not support parallel event branches (acceptable for single-agent execution)
- **Sandbox Mode**: ROM is read-only; mock Supabase client returns deterministic test data
- **Mode Lock Duration**: Once locked, requires unlock by same authorized user or 24h timeout

---

## 9. References

- `lib/agents/` — Individual agent implementations
- `lib/dsg/multi-agent/` — Orchestration pipeline
- `lib/supabase/dsg-*` — Supabase integration layers
- `app/api/trinity/` — Trinity job API routes
- `supabase/migrations/20260630000000_trinity_end_to_end_workflow.sql` — Trinity schema
- `supabase/migrations/20260628000000_create_agent_profiles.sql` — Agent profiles schema

---

## 10. Success Criteria

✅ Trinity dashboard shows:
- Live agent status (Mind, Hand, Eye, Nerve, Spine, Hermes)
- Real-time cost tracking by agent
- Tamper-proof audit trail with hash chain
- Sandbox/live mode toggle

✅ DSG Agents integrate without breaking:
- Existing job workflow (discovered → paid)
- Existing agent execution pipeline
- Existing cost metering

✅ All tests pass:
- Unit tests for 5 integration points
- Integration tests for end-to-end job flow
- E2E tests for dashboard UX

✅ Production deployment succeeds:
- Zero downtime during deploy
- No data loss
- Fallback to degraded mode works

---

**Next Step**: Implement integration code → run tests → deploy → verify dashboard shows live agent data ✅
