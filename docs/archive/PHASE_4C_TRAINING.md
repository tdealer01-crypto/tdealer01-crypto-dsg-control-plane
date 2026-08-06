# Phase 4C: DSG ONE Telemetry Team Training

**Duration:** 5 sessions × 30 minutes = 2.5 hours  
**Format:** Interactive hands-on training with PostHog  
**Prerequisites:** Phase 4B validation complete, PostHog access  
**Target Audience:** Engineering, Operations, Product, Analytics teams

---

## 📋 Training Overview

| Session | Topic | Duration | Focus | Audience |
|---------|-------|----------|-------|----------|
| 1 | Telemetry Basics | 30 min | Event capture, schema, PostHog setup | All |
| 2 | Operational Dashboards | 30 min | Metrics interpretation, bottleneck detection | Ops/Eng |
| 3 | Compliance & Audit | 30 min | Audit trails, evidence export, reporting | Compliance/Ops |
| 4 | Alert Management | 30 min | Custom alerts, thresholds, response workflows | Ops/SRE |
| 5 | Case Studies & Best Practices | 30 min | Real-world analysis, optimization, troubleshooting | All |

**Total Time:** 2.5 hours (can be split across multiple days)

---

# Session 1: Telemetry Basics (30 min)

## Learning Objectives
- Understand what telemetry events are and why they matter
- Navigate PostHog dashboard and event explorer
- Read event properties and understand data flow
- Know where to find event documentation

## Agenda (30 min)

### Part 1: Introduction (5 min)
**What is telemetry?**
- Definition: Data capture about user actions and system behavior
- Why we use it: Performance monitoring, user insights, compliance tracking
- DSG ONE approach: 21 custom events across 3 phases

### Part 2: PostHog Tour (10 min)

**Access PostHog:**
- URL: https://us.posthog.com/project/479488
- Project: DSG ONE (479488)
- Role: Team member with view/analyze access

**Explore Events Tab:**
1. Click **Events** in left sidebar
2. See recent events (last 24 hours by default)
3. Filter by event name (e.g., "organization_created")
4. Click event row to expand properties

**Key Columns:**
- **Event name** — what happened (e.g., `policy_created`)
- **Person** — who triggered it (user ID/email)
- **Timestamp** — when it happened
- **Properties** — details about the event

### Part 3: Understanding Events (10 min)

**Event Anatomy:**

Example: `policy_created` event
```json
{
  "event": "policy_created",
  "distinct_id": "user-123",
  "timestamp": "2026-07-12T22:00:00Z",
  "properties": {
    "policy_id": "pol_123",
    "policy_name": "Execution Gate Policy",
    "policy_type": "deterministic",
    "organization_id": "org_123",
    "workspace_id": "ws_123"
  }
}
```

**Property Types:**
- **ID fields** — unique identifiers (policy_id, org_id, user_id)
- **Name fields** — human-readable labels (policy_name, user_email)
- **Metric fields** — measurable values (execution_count, latency_ms)
- **Timestamp fields** — when something occurred (created_at, completed_at)

### Part 4: The 21 Events (5 min)

**Phase 1: Conversion Funnel (7 events)**
```
1. organization_created  — user creates account
2. policy_created        — user creates first policy
3. agent_created         — agent added to workspace
4. execution_submitted   — policy execution requested
5. decision_made         — policy returns decision
6. checkout_started      — user starts billing flow
7. subscription_created  — subscription confirmed
```

**Phase 2: Operational Metrics (8 events)**
```
8. workspace_created        — new workspace created
9. approval_queue_checked   — approval queue reviewed
10. approval_completed      — approval decision made
11. execution_completed     — execution finished
12. approval_requested      — approval needed
13. policy_updated          — policy modified
14. policy_archived         — policy deactivated
15. team_member_invited     — team member added
```

**Phase 3: Compliance & Audit (6 events)**
```
16. evidence_exported              — evidence bundle exported
17. audit_trail_queried            — audit log accessed
18. compliance_report_generated    — compliance report created
19. execution_replayed             — execution re-run for audit
20. proof_verified                 — formal proof validated
```

## Hands-On Exercise (5 min)

**Activity: Find an event**
1. Go to Events tab
2. Look for `policy_created` event (last 24 hours)
3. Click to expand properties
4. Identify:
   - policy_id
   - organization_id
   - policy_type
5. Note the timestamp

**Q&A:**
- "What does policy_type tell us?" → Type of policy (deterministic, rule-based, etc.)
- "Why is organization_id important?" → Multi-tenancy tracking
- "How long do events stay?" → 90 days (configurable)

## Key Takeaways
✅ Events are the building blocks of telemetry  
✅ Properties contain the detailed information  
✅ PostHog organizes and visualizes event data  
✅ 21 DSG ONE events track full user journey  

---

# Session 2: Operational Dashboards (30 min)

## Learning Objectives
- Navigate Conversion Funnel and Operational Metrics dashboards
- Interpret dashboard widgets and their data
- Identify operational bottlenecks
- Use filters and date ranges to analyze trends

## Agenda (30 min)

### Part 1: Dashboard Overview (5 min)

**What is a Dashboard?**
- Curated collection of widgets (charts, tables, numbers)
- Real-time view of business metrics
- Single source of truth for monitoring

**DSG ONE Dashboards:**
1. **Conversion Funnel** (1835443) — user acquisition and product adoption
2. **Operational Metrics** (1835444) — performance and efficiency
3. **Compliance & Audit** (1835445) — regulatory and audit tracking

### Part 2: Conversion Funnel Dashboard (10 min)

**URL:** https://us.posthog.com/project/479488/dashboard/1835443

**Understanding the Funnel:**
```
User Signup → Organization Created → Policy Created → Execution → Subscription
    ↓              ↓                    ↓                ↓              ↓
  100%           ~80%                 ~60%            ~40%           ~20%
```

**Key Widgets:**

1. **Execution Volume (Conversion Funnel)**
   - What: Total execution submissions and completions
   - Why: Measures policy engine load
   - Action: Growing = healthy, Flat = investigation needed

2. **New Policies Created (Conversion Funnel)**
   - What: Count of policies created per time period
   - Why: Feature adoption indicator
   - Action: Declining trend = UX issue or lack of demand

3. **Total Organizations (Conversion Funnel)**
   - What: Cumulative new organizations
   - Why: Customer acquisition tracking
   - Action: Baseline for cohort analysis

4. **Daily Signups (Conversion Funnel)**
   - What: New user registrations per day
   - Why: Growth velocity
   - Action: Spikes = marketing campaign success

**Conversion Rate Calculation:**
```
Signup Rate = New Policies / New Organizations
Example: 50 new orgs, 30 new policies = 60% adoption
```

**Interpreting Trends:**
- ↗️ **Upward trend** = Growing adoption (good)
- ↘️ **Downward trend** = Declining interest (investigate)
- 📊 **Flat** = Steady state (monitor)
- 📉 **Sharp drop** = Incident or bug (urgent)

### Part 3: Operational Metrics Dashboard (10 min)

**URL:** https://us.posthog.com/project/479488/dashboard/1835444

**Operational Health Focus:**

1. **Approval Escalations (Operational Metrics)**
   - What: Approval requests escalated over time
   - Why: Backlog and SLA tracking
   - Threshold: < 5 escalations/hour = healthy

2. **Policy Activity Timeline (Operational Metrics)**
   - What: Create/update/archive activity
   - Why: Content management load
   - Action: Spikes may indicate data migrations

3. **Team Member Invitations (Operational Metrics)**
   - What: New team members added per period
   - Why: Team growth and onboarding
   - Threshold: Track against headcount

4. **Approval Completion Rate (Operational Metrics)**
   - What: % of approvals completed within SLA
   - Why: Process efficiency
   - Target: > 95% completion

5. **Workspace Utilization (Operational Metrics)**
   - What: Active workspaces and their usage
   - Why: Feature adoption at org level
   - Action: Unused workspaces = churn risk

### Part 4: Dashboard Interaction (5 min)

**Filtering & Analysis:**

1. **Date Range Selection:**
   - Default: "Last 7 days"
   - Click date dropdown to change
   - Compare "This week vs Last week"

2. **Adding Filters:**
   - Click "+ Filter" button
   - Filter by organization_id, policy_type, workspace_id
   - Example: "Show only deterministic policies"

3. **Breakdown View:**
   - Click "Breakdown" to segment data
   - Segment by: policy_type, organization, user
   - Example: "Breakdown execution volume by policy_type"

4. **Exporting Data:**
   - Click "..." (three dots) on widget
   - "Export as CSV" for further analysis
   - Useful for monthly reporting

## Hands-On Exercise (5 min)

**Activity: Analyze Conversion Funnel**

1. Go to Conversion Funnel dashboard
2. Look at "New Policies Created" widget
3. Compare:
   - This week vs Last week
   - By policy_type (deterministic vs rule-based)
4. Identify:
   - Which type is most popular?
   - Is adoption growing?
   - Any concerning trends?

**Scenarios & Responses:**

| Scenario | Action |
|----------|--------|
| Policy creation trending down | Check recent changes, UX issues, market shifts |
| Execution volume up but completion down | Investigate timeouts, errors, rate limits |
| Approvals backing up | Alert ops team, review SLA |
| New team members spike | Celebrate! Monitor onboarding experience |

## Key Takeaways
✅ Dashboards show the big picture  
✅ Widgets tell you "what" and "why"  
✅ Filters reveal hidden patterns  
✅ Trends matter more than absolute numbers  

---

# Session 3: Compliance & Audit (30 min)

## Learning Objectives
- Navigate compliance and audit dashboards
- Export evidence and audit trails
- Generate compliance reports
- Understand proof verification workflow

## Agenda (30 min)

### Part 1: Compliance Requirements (5 min)

**Why Compliance Matters:**
- Regulatory: SOC 2, ISO 27001, GDPR
- Customer: Enterprise contracts require audit trails
- Internal: Risk management and governance
- Legal: Evidence for disputes and investigations

**DSG ONE Compliance Strategy:**
- Event-based audit trail (immutable record)
- Evidence export capability (proof bundle)
- Proof verification (formal validation)
- Dashboard reporting (compliance metrics)

### Part 2: Compliance & Audit Dashboard (10 min)

**URL:** https://us.posthog.com/project/479488/dashboard/1835445

**Key Widgets:**

1. **Evidence Exported (Compliance & Audit)**
   - What: Count of evidence bundles created
   - Why: Proof of audit capability
   - Action: Increasing = customers using feature

2. **Audit Trail Queries (Compliance & Audit)**
   - What: Number of audit log accesses
   - Why: Security monitoring (who looked at what)
   - Alert: Unusual spike = potential investigation

3. **Compliance Report Generated (Compliance & Audit)**
   - What: Reports created per period
   - Why: Compliance activity indicator
   - Threshold: Track against SLA

4. **Proof Verification Status (Compliance & Audit)**
   - What: Formal proofs validated successfully
   - Why: Cryptographic verification of policies
   - Action: 0% = feature not used yet

5. **Execution Replay Activity (Compliance & Audit)**
   - What: Executions re-run for audit/testing
   - Why: Reproducibility and forensics
   - Action: Enables "replay attack" investigation

### Part 3: Evidence & Audit Operations (10 min)

**Exporting Audit Trail:**

**Use Case:** Customer requests proof of all policy decisions for Q2 2026

**Steps:**
1. Go to Events tab
2. Filter: event name = "decision_made", date range = Q2 2026
3. Select all results (checkbox top-left)
4. Click "Export → CSV"
5. Include columns:
   - timestamp
   - policy_id
   - policy_name
   - organization_id
   - decision
   - reason

**Output:** CSV file with complete decision trail

**Generating Compliance Report:**

**Use Case:** SOC 2 audit requires access control logs

**Steps:**
1. Go to Events tab
2. Filter: event names = "team_member_invited", "user_added", "access_granted"
3. Date range = Last 12 months
4. Export as CSV
5. Create summary table:
   - Date | User Added | Team | Changed By | Approval
6. Attach to SOC 2 report

**Proof Verification:**

**Use Case:** Customer challenges a policy decision

**Challenge:** "Did your system really apply deterministic policy X?"

**Evidence:**
1. Retrieve execution event: `execution_completed`
2. Extract: policy_id, policy_version, input_hash, decision_hash
3. Run proof verification: `POST /api/dsg/v1/proofs/prove`
4. Receives: formal proof JSON
5. Send proof to customer → cryptographically validated

### Part 4: Dashboard Filters for Compliance (5 min)

**Common Compliance Queries:**

**Query 1: "Show me all changes to Policy ABC"**
```
Filter: 
  - event name IN [policy_updated, policy_archived]
  - policy_id = "pol_abc"
  - Date range: Last 90 days
```

**Query 2: "Who accessed the audit trail?"**
```
Filter:
  - event name = audit_trail_queried
  - Date range: Last 30 days
Group by: User
```

**Query 3: "All executions for Organization XYZ"**
```
Filter:
  - event name = execution_completed
  - organization_id = "org_xyz"
  - Date range: Last 12 months
Order by: Timestamp DESC
```

**Query 4: "Proof verification success rate"**
```
Filter:
  - event name = proof_verified
  - Date range: Last 30 days
Breakdown by: verification_status (pass/fail)
```

## Hands-On Exercise (5 min)

**Activity: Export Audit Trail**

1. Go to Events tab
2. Filter for: `team_member_invited` events (last 7 days)
3. Review:
   - Who was invited?
   - By whom?
   - What date?
4. Export as CSV
5. Open CSV and verify:
   - Column headers present
   - Data is complete
   - No sensitive fields leaking

**Scenarios:**

| Situation | Response |
|-----------|----------|
| Customer requests proof of access control | Export team_member_invited events + access_granted logs |
| Audit finds suspicious activity | Filter by timestamp, replay execution, generate proof |
| Compliance officer wants monthly summary | Export events, create summary table, attach to report |

## Key Takeaways
✅ Events create immutable audit trail  
✅ Evidence export provides proof  
✅ Proofs enable formal verification  
✅ Dashboards track compliance metrics  

---

# Session 4: Alert Management (30 min)

## Learning Objectives
- Understand alert rules and thresholds
- Configure custom alerts
- Respond to alert incidents
- Tune thresholds to reduce noise

## Agenda (30 min)

### Part 1: Alert Strategy (5 min)

**Why Alerts Matter:**
- Early warning of problems
- Automated escalation
- SLA enforcement
- Team notification

**Alert Principles:**
- ✅ Alert on symptoms (high latency), not causes (internal state)
- ✅ Tuned thresholds (minimize false positives)
- ✅ Clear escalation path (who gets notified)
- ✅ Actionable (ops team can fix it)
- ❌ Don't alert on every metric (alert fatigue)

### Part 2: DSG ONE Alert Rules (10 min)

**4 Alert Rules Configured:**

**1. High Execution Rate Alert**
```
Trigger:  execution_submitted event count > 5 per hour
Severity: Warning
Action:   Notify ops team
Why:      Unusual spike may indicate:
          - Load test
          - Malicious usage
          - Integration error causing spam
Threshold tuning:
  - If too many false positives → increase to 10/hour
  - If missing real spikes → decrease to 3/hour
```

**2. Approval Queue Backlog Alert**
```
Trigger:  approval_requested - approval_completed > 10 pending
Severity: Critical
Action:   Page on-call engineer immediately
Why:      Backing approval queue = customer impact
          Customers waiting for decisions
Threshold tuning:
  - Start at 10 (adjust based on SLA)
  - For 1-hour SLA with 5 reviewers: set to 15
  - For 4-hour SLA: can set higher
```

**3. Team Growth Spike Alert**
```
Trigger:  team_member_invited count > 3 per day
Severity: Info
Action:   Notify sales/ops (FYI)
Why:      Unusual team growth may indicate:
          - Large customer onboarding
          - Data migration
          - Team restructuring
Threshold tuning:
  - Info-level (no urgent action)
  - Can be aggregated in daily report
```

**4. Compliance Report Surge Alert**
```
Trigger:  compliance_report_generated count > 5 per hour
Severity: Warning
Action:   Notify analytics team
Why:      Unusual report generation may indicate:
          - Automated compliance checks
          - Audit in progress
          - Integration testing
Threshold tuning:
  - Monitor for patterns
  - Adjust based on business calendar
```

### Part 3: Alert Incident Response (10 min)

**Incident Response Workflow:**

**Step 1: Alert Fires**
```
Alert: "Approval Queue Backlog"
Message: "10+ pending approvals detected"
Time: 2026-07-12 14:30 UTC
```

**Step 2: Triage**
```
1. Check dashboard:
   - Go to Operational Metrics dashboard
   - Look at "Approval Queue Status" widget
   - See pending count, oldest request age
   
2. Ask questions:
   - Is this a spike or normal?
   - How long have they been waiting?
   - Are approvers responding?
   
3. Decide:
   - URGENT: Page on-call engineer
   - ROUTINE: Create task for next reviewer
   - FALSE ALARM: Adjust threshold
```

**Step 3: Response**

**Scenario A: Real Backlog**
```
Actions:
1. Notify backup approvers
2. Create task: "Review 15 pending approvals"
3. Set SLA: "Resolve within 1 hour"
4. Monitor: Check back in 30 min
5. If not improving → escalate to manager
```

**Scenario B: False Alarm (threshold too low)**
```
Actions:
1. Investigate: Why so many approvals?
   - Integration testing?
   - Bulk import?
   - New customer?
2. Context check: Is performance OK?
   - Response times normal?
   - User feedback positive?
3. Decision: Keep or adjust?
   - Keep if sustainable
   - Adjust if consistent spike
```

**Scenario C: Alert Fatigue (too many noise alerts)**
```
Actions:
1. Review alert history (last 30 days)
2. Calculate: What % are actionable vs noise?
3. If > 20% noise:
   - Increase threshold 10-20%
   - Add filter to exclude known cases
   - Consider time-based suppression (overnight)
4. Test new threshold for 1 week
```

### Part 4: Custom Alert Creation (5 min)

**Example: Create "Unusual Policy Type" Alert**

**Scenario:** Most customers use "deterministic" policies, but sudden spike in "experimental" usage might indicate:
- Bug in policy editor
- Integration error
- Testing/chaos engineering

**Alert Setup:**

```
Name: "Experimental Policy Usage Spike"
Trigger: policy_created event count
Where: policy_type = "experimental"
Condition: > 2 per hour (baseline is 0)
Severity: Info
Notify: #engineering-alerts Slack channel
Message: "{{count}} experimental policies created in last hour"
```

**Testing Alert:**
1. Go to PostHog → Alerts
2. Click "New Alert"
3. Select event: policy_created
4. Add filter: policy_type = experimental
5. Set threshold: > 2 per hour
6. Set destination: Slack webhook
7. Click "Test Alert" to verify Slack integration
8. Review: Does message make sense? Is it actionable?

## Hands-On Exercise (5 min)

**Activity: Configure a Custom Alert**

1. Go to PostHog → Alerts section
2. Create alert for: "High Execution Volume"
   - Event: execution_submitted
   - Condition: > 10 per hour
   - Severity: Warning
   - Destination: Email
3. Test by simulating alert
4. Document:
   - Who should respond?
   - What's the first action?
   - When should we escalate?

**Checklist:**
- [ ] Alert has clear name
- [ ] Trigger condition is specific (not too broad)
- [ ] Threshold is tuned (not too noisy)
- [ ] Destination is configured (email/Slack)
- [ ] Test notification sent successfully
- [ ] Team knows what to do when alert fires

## Key Takeaways
✅ Alerts are tools for automation, not noise  
✅ Thresholds must be tuned regularly  
✅ Response workflow should be clear  
✅ False alarms waste team capacity  

---

# Session 5: Case Studies & Best Practices (30 min)

## Learning Objectives
- Apply telemetry to real-world scenarios
- Identify performance bottlenecks using data
- Learn from case studies
- Optimize dashboards and alerts

## Agenda (30 min)

### Part 1: Case Study 1 - Policy Adoption Analysis (8 min)

**The Scenario:**
A new enterprise customer signed up, created a workspace, but hasn't created any policies after 3 days. Their contract includes SLA guarantees.

**Investigation Using Telemetry:**

**Step 1: Check Organization Timeline**
```
Events to review:
- organization_created: 2026-07-09 10:00 UTC
- workspace_created: 2026-07-09 10:15 UTC
- Last event: workspace_created (nothing since then)

Observation: Customer is stuck after workspace creation
```

**Step 2: Review Customer Behavior**
```
Filter events by organization_id:
- No policy_created events
- No agent_created events
- No execution events
- No approval events

Observation: Customer hasn't used any features
```

**Step 3: Check for Errors**
```
Query: Look for any error events (500s, auth failures)
Result: No errors - just no activity

Observation: Not a technical failure, behavioral
```

**Step 4: Identify Blocker**
```
Hypothesis: Customer needs onboarding help
Evidence: All setup events present, but no feature adoption

Action:
1. Send email: "Getting started with your first policy"
2. Offer: 30-min onboarding call
3. Follow-up: Monitor for policy_created event
4. Document: Add to "Slow adoption" cohort for analysis
```

**Outcome:**
- Customer created first policy after onboarding call
- Second policy 2 days later
- Now steady user

**Lesson:** Telemetry revealed behavioral issue (not technical) → triggered support intervention

---

### Part 2: Case Study 2 - Approval Queue Performance (8 min)

**The Scenario:**
Operational dashboard shows approval queue growing. SLA is 4 hours, but average wait is now 8 hours.

**Investigation:**

**Step 1: Dashboard Analysis**
```
Dashboard: Operational Metrics
Widget: Approval Completion Rate

Current: 70% within SLA (target: 95%)
Trend: Declining over last 7 days

Questions:
- When did this start?
- Which teams are affected?
- What types of approvals are slow?
```

**Step 2: Drill Down**
```
Filter: approval_completed events, last 30 days

Breakdown by: approval_type
Result:
- "security_review": 12 hours avg (overdue)
- "policy_validation": 3 hours avg (on-time)
- "budget_check": 6 hours avg (slightly overdue)

Observation: Security review is the bottleneck
```

**Step 3: Find Root Cause**
```
Filter: approval_requested events where approval_type = security_review

Group by: assigned_to (who's doing reviews)

Result:
- Sarah: 15 pending (5 days old!)
- Mike: 2 pending (current)
- Team average: 3 pending

Observation: Sarah is overloaded or unavailable
```

**Step 4: Take Action**
```
Immediate:
1. Check with Sarah → out sick (didn't inform team)
2. Reassign 10 oldest requests to Mike
3. Notify customers of 1-day extension

Short-term:
1. Add temporary approver (contractor)
2. Update runbook to detect this pattern
3. Create alert: "Approver queue > 5 for 1 hour"

Long-term:
1. Cross-train second security reviewer
2. Add approval load to team dashboards
3. Set threshold: No approver > 5 requests
```

**Outcome:**
- Backlog cleared in 2 hours
- SLA restored
- New alert prevents repeat

**Lesson:** Telemetry + breakdown analysis revealed human bottleneck → actionable resolution

---

### Part 3: Best Practices (8 min)

**Best Practice 1: Weekly Metrics Review**
```
Every Monday:
1. Review Conversion Funnel dashboard
2. Check Operational Metrics
3. Scan Compliance & Audit alerts
4. Ask:
   - Any concerning trends?
   - Any growth stories?
   - Any alerts this week?
5. Document in team standup
```

**Best Practice 2: Alert Tuning Cycle**
```
Every 2 weeks:
1. Review alert firing history
2. Calculate: Useful alerts vs noise
3. If noise > 30%:
   - Increase threshold
   - Add filtering
   - Add time-based suppression
4. Document adjustment & reason
5. Measure impact over next cycle
```

**Best Practice 3: Cohort Analysis**
```
Segment users into cohorts based on behavior:
- "High-engagement": 10+ executions/week
- "Medium-engagement": 1-10 executions/week
- "Low-engagement": < 1 execution/week
- "Inactive": No events this month

Track separately → retention, churn, growth by cohort
```

**Best Practice 4: Retention Funnel**
```
Track user retention over time:
Week 1: 100% of new users active
Week 2: 80% retained
Week 4: 60% retained
Week 12: 40% retained

Identify: Where do we lose people? Why?
Action: Improve onboarding or feature gap
```

**Best Practice 5: Root Cause Analysis**
```
When something goes wrong:
1. CHECK DASHBOARDS FIRST
2. Look for correlations in events
3. Ask: "What changed?"
4. Investigate: Code, data, infrastructure
5. Document: What you learned
6. Create: Alert to prevent repeat
```

**Best Practice 6: Documentation**
```
Keep runbook updated:
- What each dashboard shows
- Normal vs abnormal ranges
- Common alerts and responses
- Escalation paths
- Contact list
```

### Part 4: Q&A and Troubleshooting (6 min)

**Common Questions:**

**Q: "How long does it take for events to show up?"**
A: Typically < 5 seconds, max 1-2 minutes for indexing

**Q: "Can we see individual user behavior?"**
A: Yes, but filter by user_id. Useful for debugging specific accounts

**Q: "What if we miss an event?"**
A: Check:
1. Event name spelling
2. Environment (staging vs prod)
3. User permission level
4. Feature flag (event capture might be gated)

**Q: "How do we get more detailed data?"**
A: Add custom properties to events. Coordinate with engineering team

**Q: "Can we correlate events from different systems?"**
A: Use shared IDs (org_id, user_id, execution_id)

**Common Troubleshooting:**

| Problem | Check |
|---------|-------|
| Dashboard shows no data | Date range, filters, event name spelling |
| Alert not firing | Threshold value, condition logic, event flow |
| Spike in one metric but not others | Check correlation, filter by segment |
| Event properties missing | Check event schema, field names, mapping |

## Hands-On Exercise (6 min)

**Capstone Project: Investigate a Scenario**

**Scenario:** 
Your customer reports: "We created 50 policies yesterday, but only 5 executed. Why?"

**Your Investigation:**

1. **Gather Data**
   - Filter: policy_created events, last 24 hours
   - Result: 50 events ✓
   - Filter: execution_submitted events, last 24 hours
   - Result: 5 events ✓

2. **Analyze Gap**
   - 50 created vs 5 executed = 10% execution rate (low)
   - Why aren't the other 45 being used?

3. **Drill Down**
   - Check: policy_archived events (were they deleted?)
   - Check: policy_updated events (being tweaked?)
   - Check: agent_created events (were agents added?)

4. **Hypotheses**
   - H1: Policies not yet tested
   - H2: Policies failed validation
   - H3: No agents to execute them
   - H4: Policies waiting for approval

5. **Findings Report**
   ```
   Finding: 45 policies created but no execution attempts
   
   Analysis:
   - All 45 policies exist (policy_created ✓)
   - None have errors (no error events)
   - Only 5 have agents assigned (agent_created)
   
   Root Cause: Agent assignment incomplete
   
   Recommendation:
   1. Remind customer to assign agents
   2. Add alert: "Policy with no agent for > 1 hour"
   3. Improve UX: Auto-assign default agent
   ```

## Key Takeaways
✅ Data tells stories about customer behavior  
✅ Drill-down analysis finds root causes  
✅ Pattern recognition prevents problems  
✅ Documentation multiplies team knowledge  

---

# Training Resources

## Dashboards Reference
- **Conversion Funnel:** https://us.posthog.com/project/479488/dashboard/1835443
- **Operational Metrics:** https://us.posthog.com/project/479488/dashboard/1835444
- **Compliance & Audit:** https://us.posthog.com/project/479488/dashboard/1835445
- **Events Viewer:** https://us.posthog.com/project/479488/events

## Event Documentation
See `/docs/PHASE_4B_VALIDATION.md` for complete event schema

## Support Contacts
- **PostHog Questions:** team@posthog.com
- **DSG ONE Telemetry:** analytics-team@dsg.pics
- **Compliance:** compliance@dsg.pics

## Follow-Up Sessions
- **Monthly:** Team metrics review (30 min)
- **As-needed:** Deep-dive investigation workshops
- **Quarterly:** Alert tuning and optimization review

---

# Post-Training Checklist

After completing Phase 4C training:

- [ ] All team members watched Session 1: Telemetry Basics
- [ ] Engineering team watched Sessions 1 & 2 & 4
- [ ] Operations team watched Sessions 2, 3, & 4
- [ ] Compliance team watched Session 3
- [ ] Product team watched Sessions 1, 2, & 5
- [ ] Everyone completed at least one hands-on exercise
- [ ] Team created 1+ custom alert
- [ ] Questions documented in team wiki
- [ ] Training materials added to runbook
- [ ] Schedule follow-up (4 weeks)

---

## Appendix: Event Schema Reference

### Phase 1 Events
```typescript
// organization_created
{
  event: "organization_created",
  properties: {
    organization_id: string,
    organization_name: string,
    created_at: timestamp,
    user_id: string
  }
}

// policy_created
{
  event: "policy_created",
  properties: {
    policy_id: string,
    policy_name: string,
    policy_type: "deterministic" | "rule-based" | "experimental",
    organization_id: string,
    created_by: string
  }
}

// execution_submitted
{
  event: "execution_submitted",
  properties: {
    execution_id: string,
    policy_id: string,
    policy_version: number,
    input_hash: string,
    submitted_at: timestamp
  }
}
```

### Phase 2 Events
```typescript
// workspace_created
{
  event: "workspace_created",
  properties: {
    workspace_id: string,
    workspace_name: string,
    organization_id: string,
    created_by: string
  }
}

// approval_requested
{
  event: "approval_requested",
  properties: {
    approval_id: string,
    policy_id: string,
    requestor_id: string,
    assigned_to: string,
    approval_type: "security_review" | "budget_check" | "compliance_review"
  }
}
```

### Phase 3 Events
```typescript
// compliance_report_generated
{
  event: "compliance_report_generated",
  properties: {
    report_id: string,
    report_type: "SOC2" | "ISO27001" | "GDPR" | "custom",
    organization_id: string,
    generated_by: string,
    generated_at: timestamp
  }
}

// proof_verified
{
  event: "proof_verified",
  properties: {
    execution_id: string,
    policy_id: string,
    proof_status: "valid" | "invalid" | "unable_to_verify",
    verification_timestamp: timestamp
  }
}
```

---

**Training Materials Version:** 1.0  
**Last Updated:** 2026-07-12  
**Next Review:** 2026-08-12
