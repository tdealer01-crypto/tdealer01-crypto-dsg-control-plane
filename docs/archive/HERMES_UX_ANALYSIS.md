# Hermes Dashboard UX/UI Analysis & Recommendations

**Date:** 2026-06-10  
**Version:** Phase 2 Integration Analysis

---

## Current State Analysis

### ✅ Strengths

1. **Rich Information Density**
   - 3 sidebar tabs (System, Hermes Runtime, **Parallel** Phase 2)
   - 9 quick command buttons for common tasks
   - Real-time metrics with 5-second updates
   - Tool step tracing for execution visibility

2. **Good Visual Hierarchy**
   - Color-coded decisions (ALLOW=green, BLOCK=red, REVIEW=amber)
   - Status icons for tool steps (spinning, OK, ERR, WAIT)
   - Clear message bubbles (user=emerald, agent=slate, system=centered)

3. **Accessibility Features**
   - Voice input (🎤 speech recognition, Thai language support)
   - File upload with preview (📎)
   - Camera capture (📷)
   - LIVE mode (continuous voice input with auto-send)

4. **Mobile-Aware Layout**
   - Sidebar hidden on small screens (lg: breakpoint)
   - Responsive grid for quick commands
   - Touch-friendly button sizes

---

## ❌ Critical UX Issues

### 1. **Cognitive Overload in Main Chat**
**Problem:** User sees raw SSE events (preflight → plan → step_start → step_result → done) scattered across chat  
**Impact:** Agent actions buried in stream, hard to follow execution flow  
**User feels:** "What just happened? Where's my answer?"

**Scenario:**
```
User: "List agents"
Agent shows: 
  - Preflight decision (ALLOW)
  - Plan: [listAgents tool]
  - Step start: tool running
  - Step result: [100 agents in JSON]
  - Done message
→ User sees 5 separate messages instead of 1 clear result
```

### 2. **Parallel Tab Metrics are Abstract**
**Problem:** Queue size, cache hit rate, latency numbers displayed without context  
**Impact:** Operator doesn't know if "p99: 850ms" is good or bad, what action to take  
**User feels:** "Pretty graphs but... what do I do with this?"

**Example:**
```
Queue depth: 245
Avg wait: 34ms
P95: 120ms
→ Is this normal? High? Low? What's the threshold?
```

### 3. **No Agent ↔ Operator Collaboration Loop**
**Problem:** Agent executes autonomously, operator can only watch/react  
**Impact:** No way for human to intervene mid-execution, confirm risky actions  
**User feels:** "I can't stop this if it goes wrong!"

**Missing flow:**
- Agent plans action → Operator reviews → Confirms/rejects → Agent executes
- Currently: Agent plans → Executes → Operator sees result

### 4. **Tool Results Not Actionable**
**Problem:** Long JSON results truncated at 800 chars, no filtering/sorting/export  
**Impact:** Can't slice data, compare executions, export for audit  
**User feels:** "I need to copy-paste this into another tool"

### 5. **Sidebar Tabs Fight for Attention**
**Problem:** System/Hermes/Parallel tabs are equal visual weight despite different purposes  
**Impact:** Operator forgets Phase 2 metrics exist, doesn't monitor queue health  
**User feels:** "I didn't even know that tab existed"

### 6. **No Real-Time Alerts**
**Problem:** If queue backs up to 1000+ or cache hit drops below 50%, nothing warns operator  
**Impact:** Degradation goes unnoticed until user complains  
**User feels:** "Why didn't I know the system was struggling?"

### 7. **Message History Search Missing**
**Problem:** 120 messages in history, no way to find past execution results  
**Impact:** Can't reference "what did we deploy last Tuesday?"  
**User feels:** Stuck scrolling up forever

---

## 🎯 Recommended UX Improvements

### Phase A: Immediate (Low effort, high impact)

#### 1. **Execution Summary Card** (replaces scattered steps)
```
┌─────────────────────────────────────────┐
│ Execution Summary                   [✓]  │
├─────────────────────────────────────────┤
│ Agent: cloud-analyzer-01                │
│ Decision: ✅ ALLOW (preflight)          │
│ Command: list_agents                    │
│ Duration: 847ms                         │
│ Result: 47 agents, 3 orgs               │
│ [View Details] [Export] [Copy]          │
└─────────────────────────────────────────┘
```

**Implementation:**
- New `ExecutionSummary` component
- Aggregate preflight + steps into single card
- Show only: decision + duration + key metric
- Collapse steps section by default
- [View Details] expands full trace

#### 2. **Parallel Metrics → Actionable Dashboard**
```
┌─────────────────────────┐
│ Queue Health     GOOD   │  ← Color: green/amber/red
├─────────────────────────┤
│ Depth: 12/10000        │
│ P99 wait: 39ms/<1000ms │  ← Threshold comparison
│ Status: processing...  │
│                        │
│ Harmony Cache  EXCELLENT│
│ Hit rate: 99%/>75% ✓   │
│ Latency: 17ms/<100ms ✓ │
│                        │
│ [Drill down] [Tune]    │  ← Action buttons
└─────────────────────────┘
```

**Implementation:**
- Add health score (RED/AMBER/GREEN)
- Show target thresholds alongside actual values
- Color bars based on utilization %
- [Drill down] → detailed metrics view
- [Tune] → link to config docs

#### 3. **Sidebar Tab Badges** (signal importance)
```
System  |  Hermes  |  ⚡ Parallel [!]
                    ↑ Red badge if queue > 500
                      or cache hit < 50%
```

**Implementation:**
- Add `<Badge>` component to tab labels
- Show "!" if queue depth > 50% of max
- Show "⚠" if cache hit rate drops below 50%
- Pulsing animation for critical alerts

#### 4. **Tool Result Toolbar**
```
Tool Result
┌────────────────────────────────────────┐
│ [📋 Copy] [💾 Export] [🔍 Search] [↗]  │
├────────────────────────────────────────┤
│ JSON viewer with collapsible sections  │
│ {                                      │
│   "agents": [47 items]   [expand ▶]   │
│   "orgs": [3 items]      [expand ▶]   │
│   "timestamp": "2026..."                │
│ }                                      │
└────────────────────────────────────────┘
```

**Implementation:**
- Add toolbar above result
- [📋 Copy] → copy to clipboard
- [💾 Export] → download JSON/CSV
- [🔍 Search] → filter fields in result
- [↗] → open in new tab (full screen)

#### 5. **Chat Search Bar**
```
┌─────────────────────────────────────────┐
│ 🔍 Search chat history...        [clear]│
└─────────────────────────────────────────┘
↓ Shows: "list_agents", "deploy", "audit" (recent)
```

**Implementation:**
- New search input above message feed
- Filter messages by: tool name, decision, timestamp
- Highlight matches in blue
- Keyboard shortcut: Cmd+F

---

### Phase B: Mid-term (1-2 days, enables collaboration)

#### 6. **Operator Review Gate** (human-in-the-loop)
```
Agent: "I want to deploy app-v2.0"
Decision: ⏳ PENDING REVIEW (not ALLOW yet)

┌──────────────────────────────────────────┐
│ Preflight Details                        │
├──────────────────────────────────────────┤
│ Risk: HIGH                              │
│ Affected: 5000 users                    │
│ Rollback: Available (v1.9)              │
├──────────────────────────────────────────┤
│ [✅ Confirm] [❌ Block] [🤔 Delegate]  │
└──────────────────────────────────────────┘
```

**Implementation:**
- Add `reviewGate: boolean` to preflight response
- Show review panel for HIGH/CRITICAL decisions
- [✅ Confirm] → agent proceeds
- [❌ Block] → agent sees rejection + reason
- [🤔 Delegate] → assign to another operator

**Database:**
- `agi_review_gates` table (decision_id, reviewer_id, status, reason)

#### 7. **Execution Comparison** (see what changed)
```
[Execution 1]  [Execution 2]  [Compare]
                                ↓
Before: 47 agents              After: 48 agents
        3 orgs                        3 orgs
        Last update: 2h ago           Last update: 5m ago
        
[Diff] Shows: +1 agent, same orgs
```

**Implementation:**
- New "Compare" button on tool results
- Select 2 executions → show delta
- Highlight added/removed fields
- Useful for: comparing deployment results, audit changes

---

### Phase C: Long-term (enables real observability)

#### 8. **Smart Alerts & Thresholds**
```
System Alert: Queue backing up
├─ Depth: 850/10000 (85%)
├─ P99 wait: 945ms
├─ Suggested action: Scale executors
└─ [View Parallel Tab] [Snooze 1h] [Dismiss]
```

**Implementation:**
- Custom alert rules (queue > X%, cache hit < Y%)
- Toast notifications (top right)
- Alert history tab
- Configurable thresholds per org

#### 9. **Agent ↔ Operator Conversation** (true collaboration)
```
Agent: "Deploy app-v2 to production"
[Waiting for human approval...]

Operator: "Sure, but only to 10% of traffic first"
Agent: "OK, deploying canary: 10% traffic"
Agent: "Canary healthy after 5m. Ready for full rollout?"

Operator: "Yes, go for it"
Agent: "Full rollout complete. Metrics nominal."
```

**Implementation:**
- Allow operator to reply mid-execution
- Agent can pause and ask clarifying questions
- New message type: `operator_instruction`
- Audit trail: every human decision logged

#### 10. **Execution Timeline/Gantt** (see parallelism)
```
Request 1: ████████ queue (50ms) ████ harmony (5ms) ██████ execute (142ms)
Request 2:         ████████ queue (48ms) ████ harmony (4ms) ██████ execute (150ms)
Request 3:                  ████████ queue (52ms) ████ harmony (5ms) ██████ execute (148ms)

Total wall time: 240ms (3 requests in parallel)
```

**Implementation:**
- New Gantt view in Parallel tab
- Show queue wait + harmony lookup + executor time
- Color by stage (blue=queue, green=harmony, orange=execute)
- Identify bottlenecks visually

---

## Priority Matrix

| Improvement | Effort | Impact | Priority |
|------------|--------|--------|----------|
| 1. Execution Summary Card | 2h | HIGH (reduce confusion) | 🔴 P0 |
| 2. Parallel Metrics w/ thresholds | 3h | HIGH (enables tuning) | 🔴 P0 |
| 3. Sidebar badges | 1h | MEDIUM (visibility) | 🟡 P1 |
| 4. Tool Result toolbar | 2h | HIGH (exportability) | 🔴 P0 |
| 5. Chat search | 2h | MEDIUM (findability) | 🟡 P1 |
| 6. Operator Review Gate | 4h | HIGH (safety) | 🔴 P0 |
| 7. Execution Compare | 3h | MEDIUM (audit) | 🟡 P1 |
| 8. Smart Alerts | 3h | HIGH (observability) | 🟡 P1 |
| 9. Agent ↔ Operator convo | 6h | VERY HIGH (collaboration) | 🔴 P0 |
| 10. Execution Timeline | 4h | MEDIUM (debugging) | 🟡 P1 |

---

## Implementation Roadmap

### Week 1 (P0 — Make it functional)
1. ✅ Execution Summary Card
2. ✅ Parallel Metrics with thresholds
3. ✅ Tool Result toolbar
4. ✅ Sidebar badges

### Week 2 (P1 — Make it discoverable)
5. ✅ Chat search
6. ✅ Operator Review Gate (critical for agent safety)
7. ✅ Smart Alerts

### Week 3+ (P2 — Make it collaborative)
8. ✅ Execution Compare
9. ✅ Agent ↔ Operator conversation
10. ✅ Execution Timeline Gantt

---

## Current User Pain Points → Solutions Map

| User Goal | Current Pain | Recommended Fix |
|-----------|-------------|-----------------|
| "Did the deploy work?" | Raw steps scattered across chat | Execution Summary Card (#1) |
| "Is the system healthy?" | Abstract numbers in Parallel tab | Metrics with thresholds (#2) |
| "I need to stop this action NOW" | No way to intervene mid-execution | Operator Review Gate (#6) |
| "Export this list of agents" | Can only copy-paste JSON | Tool Result toolbar (#4) |
| "What did we deploy last week?" | No search in 120 messages | Chat search (#5) |
| "Why is latency high?" | Numbers, no drill-down context | Execution Timeline (#10) |
| "Approve this risky action" | No approval workflow | Operator Review Gate (#6) |
| "Did something change?" | Can't compare executions side-by-side | Execution Compare (#7) |

---

## Success Metrics

After implementing Phase B (mid-term):

| Metric | Current | Target |
|--------|---------|--------|
| Operator decision time | 2-3 min | <30 sec (via Review Gate) |
| Chat search success | 0% (no search) | >90% find 1st result |
| Export requests to external tools | High (manual copy) | Low (built-in export) |
| Agent interventions per day | 0 (no gate) | >5 (enabled via Review) |
| Queue degradation detection | Manual | <1 min (alerts) |

---

## Next Steps

1. **Validate with users** — test Execution Summary Card on real operator
2. **Implement Phase A** (1-2 days) — quick wins for clarity
3. **Get feedback** — does Operator Review Gate feel natural?
4. **Implement Phase B** (2-3 days) — enable human-in-the-loop
5. **Monitor adoption** — which features get used most?

---

**Document:** Hermes Dashboard UX/UI Analysis  
**Status:** Ready for implementation  
**Author:** Claude Code Assistant  
**Date:** 2026-06-10
