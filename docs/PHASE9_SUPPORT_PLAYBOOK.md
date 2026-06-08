# Phase 9: Customer Support & Incident Response Playbook

**Status:** Post-Launch Support Operations Guide  
**Updated:** 2026-06-07  
**Owner:** Support, DevOps, Product  
**Review Frequency:** After every incident, annually for preventive reviews

---

## Overview

This playbook covers:
1. **Response SLAs** — how fast you commit to respond
2. **Common issues** — 15 frequent customer problems + solutions
3. **Escalation procedures** — when to involve engineering
4. **Incident response** — how to handle production issues
5. **Communication templates** — what to say to customers

**Goal:** Every customer question answered within SLA, every incident resolved with transparency.

---

## Support Channels & Coverage

### Support Email

**Address:** support@yourcompany.com  
**Monitoring:** Business hours (9am-5pm PT) + 24/7 on-call for critical issues  
**Inbox management:** Delegate to support team lead

### Ticketing System

**Tool:** [Zendesk / Help Scout / Linear]  
**Setup:** Auto-assign to support queue, track SLA per ticket  
**Categories:** Bug Report, Feature Request, Integration Help, Billing, General Question

### Escalation Slack Channel

**Channel:** #support-escalations  
**Subscribers:** Support lead, Engineering lead, Product lead  
**Purpose:** Thread critical issues, route to engineering if needed

### Community / Public Q&A

**Optional:** Stripe community forums, subreddits, Discord  
**Policy:** Monitor mentions of your app; respond within 24 hours

---

## Support Response SLAs

These are your commitments to customers. Track and report weekly.

| Severity | Definition | Response SLA | Resolution SLA | Examples |
|----------|-----------|--------------|---|---|
| **Critical** | Service is down, customers can't gate operations, data loss | 15 minutes | 1 hour | Webhook handler failing, OAuth broken, 50%+ error rate |
| **Urgent** | Feature is broken, blocking customer use, but alternative exists | 1 hour | 4 hours | Policy not evaluating correctly, dashboard slow, can't create policies |
| **High** | Feature doesn't work as expected, but workaround exists | 4 hours | 1 business day | UI bug, documentation unclear, performance degradation |
| **Normal** | Question, feature request, or minor issue | 2 business days | 5 business days | How do I...?, Can you add...?, Wrong behavior in edge case |

### SLA Calculation

- **Response SLA:** Time from customer email to first response (even if just "we're looking into this")
- **Resolution SLA:** Time from customer email to customer confirms issue is fixed
- **Business hours:** 9am-5pm PT, Monday-Friday (no holidays)

### Tracking & Reporting

Every Friday, report:
```
Critical issues (this week): [X] avg response [Y]min
Urgent issues (this week): [X] avg response [Y]min
High issues (this week): [X] avg response [Y]min
Normal issues (this week): [X] avg response [Y]min

SLA compliance: [X]% of issues met response SLA
SLA compliance: [X]% of issues met resolution SLA
```

---

## Common Customer Issues & Solutions

### Category 1: Installation & Onboarding

#### Issue 1.1: "OAuth Flow Failed" or "Can't Connect to Stripe"

**Customer symptom:** Clicked "Connect with Stripe" → blank page or error

**Root causes:**
- Browser cache (OAuth state token stale)
- Environment variable not set (`NEXT_PUBLIC_STRIPE_CLIENT_ID`)
- Redirect URI mismatch in Stripe Dashboard

**Solution (Tier 1 - Customer Self-Service):**

1. Try incognito/private browser window (clears cache)
2. Clear cookies for your domain
3. Hard refresh (Ctrl+Shift+R on Windows, Cmd+Shift+R on Mac)
4. Try again

**If still failing (Tier 2 - Escalate to Engineering):**

1. Ask customer for error message or screenshot
2. Check Vercel logs: Dashboard → Logs → filter for `stripe-callback`
3. Look for:
   - `NEXT_PUBLIC_STRIPE_CLIENT_ID not set`
   - `Redirect URI mismatch: expected X, got Y`
4. Fix environment variable or Stripe Dashboard config
5. Redeploy: `git push` to main (or use Vercel manual redeploy)

**Template response:**

```
Hi [NAME],

Thanks for reaching out. Let's get you connected.

Could you try these steps first (often fixes OAuth issues):
1. Use an incognito/private browser window
2. Clear cookies for our domain
3. Hard refresh (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)
4. Try again

If you still see an error, please reply with:
- What's the exact error message you see?
- Screenshot of the error (if possible)
- Which browser/OS you're using

I'll dive into logs on our end once I hear back.

Best,
[Support Team]
```

---

#### Issue 1.2: "Webhook Events Not Arriving"

**Customer symptom:** Created policy, executed operation, but webhook handler didn't fire

**Root causes:**
- Webhook endpoint URL misconfigured in Stripe Dashboard
- Stripe webhook signing secret doesn't match app config
- Firewall blocking webhooks (rare)
- Webhook handler has a bug (failing to parse payload)

**Solution:**

1. **Verify webhook URL is correct:**
   - Stripe Dashboard → Webhooks → Click your endpoint
   - URL should be: `https://yourapp.com/api/stripe-webhook`
   - Should NOT be: `http://` (must be HTTPS)

2. **Verify signing secret matches:**
   - Stripe Dashboard: Copy signing secret from webhooks page
   - Vercel env: Check `STRIPE_WEBHOOK_SECRET` matches
   - If different: Update Vercel env var, redeploy

3. **Test webhook delivery:**
   - Stripe Dashboard → Webhooks → Click endpoint → "Send test event"
   - Choose `charge.created`, click "Send test event"
   - Check Vercel logs for incoming webhook

4. **If test event works but real events don't:**
   - Ask customer: "What operation were you trying to gate?"
   - Reproduce issue with test account
   - Check app logs for errors in webhook parsing

**Template response:**

```
Hi [NAME],

Let's debug webhook delivery. First, could you check these settings:

In Stripe Dashboard:
1. Webhooks page → Find the endpoint for [YOUR_APP]
2. Verify the URL is: https://[YOUR_DOMAIN]/api/stripe-webhook
3. Click "Send test event" → Choose "charge.created" → Send

Let me know:
- Did a test event arrive?
- What operation were you trying to gate (charge? payout?)?
- Any error message you saw?

Once I hear back, I can dig into logs.

Best,
[Support Team]
```

---

#### Issue 1.3: "Dashboard Loads But Says 'Not Connected'"

**Customer symptom:** Dashboard loads, but shows "Stripe account not connected" even though they authorized

**Root causes:**
- OAuth token wasn't saved to database
- Database connection issue
- Session cookie expired

**Solution:**

1. Clear session: Ask customer to log out and log back in
2. Check database: Query `stripe_connections` table for the customer's Stripe account ID
3. If not found: OAuth succeeded but database write failed → escalate to engineering
4. If found: Session/cookie issue → try different browser

**Escalation to Engineering:** Need to check:
- Supabase logs for write errors during OAuth callback
- Application logs for unhandled exceptions in `/api/stripe-callback`

---

### Category 2: Policy Creation & Configuration

#### Issue 2.1: "Policy Not Evaluating Operations" or "Everything Gets ALLOWED"

**Customer symptom:** Created a policy like "Block charges >$5000", but $10,000 charge was allowed

**Root causes:**
- Policy syntax error (invalid rules)
- Policy not activated/published
- Wrong policy selected for operation type
- Threshold in wrong currency

**Solution:**

1. **Check policy is active:** Dashboard → Policies → status should show "Active"
2. **Review policy rules:** Click policy → Review the exact logic
   - Correct threshold? ($5000 in right currency?)
   - Correct operator? (> vs. >=)
   - Correct field? (amount vs. description)
3. **Test rule manually:** Try simple rule first: "Block all charges"
   - Create test charge
   - Verify it's blocked
   - If blocked, rule engine works → refine rule
4. **Check policy version:** If updated policy, confirm new version is being used
   - New charges should use latest policy version (check timestamp)

**Template response:**

```
Hi [NAME],

Let's check your policy setup.

Quick debugging steps:
1. Go to Dashboard → Policies → Your Policy
2. Verify status shows "Active" (not "Draft")
3. Click the policy → Review the Rules section
4. What's the exact rule? (e.g., "Block if amount > 5000")

Then, try this test:
1. Create a new policy: "Block ALL charges" (simplest rule)
2. Execute a test charge in Stripe
3. Did it get blocked?

Let me know your results, and I can help refine the rules.

Best,
[Support Team]
```

---

#### Issue 2.2: "Policy Too Complex" or "Can't Add Rule"

**Customer symptom:** Dashboard form won't let them add rule, or rule engine is confusing

**Root causes:**
- Form validation error (missing required field)
- UI bug (button not responding)
- Rule syntax not clear to user

**Solution:**

1. **Check form:** Missing required field? (name, condition, action)
2. **Simplify first:** Start with 1 rule, not 5. Build incrementally.
3. **Use templates:** Provide pre-built policy templates:
   - "Block high-value charges" (> $5000)
   - "Block international charges" (non-US)
   - "Require review for suspicious patterns"

**Provide documentation:** Point to `PHASE9_MARKETING/developer-documentation-template.md` → Policy Creation section

---

### Category 3: Integration & API

#### Issue 3.1: "Error When Posting to `/api/execute`"

**Customer symptom:** Custom app is calling `/api/execute` endpoint and getting error

**Root causes:**
- Missing Bearer token in `Authorization` header
- Invalid JSON payload
- Rate limit exceeded
- API key not recognized

**Solution:**

1. **Check headers:**
   ```
   Authorization: Bearer <valid_api_key>
   Content-Type: application/json
   ```

2. **Check payload:** Valid JSON? All required fields?
   ```json
   {
     "agent_id": "your-agent-id",
     "action": "evaluate_policy",
     "payload": { /* your data */ }
   }
   ```

3. **Check API key:** Is it valid and not expired?
   - Dashboard → Settings → API Keys → Verify key

4. **Check rate limit:** Are you hitting rate limit?
   - Response headers should show `X-RateLimit-Remaining`
   - If 0, wait before retrying

**Template response:**

```
Hi [NAME],

Let's check your API integration. Can you share:
1. Exact error message returned
2. Request URL you're calling
3. Headers (mask any actual API keys)
4. Request body (JSON)

Or try this quick test with cURL:

curl -X POST https://yourapp.com/api/execute \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "test-agent",
    "action": "evaluate_policy",
    "payload": {"amount": 100}
  }'

Let me know what response you get.

Best,
[Support Team]
```

---

#### Issue 3.2: "Webhook Signature Verification Failed"

**Customer symptom:** Our webhook delivery is failing; error says "Signature verification failed"

**Root causes:**
- Webhook signing secret is wrong
- Payload was modified in transit
- Clock skew between servers (rare)

**Solution:**

1. **Verify secret in environment:**
   - Stripe Dashboard → Webhooks → Copy signing secret
   - Your app env: `STRIPE_WEBHOOK_SECRET` should match exactly
   - If not: Update and redeploy

2. **Check code:** Is your app calling `stripe.webhooks.constructEvent()`?
   - Should validate signature automatically
   - If custom signature validation: ensure you're using correct secret

3. **Re-send test event:**
   - Stripe Dashboard → Webhooks → "Send test event"
   - Should succeed if secret is correct

---

### Category 4: Performance & Load Issues

#### Issue 4.1: "Dashboard Is Slow" or "Operations Take Forever"

**Customer symptom:** Dashboard takes 10+ seconds to load, or API calls are slow

**Root causes:**
- Database query is slow (missing index)
- Supabase connection pool exhausted
- High load on shared infrastructure
- Large dataset (thousands of policies/operations)

**Solution:**

1. **Check application logs:** Is there an obvious slow query?
   - Look for queries taking >5 seconds
   - Check Supabase query performance logs

2. **Check infrastructure:**
   - Vercel status page: any incidents?
   - Supabase status page: any incidents?

3. **Temporary fix:** If database is slow:
   - Add pagination: Load first 10 operations, not all 10,000
   - Add filters: "Show last 30 days" not "all time"

4. **Permanent fix:** Engineering optimization
   - Add database index on frequently filtered column
   - Implement caching layer
   - Optimize queries

**Escalation to Engineering:** If slow queries detected, escalate for query optimization

---

#### Issue 4.2: "Got Rate Limited"

**Customer symptom:** Getting 429 Too Many Requests response

**Root causes:**
- Legitimate high volume (webhook flood)
- Test code in loop hammering endpoint
- Account compromise (suspicious activity)

**Solution:**

1. **Explain rate limits:** Calm customer, explain it's a safety feature
2. **Identify cause:**
   - Check Vercel logs: where are requests coming from?
   - Are they legitimate (from their IP) or suspicious?
3. **Solution:**
   - Legitimate high volume: Increase rate limit (contact support)
   - Test loop: Fix test code, add delays between requests
   - Suspicious activity: Verify account security

**Response template:**

```
Hi [NAME],

You hit our rate limit, which protects the system from abuse. It's a 
good sign of interest, though!

Here's what happened:
- You sent more than [100] requests/minute
- Response: 429 Too Many Requests (retry after 60 seconds)

To prevent this:
1. Add delays between API calls (e.g., 1 second)
2. Batch operations when possible
3. Use webhook instead of polling (more efficient)

If you need higher limits for legitimate use, let's chat:
- How many operations/second do you need?
- Is this sustained or burst?
- What's the use case?

I can adjust your limit if it makes sense.

Best,
[Support Team]
```

---

### Category 5: Billing & Account

#### Issue 5.1: "Was Charged Without Consent" or "Unexpected Charge"

**Customer symptom:** Invoice for subscription they don't remember signing up for

**Root causes:**
- Freemium tier auto-converted to paid (they reached usage limit)
- Trial period ended and billing started
- Accidental upgrade (clicked wrong button)

**Solution:**

1. **Find the invoice:** Check Supabase `stripe_invoices` table
2. **Identify cause:** When did they sign up? When did charge occur?
3. **Explain pricing:** Customer may not have understood freemium tier limits
4. **Options:**
   - If mistake: Refund and downgrade to freemium
   - If intentional: Confirm subscription, answer questions
   - If fraud: Investigate account access

**Escalate to:** Finance team if refund needed

**Template:**

```
Hi [NAME],

I see a charge of $[X] on [DATE]. Let me explain what happened.

You signed up for our freemium plan (free up to 100 operations/month). 
On [DATE], you exceeded 100 operations, so we auto-enrolled you in the 
Pro plan ($99/month) to keep things running.

You should have gotten an email about this, but I understand it might 
have been missed.

Your options:
1. Keep Pro plan (more features, more operations)
2. Cancel Pro and move back to Freemium ($0/month, limited to 100 ops)
3. Get a refund for this charge (I can do this now)

What would you prefer?

Best,
[Support Team]
```

---

#### Issue 5.2: "What's Your Pricing?"

**Customer symptom:** New customer asking about pricing/plans

**Root causes:** Pricing not clear on website, or customer wants custom plan

**Solution:**

1. **Reference pricing page:** Point to `https://yourcompany.com/pricing`
2. **Summarize main tiers:**
   - Freemium: Free, up to 100 ops/month
   - Pro: $99/month, unlimited operations
   - Enterprise: Custom pricing for large orgs

3. **Offer customization:** If they have specific needs, schedule a call

**Template:**

```
Hi [NAME],

Great question! Here's our pricing:

**Freemium:** Free
- Up to 100 gated operations/month
- Basic policies (up to 5)
- Community support

**Pro:** $99/month
- Unlimited operations
- Advanced policies (unlimited)
- Priority email support
- Audit trail & reports

**Enterprise:** Custom
- For organizations processing 10K+ operations/month
- Dedicated support, SLA
- Custom integrations

If you have questions or need a custom plan, let's chat:
[Calendar link to 15-minute call]

Best,
[Support Team]
```

---

### Category 6: Data & Compliance

#### Issue 6.1: "How Long Do You Keep My Data?"

**Customer symptom:** Customer asking about data retention, compliance

**Root causes:** Privacy/compliance requirements

**Solution:**

1. **Refer to privacy policy:** `https://yourcompany.com/privacy`
2. **Summarize key points:**
   - Audit logs: 12 months (legal requirement)
   - Operation metadata: Until account closure
   - Personal data: Deleted on request (GDPR right to delete)

3. **Offer legal documentation:** DPA, privacy notice, compliance docs

**Template:**

```
Hi [NAME],

Great question about data retention.

Here's our policy:
- **Audit trails:** Kept for 12 months (required for compliance)
- **Operation metadata:** Kept as long as your account is active
- **Personal data:** Deleted within 30 days on request (GDPR)

You can request:
- Your data export (GDPR right to portability)
- Data deletion (GDPR right to be forgotten, except audit trail)
- DPA / privacy agreement for your procurement team

For legal questions, contact: privacy@yourcompany.com

Best,
[Support Team]
```

---

#### Issue 6.2: "Can I Get a Data Processing Addendum (DPA) or SOC 2 Report?"

**Customer symptom:** Enterprise customer needs compliance docs for their security team

**Root causes:** Normal enterprise procurement requirement

**Solution:**

1. **Offer DPA:** Provide template from `PHASE9_MARKETING/legal/dpa-template.md`
2. **Offer compliance status:** Document current certifications
   - [ ] SOC 2 (audit in progress / planned / completed)
   - [ ] ISO 27001 (in progress / completed)
   - [ ] GDPR (compliant / DPA provided)
   - [ ] HIPAA (not in scope / available)

3. **Be honest:** If SOC 2 not done yet, say "in progress" not "completed"

**Template:**

```
Hi [NAME],

Absolutely, we can provide compliance docs.

Here's what we have available:
- ✅ Data Processing Addendum (GDPR-compliant)
- ✅ Privacy Policy & Terms of Service
- ⏳ SOC 2 Type II (audit in progress, expected Q3 2026)
- 📋 HIPAA (available upon request)

I'll send you our DPA separately. For SOC 2, you can tell your security 
team it's in progress with [Audit Firm Name], expected by [DATE].

Any other questions about compliance?

Best,
[Support Team]
```

---

## Incident Response Playbook

### Severity Definitions

**Critical:** Service unavailable, customer data at risk, or >10% error rate
**Urgent:** Feature broken, but service available, or 5-10% error rate  
**High:** Performance degradation or intermittent issues

### Critical Incident Response Flow

```
🚨 CRITICAL INCIDENT DETECTED
    ↓
1. DECLARE INCIDENT (page on-call engineer)
    ↓
2. ASSESS (what's down? how many customers affected?)
    ↓
3. COMMUNICATE (notify customers of status)
    ↓
4. INVESTIGATE (root cause in logs)
    ↓
5. MITIGATE (temporary fix if needed)
    ↓
6. RESOLVE (permanent fix)
    ↓
7. POST-MORTEM (what went wrong? how do we prevent?)
```

### Step-by-Step Response

#### Step 1: Declare Incident

**Who:** First person to notice (support, DevOps, or automated alert)

**Action:**
1. Slack → Post in #incidents channel: `🚨 CRITICAL: [Brief description]`
2. Page on-call engineer (use PagerDuty or similar)
3. Start incident timeline (when did it start?)

**Example:**
```
🚨 CRITICAL INCIDENT

Service: DSG Governance Gate API
Status: Down
Severity: Critical (OAuth failing, customers can't connect)
Started: 2026-06-07 14:32 UTC
Who's investigating: [On-call engineer name]
```

#### Step 2: Assess Impact

**Owner:** On-call engineer

**Questions to answer:**
- What's actually down? (OAuth? Webhook? Database?)
- How many customers affected? (All? Some?)
- What's the error rate?
- When did it start?

**Commands to run:**

```bash
# Check Vercel deployment status
curl -I https://yourapp.com/api/health

# Check error rate
# (In Vercel dashboard: Analytics → Error Rate graph)

# Check database connectivity
# (In Supabase dashboard: Reports → look for connection pool)

# Check logs
# (Vercel: Logs → filter for recent errors)
```

#### Step 3: Communicate

**Owner:** Support or Product lead

**Notify customers:**

**Email to all affected customers:**
```
Subject: 🔴 Service Status Update - DSG Governance Gate

We're experiencing an issue with [SPECIFIC FEATURE] that affects your 
ability to [SPECIFIC ACTION].

Status: Investigating (started at 14:32 UTC)
Impact: ~[X] customers unable to [ACTION]

We're actively working on a fix. Updates every 15 minutes.

Current workaround (if any): [Describe if available]

We apologize for the disruption and will have an update shortly.

[Company] Support Team
```

**Slack status:**
```
🔴 DSG API: Down — OAuth failing — Investigating
Last update: 2026-06-07 14:45 UTC
```

**Update every 15 minutes** if incident >30 min

#### Step 4: Investigate Root Cause

**Owner:** On-call engineer

**Check these in order:**

1. **Recent deployments:** Did something just ship?
   - Vercel Deployments → see recent changes
   - If yes: roll back immediately (`vercel rollback`)

2. **Database:** Is Supabase up?
   - Check Supabase status page
   - Check Supabase logs for errors

3. **Environment variables:** Were they accidentally changed?
   - Compare Vercel env vars to documentation
   - If missing: add and redeploy

4. **Rate limiting:** Are we blocking legitimate traffic?
   - Check logs for 429 responses
   - If yes: adjust rate limit

5. **External dependencies:** Is Stripe API down?
   - Check Stripe status: https://status.stripe.com
   - Check logs for Stripe API errors

**Document findings in incident thread**

#### Step 5: Mitigate

**Owner:** On-call engineer

**Quick fixes (within 5-10 minutes):**

- **Roll back recent deployment:** `vercel rollback`
- **Restart service:** Vercel auto-restarts failed functions
- **Increase rate limit:** Update env variable and redeploy
- **Scale up:** If capacity issue, increase Vercel function memory

**Communicate mitigation to customers:**
```
We've identified the issue and are applying a fix now. 
Expected resolution: 5-10 minutes.
```

#### Step 6: Resolve

**Owner:** On-call engineer

**Full resolution (after mitigation):**

1. Implement permanent fix:
   - Code change (merge to main if tested)
   - Configuration update
   - Database migration

2. Deploy fix:
   - `git push` to main (triggers Vercel deployment)
   - Monitor Vercel deployment status
   - Verify fix in production

3. Verify resolution:
   - Test via: `curl https://yourapp.com/api/health`
   - Check error rate dropped to <1%
   - Ask 1-2 customers to confirm they can use the service

**Communicate resolution:**
```
✅ RESOLVED

The issue with [FEATURE] has been fixed at 2026-06-07 14:52 UTC.

Root cause: [Brief explanation]
Fix: [Brief description]

Affected customers should be able to [ACTION] normally now. 
Thank you for your patience.

[Company] Support Team
```

#### Step 7: Post-Mortem

**Owner:** Engineering lead

**Schedule:** Within 24 hours of incident closure

**Template:**

```markdown
# Incident Post-Mortem

**Date:** 2026-06-07  
**Duration:** 20 minutes (14:32-14:52 UTC)  
**Severity:** Critical  
**Status:** Resolved  

## Summary
[1-2 sentences on what happened and impact]

## Timeline
- 14:32 UTC: Alert fired (error rate >50%)
- 14:35 UTC: Engineer paged
- 14:38 UTC: Root cause identified (missing env var)
- 14:40 UTC: Mitigation applied (env var added)
- 14:45 UTC: Customers confirmed working
- 14:52 UTC: Incident closed

## Root Cause
[Explain why it happened, not just what]

Example: "During deployment X, env var STRIPE_WEBHOOK_SECRET wasn't 
synced from staging. New code expected var, which was nil, so webhook 
handler crashed."

## Impact
- Affected customers: [X]
- Error rate: [peak]%
- Operations lost: ~[X] (if applicable)

## What Went Well
- Alert fired immediately
- Engineer responded in <5 min
- Clear logs for debugging

## What We Could Do Better
- Auto-sync critical env vars before deployment
- Add healthcheck for webhook connectivity
- Automated rollback on error rate spike

## Action Items
- [ ] Add pre-deployment env var validation (Owner: [Name], Due: [Date])
- [ ] Implement webhook connectivity healthcheck (Owner: [Name], Due: [Date])
- [ ] Document critical env vars in runbook (Owner: [Name], Due: [Date])

## Lessons Learned
[Key insight to prevent similar incidents]
```

**Share post-mortem:**
- [ ] With engineering team (for learning)
- [ ] With customers (if major incident)
- [ ] With leadership (summary only)

---

## Customer Communication Templates

### "Issue Identified" Template

```
Hi [NAME],

We've identified the issue you're experiencing with [FEATURE].

Here's what's happening:
[Technical explanation in plain English]

What we're doing:
[Quick fix / workaround / ETA for full fix]

Expected impact on you:
[What functionality is affected, how long]

Next update: [Timeframe, e.g., "in 30 minutes" or "tomorrow morning"]

Thanks for your patience,
[Support Team]
```

### "Quick Fix Available" Template

```
Hi [NAME],

Good news! We've rolled out a fix for the issue.

If you're still experiencing the problem:
1. Clear browser cache (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)
2. Log out and log back in
3. Try again

Let me know if it's resolved or if you need more help.

Best,
[Support Team]
```

### "Feature Down Due to [X]" Template

```
Hi [NAME],

Quick update: [FEATURE] is temporarily unavailable due to [REASON].

Timeline:
- Issue started: [TIME]
- Expected fix: [TIME / ETA]
- Workaround: [If available, describe]

We apologize for the disruption. I'll update you as soon as it's resolved.

Best,
[Support Team]
```

---

## Escalation Criteria

**Escalate to Engineering if:**

- [ ] Error rate >1% sustained for >30 minutes
- [ ] Database query taking >5 seconds
- [ ] Webhook deliveries failing >10 times/hour
- [ ] Memory/CPU usage >80% sustained
- [ ] Unhandled exception in application logs
- [ ] Customer data corruption suspected

**Escalate to Product if:**

- [ ] Policy engine not working as designed
- [ ] UI confusing (multiple customers asking same question)
- [ ] Feature request critical to multiple customers
- [ ] Customer churn risk due to missing feature

**Escalate to Finance if:**

- [ ] Customer disputes a charge
- [ ] Refund request
- [ ] Custom pricing negotiation
- [ ] Large deal at risk due to cost

---

## On-Call Rotation

**Setup:**
- Engineer on-call Monday-Sunday 9am-5pm PT
- Same engineer handles critical issues outside business hours (or rotate 24/7 based on demand)

**Escalation path:**
- PagerDuty (or equivalent) alerts on-call engineer
- If no response in 5 min, page backup engineer
- If incident >1 hour, escalate to engineering lead

**On-call responsibilities:**
- Respond to critical alerts within 15 minutes
- Investigate and provide status update within 30 minutes
- Coordinate with support for customer communication
- Document incident and post-mortem within 24 hours

---

## Support Metrics to Track

**Weekly reporting:**

```
Critical issues: [X] (SLA compliance: [Y]%)
Urgent issues: [X] (SLA compliance: [Y]%)
High issues: [X] (SLA compliance: [Y]%)
Normal issues: [X] (SLA compliance: [Y]%)

Avg response time: [X] hours
Avg resolution time: [X] hours
First-contact resolution rate: [X]%
Customer satisfaction: [X]/5.0
```

**Analyze trends:**
- Which issues are most common? → Improve documentation/UX
- Which issues take longest to resolve? → Add automation/tools
- How's satisfaction trending? → Address top complaints

---

## Prevention: How to Reduce Support Load

1. **Improve documentation:** Answer FAQs before customer asks
2. **Better onboarding:** Help customers succeed faster
3. **Improve UX:** Make common tasks obvious
4. **Proactive monitoring:** Catch issues before customers notice
5. **Automated testing:** Prevent regressions

---

**Last Updated:** 2026-06-07  
**Status:** ✅ Ready for Implementation (Post-Launch)  
**Owner:** Support, DevOps, Product
