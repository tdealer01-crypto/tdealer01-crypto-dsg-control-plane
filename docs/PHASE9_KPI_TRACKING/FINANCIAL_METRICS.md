# Financial Metrics & Pricing — Phase 9+ Revenue Model

**Last Updated:** 2026-06-07  
**Purpose:** Define revenue model, pricing tiers, financial projections, and unit economics for Phase 9+ launch.

---

## Overview

DSG ONE / ProofGate uses a **freemium subscription model** with usage-based overage pricing. This document defines:
- Free tier boundaries and upgrade triggers
- Paid pricing tiers and feature matrix
- Cost structure and margin analysis
- Break-even and profitability path
- Year 1 financial projections

---

## Part 1: Revenue Model

### 1.1 Freemium Tier Structure

#### Free Tier

**Monthly Quota:** 100 governed operations per month (executions, policy evaluations, approvals)

**Included Features:**
- Basic policy creation (up to 5 policies)
- Single user account
- Audit trail (30-day retention)
- API access (rate-limited to 10 req/sec)
- Community support (email, Discord)
- Email-based NPS survey (quarterly)

**Upgrade Trigger:** Reach 90+ operations in a month, then display upgrade banner

**Retention Strategy:**
- No data deletion on cancellation (migration-friendly)
- Free tier can downgrade from paid but not permanently lose workspace
- Annual survey asking why user is on free tier

**Target Audience:** Developers, hobbyists, individual engineers testing the platform

---

#### Paid Tier: Starter ($49/month or $490/year)

**Monthly Quota:** 10,000 operations per month

**Included Features:**
- Everything in Free +
- Team members (up to 5)
- Advanced policies (unlimited)
- Audit trail (90-day retention)
- Governance reports (monthly PDF)
- Email support (24h response)
- API rate limit: 50 req/sec
- Custom branding (in reports)
- Webhook integrations (up to 10)
- Monthly usage reports

**Target Audience:** Small teams (2-5 people), early-stage startups

**Overage Pricing:** $4.90 per 1,000 operations above 10,000/month

---

#### Paid Tier: Professional ($199/month or $1,990/year)

**Monthly Quota:** 100,000 operations per month

**Included Features:**
- Everything in Starter +
- Team members (up to 25)
- Admin dashboard (org & billing controls)
- Audit trail (1-year retention)
- Compliance reports (SOC 2, HIPAA templates)
- Priority email support (4h response)
- API rate limit: 200 req/sec
- SSO / SAML integration
- IP whitelist / firewall rules
- Slack integration
- Usage analytics dashboard
- Scheduled policy reviews
- Role-based access control (RBAC)

**Target Audience:** Growing teams (5-25 people), mid-market companies, compliance-heavy industries

**Overage Pricing:** $3.99 per 1,000 operations above 100,000/month

---

#### Paid Tier: Enterprise (Custom pricing, $3,000+/month)

**Monthly Quota:** Unlimited operations (or custom threshold)

**Included Features:**
- Everything in Professional +
- Dedicated account manager
- Custom integrations (2/year)
- On-premise option (with extra licensing fee)
- Advanced SLA (99.9% uptime, credit policy)
- Compliance certifications (SOC 2 Type II, ISO 27001, GDPR/CCPA-ready)
- Custom compliance templates
- Technical onboarding (4 hours)
- Quarterly business reviews
- Feature request priority
- Direct engineering support

**Minimum Seat Count:** 50 monthly operations guaranteed

**Target Audience:** Enterprises, regulated industries, companies with custom compliance needs

---

### 1.2 Feature Matrix

| Feature | Free | Starter | Professional | Enterprise |
|---------|------|---------|--------------|-----------|
| Monthly Operations | 100 | 10,000 | 100,000 | Unlimited |
| Team Members | 1 | 5 | 25 | Unlimited |
| Policies | 5 | Unlimited | Unlimited | Unlimited |
| Audit Trail Retention | 30 days | 90 days | 365 days | Custom |
| API Rate Limit | 10 req/s | 50 req/s | 200 req/s | Custom |
| Email Support | Community | 24h | 4h | 1h |
| SSO/SAML | ❌ | ❌ | ✅ | ✅ |
| IP Whitelist | ❌ | ❌ | ✅ | ✅ |
| Compliance Reports | ❌ | ❌ | ✅ | ✅ |
| Dedicated Account Manager | ❌ | ❌ | ❌ | ✅ |
| On-Premise Option | ❌ | ❌ | ❌ | ✅ |
| SLA | Best Effort | Best Effort | 99.9% | 99.95% |
| Price (Monthly) | Free | $49 | $199 | Custom |
| Price (Annual, 20% discount) | Free | $490 | $1,990 | Custom |

---

## Part 2: Unit Economics

### 2.1 Customer Acquisition Cost (CAC)

**Breakdown by Channel:**

| Channel | Strategy | Cost/Customer | Notes |
|---------|----------|--------|-------|
| Organic Search | Content, SEO (blog, docs) | $50-80 | Lowest cost; 3-6 month lag |
| Direct/Word-of-Mouth | Referral incentives, NPS | $30-50 | Highest quality |
| Social Media | Twitter, LinkedIn organic | $40-70 | Engagement-driven |
| ProductHunt | 1-2 launches/year | $20-100 | Burst traffic; varies |
| Partner/Marketplace | GitHub Marketplace, integration shops | $100-200 | Higher touch; slower |
| Paid Ads (Google/LinkedIn) | PPC campaigns | $150-300 | Scalable but expensive; hold until Month 3 |
| Sales/Inbound | Founders + sales conversations | $200-500 | For Enterprise tier |
| Content/Webinar | Thought leadership events | $75-150 | Brand building |

**Weighted CAC (Mixed Channel):**

Assumption: 50% organic, 25% word-of-mouth, 15% paid, 10% partner

```
CAC = (0.50 × $65) + (0.25 × $40) + (0.15 × $200) + (0.10 × $150)
CAC = $32.50 + $10 + $30 + $15
CAC = $87.50 (blended average)
```

**Monthly CAC Budget (by stage):**

- **Week 1-4:** $0-500 (organic/PR only)
- **Month 2:** $1,000-2,000 (add product reviews, webinar)
- **Month 3+:** $3,000-5,000/month (scale winners, test paid channels)

---

### 2.2 Customer Lifetime Value (CLV)

**Formula:**

```
CLV = (ARPU × Gross Margin % × Months) ÷ Monthly Churn Rate

Where:
- ARPU = Average Revenue Per User
- Gross Margin = 70% (target, assuming cloud costs ~15-20%, ops ~10%)
- Months = Historical or projected average customer lifetime (e.g., 24-36 months)
- Monthly Churn = % of customers canceling each month
```

**Scenario Analysis:**

**Conservative Case (Higher Churn):**
- ARPU: $120/month (mix of Starter + Professional)
- Gross Margin: 65%
- Monthly Churn: 5%
- CLV = (120 × 0.65 × (1 / 0.05)) = (120 × 0.65 × 20) = **$1,560**

**Base Case (Target):**
- ARPU: $150/month
- Gross Margin: 70%
- Monthly Churn: 3%
- CLV = (150 × 0.70 × (1 / 0.03)) = (150 × 0.70 × 33.3) = **$3,500**

**Optimistic Case (Strong Product-Market Fit):**
- ARPU: $200/month
- Gross Margin: 75%
- Monthly Churn: 2%
- CLV = (200 × 0.75 × (1 / 0.02)) = (200 × 0.75 × 50) = **$7,500**

**Unit Economics Viability:**

```
CLV : CAC Ratio Target = 3:1 or higher

Base Case: $3,500 CLV ÷ $87.50 CAC = 40:1 ✅ Extremely healthy
Conservative: $1,560 ÷ $87.50 CAC = 17.8:1 ✅ Strong
Optimistic: $7,500 ÷ $87.50 CAC = 85.7:1 ✅ Excellent
```

**Payback Period (Month to ROI on CAC):**

```
Payback Period = CAC ÷ (ARPU × Gross Margin)

Base Case: $87.50 ÷ ($150 × 0.70) = $87.50 ÷ $105 = 0.83 months (~25 days)
```

**All scenarios break even on customer acquisition within 1 month.** ✅

---

### 2.3 Gross Margin & Cost Structure

**Revenue:**

Assume mix of 70% Starter, 25% Professional, 5% Enterprise (by customer count):

```
Monthly Cohort of 100 Customers:
- 70 Starter @ $49 = $3,430
- 25 Professional @ $199 = $4,975
- 5 Enterprise @ $3,000 = $15,000
Total Monthly Revenue = $23,405
```

**Cost Breakdown (per month):**

| Cost Category | Percentage | Amount | Notes |
|---|---|---|---|
| **Cloud Infrastructure** | 15% | $3,511 | Vercel, Supabase, uptime monitoring |
| **Payment Processing** | 3% | $702 | Stripe fees |
| **Customer Support** | 8% | $1,872 | 2 support staff @ $3,000 loaded cost |
| **Operations/Admin** | 4% | $936 | Tools, security, compliance |
| **Marketing** | 5% | $1,170 | Content, events, paid (variable) |
| **R&D/Infrastructure** | 8% | $1,872 | Server maintenance, security updates |
| **COGS (Variable)** | 3% | $702 | Stripe fees, miscellaneous |
| **Total COGS** | **46%** | **$10,765** | |
| **Gross Profit** | **54%** | **$12,640** | |

**Assumption:** Team costs (founders + 1-2 engineers) are covered by fundraising, not product revenue yet.

**Gross Margin % = 54-70%** depending on mix (more Enterprise = higher margin)

---

## Part 3: Break-Even Analysis

### 3.1 Monthly Fixed Costs (Non-Product)

| Cost | Monthly | Annual |
|------|---------|--------|
| **Team Salaries (2 founders + 1 engineer, loaded)** | $20,000 | $240,000 |
| **Office/Overhead** | $2,000 | $24,000 |
| **Legal/Accounting/Compliance** | $1,500 | $18,000 |
| **Insurance/HR** | $500 | $6,000 |
| **Miscellaneous** | $500 | $6,000 |
| **Total Monthly Fixed** | **$24,500** | **$294,000** |

### 3.2 Break-Even Revenue (Monthly)

```
Break-Even MRR = Fixed Costs ÷ Gross Margin %
Break-Even = $24,500 ÷ 0.60 = $40,833/month

With current pricing mix, this requires ~170 paying customers (mix of tiers).
```

### 3.3 Path to Profitability

| Milestone | Customers | MRR | COGS (46%) | Gross Profit | Fixed Costs | Net Profit | Timeline |
|-----------|-----------|-----|-----------|--------------|-------------|-----------|----------|
| Month 1 Launch | 5-10 | $500 | $230 | $270 | $24,500 | -$24,230 | Week 1 |
| Month 2 (+50% growth) | 15 | $2,000 | $920 | $1,080 | $24,500 | -$23,420 | Week 8 |
| Month 3 (target PMF) | 35 | $5,000 | $2,300 | $2,700 | $24,500 | -$21,800 | Week 12 |
| Month 6 (acceleration) | 100 | $14,000 | $6,440 | $7,560 | $24,500 | -$16,940 | Week 24 |
| Month 12 (scale) | 250 | $35,000 | $16,100 | $18,900 | $24,500 | -$5,600 | Week 52 |
| Month 18 (profitability) | 400 | $56,000 | $25,760 | $30,240 | $26,000 | +$4,240 | Week 78 |

**Key Assumptions:**
- MRR grows 20-30% month-over-month for first 6 months
- Fixed costs increase slightly at 6-month mark (add 1 support engineer)
- Gross margin improves to 62% by month 12 (higher Enterprise %)

**Profitability Timeline: ~18 months from launch** (with continued growth)

---

## Part 4: Year 1 Financial Projections

### 4.1 Revenue Forecast

**Assumptions:**
- Launch: June 2026 (Week 1)
- Month 1-3: Aggressive growth (40% MoM)
- Month 4-6: Sustained growth (25% MoM)
- Month 7-12: Scaling phase (15% MoM)

| Month | Timeline | Customers | ARR/MRR | Comment |
|-------|----------|-----------|---------|---------|
| 1 | June 15-30 | 8 | $400 | Launch week; organic growth |
| 2 | July | 22 | $1,800 | +175% growth; early adopters |
| 3 | August | 50 | $5,000 | +178% growth; product-market fit signals |
| 4 | September | 100 | $10,000 | +100% growth; scaling begins |
| 5 | October | 160 | $15,000 | +50% growth; churn stabilizes |
| 6 | November | 240 | $21,000 | +40% growth; holiday boost |
| 7 | December | 300 | $25,000 | +19% growth; year-end buying |
| 8 | January 2027 | 380 | $30,000 | +20% growth; new year resolutions |
| 9 | February | 460 | $35,000 | +17% growth |
| 10 | March | 530 | $40,000 | +14% growth |
| 11 | April | 610 | $45,000 | +13% growth |
| 12 | May | 680 | $50,000 | +11% growth; reach 680 customers |

**Year 1 Total Revenue:** $278,200 (6 months)
**Year 1 (Full 12 months): Projected $1.2M ARR** (if growth sustains)

---

### 4.2 Cash Flow Projection (6 Months)

| Month | Revenue | Cloud Costs | Stripe Fees | Support | Ops | Marketing | Total COGS | Gross Profit | Team/Fixed | Net Burn |
|-------|---------|----------|-----------|---------|-----|----------|-----------|--------------|-----------|-----------|
| Jun | $400 | $600 | $12 | $500 | $200 | $500 | $1,812 | -$1,412 | $20,000 | -$21,412 |
| Jul | $1,800 | $1,200 | $54 | $1,500 | $400 | $1,000 | $4,154 | -$2,354 | $20,000 | -$22,354 |
| Aug | $5,000 | $1,500 | $150 | $1,500 | $400 | $1,000 | $4,550 | $450 | $20,000 | -$19,550 |
| Sep | $10,000 | $2,000 | $300 | $1,500 | $500 | $1,500 | $5,800 | $4,200 | $20,000 | -$15,800 |
| Oct | $15,000 | $2,200 | $450 | $1,500 | $600 | $2,000 | $6,750 | $8,250 | $20,000 | -$11,750 |
| Nov | $21,000 | $2,500 | $630 | $1,500 | $700 | $2,500 | $7,830 | $13,170 | $20,000 | -$6,830 |

**6-Month Cumulative Burn: -$97,696**

Starting cash (assumed seed round): $200,000
**Remaining Runway: $200,000 - $97,696 = $102,304** (Month 6 end)

**Runway to Profitability: 18 months** (see Section 3.3)

---

### 4.3 Sensitivity Analysis

**Scenario: 50% slower growth (pessimistic)**

| Month | Customers | MRR | Net Burn |
|-------|-----------|-----|----------|
| 1 | 5 | $250 | -$21,500 |
| 2 | 10 | $500 | -$23,800 |
| 3 | 20 | $1,500 | -$22,900 |
| 4 | 35 | $2,500 | -$21,800 |
| 5 | 55 | $4,000 | -$20,600 |
| 6 | 80 | $5,500 | -$19,200 |

**6-Month Burn (pessimistic): -$129,800**
**Remaining Runway: $70,200** (Month 6 end) → requires funding at Month 9

---

**Scenario: 50% faster growth (optimistic)**

| Month | Customers | MRR | Net Burn |
|-------|-----------|-----|----------|
| 1 | 12 | $750 | -$21,000 |
| 2 | 35 | $3,500 | -$19,500 |
| 3 | 80 | $8,000 | -$15,200 |
| 4 | 150 | $15,000 | -$8,500 |
| 5 | 240 | $22,000 | $500 |
| 6 | 360 | $30,000 | $6,400 |

**6-Month Burn (optimistic): -$57,800**
**Remaining Runway: $142,200** (Month 6 end) → self-sustaining

---

## Part 5: Pricing Strategy & Adjustments

### 5.1 Go/No-Go Decision: Pricing Viability

**Month 1 Checkpoint:**

- [ ] Free-to-paid conversion >2% → continue current pricing
- [ ] No churn observed yet (too early) → proceed
- [ ] Feedback: Pricing perceived as fair → proceed
- [ ] Feedback: Price too high / not enough value → reduce $199 to $149, increase free quota to 200 ops

**Month 3 Checkpoint:**

- [ ] CAC < $100 and CLV > $3,000 → pricing working
- [ ] 30-day retention >40% → pricing not a friction point
- [ ] Churn rate <5% → pricing acceptable
- [ ] If churn >8%: audit feature gap vs. competitor comparison

**Month 6 Checkpoint:**

- [ ] MRR > $14,000 → pricing model validates
- [ ] Feature adoption <50% in paid tiers → consider bundling features
- [ ] Enterprise interest (5+ inbound) → introduce Enterprise tier
- [ ] If MRR < $5,000: pivot pricing (lower entry price, higher limits)

### 5.2 Pricing Adjustment Rules

**If Free-to-Paid < 2% (persistently):**
- Lower free tier quota to 50 ops (force upgrade faster)
- OR reduce Starter price to $39/month
- OR increase free tier quota to 200 ops (expand funnel)

**If Churn (Paid) > 7%:**
- Survey churned customers on reason
- If feature gap: accelerate feature roadmap
- If price sensitivity: introduce $99/month tier
- If competitor: lower pricing by 10-20%

**If ARPU declining (mix shifting to Starter):**
- Reduce Starter quota to push upgrades
- Add paid add-on for extra features (e.g., +$20 for SSO)
- Introduce annual commitment discount (3-5%, not 20%)

---

## Part 6: Financial Reporting

### 6.1 Weekly Finance Summary

**Template (for Friday standup):**

```markdown
## Week of June 15-21, 2026

### Revenue & Customers
- New Customers: 3
- Customers (Total): 8
- MRR: $400
- Expected MRR (Month 1): $500-800

### Burn & Runway
- Weekly Burn: -$5,600
- Monthly Burn (projected): -$22,400
- Runway: 8.9 months

### Key Metrics
- Free-to-Paid Conversion: 2.5% (targeting 3%+)
- Churn: N/A (too early)
- CAC: ~$80 (organic + referral)

### Alerts
- None
```

### 6.2 Monthly Financial P&L

| Line Item | Month 1 | Month 2 | Month 3 |
|-----------|---------|---------|---------|
| **Revenue** | | | |
| Starter (70 customers avg) | $1,500 | $2,200 | $3,500 |
| Professional (25 customers avg) | $2,500 | $3,500 | $5,000 |
| Enterprise (5 customers avg) | $0 | $0 | $3,000 |
| **Total Revenue** | $4,000 | $5,700 | $11,500 |
| | | | |
| **COGS** | | | |
| Cloud Infrastructure | $600 | $800 | $1,200 |
| Payment Processing (3%) | $120 | $171 | $345 |
| Customer Support | $1,500 | $1,500 | $1,500 |
| Operations | $200 | $300 | $400 |
| Marketing | $500 | $1,000 | $2,000 |
| **Total COGS** | $2,920 | $3,771 | $5,445 |
| **Gross Profit** | $1,080 | $1,929 | $6,055 |
| **Gross Margin %** | 27% | 34% | 53% |
| | | | |
| **Fixed Costs** | | | |
| Team Salaries (loaded) | $20,000 | $20,000 | $20,000 |
| Overhead | $2,000 | $2,000 | $2,000 |
| Legal/Compliance | $1,500 | $1,500 | $1,500 |
| **Total Fixed** | $23,500 | $23,500 | $23,500 |
| | | | |
| **Net Profit (Loss)** | -$22,420 | -$21,571 | -$17,445 |
| **Cash Burn** | -$22,420 | -$21,571 | -$17,445 |
| **Cumulative Burn** | -$22,420 | -$43,991 | -$61,436 |

---

## Part 7: Investor Messaging

### For Seed/Series A Conversations:

**Unit Economics:**
- CAC: ~$85 (organic-heavy)
- CLV: $3,500+ (3.1% monthly churn assumption)
- LTV:CAC Ratio: 41:1 (highly efficient)
- Payback Period: 25 days

**Growth:**
- Month 1-3: 40-50% MoM growth
- Target 300+ customers by Month 12
- Projected $1.2M ARR by Month 12

**Path to Profitability:**
- Break-even at 170 paying customers (~$41K MRR)
- Achievable in 15-18 months with sustained growth

**Competitive Advantage:**
- First-mover in AI governance + execution gating
- Integrated proof/compliance framework (vs. competitors offering point solutions)
- Land-and-expand motion (free → Starter → Professional → Enterprise)

**Use of Capital (if raising $500K seed):**
- 40% ($200K): Product & Engineering (2 senior engineers)
- 30% ($150K): Sales & Marketing
- 20% ($100K): Operations & Infrastructure
- 10% ($50K): Buffer

---

## Verification Checklist

- [ ] Pricing tiers confirmed with product team
- [ ] Stripe account configured with products and pricing
- [ ] Overage pricing automation tested
- [ ] Annual discount implemented in billing system
- [ ] Free tier quota (100 ops) enforced at API layer
- [ ] MRR tracking query created in Supabase
- [ ] P&L template created in shared accounting system (QuickBooks, Xero, etc.)
- [ ] Weekly finance review added to calendar (Friday, 2 PM)
- [ ] CAC tracking enabled (UTM params + Supabase org metadata)

---

## Next Steps

1. **This week:** Configure Stripe products/pricing; test free tier quota enforcement
2. **Week 2:** Set up Supabase MRR query; create P&L tracking spreadsheet
3. **Week 3:** Send first email to customers about paid upgrade option
4. **Week 4:** First weekly finance review; adjust if needed
5. **Month 2:** Analyze customer feedback on pricing; prepare for Month 1 checkpoint

See `KPI_DASHBOARD.md` for revenue KPIs (MRR, ARPU, CLV, CAC).
See `MONITORING_SETUP.md` for revenue tracking infrastructure.
