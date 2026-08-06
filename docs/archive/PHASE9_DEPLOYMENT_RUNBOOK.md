# Phase 9: Launch Day Deployment Runbook

**Status:** Go-Live Execution Checklist  
**Updated:** 2026-06-07  
**Owner:** DevOps, Product, Engineering  
**Trigger:** After Stripe approval (Days 43-49 of Phase 9)

---

## Overview

This runbook covers the exact steps to take on launch day, the 24 hours before, and the 48 hours after. It's your step-by-step guide to avoid surprises.

**Timeline:**
- **Day 0 (48 hours before):** Final verification & dry run
- **Day 1 (24 hours before):** Pre-flight checklist
- **Launch Day:** Enable in marketplace, announce, monitor
- **Day 1-2 after launch:** Watch for issues, support first customers

---

## Pre-Launch Phase (48-24 Hours Before)

### 48 Hours Before: Final Verification

**Owner:** Engineering Lead

**Checklist:**

- [ ] **Code Review:** Verify all Phase 9 code is merged to `main`
  ```bash
  git log --oneline -5 main | grep -i phase9
  # Should see recent Phase 9 commits
  ```

- [ ] **Build Test:** Ensure `next build` passes
  ```bash
  npm run build
  # Expected: Build successful, no errors
  ```

- [ ] **Type Check:** No TypeScript errors
  ```bash
  npm run typecheck
  # Expected: 0 errors
  ```

- [ ] **Tests Pass:** Run full test suite
  ```bash
  npm run test
  # Expected: >80% test pass rate, <20 failures (if any)
  ```

- [ ] **Security Audit:** Check for vulnerabilities
  ```bash
  npm audit --audit-level=moderate
  # Expected: 0 vulnerabilities at moderate or high level
  ```

- [ ] **Staging Environment:** Verify staging deployment is healthy
  - URL: `https://staging.yourapp.com` (or similar)
  - Status: Vercel deployment "Ready" (not "Error")
  - Health check: `curl https://staging.yourapp.com/api/health`
  - Expected response: `{"status":"ok","database":"connected"}`

- [ ] **Database Migrations:** All pending migrations applied
  - Staging Supabase: Check latest migration date
  - Expected: Within last 24 hours

- [ ] **Environment Variables:** Verified in all environments
  - [ ] Staging: All required vars set
  - [ ] Production: All required vars set (double-check)
  - Don't print values, only verify names

**Action if any check fails:** 
- Fix the issue before proceeding
- Do NOT skip checks
- If >1 failure, delay launch 24 hours

---

### 24 Hours Before: Pre-Flight Checklist

**Owner:** DevOps + Product Lead

**Part 1: Infrastructure**

- [ ] **Vercel Capacity:** Confirm sufficient resources
  - Vercel dashboard: Project → **Settings** → **General**
  - Memory: Default is fine (Vercel auto-scales)
  - Concurrency: No limits on standard plan

- [ ] **Supabase Capacity:** Check database is not at limits
  - Supabase dashboard: **Reports** → **Database** tab
  - Database size: <1GB (you have 500GB available)
  - Connections: <20 concurrent (you have 200 available)
  - Storage: <100GB used (you have 1TB available)

- [ ] **Vercel Auto-Scaling:** Enable if needed
  - Most features enabled by default
  - If expecting >1000 requests/min, notify Vercel support in advance

- [ ] **Supabase Backup:** Recent backup exists
  - Supabase dashboard: **Backups** tab
  - Latest backup: Within last 24 hours
  - Action: If not, trigger manual backup now

**Part 2: Monitoring**

- [ ] **Alerts are Active:** Verify alert rules in place
  - [ ] Error rate >2% → Slack #incidents
  - [ ] Uptime <99% in 24h → Slack #incidents
  - [ ] Webhook failures >10/hr → Slack #support
  - [ ] Database query >5s → Engineering notification

- [ ] **Dashboards Ready:**
  - [ ] Vercel Analytics dashboard open and viewable
  - [ ] Supabase Reports queries ready
  - [ ] Google Data Studio dashboard (if using)
  - [ ] Uptime monitoring (UptimeRobot or similar)

- [ ] **Logging Configured:**
  - [ ] Vercel Logs: Can filter by endpoint, time range
  - [ ] Supabase Logs: Can query for errors
  - [ ] Application error tracking: Sentry/Rollbar connected (if using)

**Part 3: Communication**

- [ ] **Status Page Configured:**
  - [ ] Set to "All Systems Operational" (pre-launch)
  - [ ] Incident response team has access
  - [ ] Can update status within 5 minutes

- [ ] **Slack Channels Ready:**
  - [ ] #launch-day channel created
  - [ ] #incidents channel exists
  - [ ] #support channel exists
  - [ ] All team members joined relevant channels

- [ ] **Email Templates Ready:**
  - [ ] Launch announcement email drafted
  - [ ] Error notification email template ready
  - [ ] Customer welcome email template ready

- [ ] **On-Call Schedule:**
  - [ ] Engineer on-call for launch day (→ +48 hours)
  - [ ] Support team staffed
  - [ ] Manager on-call for escalations

**Part 4: Customer Communication**

- [ ] **Blog Post Queued:** Scheduled for launch morning (or ready to publish)
- [ ] **Social Media Posts Queued:** Twitter, LinkedIn scheduled (or ready)
- [ ] **Customer Email List:** Ready to send launch notification
- [ ] **Demo/Support Calls Scheduled:** Any early-access onboarding booked

**Part 5: Team Preparation**

- [ ] **Runbook Shared:** All team members have this runbook
- [ ] **Launch Call Scheduled:** 30 minutes before go-live
  - [ ] Product lead
  - [ ] Engineering lead
  - [ ] DevOps
  - [ ] Support lead
  - [ ] Marketing (if participating)

- [ ] **Communication Plan:**
  - [ ] How to announce status (Slack → #launch-day)
  - [ ] Who approves "go" decision (Product lead)
  - [ ] Escalation phone numbers documented

---

## Launch Day (T-0)

### T-8 Hours: Morning Standup

**Owner:** Product Lead  
**Duration:** 30 minutes  
**Participants:** All leads (Engineering, DevOps, Support, Product)

**Agenda:**

```
1. Status check (5 min)
   - Staging deployment: any issues overnight?
   - Alerts: any false positives to adjust?
   - Database: any issues?

2. Final readiness (10 min)
   - Pre-flight checklist: all green? (review any yellow/red)
   - Team ready? (all on-call confirmed)
   - Communications ready? (blog, email, social)

3. Deployment plan (10 min)
   - Go-live timeline (T+0: enable marketplace)
   - Communication sequence (when to announce)
   - Monitoring plan (who watches what)

4. Contingencies (5 min)
   - If OAuth fails: rollback plan
   - If webhooks fail: customer impact
   - If database issue: escalation
```

**Go/No-Go Decision:**
- Product lead says: **"GO"** or **"DELAY"**
- If GO: Proceed to launch
- If DELAY: Communicate to team and affected customers

---

### T-0: Go-Live

**Owner:** DevOps Lead

#### Step 1: Verify Production Deployment (T-0:00)

```bash
# Confirm production is on latest code
curl https://yourapp.com/api/agent/status | jq '.version'
# Should match latest main branch commit

# Check health
curl https://yourapp.com/api/health
# Expected: {"status":"ok","database":"connected"}

# Verify no recent errors
# (Check Vercel logs for last 5 minutes)
```

#### Step 2: Enable App in Stripe Marketplace (T-0:10)

**Owner:** DevOps or Product Lead  
**Action:** In Stripe Dashboard

1. Log in to Stripe Dashboard
2. Navigate to **Apps & Integrations** → **Develop an App**
3. Find your app in "My Apps"
4. Click your app → **App Details** tab
5. Look for **Enable in Marketplace** or **Publish** button
6. Click the button
7. Confirm the action (Stripe will show warning)
8. Wait for confirmation (usually instant)

**Verification:**
```bash
# Marketplace should be live within 2-5 minutes
# Check publicly:
curl -s https://marketplace.stripe.com/ | grep -i "dsg-governance"
# Or manually search in Stripe Marketplace
```

**In #launch-day Slack:**
```
✅ [T+0:15] App published in Stripe Marketplace
   All Systems: 🟢 Green
   Next: Monitor signup and OAuth flow
```

#### Step 3: Verify Marketplace Listing (T-0:15)

1. Open Stripe Marketplace in incognito browser: https://marketplace.stripe.com/
2. Search for your app name
3. Verify appears in search results
4. Click listing, verify information is correct:
   - [ ] App icon displays
   - [ ] Name and description visible
   - [ ] Screenshots visible
   - [ ] "Connect" button present
   - [ ] Support email visible
   - [ ] Privacy & ToS links work

**In #launch-day Slack:**
```
✅ [T+0:20] Marketplace listing verified
   Visible in public search ✓
   All assets displaying ✓
```

#### Step 4: Publish Launch Announcement (T-0:30)

**Owner:** Marketing  
**Action:** Publish the queued content

1. **Blog Post:** Publish on company website
   - Or schedule for 9am if currently after hours
   
2. **Email Announcement:** Send to early-access customer list
   - Use template from PHASE9_POST_APPROVAL_SETUP.md
   
3. **Social Media:** Post the queued tweets/LinkedIn content
   - Or schedule for morning if after hours

**In #launch-day Slack:**
```
📢 [T+0:35] Launch communications published
   Blog post live ✓
   Email sent to [X] customers ✓
   Social media queued ✓
```

#### Step 5: Start Monitoring (T-0:45)

**Owner:** DevOps + Support

**Critical metrics to watch (every 5 minutes for first hour):**

```
Dashboard to monitor:
- /api/stripe-callback hits (OAuth completions)
- /api/stripe-webhook hits (webhook deliveries)
- Error rate (should be <1%)
- API latency (should be <500ms p95)
- Database connection pool (should be <50% used)

Commands to run:
curl https://yourapp.com/api/health -v
# Should see 200 OK, response <100ms

Check Vercel logs:
https://vercel.com/YOUR_PROJECT/deployments
# Look for any errors in recent logs
```

**Slack updates (every 15 minutes for first hour):**

```
[T+0:45] First customers connecting...
  OAuth callback hits: [X] (expecting 5-10 in first 15 min)
  Errors: [X] (expecting <1%)
  Status: 🟢 Green

[T+1:00] Continued healthy...
  Installs: [X]
  Operations processed: [X]
  Support tickets: [X]
  Status: 🟢 Green
```

---

## First 24 Hours (T+0:00 to T+24:00)

### Hourly Monitoring (First 6 hours: T+0 to T+6)

**Owner:** DevOps Lead  
**Frequency:** Every hour

**Check:**
```bash
# Health check
curl https://yourapp.com/api/health

# Recent installs count
# Query Supabase:
SELECT COUNT(*) as installs_today, MAX(created_at) as latest
FROM stripe_connections WHERE created_at >= DATE_TRUNC('day', NOW());

# Error rate
# Check Vercel dashboard or logs

# Webhook success rate
# Query Supabase:
SELECT 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE processed = true) as successful,
  ROUND(COUNT(*) FILTER (WHERE processed = true) * 100.0 / COUNT(*), 1) as success_pct
FROM stripe_webhook_deliveries WHERE created_at >= NOW() - INTERVAL '1 hour';
```

**Slack report (hourly, for first 6 hours):**

```
[T+1:00] 🟢 Hour 1 Summary
  New installations: [X]
  OAuth success: [X]%
  Error rate: [X]%
  Webhook success: [X]%
  Support tickets: [X]

[T+2:00] 🟢 Hour 2 Summary
  ... (repeat)
```

### After First 6 Hours (T+6 to T+24)

**Owner:** DevOps + Support

**Reduce monitoring frequency:** Every 4 hours

**Check:**
- Installations still coming in
- No error rate spike
- Webhook delivering consistently
- Support team handling questions
- Database healthy

**Slack report (every 4 hours):**

```
[T+10:00] 🟢 Status Update
  Total installs (today): [X]
  Active merchants: [X]
  Operations processed: [X]
  Error rate: [X]%
  Support tickets: [X] (all resolved)
  Status: 🟢 Healthy

Next check: [TIME]
```

### Incident Response (During T+0 to T+24)

**If error rate >2% or uptime <99%:**

1. **Declare incident** (use Critical Incident flow from PHASE9_SUPPORT_PLAYBOOK.md)
2. **Page engineer** if not already involved
3. **Notify customers** if >10 customers affected
4. **Investigate** (check logs, recent changes)
5. **Mitigate** (rollback, restart, scale)
6. **Resolve** (permanent fix)

**Do NOT:**
- ❌ Let customers discover the issue without notification
- ❌ Make changes without testing first
- ❌ Wait >30 min to communicate status

---

## First Week After Launch (T+24 to T+168 hours)

### Daily Stand-ups (Days 2-7)

**Owner:** Product Lead  
**Duration:** 15 minutes  
**Time:** 10am PT (adjust for your timezone)

**Agenda:**
- Last 24h metrics (installs, operations, errors)
- Customer feedback/questions
- Any issues or blockers
- Support ticket backlog

**Report to leadership (daily, for first week):**

```
DSG Governance Gate — Day 2 Launch Report
Date: 2026-06-08

Total installs (cumulative): 25
Active merchants: 20
Operations processed: 250
Error rate: 0.3% (healthy)
Support tickets: 5 (all resolved)
Customer sentiment: Positive (early feedback)

What's working:
- OAuth flow smooth
- Webhook delivering reliably
- Customers creating policies quickly

Risks:
- None identified yet

Next: Monitor Day 3, expect more installs as word spreads
```

### Customer Success Outreach (Days 1-7)

**Owner:** Customer Success  
**Activity:** Onboarding calls

**For each new customer:**
- [ ] Send welcome email (first day)
- [ ] Schedule 30-min onboarding call (within 48 hours)
- [ ] Walk through getting started
- [ ] Collect feedback
- [ ] Note feature requests

**Reference:** PHASE9_CUSTOMER_ONBOARDING/getting-started-guide.md

---

## End of Week 1 Report (Day 7)

**Owner:** Product Lead  
**Audience:** Leadership, full team

**Report Template:**

```markdown
# DSG Governance Gate — Week 1 Launch Report

## Key Metrics

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Installations | 10+ | [X] | 🟢 |
| Active users | 8+ | [X] | 🟢 |
| Operations | 100+ | [X] | 🟢 |
| Error rate | <1% | [X]% | 🟢 |
| Uptime | 99.9%+ | [X]% | 🟢 |
| Support tickets | <10 | [X] | 🟢 |
| NPS | >30 | [X] | 🟢 |

## What Went Well

- [Win 1]
- [Win 2]
- [Win 3]

## What We're Working On

- [Issue 1 + action]
- [Issue 2 + action]

## Customer Feedback

- [Theme 1: what customers love]
- [Theme 2: what customers need]
- [Feature request 1 + interest level]

## Week 2 Focus

- [ ] Action 1
- [ ] Action 2
- [ ] Action 3

## Financial Summary

- Freemium signups: [X]
- Paid signups: [X]
- MRR: $[X]
- CAC: $[X] (from marketing spend)

## Forecast

- Month 1 target: 50 installs (on track / at risk / at risk)
- Month 3 target: 200 installs (confident / cautious)

---

**Prepared by:** [Name]  
**Date:** [Date]
```

---

## Rollback Plan (If Needed)

**When to rollback:** 
- Critical bugs introduced in Phase 9
- Error rate >10% for >5 minutes
- OAuth completely broken
- Webhook handler failing consistently

**How to rollback:**

```bash
# Option 1: Use Vercel Dashboard
# https://vercel.com/[PROJECT_NAME]/deployments
# Find previous good deployment
# Click "..." menu → "Rollback to this deployment"

# Option 2: Use Vercel CLI
vercel --prod --confirm # This promotes previous stable deployment

# Option 3: Revert code and redeploy
git revert HEAD~1 # Revert last commit
git push origin main # Automatic redeploy on Vercel
```

**Notify customers:**
```
⚠️ We've identified an issue and rolled back to the previous version.
   Functionality is restored, but we're investigating the root cause.
   Updates coming in the next hour.
```

---

## Post-Launch Communication

### For Customers (If Issues)

**Apology Template:**
```
We experienced an issue that affected your ability to [ACTION].
We've resolved it and are taking steps to prevent recurrence.

What happened: [Brief technical explanation]
How we fixed it: [Brief fix description]
What we're doing to prevent: [1-2 preventive measures]

We appreciate your patience and feedback.

[Company] Team
```

### For Team (Internal Retrospective)

**Day 8-9: Incident Review (if applicable)**

- What went wrong
- Why it happened
- How we fixed it
- How we prevent next time
- Action items with owners/deadlines

**Reference:** PHASE9_SUPPORT_PLAYBOOK.md → Post-Mortem Template

---

## Success Criteria

### Launch Day Success (T+24 hours)

- ✅ App published in Stripe Marketplace
- ✅ Marketplace listing is live and visible
- ✅ First 10+ customers installed
- ✅ OAuth flow working for all test customers
- ✅ 0 critical support issues
- ✅ Error rate <1%

### Week 1 Success (T+168 hours)

- ✅ 25-50 installations
- ✅ 80%+ onboarding completion
- ✅ <1% error rate sustained
- ✅ 0 critical incidents
- ✅ Positive customer feedback

### Month 1 Success (T+720 hours)

- ✅ 50+ installations
- ✅ 500+ operations processed
- ✅ 70%+ Day 30 retention
- ✅ 2-3 customer success stories
- ✅ No major production incidents

---

## Key Contacts & Escalation

**During Launch Day:**

| Role | Name | Phone | Slack |
|------|------|-------|-------|
| Product Lead | [Name] | [Phone] | @[handle] |
| Engineering Lead | [Name] | [Phone] | @[handle] |
| DevOps | [Name] | [Phone] | @[handle] |
| Support Lead | [Name] | [Phone] | @[handle] |
| CEO/Exec | [Name] | [Phone] | @[handle] |

**Escalation Path:**
1. Issue detected → DevOps notifies #incidents
2. Issue >15 min → Page engineering lead
3. Issue >1 hour → Escalate to CEO/exec
4. Critical (customers affected) → Notify all leads

---

## Checklists (Printable)

### Day Before Checklist

- [ ] Pre-flight checklist complete (all green)
- [ ] Monitoring configured and tested
- [ ] Team on-call confirmed
- [ ] Communications ready
- [ ] Rollback plan reviewed
- [ ] Product lead has latest code
- [ ] DevOps has latest env vars

### Launch Day Checklist

- [ ] Morning standup (go/no-go decision)
- [ ] Health checks pass
- [ ] Enable app in Stripe Marketplace
- [ ] Verify marketplace listing
- [ ] Publish blog/email/social
- [ ] Start monitoring (refresh every 5 min for 1 hour)
- [ ] Hourly status reports to Slack
- [ ] 24-hour wrap-up report

### First Week Checklist

- [ ] Daily standups (review metrics)
- [ ] Customer onboarding calls
- [ ] Support tickets handled <24h
- [ ] Monitor error rate (should stay <1%)
- [ ] End of week 1 report to leadership
- [ ] Week 2 priorities set

---

**Last Updated:** 2026-06-07  
**Status:** ✅ Ready for Launch Day Execution  
**Owner:** DevOps, Product, Engineering
