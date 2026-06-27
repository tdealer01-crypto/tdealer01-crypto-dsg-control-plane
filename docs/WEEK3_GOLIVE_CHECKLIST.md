# Week 3 Go-Live Checklist — Customer Acquisition Ready

**Status:** Ready for execution  
**Launch Date:** June 10, 2026  
**Deployment:** Vercel (tdealer01-crypto-dsg-control-plane.vercel.app)

---

## Pre-Launch Verification (48 hours before)

### Tier 1 Products Live

- [ ] **Agent Governance** landing page accessible at `/products/agent-governance`
- [ ] **Compliance Proof** landing page accessible at `/products/compliance-proof`
- [ ] **Policy Gates** landing page accessible at `/products/policy-gates`
- [ ] All landing pages render without errors (no 404, no 5xx)

### Tier 2 Products Live

- [ ] **Approval Dashboard** accessible at `/dashboard/approvals`
- [ ] **Readiness Gate** landing page accessible at `/products/readiness-gate`
- [ ] **Readiness Config** dashboard accessible at `/dashboard/readiness-config`

### API Endpoints Verified

**Tier 1A (Agent Governance):**
- [ ] `POST /api/execute` returns 200 with quota check

**Tier 1B (Compliance Proof):**
- [ ] `POST /api/compliance/export` returns JSON with frameworks
- [ ] `GET /api/compliance/export/frameworks` returns supported frameworks list

**Tier 1C (Policy Gates):**
- [ ] npm package `@dsg-platform/gates` installable from npm registry
- [ ] `npm install @dsg-platform/gates` works locally
- [ ] TypeScript exports resolve (`GateRequest`, `GatePolicyConfig`, etc.)

**Tier 2A (Approval Queue):**
- [ ] `POST /api/approval-queue/request` creates approval request
- [ ] `GET /api/approval-queue/pending` returns paginated list
- [ ] `PATCH /api/approval-queue/{id}` updates status (approve/reject)

**Tier 2B (Readiness Gate):**
- [ ] `POST /api/readiness/check` evaluates 5 checks
- [ ] `GET /api/readiness/config` returns org config
- [ ] `PATCH /api/readiness/config` updates thresholds
- [ ] `GET /api/readiness/history` returns audit trail

### Database & Auth

- [ ] Supabase migrations applied (if any new tables added)
- [ ] RLS policies configured for authenticated routes
- [ ] Org isolation enforced (users can only see their org's data)
- [ ] Free tier quotas initialized for all users

### Pricing & Billing

- [ ] Stripe products created for all 5 tiers
- [ ] Pricing page updated with all products
- [ ] Free trial setup working (14-day Pro trial CTA)
- [ ] Beta signup quota tracking initialized

### Email & Notifications

- [ ] Resend email service configured (API key in Vercel env)
- [ ] Welcome email template tested
- [ ] Approval notification templates ready
- [ ] ProductHunt subscriber list imported

### Security

- [ ] CORS headers correctly set (no overpermissive origins)
- [ ] API key validation enforced on authenticated routes
- [ ] Rate limiting configured (100/min free, 1000/min paid)
- [ ] No secrets in code, .env.example only has variable names

### Performance

- [ ] Vercel deployment completed (no build errors)
- [ ] `GET /api/health` returns 200 < 100ms
- [ ] `GET /api/agent/status` confirms deployed commit
- [ ] Landing pages load < 2 seconds on 4G network

---

## ProductHunt Launch Checklist

- [ ] ProductHunt account created + company profile filled
- [ ] Product title, tagline, description finalized
- [ ] 5 gallery images uploaded (1280×720 each, <5MB)
- [ ] 60-second demo video linked (YouTube or direct upload)
- [ ] Pricing section complete with Free/Pro comparison
- [ ] "Get Started" button links to `/products/agent-governance`
- [ ] Website link updated to production URL
- [ ] GitHub link accessible and relevant

**Going Live:**
- [ ] Submit to ProductHunt (Jun 9, 8:00 PM PT → goes live Jun 10, 12:01 AM PT)
- [ ] Prepare Twitter thread (5 tweets, scheduled for Jun 10 00:00 UTC)
- [ ] Prepare email blast to warm list (50 beta users, to be sent Jun 10)

---

## Cold Email Campaign Checklist

- [ ] Resend account configured with custom domain email (t.dealer01@dsg.pics)
- [ ] Email 1 subject lines A/B tested (3 variants)
- [ ] Email 1 body personalized for 20 target companies
- [ ] Calendly scheduling link working (15-min + 30-min slots available)
- [ ] Demo video recorded and uploaded (or placeholder script ready)
- [ ] Case study template finalized (for post-signature)
- [ ] CRM (Pipedrive or similar) set up to track:
  - [ ] Email sent, open time, click time
  - [ ] Demo booked, attended, outcome
  - [ ] Contract signed, amount, product mix

**Email Sequence:**
- [ ] Email 1: Jun 10, 09:00 UTC (cold intro)
- [ ] Email 2: Jun 12, 09:00 UTC (demo + social proof)
- [ ] Email 3: Jun 14, 09:00 UTC (interview offer)
- [ ] Email 4: Jun 18, 09:00 UTC (pricing clarity)
- [ ] Email 5: Jun 21, 09:00 UTC (limited offer, 48h deadline)

---

## Support & Onboarding Checklist

- [ ] Help documentation available (getting started guide for each product)
- [ ] Onboarding flow prepared (5-step setup for Agent Governance):
  1. GitHub App install
  2. Configure policy (if using Policy Gates)
  3. Create first approval request
  4. Review decision
  5. Upgrade to Pro (optional)
- [ ] Hermes chat widget configured (or Slack community ready)
- [ ] FAQ page populated with 5+ Q&A per product

---

## Metrics & Monitoring

**Setup:**
- [ ] Vercel Analytics enabled (tracking page views, errors)
- [ ] Sentry configured (error tracking + alerting)
- [ ] Google Analytics 4 or Plausible configured
- [ ] ProductHunt dashboard monitored (upvotes, comments, click-through)
- [ ] Email metrics tracked (opens, clicks, bounces)

**Daily Monitoring (Weeks 3-4):**
- [ ] ProductHunt rank and upvotes (check every 6h Jun 10-11)
- [ ] Website traffic (is ProductHunt/Twitter driving signups?)
- [ ] Email open rate and click-through rate
- [ ] Approval queue activity (are beta users using it?)
- [ ] Error rate (any 5xx errors on Vercel?)
- [ ] API latency (gate evaluation <500ms?)

---

## Post-Launch Actions (Immediate)

**Day 1 (Jun 10):**
- [ ] Submit ProductHunt (if not already live)
- [ ] Post Twitter thread (5 tweets)
- [ ] Send cold Email 1 to 20 targets
- [ ] Send warm email to beta list (50+ people)
- [ ] Engage ProductHunt comments (respond to every comment within 2h)

**Day 2 (Jun 11):**
- [ ] Check ProductHunt rank (target: top 10)
- [ ] Share user testimonials in ProductHunt comments
- [ ] Respond to Twitter mentions
- [ ] Compile early metrics email

**Day 3-7 (Jun 12-16):**
- [ ] Send Email 2 (demo + social proof)
- [ ] Follow up with non-respondents to Email 1
- [ ] Demo calls with interested parties
- [ ] Begin case study interviews with early adopters

---

## Success Criteria

**Week 3 Targets (by Jun 16):**
- ✅ 3+ demo calls booked (from cold emails)
- ✅ 100+ ProductHunt upvotes
- ✅ 50+ beta signups (from ProductHunt + cold outreach)
- ✅ 0 5xx errors on production (error-free launch)
- ✅ <500ms API latency (all gate evaluations)

**Week 4 Targets (by Jun 30):**
- ✅ 3+ pilot contracts signed (1 per Tier 1 product)
- ✅ 1 case study completed and published
- ✅ 150+ total beta signups
- ✅ 10+ approval workflow tests by pilot customers
- ✅ $X MRR from paid tiers (even if just 1 contract)

---

## Go / No-Go Decision Point

**Decision Date:** Jun 12, 2026 (48 hours after launch)

**GO criteria (all must be true):**
- ✅ 0 critical bugs on production
- ✅ ProductHunt traffic flowing (>100 unique visitors)
- ✅ Email deliverability working (no bounces >5%)
- ✅ API endpoints responding <500ms
- ✅ 20+ beta signups received

**NO-GO scenarios:**
- ❌ Website down or unreachable (fix immediately, retry)
- ❌ ProductHunt rejected submission (activate Twitter backup immediately)
- ❌ Cold emails bouncing >10% (review list quality, retry with corrected addresses)
- ❌ API consistently failing (100+ errors in first day)

If NO-GO: publish incident report, fix root cause within 24h, relaunch.

---

## Contingency Plans

### ProductHunt Rejected (Low probability)

1. Activate Twitter launch immediately (tweet thread, pin to profile)
2. Post to HackerNews with "Show HN: DSG Agent Governance"
3. Post in r/github, r/devops, r/programming subreddits
4. Cold email ProductHunt early users directly
5. Resubmit to ProductHunt next day with corrections

### Cold Email Bounce Rate >10%

1. Validate email list quality (remove bounces)
2. Find replacement contacts at bounced companies
3. Switch from cold email to LinkedIn outreach for bounced targets
4. Continue with remaining 18 companies in next round

### API Downtime During Launch

1. Revert last commit (`git revert HEAD`)
2. Redeploy from previous stable version
3. Investigate root cause
4. Fix and retest locally before redeploying
5. Post status update to ProductHunt comments + Twitter

---

**Checklist Status:** ✅ Ready for execution  
**Next:** Verify each item 48 hours before June 10 launch  
**Owner:** DevOps + QA
