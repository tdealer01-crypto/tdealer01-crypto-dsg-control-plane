# Phase 9: Post-Approval Setup & Launch

**Status:** Execution Guide for After Stripe Approval  
**Duration:** 1 week (Days 43-49 of Phase 9)  
**Owner:** DevOps, Product, Marketing  
**Trigger:** Approval email from Stripe  

---

## Overview

This guide covers the critical steps you take AFTER Stripe approves your app and before you announce the launch. It's the bridge between "approved" and "live in marketplace."

**Timeline:**
- **Day 0 (Approval Day):** Receive approval email, enable in marketplace
- **Days 1-2:** Verify app is live, run final tests
- **Days 3-4:** Send launch announcements, activate monitoring
- **Days 5-7:** Monitor first week, collect early feedback

---

## Pre-Approval Checklist (Verify Before Proceeding)

Before executing this guide, confirm:

- [ ] Stripe approval email received and saved
- [ ] Email includes app ID, marketplace listing URL, and any conditions
- [ ] No additional action items mentioned in email (if yes, handle first)
- [ ] All team members notified of approval
- [ ] Customer success team has completed `PHASE9_CUSTOMER_ONBOARDING/` preparation
- [ ] Monitoring dashboard is ready (see PHASE9_SUCCESS_METRICS.md)
- [ ] Support team is trained and available

---

## Part 1: Enable in Production Marketplace (Day 0-1)

### Step 1: Verify Marketplace Eligibility

**In Stripe Dashboard:**

1. Log in to Stripe Dashboard
2. Navigate to **Apps & Integrations** → **Develop an App**
3. Find your app in the "My Apps" section
4. Click on your app → **App Details** tab
5. Verify status shows "Approved" (not "In Review")
6. Note the Marketplace URL (you'll use this in announcements)

**Expected:** You should see an "Enable in Marketplace" or "Publish" button

### Step 2: Enable the App in Marketplace

**In Stripe Dashboard:**

1. On your app's **App Details** page, find the **Listing** tab
2. Verify all fields are complete:
   - [ ] App name
   - [ ] Description (short & long)
   - [ ] Icons (app icon uploaded)
   - [ ] API scopes and permissions
   - [ ] Support contact email
   - [ ] Terms of Service & Privacy Policy URLs

3. Click **Enable in Marketplace** or **Publish** button
4. Confirm the action (Stripe will show a warning; confirm intentional publication)
5. Wait 2-5 minutes for marketplace index to update

**Expected:** App status changes to "Published" or "Live in Marketplace"

### Step 3: Verify App is Live in Marketplace

**Public test (no login required):**

1. Open Stripe App Marketplace in incognito/private browser: https://marketplace.stripe.com/
2. Search for your app by name or category
3. Verify your app appears in search results
4. Click on listing and verify all information displays correctly:
   - [ ] App icon, name, short description visible
   - [ ] Long description renders properly
   - [ ] Screenshots and hero image display
   - [ ] "Connect" or "Install" button is clickable
   - [ ] Support contact email visible
   - [ ] Privacy & Terms links work

**If not visible after 5 minutes:**
- Wait 10-15 minutes (marketplace index updates periodically)
- Clear browser cache and try again
- Contact Stripe support if still not visible after 30 minutes

### Step 4: Test Installation Flow (as Merchant)

**Using a test Stripe account:**

1. Log in to a test Stripe Dashboard with test API keys
2. Find your app in Stripe App Marketplace
3. Click **Connect** or **Install** button
4. Verify OAuth flow works:
   - [ ] Consent screen appears
   - [ ] Authorize button is clickable
   - [ ] After authorizing, redirected back to your app
   - [ ] Webhook events are being received from test account

5. In your app dashboard, verify the test merchant appears:
   - [ ] Merchant account listed
   - [ ] Account status shows "Connected"
   - [ ] Can create test policies
   - [ ] Can execute test operations

**If OAuth fails:**
- Verify `NEXT_PUBLIC_STRIPE_CLIENT_ID` is set in Vercel environment
- Verify redirect URI in Stripe Dashboard matches `app/api/stripe-callback`
- Check application logs for errors

---

## Part 2: Launch Communications (Days 1-3)

### Step 5: Send Launch Announcement Email

**To:** Early access customers, beta testers, waitlist  
**Timing:** Days 1-2 post-approval  
**Owner:** Marketing

**Email Template:**

Subject: `🚀 DSG Governance Gate is Now Available in Stripe Marketplace`

```
Hi [CUSTOMER_NAME],

We're excited to announce that DSG Governance Gate is now live in the 
Stripe App Marketplace!

After 6 months of development and 2-4 weeks of Stripe review, your 
governance and policy engine is now officially available to all Stripe merchants.

WHAT'S READY:
✓ Real-time operation gating (charges, payouts, refunds)
✓ Immutable audit trails for compliance
✓ Role-based access control & policy versioning
✓ API + Stripe webhook integration
✓ 99.9% uptime SLA

WHAT YOU GET (as early access customer):
✓ 50% discount on first 3 months
✓ Free onboarding & setup assistance
✓ Direct access to product team
✓ Feature requests prioritized

NEXT STEPS:
1. [Install from Marketplace](https://marketplace.stripe.com/apps/[YOUR_APP_SLUG])
2. [Get Started Guide](https://yourcompany.com/docs/getting-started)
3. [Book Onboarding Call](https://calendly.com/yourcompany/dsg-demo)

Questions? Reply to this email or contact support@yourcompany.com

Welcome to governed AI operations! 🎯

[FOUNDER_NAME]
DSG Governance Gate Team
```

**Track:**
- Sent date
- Open rate (if using email tracking)
- Click-through rate to marketplace
- Conversion rate (who installs within 7 days)

### Step 6: Post to Company Channels

**Blog Post (500 words)**

Location: `https://yourcompany.com/blog/dsg-marketplace-launch`

Reference: `PHASE9_MARKETING/launch-announcement.md`

Key points to cover:
- Problem solved (ungovened AI operations)
- Solution (real-time policy gating)
- Target customers (3-5 use cases)
- What's included (features)
- Pricing (freemium tier)
- Call to action (install from marketplace)

**Twitter/X Announcement (Thread)**

Reference: `PHASE9_MARKETING/social-media/twitter-thread.txt`

Example:

```
🧵 We're launching in the Stripe App Marketplace! 🚀

1/ After 6 months of building and 2-4 weeks of Stripe review, DSG 
Governance Gate is now officially live.

2/ The problem: AI agents execute Stripe operations (charges, payouts, 
refunds) without real-time policy gates. Result: fraud risk, compliance 
gaps, audit trail gaps.

3/ Our solution: Gate every Stripe operation BEFORE execution. Real-time 
policy evaluation, immutable audit trails, deterministic evidence lineage.

4/ Now available in Stripe Marketplace for all merchants. Install in 
2 minutes, create your first policy in 5 minutes.

5/ Early access customers: 50% discount for 3 months + direct product 
team support.

[Link to marketplace]

#Stripe #AI #Governance #PaymentGating
```

**LinkedIn Article**

Reference: `PHASE9_MARKETING/social-media/linkedin-article.txt`

Key points:
- Thought leadership (why governance matters)
- Market insight (fraud trends, compliance pressure)
- Company story (journey to launch)
- Product value (use cases)
- Call to action (install or demo)

### Step 7: Notify Stripe Partnership Team (Optional)

**Purpose:** Get featured in Stripe channels  
**Timing:** Day 2-3  
**Owner:** Business Development

**Email to:** partners@stripe.com or your Stripe account manager

```
Subject: DSG Governance Gate Approved & Live in Marketplace

Hi [Stripe Partner Team],

I wanted to let you know that DSG Governance Gate was approved and 
is now live in the Stripe App Marketplace.

Quick overview:
- App slug: dsg-governance-gate
- Category: Risk Management & Compliance
- Target: High-risk merchants needing AI operation gating
- Launch date: [TODAY]

We're reaching out to 50+ merchants in the first 30 days and expect 
to hit 100+ installations by end of Q2.

If you see opportunities for:
- Featured listing in Stripe materials
- Co-marketing campaign
- Partner integration showcase

We'd love to discuss. Available for call this week.

Best,
[YOUR_NAME]
```

---

## Part 3: Monitoring & Metrics Setup (Days 2-4)

### Step 8: Activate Success Metrics Dashboard

**Reference:** PHASE9_SUCCESS_METRICS.md

**Setup in Vercel Analytics:**

1. Log in to Vercel Dashboard
2. Navigate to your project → **Analytics** tab
3. Verify these metrics are tracking:
   - [ ] `/api/stripe-callback` hits (OAuth completions)
   - [ ] `/api/stripe-webhook` hits (webhook deliveries)
   - [ ] `/api/execute` hits (gating operations)
   - [ ] API response times (p50, p95, p99)
   - [ ] Error rates (4xx, 5xx)

4. Set up alerts:
   - [ ] Alert if error rate > 1% for 5 minutes
   - [ ] Alert if p99 latency > 1000ms for 5 minutes
   - [ ] Alert if webhook processing fails > 10 times/hour

**Setup in Supabase Monitoring:**

1. Log in to Supabase Dashboard
2. Navigate to your project → **Reports** tab
3. Create custom query to track:
   - [ ] `stripe_operations` table row count (growth indicator)
   - [ ] `runtime_intents` completion rate
   - [ ] Policy violation rate (BLOCK decisions)

Example query:

```sql
SELECT 
  DATE_TRUNC('day', created_at) as day,
  COUNT(*) as operations,
  SUM(CASE WHEN decision = 'ALLOW' THEN 1 ELSE 0 END) as allowed,
  SUM(CASE WHEN decision = 'BLOCK' THEN 1 ELSE 0 END) as blocked,
  SUM(CASE WHEN decision = 'REVIEW' THEN 1 ELSE 0 END) as review
FROM stripe_operations
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY day
ORDER BY day DESC;
```

### Step 9: Set Up Support Monitoring

**Setup support email and ticketing:**

Reference: PHASE9_SUPPORT_PLAYBOOK.md

1. Verify support email is monitored (from PHASE9_MARKETPLACE_SUBMISSION.md, Item 8)
2. Set up ticketing system (Zendesk, Help Scout, etc.)
3. Create support email template responses:
   - "Thanks for installing DSG" (auto-response)
   - "Getting started" (common question)
   - "Integration help" (common request)
   - "Feature request" (capture & forward to product)

4. Brief support team on:
   - Common issues (see PHASE9_SUPPORT_PLAYBOOK.md)
   - Escalation path (when to involve engineering)
   - First 30 days prioritization (any issue blocking customer use = urgent)

### Step 10: Configure Alerts & Escalation

**Create incident response triggers:**

1. **Critical:** Error rate > 5% or downtime
   - Alert: Slack #incidents channel
   - Response: Page on-call engineer (within 5 minutes)
   - Escalation: VP Engineering if not resolved in 15 minutes

2. **Urgent:** Error rate > 1% or p99 latency > 2000ms
   - Alert: Slack #platform channel
   - Response: Engineering team acknowledges (within 15 minutes)
   - Escalation: Engineering lead if not resolved in 1 hour

3. **High:** New customer support request or bug report
   - Alert: Email to support team
   - Response: Support team replies (within 2 hours)
   - Escalation: Engineering if technical (within 4 hours)

---

## Part 4: First Week Execution (Days 1-7)

### Step 11: Daily Stand-ups (Days 1-7)

**Purpose:** Catch issues early, celebrate wins  
**Duration:** 15 minutes  
**Participants:** Product, Engineering, Support, Marketing

**Agenda:**

```
1. Last 24h metrics (5 min)
   - Installations
   - Operations processed
   - Support tickets opened
   - Any errors or incidents?

2. Customer feedback (3 min)
   - Early feedback from installations
   - Any blockers or questions?

3. Today's priorities (5 min)
   - What's the one thing we're focused on?
   - Any customer calls scheduled?

4. Escalations (2 min)
   - Any issues needing exec attention?
```

### Step 12: Customer Onboarding Calls

**Schedule:** Days 1-7 post-launch  
**Owner:** Customer Success  
**Reference:** PHASE9_CUSTOMER_ONBOARDING/integration-tutorial.md

**For each early access customer:**

1. Schedule 30-minute onboarding call
2. Cover:
   - [ ] How to install app from Stripe Marketplace
   - [ ] OAuth flow walkthrough
   - [ ] Creating first policy
   - [ ] Testing with sample charge
   - [ ] Reviewing audit trail
   - [ ] Q&A

3. After call:
   - [ ] Send follow-up email with resources
   - [ ] Document any feature requests
   - [ ] Mark completion in CRM

### Step 13: First-Week Metrics Review (End of Day 7)

**Owner:** Product/Analytics

**Report to leadership:**

```
DSG GOVERNANCE GATE — LAUNCH WEEK 1 METRICS

Adoption:
- Installations (Target: 10+): [X]
- Active merchants (attempted policy): [X]
- Test operations processed: [X]

Engagement:
- Avg. operations/merchant: [X]
- Policy creation rate: [X]
- Feature usage (gating types): [X]

Quality:
- Error rate: [X]% (Target: <1%)
- Support tickets: [X]
  - Resolved (0-2 hours): [X]
  - Pending: [X]
- Customer sentiment: [X] (based on calls)

Revenue:
- Freemium signups: [X]
- Paid signups: [X]
- MRR (monthly recurring): $[X]

Next Week:
- Focus: [specific area based on data]
- Risk: [any issues to monitor]
- Opportunity: [early wins to double down on]
```

---

## Part 5: 30-Day Launch Window (Days 8-43)

### Step 14: Content & Community (Ongoing)

**Blog / Help Center Updates:**
- Publish 1-2 customer success stories (testimonials)
- Add 3-5 "how-to" guides (advanced policy setup)
- Document API enhancements or new features

**Community Engagement:**
- Answer questions on Stripe forums (if applicable)
- Share tips/tricks on Twitter/LinkedIn
- Host 1x webinar: "10 Policies Every Merchant Needs"

**Partnership Development:**
- Reach out to 10+ complementary SaaS providers
- Discuss integration/co-marketing opportunities
- Document partnership pipeline

### Step 15: Customer Success Program

**Email Sequence (see PHASE9_CUSTOMER_ONBOARDING/):**
- [ ] Day 0: Welcome email + getting started
- [ ] Day 2: First policy tutorial
- [ ] Day 4: Advanced features unlock
- [ ] Day 8: Feature request feedback loop
- [ ] Day 14: Success story / customer showcase

**Success Tracking:**
- Onboarding completion rate (target: 80%+)
- Time to first policy (target: <1 hour)
- Retention rate at 30 days (target: 70%+)
- NPS score from early customers (target: >40)

### Step 16: Product Monitoring & Optimization

**Weekly Metrics Review:**
- Installation growth trend
- Feature usage breakdown
- Common support issues (identify quick wins)
- Customer feedback themes

**Feedback Loop:**
- Collect feature requests
- Prioritize based on customer impact
- Publish roadmap update mid-month

**Bug Fixes:**
- Monitor for any issues reported by customers
- Fix critical bugs within 24 hours
- Publish fix with transparent changelog

---

## Post-Approval Checklist

Use this checklist to track execution:

### Day 0-1: Marketplace Activation
- [ ] Verify Stripe approval email received
- [ ] Enable app in production marketplace
- [ ] Confirm app appears in Stripe Marketplace search
- [ ] Test installation flow with test account
- [ ] Verify OAuth callback works
- [ ] Verify webhook events are received

### Day 1-3: Launch Communications
- [ ] Send launch announcement email to early access
- [ ] Publish blog post announcement
- [ ] Post social media (Twitter, LinkedIn)
- [ ] (Optional) Notify Stripe partnerships team
- [ ] Update marketing website with "Now in Stripe Marketplace" badge

### Day 2-4: Monitoring Setup
- [ ] Activate Vercel Analytics dashboard
- [ ] Set up error rate & latency alerts
- [ ] Create Supabase custom metrics queries
- [ ] Configure support email & ticketing
- [ ] Brief support team on common issues
- [ ] Set up incident escalation procedures

### Days 1-7: First-Week Execution
- [ ] Daily stand-ups (track metrics & issues)
- [ ] Schedule onboarding calls with early customers
- [ ] Respond to customer emails <2 hours
- [ ] Fix any critical issues immediately
- [ ] Collect customer feedback
- [ ] End-of-week metrics review & leadership report

### Days 8-43: 30-Day Launch Window
- [ ] Publish 1-2 customer success stories
- [ ] Send email onboarding sequence (5 emails)
- [ ] Host 1x webinar or demo
- [ ] Reach out to 10+ partnership prospects
- [ ] Weekly metrics review & optimization
- [ ] Bug fixes & product improvements
- [ ] Mid-month roadmap update

---

## What Success Looks Like

### By End of Week 1
- ✅ App is live in Stripe Marketplace (publicly visible)
- ✅ 10+ installations from non-beta customers
- ✅ 0 critical support issues
- ✅ Customer onboarding calls completed for early access
- ✅ Monitoring & alerts are active

### By End of Month 1
- ✅ 50+ installations
- ✅ 500+ operations gated (across all customers)
- ✅ 80%+ onboarding completion rate
- ✅ <1% error rate sustained
- ✅ 2-3 customer success stories collected
- ✅ 0 critical production incidents

### By End of Month 3
- ✅ 200+ installations
- ✅ 5,000+ operations gated
- ✅ 70%+ 30-day retention rate
- ✅ $10K+ MRR from paid customers
- ✅ 5-10 case studies & testimonials
- ✅ Partnership pipeline established

---

## Troubleshooting

### App Not Appearing in Marketplace After "Publish"

**Symptoms:** Clicked "Publish" but can't find app in marketplace

**Cause:** Marketplace index hasn't updated yet

**Fix:**
1. Wait 15-30 minutes and refresh
2. Try searching in incognito/private browser (clear cache)
3. Verify app status is "Published" in Stripe Dashboard
4. If still not visible after 1 hour, contact Stripe support

### OAuth Flow Not Working After Approval

**Symptoms:** "Install" button appears but OAuth fails

**Cause:** Environment variable not set or redirect URI mismatch

**Fix:**
1. Verify `NEXT_PUBLIC_STRIPE_CLIENT_ID` is set in Vercel
2. Verify `STRIPE_SECRET_KEY` is set in Vercel
3. Verify redirect URI in Stripe Dashboard matches `https://yoururl.com/api/stripe-callback`
4. Redeploy to Vercel: `git push` or redeploy from Vercel dashboard

### Support Email Overload

**Symptoms:** Too many support emails, can't keep up

**Cause:** More interest than expected (good problem!)

**Fix:**
1. Set up auto-responder: "Thanks for reaching out. We'll respond within 24 hours"
2. Create FAQ doc and link in auto-response
3. Add more support staff if needed
4. Prioritize: critical bugs > onboarding questions > feature requests

---

## Key Contacts & Escalation

**Stripe Support:**
- **URL:** https://support.stripe.com/
- **Category:** "App Marketplace"
- **Response SLA:** Usually 24-48 hours

**Your Company Support:**
- **Email:** support@yourcompany.com
- **On-call:** [Your on-call rotation]
- **Escalation:** VP Engineering

---

## Next Steps After 30 Days

After the 30-day launch window, move to:

1. **PHASE9_SUCCESS_METRICS.md** — Establish ongoing KPI tracking
2. **PHASE9_SUPPORT_PLAYBOOK.md** — Mature support operations
3. **PHASE9_PARTNERSHIP.md** — Execute partnership strategy
4. **Product Roadmap** — Plan next features based on customer feedback

---

**Last Updated:** 2026-06-07  
**Status:** ✅ Ready for Execution (After Stripe Approval)  
**Owner:** DevOps, Product, Marketing
