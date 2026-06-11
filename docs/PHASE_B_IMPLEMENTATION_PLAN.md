# Phase B Implementation Plan — Operator Collaboration Features

**Date:** 2026-06-10  
**Status:** In Progress (3 agents working in parallel)  
**Phase A Status:** ✅ Complete  

---

## Phase B Goal

Enable human-in-the-loop collaboration: operators can now intervene mid-execution, compare results, and receive smart alerts about system degradation.

---

## Components Being Implemented

### 1. Operator Review Gate (Agent: a11bd6b1319efa85f)

**Purpose:** Allow operators to approve or block HIGH/CRITICAL actions before execution.

**Database Schema:**
```sql
CREATE TABLE agi_review_gates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id TEXT NOT NULL,
  reviewer_id UUID,
  status TEXT CHECK (status IN ('PENDING', 'APPROVED', 'BLOCKED', 'DELEGATED')),
  reason TEXT,
  created_at TIMESTAMP DEFAULT now(),
  resolved_at TIMESTAMP
);
```

**UI Component:** ReviewGatePanel
- Shows risk level, affected users, rollback option
- Three action buttons: [✅ Confirm] [❌ Block] [🤔 Delegate]
- Posts to `/api/dsg/hermes/review-gate`

**Enables:** Agent → Asks for approval → Operator approves/blocks → Agent executes (or stops)

---

### 2. Smart Alerts System (Agent: a34f506b78239947d)

**Purpose:** Notify operator when system health degrades (queue backing up, cache failing, latency high).

**Alert Rules:**
1. Queue > 80% → CRITICAL "Queue backing up, consider scaling"
2. Cache hit < 50% → WARNING "Cache performance degrading"
3. P99 latency > 500ms → WARNING "High latency detected"
4. Executor capacity > 90% → CRITICAL "Executor near capacity"

**UI Component:** AlertToast
- Toast notifications (top-right, 5s auto-dismiss)
- Color-coded: INFO (blue), WARNING (amber), CRITICAL (red + pulse)
- Snooze/Dismiss buttons
- Deduplication: max 1 alert per rule per 30s

**Enables:** Operator sees degradation immediately without checking Parallel tab

---

### 3. Execution Comparison (Agent: a4d827f593998d64b)

**Purpose:** Compare two executions side-by-side to see what changed.

**UI Component:** ComparisonPanel
- Before/After columns
- Highlights: +added (green), -removed (red), ~changed (amber)
- Delta summary: "+1 agent added, same 3 orgs"
- Uses diffJson() client-side helper

**Enables:** Operator can audit execution effects: "Did the deployment actually add users?"

---

## Timeline

- **Agent 1 (Review Gate):** ETA 10-15 min
- **Agent 2 (Smart Alerts):** ETA 10-15 min
- **Agent 3 (Execution Comparison):** ETA 10-15 min
- **Integration:** 5-10 min (merge all 3 into page.tsx)
- **Testing:** 5 min (typecheck + build)
- **Total:** ~45 min

---

## Files to be Modified/Created

| File | Type | Lines | Purpose |
|------|------|-------|---------|
| supabase/migrations/XXX_add_review_gates.sql | NEW | 20 | Review gate table |
| app/api/dsg/hermes/review-gate/route.ts | NEW | 60 | Review gate API |
| app/dashboard/hermes/page.tsx | MODIFY | +400 | New components + integration |
| lib/database.types.ts | MODIFY | +10 | TypeScript types from schema |

---

## Integration Checklist

- [ ] Agent 1 completes: Review Gate (DB + API + UI)
- [ ] Agent 2 completes: Smart Alerts (Context + UI + Rules)
- [ ] Agent 3 completes: Execution Comparison (Component + Helper)
- [ ] Merge all changes into page.tsx
- [ ] Typecheck: `npm run typecheck`
- [ ] Build: `npm run build`
- [ ] Commit with summary

---

## Success Criteria

**Operator Decision Time:** <30 sec (from "Alert fired" to "Action taken")
- Before: Spot degradation manually, find Parallel tab, read metrics, decide action
- After: Toast notification → [View Parallel] click → See colored health card → Decide
- Target: ✅ <30 sec decision loop

**Action Approval Workflow:** Agent asks → Operator approves (1 click) → Agent executes
- Before: No approval, pure autonomous
- After: Risk gated by human review
- Target: ✅ Collaboration enabled

**Execution Auditing:** Compare results to understand effect
- Before: Can't easily see what changed
- After: [Compare] button → side-by-side diff
- Target: ✅ Audit ready

---

## Phase B → Phase C Roadmap

After Phase B is complete and tested:

**Phase C (Long-term, 3 items):**
1. **Agent ↔ Operator Conversation** — Operator can reply mid-execution, agent asks clarifying questions
2. **Execution Timeline/Gantt** — Visual timeline showing queue wait + harmony lookup + executor time
3. **Configurable Alert Thresholds** — Operator can tune alert rules per org

---

## Next Steps

1. Wait for 3 agents to complete
2. Review changes from each agent
3. Integrate into page.tsx (resolve any conflicts)
4. Run typecheck + build
5. Commit with summary
6. Document any new limitations or known issues
7. Prepare Phase C scope (if time permits)

---

**Status:** Waiting for agent completion notifications...
