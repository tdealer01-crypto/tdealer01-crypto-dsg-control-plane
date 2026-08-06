# Agent Operations Runbook: Phase 4C Telemetry

**Purpose:** Guidance for agents/automations operating Phase 4B/4C infrastructure  
**Audience:** Claude Code agents, CI/CD automation, monitoring systems  
**Last Updated:** 2026-07-12

---

## Overview

This runbook specifies how agents should maintain, monitor, and improve the telemetry infrastructure after Phase 4B/4C delivery.

**Agent Responsibilities:**
1. Weekly health checks (dashboards, events, alerts)
2. Monthly threshold tuning (alert noise reduction)
3. Documentation updates (runbooks, training materials)
4. Incident response (when alerts fire)
5. Training coordination (session scheduling)

---

## Automated Tasks

### Weekly: Health Check (Monday 9:00 AM UTC)

**Trigger:** Monday weekly at 09:00 UTC  
**Duration:** 15 minutes  
**Status Output:** Markdown report

**Steps:**

1. **Dashboard Accessibility**
   ```bash
   curl -s https://us.posthog.com/project/479488/dashboard/{1835443,1835444,1835445} \
     | grep -q "DSG ONE" && echo "✅ Dashboards OK" || echo "❌ Dashboard error"
   ```

2. **Event Flow Check**
   - Query PostHog API: Last 7 days of events
   - Expected: 21 event types present
   - Alert if: Any event type missing for > 24 hours

3. **Alert Status Verification**
   - Check all 4 alert rules are enabled
   - Review firing history (any false positives?)
   - Document threshold adjustments needed

4. **Report Generation**
   - Run: `bash scripts/phase-4c-health-monitor.sh`
   - Generate: Markdown summary
   - Post: To #engineering-alerts Slack channel (if configured)

**Success Criteria:**
- ✅ All 3 dashboards accessible
- ✅ All 21 events present in last 7 days
- ✅ 4 alert rules enabled
- ✅ No data quality issues

**Failure Handling:**
- If dashboard unreachable: Check Vercel deployment status
- If events missing: Check app logs, Supabase connectivity
- If alerts disabled: Re-enable and investigate why they were disabled

---

### Bi-Weekly: Alert Threshold Tuning (Every 2 weeks)

**Trigger:** Alternate Mondays at 10:00 AM UTC  
**Duration:** 20 minutes  
**Owner:** DevOps / SRE team

**Process:**

1. **Collect Alert History**
   ```bash
   # Review last 14 days of alert firings
   # Question: What % were actionable vs noise?
   ```

2. **Analyze Noise Ratio**
   - If noise > 30%: Increase threshold 10-20%
   - If noise < 5%: Consider lowering threshold
   - Document: Date, metric, old threshold, new threshold, reason

3. **Example Tuning**
   ```
   Alert: High Execution Rate
   Old threshold: 5 executions/hour
   Noise level: 35% (too high)
   Action: Increase to 8 executions/hour
   Reason: Normal variation for peak hours
   Start: 2026-07-19
   Review: 2026-08-02
   ```

4. **Document Changes**
   - Update: `/docs/PHASE_4C_ALERT_TUNING.md`
   - Record: Date, alert, change, reason, outcome
   - Share: In team standup

**Success Criteria:**
- ✅ Alert noise < 20%
- ✅ All thresholds documented
- ✅ Team aware of recent changes

---

### Monthly: Comprehensive Review (First Monday of month)

**Trigger:** First Monday at 09:00 AM UTC  
**Duration:** 1 hour  
**Format:** Team meeting or async review

**Agenda:**

1. **Metrics Review** (20 min)
   - Conversion Funnel: Adoption trends
   - Operational Metrics: Performance health
   - Compliance & Audit: Regulatory status

2. **Alert Performance** (15 min)
   - Which alerts were most useful?
   - Which created most noise?
   - Adjustments needed?

3. **Cohort Analysis** (15 min)
   - High-engagement users: Retaining?
   - Low-engagement users: Churning?
   - New features: Adoption rate?

4. **Documentation** (10 min)
   - Update runbooks if behavior changed
   - Add new patterns observed
   - Share learnings with team

**Deliverables:**
- Summary email to stakeholders
- Updated alert thresholds
- New patterns/insights documented
- Training materials version bump

---

## Incident Response

### Alert: "Approval Queue Backlog"

**Trigger Condition:** `approval_requested - approval_completed > 10 for > 30 min`

**Severity:** 🔴 CRITICAL

**Response Steps:**

```
1. TRIAGE (2 min)
   - Check Operational Metrics dashboard
   - See: Current queue count, oldest request age
   - Ask: Is this new or escalating?

2. CONTEXT (3 min)
   - Query: approval_requested events (last 24 hours)
   - Question: Sudden spike or gradual buildup?
   - Check: Are approvers online/available?

3. RESPONSE (5 min)
   - If queue > 15: Activate backup approver
   - If queue > 25: Page on-call manager
   - Notify: Customers with pending approvals

4. RESOLUTION (30+ min)
   - Process oldest requests first
   - Aim: Clear to < 5 within 1 hour
   - Monitor: Until resolved

5. POST-INCIDENT (follow-up next day)
   - Root cause: Why did this happen?
   - Prevention: What alert/automation helps?
   - Documentation: Update runbook
```

**Escalation:**
- 0-15 pending: Team responsibility
- 15-30 pending: Notify manager
- >30 pending: Page on-call director

---

### Alert: "High Execution Rate"

**Trigger Condition:** `execution_submitted count > 5 per hour`

**Severity:** 🟡 WARNING

**Response Steps:**

```
1. INVESTIGATE (5 min)
   - Check: Is this unusual? (compare to yesterday, last week)
   - Query: execution_submitted events (last hour)
   - Ask: What changed? (deployment, feature launch, customer?)

2. ASSESS (5 min)
   - Check system metrics: CPU, memory, latency
   - Question: Is system handling load?
   - Look for: Errors, timeouts, or failures

3. DECISION (5 min)
   - If system healthy: Monitor and log (may be normal)
   - If degradation: Investigate policy engine
   - If errors: Alert engineering team

4. ACTION (10+ min based on assessment)
   - If normal: Document spike cause
   - If issue: Begin incident response
   - If testing: Acknowledge and continue
```

**Common Causes:**
- Load test (expected) → document
- Marketing campaign spike (good) → document
- Malicious usage (bad) → block user
- Integration error (bug) → fix and deploy

---

### Alert: "Compliance Report Surge"

**Trigger Condition:** `compliance_report_generated count > 5 per hour`

**Severity:** 🟡 WARNING

**Response:**

```
1. CHECK: Is audit happening?
   - Call compliance team
   - Check calendar for audits
   - Verify customer requests

2. IF EXPECTED: Document
   - Log: Date, duration, reason
   - Monitor: Resource impact
   - Continue normally

3. IF UNEXPECTED: Investigate
   - Check: Who's generating reports?
   - Query: compliance_report_generated events
   - Alert: Compliance team
```

---

## Maintenance Tasks

### Monthly Database Maintenance

**Task:** Archive old events, optimize queries

**Steps:**
1. Check PostHog project size
2. Verify retention policy (90 days is default)
3. Monitor: Query performance degradation
4. Action: Contact PostHog if optimization needed

---

### Quarterly: Training Materials Review

**Task:** Keep training docs current

**Checklist:**
- [ ] Dashboard URLs still correct
- [ ] Event names match current schema
- [ ] Alert rules same as live config
- [ ] Case studies relevant to current product
- [ ] Contact info up to date

**Update Process:**
1. Review materials with team
2. Update any stale info
3. Commit: `docs/PHASE_4C_TRAINING.md`
4. Announce: New version available

---

## Common Issues & Fixes

### Issue: Dashboard shows no data

**Diagnosis:**
```bash
# 1. Check if events exist
curl -s https://us.posthog.com/project/479488/events \
  | grep -i "organization_created" \
  && echo "✅ Events exist" || echo "❌ No events"

# 2. Check date range filter
# (Most common: filter set to "Last 24 hours" but events are older)

# 3. Check if widget query is correct
# (Click widget, view "Data" tab, see if query is valid)
```

**Solutions:**
- Expand date range: "Last 7 days" or "Last 30 days"
- Refresh page (hard refresh: Ctrl+Shift+R)
- Check event name spelling
- Verify filters are correct

---

### Issue: Alert not firing even though condition met

**Diagnosis:**
1. Check alert rule is enabled (not paused)
2. Verify threshold value (may have been changed)
3. Check time window (condition must persist for duration)
4. Test with: Force-trigger alert manually

**Fix:**
1. If disabled: Re-enable alert
2. If threshold wrong: Update threshold
3. If notification misconfigured: Check Slack/email
4. If all else fails: Delete and recreate alert

---

### Issue: Too much alert noise (false positives)

**Diagnosis:**
1. Calculate: % of alerts that required action
2. If < 70% actionable: Threshold is too low

**Fix:**
```
Formula: new_threshold = current_threshold × 1.25

Example:
Current: 5 executions/hour (70% false positives)
New: 5 × 1.25 = 6.25 → round to 6 or 7
Start: Monitor new threshold
Review: 2 weeks later
```

**Document:**
```markdown
## Alert Threshold Tuning Log

| Date | Alert | Old | New | Reason | Result |
|------|-------|-----|-----|--------|--------|
| 2026-07-19 | High Exec Rate | 5 | 8 | Too noisy | ✅ Better |
| 2026-07-26 | Approval Queue | 10 | 15 | Baseline too high | ✅ More accurate |
```

---

### Issue: Missing events in PostHog

**Diagnosis:**
1. Check: Is event captured in code? (grep for event name)
2. Check: Is event being sent? (check app logs)
3. Check: Did event reach PostHog? (API response code)
4. Check: Is event indexed? (5-15 min lag normal)

**Fix:**
1. If not captured: Add event capture code
2. If not sent: Check network, check auth
3. If not indexed: Wait 15 min and retry
4. If still missing: Check PostHog ingestion logs

---

## Authorization & Access

### Required Environment Variables

Agent needs these to operate:

```bash
# PostHog
POSTHOG_PROJECT_ID=479488
POSTHOG_API_TOKEN=phc_...

# Vercel (for deployment checks)
VERCEL_PROJECT_ID=...
VERCEL_TEAMS_ID=...
VERCEL_TOKEN=...

# Supabase (for event verification)
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...

# Slack (for notifications)
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
```

### Permissions Needed

- ✅ Read-only access to PostHog project
- ✅ Read-only access to Vercel deployments
- ✅ Read-only access to Supabase (no write)
- ✅ Post-only access to Slack webhooks (no read)

---

## Success Metrics

### Agent is performing well if:

- ✅ Weekly health checks complete reliably
- ✅ Alert tuning reduces noise by >30%
- ✅ No critical alerts missed
- ✅ Documentation stays current
- ✅ Team confidence in telemetry data high

### Red Flags:

- ❌ Health checks failing >50% of time
- ❌ Dashboards show no data for >24 hours
- ❌ Critical alerts not firing when conditions met
- ❌ More than 2 false positives in a week
- ❌ Team unable to use dashboards effectively

---

## Escalation Path

### When to involve humans:

1. **Team Lead:** Alert threshold changes, documentation updates
2. **Engineering:** Event capture issues, data quality problems
3. **DevOps:** Vercel/Supabase connectivity, infrastructure
4. **Compliance:** Audit alerts, evidence export requests
5. **Product:** Metric interpretation, business decisions

### Contact Info:

```
On-Call DevOps: #devops-oncall Slack
Engineering Lead: @engineering-lead
Compliance Officer: @compliance-officer
Product Analytics: @analytics-team
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-07-12 | Initial agent operations runbook |
| 1.1 | TBD | Add more incident scenarios |
| 2.0 | TBD | Integrate with automated monitoring |

---

**Last Review:** 2026-07-12  
**Next Review:** 2026-08-12  
**Owner:** DevOps / Analytics Team
