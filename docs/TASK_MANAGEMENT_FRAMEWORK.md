# Task Management Framework for DSG Control Plane

ตามที่เราศึกษาจากแนวคิด task management สมัยใหม่ (Zapier), บทความนี้อธิบายวิธีประยุกต์ใช้ task management ในบริบทของ **DSG Control Plane** — AI governance platform ที่มี multi-agent orchestration

---

## 1. Task Management Philosophy

### 1.1 แนวคิดพื้นฐาน

**Task automation is the behind-the-scenes magic that moves to-dos from your email inbox, calendar, saved web pages, or scattered systems into a unified, traceable execution pipeline.**

ในบริบทของ DSG Control Plane:
- **Tasks** = AI jobs ที่ต้องทำ (job discovery, execution, verification)
- **Automation** = Deterministic governance + runtime spine pipeline
- **Unified system** = Trinity Multi-Agent System + Supabase audit trail

### 1.2 ประโยชน์หลัก

#### ✅ ลดความเหนื่อยจิตใจ (Reduce Mental Load)
- ไม่ต้องจดจำ job สถานะ/deadline เอง
- Supabase audit trail ติดตามทุก execution
- Dashboard แสดง status realtime

#### ✅ รวมข้อมูลไว้ที่เดียว (Centralize Information)
- Jobs from GitHub + Immunefi ดึงผ่าน `GET /api/trinity/discover`
- Execution history + agent profile ใน `GET /api/trinity/history`
- Audit logs บันทึกใน `job_executions` table

#### ✅ ลดข้อผิดพลาด (Reduce Human Error)
- Policy gates ตรวจ 5 constraints ก่อน execution
- Deterministic hashing (`planHash`, `proofHash`, `auditHash`)
- RLS policies คุมสิทธิ์ access ตามหน้าที่

#### ✅ ปล่อยเวลากลับคืนเพื่อจริง (Get Time Back)
- Automation ทำ repetitive work (validation, proof generation)
- AI agents (Mind, Hand, Eye, Nerve, Spine) ลำไว้เพื่อจิตใจ
- Operators โฟกัสที่ strategic decisions แทน manual work

---

## 2. DSG Control Plane Task Model

### 2.1 Task Types (6 Categories)

| Task Type | Source | Handler | Entry Point |
|-----------|--------|---------|------------|
| **Job Discovery** | GitHub Issues + Immunefi API | Mind Agent | `GET /api/trinity/discover` |
| **Execution Request** | Dashboard submission | Hand Agent | `POST /api/trinity/execute-job` |
| **Quality Verification** | Hand agent output | Eye Agent | Inline in orchestrate flow |
| **Reputation Update** | Execution outcome | Nerve Agent | Post-execution callback |
| **Governance Gate** | Any execution request | Spine Agent | `POST /api/dsg/v1/gates/evaluate` |
| **Audit & Compliance** | Runtime spine | CCVS pipeline | `/api/ccvs:pipeline` |

### 2.2 Task Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│ 1. DISCOVER                                                 │
│    Mind Agent fetches from GitHub + Immunefi               │
│    → stores in memory (no DB write until submission)       │
└──────────────────────┬──────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. SUBMIT FOR EXECUTION                                    │
│    Operator selects job → POST /api/trinity/execute-job   │
│    → Hand Agent generates deliverable                      │
└──────────────────────┬──────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. GOVERNANCE GATE                                         │
│    Spine Agent evaluates 5 policy constraints:            │
│    • Agent Active (reputation ≥ 0)                        │
│    • Job Amount Valid (0 < reward < 100,000)             │
│    • Deadline Valid (deadline in future)                  │
│    • Agent Qualified (skills.length > 0)                 │
│    • No Sanctions (reputation ≥ 0)                       │
│    → PASS / REVIEW / BLOCK                              │
└──────────────────────┬──────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. DETERMINISTIC PROOF GENERATION                          │
│    Z3-backed proof chain:                                  │
│    • planHash = SHA-256(plan snapshot)                    │
│    • proofHash = SHA-256(policy + constraints)           │
│    • auditHash = SHA-256(execution + evidence)           │
└──────────────────────┬──────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. VERIFY QUALITY                                          │
│    Eye Agent scores output ≥70%                           │
│    → If fail: reject execution + flag for review         │
└──────────────────────┬──────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. REPUTATION UPDATE & COMMIT                              │
│    Nerve Agent updates agent tier (Bronze → Platinum)     │
│    → runtime_commit_execution writes to audit trail      │
│    → Supabase job_executions row persisted              │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 Task State Machine

```
PENDING
  ├─ [governance: PASS] → APPROVED
  ├─ [governance: REVIEW] → UNDER_REVIEW
  └─ [governance: BLOCK] → REJECTED

APPROVED
  ├─ [verify: PASS] → COMPLETED
  ├─ [verify: FAIL] → NEEDS_REWORK
  └─ [error] → FAILED

COMPLETED
  └─ [reputation: +delta] → ARCHIVED (with proof chain)
```

---

## 3. Integration Points with Existing Infrastructure

### 3.1 Supabase Tables

**Task-related tables:**

```sql
-- Job metadata (from GitHub/Immunefi)
SELECT * FROM jobs WHERE agent_id = $1 ORDER BY created_at DESC;

-- Execution history + outcomes
SELECT * FROM job_executions 
WHERE agent_id = $1 AND status = 'COMPLETED'
ORDER BY executed_at DESC;

-- Agent profiles (reputation, skills, tier)
SELECT * FROM agent_profiles WHERE id = $1;

-- Audit trail (compliance + CCVS)
SELECT * FROM runtime_executions
WHERE execution_id = $1;
```

### 3.2 API Routes for Task Management

#### Discovery
```http
GET /api/trinity/discover
  → Live job discovery from GitHub + Immunefi
  → Returns: [{ id, title, reward, deadline, skills_required }]
```

#### Submission & Orchestration
```http
POST /api/trinity/execute-job
  body: { job_id, agent_id, dry_run=true }
  → Hand Agent generates deliverable
  → Spine gates the execution
  → Eye verifies quality
  → Returns: { status, proof_hash, audit_hash, execution_id }

POST /api/trinity/orchestrate
  body: { job_id, agent_id, dry_run=true }
  → Full governance → execution → verification cycle
  → Returns: { decision, reason, planHash, proofHash, auditHash }
```

#### History & Status
```http
GET /api/trinity/history?agent_id=X&limit=10
  → Execution history + outcomes
  → Returns: [{ job_id, status, reward, proof_hash, completed_at }]

GET /api/executions?status=COMPLETED
  → Authenticated operator view of all executions
  → RLS enforces org/workspace scoping
```

### 3.3 Deterministic Gate & Proof Scaffold

**Policy evaluation:**
```http
POST /api/dsg/v1/gates/evaluate
  body: { 
    agent_id, 
    job_amount, 
    deadline, 
    skills_present, 
    reputation_score 
  }
  → Evaluates 5 constraints deterministically
  → Returns: { decision: PASS|REVIEW|BLOCK, proof, constraints_met }
```

**Key rule:** `UNSUPPORTED` is never mapped to `PASS`.

### 3.4 CCVS Evidence Chain

**Compliance verification:**
```bash
npm run ccvs:pipeline
  → Collects L1-L5 evidence levels
  → Generates compliance matrix
  → Outputs `coverage/evidence.json` + chain hashes
  → Pre-audit evidence mapping (not legal certification)
```

---

## 4. Best Practices for Task Management in DSG

### 4.1 Task Intake & Prioritization

✅ **DO:**
- Centralize all job sources (GitHub Issues, Immunefi, manual submissions)
- Use `dry_run=true` by default for new job types
- Include context: deadline, required skills, risk level

❌ **DON'T:**
- Bypass governance gates to speed up task approval
- Accept jobs with `reward = 0` or `deadline = null`
- Mix mock data with production execution data

### 4.2 Execution Guardrails

✅ **DO:**
- Generate deterministic proof hashes for every execution
- Log all decisions (PASS/REVIEW/BLOCK) with rationale
- Use agent reputation as a feedback signal

❌ **DON'T:**
- Allow `UNSUPPORTED` governance decisions to proceed
- Skip quality verification (Eye agent) even for urgent jobs
- Discard audit trails for "failed" executions

### 4.3 Monitoring & Observability

✅ **DO:**
- Track task completion rate per agent
- Monitor governance decision distribution (PASS vs BLOCK ratio)
- Alert on reputation drift (sudden drops)
- Log time-to-completion per task type

❌ **DON'T:**
- Rely only on Vitest passing (doesn't prove deployment works)
- Trust mock data as production evidence
- Hide failed orchestrations in logs

### 4.4 Compliance & Evidence

✅ **DO:**
- Run CCVS pipeline before production claims
- Preserve `planHash`, `proofHash`, `auditHash` in audit trail
- Include both L1 (unit) and L3 (adversarial) evidence levels

❌ **DON'T:**
- Claim `production-ready` without full gate sequence passing
- Overstate formal-verification scope (design-time Z3 ≠ runtime guarantee)
- Mix compliance matrix output with legal certification claims

---

## 5. Recommended Task Automation Workflows

### 5.1 Daily Sync: New Job Discovery

**Trigger:** Schedule daily (cron: `0 9 * * *`)

```
1. GET /api/trinity/discover
   ↓ (filter by deadline ≤ 7 days)
   ↓
2. Notify team (Slack webhook) with top 3 opportunities
   ↓
3. Log discovery in Supabase audit table
   ↓
4. Dashboard shows refresh timestamp
```

**Benefits:**
- Operators see new jobs without checking external sites
- Reduced context switching
- Automated filtering by urgency

### 5.2 Pre-Execution Checklist: Policy + Proof

**Trigger:** Before `POST /api/trinity/execute-job`

```
1. ✅ Agent reputation ≥ minimum threshold
2. ✅ Job reward in allowed range
3. ✅ Deadline in future
4. ✅ Skills match (agent.skills ∩ job.skills_required ≠ ∅)
5. ✅ No active sanctions
   ↓
6. If all pass → Proceed to governance gate
   If any fail → Return BLOCK with remediation steps
```

**Evidence:**
- Governance decision logged with timestamp + rationale
- Proof hashes stored in `job_executions.proof_chain`

### 5.3 Post-Execution Verification: Quality + Reputation

**Trigger:** After successful execution

```
1. Eye Agent verifies deliverable quality (threshold ≥ 70%)
   ↓
2. Nerve Agent calculates reputation delta
   ├─ Excellence (+25) → next tier unlock
   ├─ Good (+10) → progress toward tier
   ├─ Acceptable (+5) → maintain tier
   └─ Poor (-15) → tier downgrade
   ↓
3. CCVS pipeline generates compliance evidence
   ↓
4. Supabase writes final state:
   - job_executions row (status=COMPLETED, proof_chain JSON)
   - agent_profiles row (reputation, tier, updated_at)
   ↓
5. Dashboard updates realtime via polling / WebSocket
```

### 5.4 Weekly Report: Task Metrics & Trends

**Trigger:** Schedule Friday (cron: `0 17 * * FRI`)

```sql
-- Task completion rate
SELECT 
  agent_id,
  COUNT(*) as total_jobs,
  SUM(CASE WHEN status='COMPLETED' THEN 1 ELSE 0 END) as completed,
  ROUND(100.0 * SUM(CASE WHEN status='COMPLETED' THEN 1 ELSE 0 END) / COUNT(*), 2) as completion_rate
FROM job_executions
WHERE executed_at >= NOW() - INTERVAL '7 days'
GROUP BY agent_id
ORDER BY completion_rate DESC;

-- Governance gate effectiveness
SELECT 
  decision,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM governance_decisions
WHERE evaluated_at >= NOW() - INTERVAL '7 days'
GROUP BY decision;

-- Task time-to-completion
SELECT 
  agent_id,
  AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600.0) as avg_hours,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (completed_at - created_at))) as median_seconds
FROM job_executions
WHERE status='COMPLETED' AND executed_at >= NOW() - INTERVAL '7 days'
GROUP BY agent_id;
```

**Output:** Email report to operators + Slack summary

---

## 6. Tools & Integration Partners

### 6.1 Built-In (Already in DSG Control Plane)

| Tool | Purpose | Endpoint |
|------|---------|----------|
| **Supabase** | Persistent task storage + audit trail | DB operations via `/api/` routes |
| **Trinity Multi-Agent System** | Task discovery, execution, verification | `/api/trinity/*` routes |
| **Spine Policy Engine** | Governance gates + deterministic proofs | `/api/dsg/v1/gates/evaluate` |
| **CCVS Pipeline** | Compliance evidence collection | `npm run ccvs:pipeline` |
| **Vercel Cron** | Scheduled task triggers | `vercel.json` cron config |

### 6.2 Optional Additions (Zapier-style)

If you want to automate task intake from external sources:

```javascript
// Example: Connect Zapier webhook for new GitHub issues
POST /api/webhooks-config
  body: {
    event: "github.issue.created",
    action: "POST /api/trinity/discover?source=github_webhook",
    notify: "slack"
  }
```

This would automatically:
1. Trigger job discovery when GitHub issue posted
2. Filter by labels (e.g., `bounty`, `urgent`)
3. Push new jobs to Slack channel
4. Update Trinity dashboard

---

## 7. Metrics & Success Criteria

### 7.1 Task Automation Health

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Job discovery latency** | < 1 minute from source | Query `jobs.created_at` vs source timestamp |
| **Governance gate P99** | < 500ms | Log endpoint response times |
| **Execution completion rate** | > 90% | `SUM(COMPLETED) / SUM(ALL)` from Supabase |
| **Quality pass rate** | > 85% | Eye Agent threshold / total executions |
| **Audit trail integrity** | 100% | CCVS evidence chain validation |
| **Operator feedback loop** | < 4 hours | Time from execution → reputation update |

### 7.2 User Value Indicators

- ✅ **Reduced decision time:** Operators decide in < 5 min (no hunting for data)
- ✅ **Increased job throughput:** Agent capacity utilization ≥ 70%
- ✅ **Zero manual proof generation:** All proofs auto-generated + verified
- ✅ **Compliance ready:** CCVS matrix pass before any production claim

---

## 8. Known Limitations & Future Work

### Current State (✅ MVP)

- ✅ Discovery from GitHub + Immunefi
- ✅ Deterministic governance gates (5 constraints)
- ✅ Proof hashing (SHA-256 chain)
- ✅ Basic quality verification (Eye agent scoring)
- ✅ Reputation tracking (Nerve agent tier progression)
- ✅ Supabase audit trail
- ✅ Dashboard realtime status

### Not Yet Implemented (🚀 Roadmap)

- ❌ External Z3 solver invocation (currently TypeScript deterministic only)
- ❌ Multi-workspace task routing (currently single org)
- ❌ Advanced ML-based task prioritization
- ❌ Automatic remediation proposals
- ❌ Integration with Zapier / Make.com (webhook flows)
- ❌ Mobile task push notifications

### Design-Time Only (⚠️ Don't claim as runtime)

- Design-time formal proofs: `npm run verify:policy` (Z3-checked)
- Revenue formal proofs: `npm run proof:revenue` (Z3-checked)
- These are **audit-ready evidence**, not **production guarantees**

---

## 9. Getting Started

### For New Operators

1. **Read this file** (you are here ✅)
2. **Explore `/dashboard/trinity`** — see live job discovery
3. **Try dry-run execution:**
   ```bash
   curl -X POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/trinity/execute-job \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_JWT" \
     -d '{ "job_id": "demo-1", "agent_id": "mind-1", "dry_run": true }'
   ```
4. **Monitor audit trail** in `/dashboard/executions`
5. **Check compliance** via `/api/ccvs:pipeline` output

### For Developers

1. **Add task type:** Update `lib/spine/` task handler
2. **Add governance constraint:** Modify `/api/dsg/v1/gates/evaluate`
3. **Add evidence collection:** Update CCVS pipeline in `lib/ccvs/`
4. **Test:** `npm run test:integration -- trinity`
5. **Verify:** `npm run build && npm run go:no-go https://...`

---

## 10. References

- **[Zapier Task Management](https://zapier.com/blog/task-management/)** — industry best practices
- **[CLAUDE.md](../CLAUDE.md)** — project truth and boundaries
- **[docs/RUNBOOK_DEPLOY.md](./RUNBOOK_DEPLOY.md)** — deployment checklist
- **[lib/spine/](../lib/spine/)** — runtime spine implementation
- **[lib/dsg/deterministic/](../lib/dsg/deterministic/)** — gate scaffold
- **[README.md](../README.md)** — Trinity Multi-Agent System overview

---

**Last updated:** 2026-06-29  
**Branch:** `claude/task-management-research-1642w6`  
**Status:** ✅ Evidence-ready documentation
