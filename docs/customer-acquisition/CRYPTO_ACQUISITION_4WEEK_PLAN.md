# DSG ONE — 4-Week Crypto/Fintech Acquisition Sprint
**Start Date:** 2026-07-25  
**Target:** $5-10K MRR + 3-5 paying customers + 1-2 case studies  
**Owner:** PMM (Product/Marketing) + Eng (Integration Support)  
**Status:** 🟢 IN PROGRESS

---

## WEEK 1: Outreach Blitz (Goal: 20-30 qualified conversations)

### ✅ Daily Checklist

#### Mon-Tue: Target List & Prep
- [ ] Build 100-company target list (Crunchbase, AngelList, GitHub crypto repos)
  - Focus: $5-50M ARR, active fund movement, Stripe/Solana users
  - Export: CSV with contact info, funding stage, tech stack
- [ ] Segment companies by funding + compliance footprint
- [ ] Identify 5-8 crypto communities (Solana, DeFi, Treasury managers)
- [ ] Prepare outreach materials:
  - [ ] 3 email templates (intro, demo, objection handling)
  - [ ] 90-sec demo video (crypto variant)
  - [ ] 1-pager: "Audit-ready fund movement governance"
  - [ ] Discovery call script (4-Question Framework)

**Status:** ⏳ Not started  
**Owner:** PMM

#### Wed-Fri: Channel 1 — LinkedIn Direct Outreach (15-20 messages)
- [ ] Identify finance/compliance leads on LinkedIn
- [ ] Personalize 15-20 LinkedIn DMs with:
  - Company-specific pain point (fund movement, audit prep)
  - 90-sec demo video link
  - CTA: 15-min discovery call
- [ ] Track responses in CRM
- [ ] Expected: 5-10% response rate

**Status:** ⏳ Not started  
**Owner:** PMM

#### Wed-Fri: Channel 2 — Crypto Communities (5-8 communities)
- [ ] Post to Solana devs Slack/Discord
- [ ] Post to crypto treasury managers Slack
- [ ] Post to DeFi governance channels
- [ ] Post to FinTech founders Slack
- [ ] Message: "We help fund movement platforms prove compliance before audit. Free tier to try."
- [ ] Expected: 3-5 warm leads per community

**Status:** ⏳ Not started  
**Owner:** PMM

#### Wed-Fri: Channel 3 — Cold Email (15-20 targeted)
- [ ] Build targeted cold email list (top 20 companies)
- [ ] Subject: "Audit-ready fund movement governance — [Company]"
- [ ] Template: Problem → Solution → CTA → Price
- [ ] Follow-up sequence: +2 days, +5 days if no response
- [ ] Track: opens, clicks, responses

**Status:** ⏳ Not started  
**Owner:** PMM

#### Fri-Sat: Follow-ups & Scheduling
- [ ] Track all responses (Gmail, LinkedIn, Slack)
- [ ] Schedule 5-8 demo calls for Week 2
- [ ] Send teaser: "Here's what we'll demo Monday"
- [ ] Expected outcome: 20+ conversations initiated

**Status:** ⏳ Not started  
**Owner:** PMM

### End-of-Week Metrics

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Conversations initiated | 20+ | — | ⏳ |
| Response rate | 5-10% | — | ⏳ |
| Demo calls scheduled | 5-8 | — | ⏳ |
| Free tier signups | 10+ | — | ⏳ |

---

## WEEK 2: Discovery & Live Demos (Goal: 3-5 pilots signed)

### Mon-Wed: Discovery Calls (5-8 calls, 15-30 min each)

**4-Question Framework:**

1. **"Walk me through how fund movements are currently approved?"**
   - Listen for: manual process, no audit trail, compliance concerns
   - Dig deeper: who approves, how long, what records kept?

2. **"What happens if auditor asks: prove this $50k payout was approved?"**
   - Where is the pain? Manual export? Email chains?
   - How many hours per audit cycle?

3. **"What would it be worth to cut audit prep 80%?"**
   - Gauge buying signal
   - Expected value: $200-500/mo budget

4. **"Does your team use Stripe/OpenAI/Solana?"**
   - Product fit check
   - Integration readiness

**After call:** Score 1-10 (7+ = demo candidate)

**Status:** ⏳ Not started  
**Owner:** PMM

### Thu-Fri: Live Demos (30-45 min each, 3-5 prospects)

**Demo Script:**
1. Problem recap: "Your audit trail is [current method], costs [X hours]"
2. Show `/api/dsg/v1/gates/evaluate` call with fund movement example
3. Show audit export with proof hashes
4. Pricing: Business tier $199-299/mo
5. CTA: "Shadow mode pilot for 2 weeks?"

**Key talking points:**
- ✅ Formal proof (Z3 deterministic)
- ✅ Solana integration
- ✅ No external solver needed
- ✅ Cryptographic audit trail

**Status:** ⏳ Not started  
**Owner:** PMM + Eng

### End-of-Week Metrics

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Discovery calls | 5-8 | — | ⏳ |
| Live demos | 3-5 | — | ⏳ |
| Pilots ready to sign | 2-3 | — | ⏳ |

---

## WEEK 3: Pilot Launch & Monitoring (Goal: 3-5 live, 1-2 converting)

### Mon-Tue: Onboarding (per pilot customer)

**30-min onboarding call:**
- Collect use case, approval thresholds, audit requirements
- Define success metrics
- Technical setup: SDK snippet, API docs, Solana integration
- Policy configuration:
  - "Payout <$1k: auto-approve"
  - "$1k-$10k: 1 approval"
  - ">$10k: 2 approvals"

**Status:** ⏳ Not started  
**Owner:** PMM + Eng

### Wed-Fri: Active Support & Monitoring

- [ ] Daily Slack updates: "X fund movements gated, Y blocked, Z within policy"
- [ ] Monitor `/api/executions` logs for each customer
- [ ] Weekly call: Review decisions, discuss audit export timing
- [ ] Start case study interviews with best-performing pilot
- [ ] Expected: 50+ decisions logged across all pilots

**Status:** ⏳ Not started  
**Owner:** Eng

### End-of-Week Metrics

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Pilots live | 3-5 | — | ⏳ |
| Decisions logged | 50+ | — | ⏳ |
| Audit exports requested | 1+ | — | ⏳ |
| Ready to upgrade | 1-2 | — | ⏳ |

---

## WEEK 4: Case Study & Revenue Closure (Goal: 3-5 paying customers)

### Mon-Tue: Case Study Deep Dive

**Interview best-fit customer:**
- "Walk me through when DSG blocked a transfer"
- "How much audit time saved?"
- Get permission for name/logo

**Quantify:**
- X decisions logged
- Y blocked (risk prevented)
- Z hours saved per audit cycle

**Structure:**
- Title: "[Crypto Company] Reduced Compliance Audit Prep 80% with DSG ONE"
- Problem statement
- Solution deployed
- Results: "10 hours → 1.5 hours"
- Quote: customer testimonial

**Status:** ⏳ Not started  
**Owner:** PMM

### Wed-Thu: Conversion & Contract Closure (each pilot scoring 8+)

- [ ] "Shadow mode showed us 50 decisions. Ready for review mode?"
- [ ] ROI calculation: "Annual chargebacks × $500 saved = annual DSG cost"
- [ ] Send SaaS agreement or Stripe invoice
- [ ] Collect payment via Stripe monthly auto-billing
- [ ] Expected: 3-5 customers signed & paying

**Status:** ⏳ Not started  
**Owner:** PMM

### Fri: Public Launch

- [ ] Publish case study (blog + LinkedIn)
- [ ] Announce: "DSG ONE now live with [Customer] in production"
- [ ] Email waitlist: "See how [Crypto Company] reduced compliance audit time 80%"

**Status:** ⏳ Not started  
**Owner:** PMM

### End-of-Week Metrics

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Customers paying | 3-5 | — | ⏳ |
| MRR | $5-10K | — | ⏳ |
| Case studies published | 1-2 | — | ⏳ |
| Warm inbound leads | 50+ | — | ⏳ |

---

## Critical Path Dependencies

### Before Week 1
- [ ] 90-sec demo video (crypto variant) — NEEDED for outreach
- [ ] Target list (100 companies) — NEEDED Mon
- [ ] Email templates — NEEDED for cold email
- [ ] CRM setup (HubSpot/Airtable) — NEEDED for tracking

### Before Week 2
- [ ] Discovery call script finalized — NEEDED
- [ ] Demo route (`/api/dsg/v1/gates/evaluate`) confirmed live — NEEDED
- [ ] Audit export functionality tested — NEEDED for demo

### Before Week 3
- [ ] Shadow mode working (observe, don't block) — NEEDED
- [ ] Audit export PDF generation working — NEEDED
- [ ] Webhook/Slack notifications configured — NEEDED
- [ ] Customer Slack channel created — NEEDED

### Before Week 4
- [ ] Case study template prepared — NEEDED
- [ ] Blog publishing setup (Vercel routes?) — NEEDED
- [ ] Stripe annual billing configured — NEEDED

---

## Weekly Contingency Triggers & Actions

### If Week 1 Outreach < 10 conversations
**Action:** Expand list 50+, pivot to "prevent chargebacks" messaging, sponsor 1-2 crypto Discord communities ($500), email 10 crypto VCs for intros

### If Week 2 Demos < 3 pilots converted
**Action:** Lengthen pilot to 4 weeks free, simplify to "export audit trail only," offer free tier for first customer, pivot to DeFi/staking segment

### If Week 3 Pilots < 50 decisions logged
**Action:** Root cause call, simplify policy (logging only), assign eng 20 hrs/week support, extend pilot 1 week

### If Week 4 Customers won't sign
**Action:** 30-day refund guarantee, annual prepay discount, founder 1-on-1, extend pilot 2 weeks, reach backup prospects

### If Crypto segment stalls after Week 2
**Pivot Option 1:** Developers/DevOps (GitHub users, 1-2 week cycles, lower MRR/customer)  
**Pivot Option 2:** Enterprise Finance (CFOs at 500+ orgs, $500+/mo, 8+ week sales)  
**Pivot Option 3:** Compliance/Legal Consultants (white-label, higher deal size)

---

## Success Metrics Dashboard (Track Daily/Weekly)

### Lead Generation
- Outreach volume: 100/week
- Response rate: 8-12%
- Qualified conversations: 20/week
- Demo requests: 5-8/week

### Sales Conversion
- Pilot sign-up: 30-50% of demos
- Pilot duration: 2 weeks
- Pilot-to-paid conversion: 50%+
- Average deal size: $200-300/mo

### Revenue
- MRR: $5-10K by EOW4
- ARR run-rate: $60-120K
- CAC: <$500 (mostly internal time)
- LTV: $3-5K (12-month retention, 30% expansion)

### Product Engagement
- Decisions logged per customer: 100+/month
- Audit exports per customer: 1+
- API calls per customer: 1K+/month
- Time-to-first-value: <2 hours

---

## Files & Resources

| Phase | Asset | Source | Status |
|-------|-------|--------|--------|
| W1 | Pitch + elevator | DSG-ONE-SALES-POSITIONING.md | ✅ Exists |
| W1 | 90-sec demo (crypto) | STRIPE_APP_PHASE9_MARKETING.md | 🔨 Adapt needed |
| W1 | FinTech use-case | STRIPE_APP_PHASE9_MARKETING.md | 🔨 Adapt needed |
| W2 | Pricing comparison | DSG-ONE-SALES-POSITIONING.md | ✅ Exists |
| W2 | Discovery script | CLAUDE.md section 4 | ✅ Exists |
| W3 | Integration guide | COSPIN_DSG_CUSTOMER_INTEGRATION_FLOW.md | 🔨 Adapt for Solana |
| W4 | Case study | STRIPE_APP_PHASE9_MARKETING.md | ✅ Template exists |

---

## Progress Tracking

### Daily Standup (Owner: PMM)
**Questions to answer:**
- How many conversations this week?
- Any pilots ready to start?
- Blockers?

### Weekly Checkpoint (Owner: PMM + Eng)
**Metrics review:**
- Outreach volume vs target
- Conversion rate vs target
- MRR progress vs target
- Pilots active vs target
- Next week: adjust if behind

### Activation Events (Any day)
**If these happen → escalate immediately:**
- Customer ready to sign before scheduled day
- Major blocker (API outage, SDK issue)
- Competitor entering crypto space
- Regulatory change affecting segment

---

## Contact & Escalation

**PMM:** t.dealer01@dsg.pics  
**Eng Lead:** [Team]  
**Slack Channel:** #crypto-acquisition  
**CRM:** HubSpot (or Airtable)  

**Escalation path:** PMM → Eng Lead → Founder  
**Emergency:** Ping directly in Slack

---

**Last Updated:** 2026-07-25  
**Next Review:** 2026-07-28 (EOW1 checkpoint)
