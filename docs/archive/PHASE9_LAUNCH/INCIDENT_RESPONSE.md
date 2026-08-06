# Phase 9: Launch Day Crisis Procedures

**Status:** Incident Response Playbook for Launch Week  
**Date:** Days 1-7 after marketplace activation  
**Owner:** VP Engineering + On-Call Team  
**Activation:** Only when critical incident occurs

---

## Overview

This document provides **immediate action procedures** for critical incidents during launch.

**Key Principle:** Speed. Every second counts. Decisions must be made within defined timeframes.

**Three Incident Levels:**
1. **CRITICAL** (app down, complete failure) → 5-minute response
2. **MAJOR** (broken feature, high error rate) → 30-minute response
3. **MODERATE** (bugs, issues, data problems) → 2-hour response

---

## Incident Severity Levels

### CRITICAL Incident

**Definition:** Service is completely unavailable or degraded to <10% uptime

**Symptoms:**
- App returns 500 errors for all requests
- Response time is > 10 seconds
- Database is unreachable
- Stripe OAuth is broken
- Webhooks are not being received

**Impact:** All customers are blocked from using the product

**Response Target:** 5 minutes to declare incident + 30 minutes to restore

**Escalation:** Immediate page to on-call engineer + VP Engineering + CEO

---

### MAJOR Incident

**Definition:** Core feature is broken or error rate is > 1%

**Symptoms:**
- Policy creation returns errors (50%+ of attempts)
- Charge gating is not working correctly
- Webhook processing has > 10 failures/hour
- Database queries are timing out frequently
- Latency p99 > 2000ms

**Impact:** Customers can partially use the product but hit errors

**Response Target:** 30 minutes to fix + 15 minutes to deploy

**Escalation:** Alert engineering team + notify Product Lead

---

### MODERATE Incident

**Definition:** Minor bug, data issue, or performance concern

**Symptoms:**
- Specific API endpoint is slow
- UI elements render incorrectly
- Customer data is incorrect (non-critical)
- Error rate is between 0.5-1%
- One feature has a minor bug

**Impact:** Some customers experience inconvenience but can work around it

**Response Target:** 2 hours to fix + 1 hour to deploy

**Escalation:** Notify engineering team + support team

---

## CRITICAL Incident Response (5-minute protocol)

### T+0:00 — Declare Incident

**Who does this:** Person who first detects the issue (engineer, DevOps, on-call, customer support)

**Action:**
1. Post in Slack #incidents channel:
   ```
   🚨 CRITICAL INCIDENT DECLARED 🚨
   Time: [timestamp]
   Detected by: [name]
   Symptom: [describe what's broken]
   Status: INVESTIGATING
   ```

2. Page on-call engineer immediately:
   ```
   [Use PagerDuty or Slack bot]
   @oncall Critical incident - app is down
   ```

3. Alert VP Engineering (phone if Slack not responsive)

### T+0:30 — Initial Assessment

**Who does this:** On-call engineer + VP Engineering

**Actions:**

1. **Check System Status (30 seconds)**
   ```bash
   # Verify the problem
   curl -i https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health
   
   # Check Vercel dashboard
   # https://vercel.com/[org]/[project]/deployments
   # Look for: Red X next to deployment
   
   # Check Supabase status
   # https://status.supabase.com/
   ```

2. **Identify Root Cause Category (1 minute)**
   - Is it a **deployment issue**? (red X in Vercel)
   - Is it a **database issue**? (Supabase unreachable)
   - Is it a **Stripe API issue**? (Stripe status page down)
   - Is it a **code issue**? (error in recent deployment)

3. **Post Status Update (30 seconds)**
   ```
   Slack #incidents:
   - Root cause: [deployment / database / stripe / code]
   - Affected systems: [which features]
   - Current status: INVESTIGATING
   - ETA to fix: [estimated time]
   ```

### T+1:30 — Execute Fix

**Based on root cause category:**

---

#### **IF: Deployment Issue (Vercel)**

**Symptoms:** Vercel dashboard shows build failed or deployment failed

**Fix Actions:**

1. **Check what changed in latest deployment**
   ```bash
   # In Vercel dashboard
   git log --oneline -1
   git show [latest commit hash]
   # Look for obvious errors
   ```

2. **Check build logs**
   - Vercel Dashboard → Deployments → click failed deployment
   - Review build logs (scroll to bottom for error)
   - Common errors:
     - TypeScript compilation error
     - Missing environment variable
     - Out of memory during build

3. **Decide: Fix or Rollback?**
   - If error is obvious and quick fix (1-2 min): Fix + deploy
   - Otherwise: **ROLLBACK to previous working version**

4. **Rollback (1 minute)**
   ```bash
   # In Vercel Dashboard
   # Deployments tab → find last successful deployment (green checkmark)
   # Click on it → Promote to Production
   # Wait 2-3 minutes for rollback
   ```

5. **Verify fix**
   ```bash
   curl https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health
   # Expected: {"status":"ok",...}
   ```

6. **Notify team**
   ```
   Slack #incidents:
   ✅ INCIDENT RESOLVED
   - Root cause: [what was wrong]
   - Action taken: [rollback / fix]
   - Time to resolve: [X minutes]
   - Next: Investigate root cause in staging
   ```

---

#### **IF: Database Issue (Supabase)**

**Symptoms:**
- Database connection timeout
- All queries return errors
- Supabase status page shows incident

**Fix Actions:**

1. **Check Supabase Status**
   - Go to: https://status.supabase.com/
   - If there's an ongoing incident: Wait for Supabase to resolve
   - Post in Slack: "Waiting for Supabase to restore service"

2. **If Supabase is up but our connection is broken:**
   ```bash
   # Check database connectivity
   # In Supabase → SQL Editor → run simple query:
   SELECT 1;
   
   # If query works: Database is up
   # Problem is in our app or connection pool
   ```

3. **Check connection pool**
   ```bash
   # In Vercel Dashboard → Logs
   # Search for: "ECONNREFUSED" or "ETIMEDOUT"
   
   # If seeing too many connections:
   # The app has exhausted the connection pool
   ```

4. **Actions to restore:**
   - **If connection pool exhausted:** Restart Vercel deployment
     ```
     Vercel Dashboard → Deployments → click current → Redeploy
     ```
   - **If Supabase service is down:** Wait for Supabase to restore
   - **If specific query is slow:** Rollback code change

5. **Verify database is responding**
   ```bash
   # Supabase SQL Editor
   SELECT COUNT(*) FROM stripe_merchants;
   # Should return a number (not an error)
   ```

6. **Notify team**
   ```
   Slack #incidents:
   ✅ DATABASE RESTORED
   - Root cause: [what was wrong]
   - Action taken: [restart / wait for Supabase]
   - Current status: Accepting connections
   - Response time: [X]ms
   ```

---

#### **IF: Stripe API Issue**

**Symptoms:**
- OAuth flow fails
- Webhook delivery fails
- Stripe API returns errors

**Fix Actions:**

1. **Check Stripe Status**
   - Go to: https://status.stripe.com/
   - If there's an ongoing incident: Wait for Stripe
   - Post in Slack: "Waiting for Stripe to restore service"

2. **If Stripe is up but our integration is broken:**
   ```bash
   # Test Stripe API connectivity
   curl -H "Authorization: Bearer sk_test_[KEY]" \
     https://api.stripe.com/v1/account
   
   # If request times out or returns 5xx: Stripe issue
   # If request succeeds but returns error: Check API key
   ```

3. **Check API keys**
   - In Vercel Dashboard → Settings → Environment Variables
   - Verify `STRIPE_SECRET_KEY` and `STRIPE_CLIENT_ID` are set
   - Verify they're not expired or revoked

4. **Actions:**
   - **If API key is invalid:** Update in Vercel (requires Stripe account access)
   - **If Stripe service is down:** Wait for Stripe to restore
   - **If webhook secret is wrong:** Update `STRIPE_WEBHOOK_SECRET`

5. **Notify Stripe Support** (if service down persists > 30 minutes)
   - https://support.stripe.com/
   - Create urgent support ticket

6. **Notify team**
   ```
   Slack #incidents:
   ✅ STRIPE INTEGRATION RESTORED
   - Status: API responding normally
   - Webhooks: Processing
   - Customers affected: None (fallback working)
   ```

---

#### **IF: Code Issue (Recent Deploy)**

**Symptoms:**
- Recent code change introduced a bug
- Specific API endpoint returns errors
- Database queries are failing

**Fix Actions:**

1. **Check recent commits**
   ```bash
   git log --oneline -5
   git diff HEAD~1 HEAD
   # Look for obvious errors:
   # - Missing async/await
   # - Missing error handling
   # - Wrong variable name
   # - SQL injection vulnerability
   ```

2. **Three options:**
   - **Option A (Fast): Rollback** — revert to last working deployment
   - **Option B (Medium): Quick fix** — fix bug + redeploy (if confidence is high)
   - **Option C (Slow): Review** — review code + test + deploy (if not urgent)

3. **If rolling back:**
   ```bash
   # Vercel Dashboard → Deployments
   # Find last successful deployment
   # Click → Promote to Production
   ```

4. **If doing quick fix:**
   ```bash
   git revert [commit hash]  # or git commit --amend (if safe)
   npm run typecheck         # verify types
   npm run build            # verify build
   git push origin main     # triggers Vercel deploy
   # Wait 2-5 minutes for deployment
   ```

5. **Verify fix**
   ```bash
   curl https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health
   ```

6. **Notify team**
   ```
   Slack #incidents:
   ✅ CODE ISSUE FIXED
   - Root cause: [describe bug]
   - Action: [rollback / hotfix]
   - New commit: [hash]
   - Status: RESOLVED
   - Next: Post-mortem in 24 hours
   ```

---

### T+2:00 — Post-Incident Actions

**Who does this:** VP Engineering

**Actions:**

1. **Create incident report**
   ```
   INCIDENT REPORT
   
   Time: [timestamp]
   Duration: [X minutes]
   Severity: CRITICAL
   
   Root Cause: [what went wrong]
   
   Timeline:
   - T+0:00 — Incident detected
   - T+0:30 — Root cause identified
   - T+1:30 — Fix deployed
   - T+2:00 — Verified resolved
   
   Impact:
   - Downtime: [X minutes]
   - Customers affected: [X]
   - Operations lost: [X]
   
   Resolution:
   - Action taken: [what we did]
   - Who fixed it: [name]
   - Time to fix: [X minutes]
   
   Prevention:
   - What we'll do to prevent recurrence:
     1. [action]
     2. [action]
   
   Owner: [name]
   Status: CLOSED
   ```

2. **Notify customers affected**
   - Send email to affected customers
   - Explain what happened (high level)
   - Apologize for impact
   - Explain what we're doing to prevent recurrence

3. **Schedule post-mortem (within 24 hours)**
   - Attendees: VP Engineering, on-call engineer, DevOps, Product Lead
   - Duration: 30-60 minutes
   - Goal: Identify root cause and prevention measures

4. **Update monitoring/alerts**
   - Did alerts work? If no: improve alert thresholds
   - Did response time meet target? If no: practice runbooks

---

## MAJOR Incident Response (30-minute protocol)

### T+0:00 — Alert Team

**Who does this:** Person who detects the issue

**Action:**
```
Slack #platform:
🔴 MAJOR INCIDENT
- Issue: [describe problem]
- Affected feature: [what's broken]
- Error rate: [X]%
- Status: INVESTIGATING
- Owner: [engineer name]
```

### T+0:15 — Triage and Assess

**Who does this:** Engineering Lead

**Actions:**

1. **Verify the issue**
   - Is it affecting all customers or specific ones?
   - Is it 100% failure rate or intermittent?
   - Started when? (after deployment? or gradually?)

2. **Determine fix approach**
   - Can we fix in code? (yes → estimate time)
   - Do we need to rollback? (yes → do it immediately)
   - Is it a data issue? (yes → need database fix)

3. **Post assessment update**
   ```
   Slack #platform:
   - Issue confirmed: [yes/no]
   - Scope: [all customers / specific / specific feature]
   - Fix approach: [rollback / hotfix / data fix]
   - ETA: [X minutes]
   ```

### T+0:30 — Deploy Fix

**Actions based on fix approach:**

1. **If rollback is needed:**
   ```bash
   # Vercel Dashboard → Deployments
   # Promote last working deployment
   # Expected time: 2-3 minutes
   ```

2. **If hotfix is needed:**
   ```bash
   git checkout -b hotfix/[issue-name]
   # Make minimal fix (1-2 lines ideally)
   npm run typecheck
   git add [changed files]
   git commit -m "Fix: [brief description]"
   git push origin hotfix/[issue-name]
   # Create PR and merge to main
   # Vercel auto-deploys: 2-5 minutes
   ```

3. **Verify the fix**
   ```bash
   # Check error rate in Vercel Analytics
   # Should drop below 1% within 5 minutes
   
   # Check application logs
   # Should see no new errors related to the issue
   ```

4. **Update status**
   ```
   Slack #platform:
   ✅ MAJOR ISSUE FIXED
   - Fix deployed at: [timestamp]
   - Status: MONITORING
   - Error rate: [X]% (target: <1%)
   - Next: Review in 15 minutes
   ```

### T+1:00 — Close Incident

**Actions:**

1. **Verify stability**
   - Error rate stable < 1% for 15 minutes? Yes → close
   - No new errors related to the issue? Yes → close

2. **Notify affected customers**
   - Send email explaining issue and resolution
   - Example:
     ```
     Subject: Policy Creation Issue — Now Resolved
     
     We experienced a brief issue with policy creation between 
     [time] and [time]. The issue has been fixed and all systems 
     are operating normally.
     
     We apologize for any inconvenience. Our team is investigating 
     the root cause to prevent future occurrences.
     ```

3. **Log incident**
   ```
   MAJOR INCIDENT LOG:
   - Issue: Policy creation returning 500 errors
   - Duration: 15 minutes
   - Customers affected: 3
   - Root cause: Query timeout due to missing index
   - Fix: Added database index on policies table
   - Prevention: Add CI check for slow queries
   ```

---

## MODERATE Incident Response (2-hour protocol)

### T+0:00 — Log Issue

**Who does this:** Support team or engineer

**Action:**
```
Slack #platform:
🟡 MODERATE ISSUE LOGGED
- Issue: [describe]
- Impact: [which feature/customers]
- Priority: Medium
- Assigned to: [engineer]
```

### T+0:30-2:00 — Fix in Progress

**Actions:**

1. **Investigate root cause**
   - Reproduce in staging environment
   - Identify which code change caused it (if recent)
   - Check database for data issues

2. **Develop fix**
   - Make code change or data fix
   - Test in staging
   - Deploy to production when ready

3. **Verify fix**
   - Monitor in production for 15+ minutes
   - Ensure no side effects

4. **Close issue**
   ```
   Slack #platform:
   ✅ ISSUE RESOLVED
   - Root cause: [what went wrong]
   - Fix deployed: [yes/no]
   - Status: MONITORING
   ```

---

## Escalation Path (Critical Decisions)

### Chain of Command

1. **On-Call Engineer** (first responder)
   - Declares incident
   - Makes immediate triage decision
   - Starts investigation

2. **Engineering Lead** (2nd level)
   - Called within 5 minutes if critical
   - Approves rollback decision
   - Coordinates fix

3. **VP Engineering** (3rd level)
   - Called within 10 minutes if critical
   - Approves customer communication
   - Owns post-mortem

4. **CEO** (escalation)
   - Called only if:
     - Data loss occurred
     - Customer data compromised
     - >1 hour of complete downtime
     - Major customer impact

### Emergency Contact Info

**On-Call Engineer:**
- Slack: @oncall
- Phone: [number]
- When to call: Immediately for critical issues

**Engineering Lead:**
- Slack: @eng-lead
- Phone: [number]
- When to call: If on-call cannot be reached or issue persists >10 min

**VP Engineering:**
- Slack: @vp-eng
- Phone: [number]
- When to call: If critical + engineering lead cannot be reached

**CEO:**
- Slack: @ceo
- Phone: [number]
- When to call: Only for data loss or security incidents

---

## Customer Communication Templates

### Template 1: Brief Service Disruption

```
Subject: Brief Service Disruption — Resolved

Hi [CUSTOMER_NAME],

We experienced a brief service disruption between [start time] and 
[end time] UTC. The issue has been completely resolved.

What happened:
[2-3 sentence plain English explanation]

Impact to you:
- You may have seen errors during this window
- Any policies created during this time are intact
- No data was lost

What we're doing:
- We've identified the root cause
- We're implementing [X] to prevent recurrence
- We're monitoring closely over the next 24 hours

Thank you for your patience.

Support: support@company.com
```

### Template 2: Extended Outage

```
Subject: Service Outage from [start] to [end] — Incident Report

Dear [CUSTOMER_NAME],

We experienced a service outage from [start] to [end] UTC lasting 
approximately [X] minutes. We sincerely apologize for the impact.

Timeline:
- [Time]: Issue began
- [Time]: Issue identified
- [Time]: Fix deployed
- [Time]: Service fully restored

What happened:
[Detailed but non-technical explanation]

Root cause:
[What specifically went wrong]

Impact:
- Your policies were not gating charges during the outage
- Any charges that would have been gated were not blocked
- No data was lost or corrupted

What we're doing to prevent recurrence:
1. [Action item]
2. [Action item]
3. [Action item]

Compensation (if applicable):
[Credits/discount/refund offer]

Thank you for your patience and for using DSG.

Support: support@company.com
Incident Details: [Link to status page]
```

### Template 3: Security Incident

```
Subject: Security Incident — Action Required

Dear [CUSTOMER_NAME],

We discovered and immediately contained a security issue that may have 
affected your account. Here's what you need to know:

What happened:
[Clear explanation of security issue]

Were you affected?
[How to check if customer was affected]

What you should do:
1. [Action 1 - usually password reset]
2. [Action 2 - check account]
3. [Action 3 - monitor activity]

What we've done:
- Immediately contained the issue
- Reviewed all affected accounts
- Strengthened security controls to prevent recurrence
- Reported to relevant authorities (if required)

More information:
- Full incident report: [Link]
- Security FAQs: [Link]
- Contact us: security@company.com

We apologize for this incident and appreciate your prompt attention.
```

### Template 4: Feature Degradation

```
Subject: Policy Creation — Known Issue & Workaround

Hi [CUSTOMER_NAME],

We're aware of an issue affecting policy creation with certain 
configurations. Here's what you need to know:

Affected scenarios:
- Policies with > 100 characters in name
- Policies with special characters (&, <, >)
- Policies created on mobile browsers

Workaround:
1. Use a shorter policy name (< 100 characters)
2. Avoid special characters
3. Use desktop/laptop browser for now

Status:
- We're actively working on a fix
- Expected resolution: Within [X hours]
- We'll notify you when fixed

In the meantime:
- You can still gate charges with existing policies
- New policies will work if you follow the workaround above

We apologize for this inconvenience and appreciate your patience.

Support: support@company.com
Status: https://status.company.com
```

---

## Post-Mortem Process

### Within 24 Hours of Critical/Major Incident

**Meeting:** 60 minutes

**Attendees:**
- VP Engineering
- On-Call Engineer who responded
- Engineering Lead
- DevOps Lead (if infrastructure issue)
- Product Lead

**Agenda:**

1. **Timeline Review (15 min)**
   - When was issue first detected?
   - Who detected it?
   - When was incident declared?
   - When was fix deployed?
   - When was issue resolved?

2. **Root Cause Analysis (20 min)**
   - What was the actual root cause?
   - Why wasn't it caught before launch?
   - Was it a code issue, deployment issue, or infrastructure issue?
   - Could we have detected it earlier?

3. **Response Review (15 min)**
   - Did our runbooks work?
   - Did we escalate correctly?
   - Was response time acceptable?
   - What could we have done faster?

4. **Prevention Actions (10 min)**
   - What specific changes will we make?
   - Who owns each action item?
   - What's the deadline for each action?

### Example Post-Mortem Notes

```
INCIDENT POST-MORTEM

Incident: Policy Creation Errors (MAJOR)
Date: [date]
Duration: 15 minutes
Severity: Major

TIMELINE:
- 14:25 UTC — Support reports 500 errors on policy creation
- 14:30 UTC — Engineering confirms issue affects all customers
- 14:35 UTC — Root cause identified: Missing database index
- 14:40 UTC — Index added, deployment started
- 14:45 UTC — Fix deployed and verified
- 14:50 UTC — Error rate returned to normal

ROOT CAUSE:
A code change added a complex query to policy creation logic, but 
no database index was created. This caused table scans which timed 
out under load.

PREVENTION:
1. Add database query performance check to CI pipeline
   Owner: DevOps
   Deadline: This week

2. Require index creation when adding complex queries
   Owner: Engineering Lead
   Deadline: Update code review checklist this week

3. Add slow query alert to monitoring
   Owner: DevOps
   Deadline: This week

4. Load test all new features before deployment
   Owner: QA
   Deadline: Add to launch checklist

LESSONS LEARNED:
- Database performance issues escalate quickly under customer load
- Query performance should be tested before deployment
- Our response time was good (15 min), but detection was slow (5 min)

OWNER: VP Engineering
STATUS: CLOSED (actions tracked separately)
```

---

## Testing and Drills

### Monthly Incident Response Drill

**Frequency:** Last Friday of each month  
**Duration:** 30 minutes  
**Participation:** Engineering team + on-call rotation

**Drill Scenarios (rotate monthly):**

1. **Deployment Failure Drill**
   - Simulate: Vercel build fails
   - Practice: Identify issue, rollback, verify
   - Target time: < 10 minutes

2. **Database Issue Drill**
   - Simulate: Database becomes unreachable
   - Practice: Identify issue, reconnect, verify
   - Target time: < 15 minutes

3. **Code Bug Drill**
   - Simulate: Recent deployment has critical bug
   - Practice: Identify bug, hotfix, test, deploy
   - Target time: < 20 minutes

4. **Stripe Integration Drill**
   - Simulate: Stripe API key is invalid
   - Practice: Identify issue, update keys, verify
   - Target time: < 10 minutes

---

## Incident Dashboard

### During Active Incident

Keep visible at all times:

```
🚨 INCIDENT STATUS 🚨

Issue: [describe]
Started: [time] UTC
Duration: [X] minutes
Severity: [CRITICAL / MAJOR / MODERATE]

STATUS: [INVESTIGATING / IN PROGRESS / MONITORING / RESOLVED]

Root Cause: [description or "investigating"]
Fix ETA: [X] minutes
Deployed: [yes/no]

Last Update: [time] UTC
Owner: [name]
Next Update: [time] UTC

Slack channel: #incidents
Status page: https://status.company.com
```

---

## Key Metrics to Watch (Always)

To prevent incidents, monitor these continuously:

1. **Error Rate**
   - Target: < 0.5%
   - Yellow alert: > 0.5%
   - Red alert: > 1%

2. **Latency (P99)**
   - Target: < 500ms
   - Yellow alert: > 1000ms
   - Red alert: > 2000ms

3. **Webhook Processing**
   - Target: 0 failures
   - Yellow alert: > 5 failures/hour
   - Red alert: > 10 failures/hour

4. **Database Connections**
   - Target: < 5
   - Yellow alert: > 8
   - Red alert: > 15

5. **Database Query Time**
   - Target: < 50ms (avg)
   - Yellow alert: > 100ms (avg)
   - Red alert: > 500ms (avg)

If any metric hits yellow alert threshold: Investigate and implement fix within 2 hours.

---

## Resources

- **Stripe Support:** https://support.stripe.com/
- **Stripe Status:** https://status.stripe.com/
- **Supabase Status:** https://status.supabase.com/
- **Vercel Docs:** https://vercel.com/docs
- **Internal Runbooks:** `/docs/RUNBOOK_DEPLOY.md`
- **Monitoring Dashboards:** See access links below

---

**Last Updated:** 2026-06-07  
**Status:** Ready for Launch Execution  
**Owner:** VP Engineering
