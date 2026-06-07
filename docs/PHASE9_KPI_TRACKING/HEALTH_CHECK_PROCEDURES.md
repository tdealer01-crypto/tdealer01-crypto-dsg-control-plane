# Health Check Procedures — Phase 9+ Operations Runbook

**Last Updated:** 2026-06-07  
**Purpose:** Define daily, weekly, monthly, and quarterly health check procedures for Phase 9+ monitoring.

---

## Overview

This runbook establishes a cadence of health checks to monitor KPI progress, platform stability, and business health. Each check has a defined time commitment and decision framework.

**Quick Navigation:**
- Daily Health Check (5 min)
- Weekly Metrics Review (30 min)
- Monthly Performance Review (1 hour)
- Quarterly Strategy Review (2 hours)

---

## Part 1: Daily Health Check (5 minutes)

**Schedule:** Every weekday @ 9:00 AM (before team standup)  
**Owner:** On-call engineer or product lead  
**Artifacts:** Slack message to `#metrics` channel

### 1.1 Daily Checklist

**Step 1: Infrastructure Health (1 min)**

```bash
# Check API uptime (ping public health endpoint)
curl -s -w "Status: %{http_code}\nResponse time: %{time_total}s\n" \
  https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health

# Expected: Status 200, <1s response
```

**Green:** Status 200, <1 second  
**Yellow:** Status 200, 1-2 seconds OR Status 200 but slower last 2 hours  
**Red:** Status !200 OR No response OR >2 seconds  

**Step 2: Error Rate Check (1 min)**

Open Vercel Analytics dashboard → Errors

- **Green:** <1% error rate
- **Yellow:** 1-2% error rate (investigate)
- **Red:** >2% error rate (escalate immediately)

**Step 3: Database Health (1 min)**

Check Supabase dashboard → Database status

- **Green:** "Healthy" status, no warnings
- **Yellow:** Elevated query latency (p95 > 1 second)
- **Red:** Database offline OR connection pool exhausted

**Step 4: Revenue Pulse (1 min)**

Check Stripe dashboard OR `/api/metrics/dashboard` endpoint

- **Green:** >$0 MRR, no payment failures
- **Yellow:** 1-2 payment failures, churn spike
- **Red:** Multiple payment failures, critical payment system error

**Step 5: Critical Alerts (1 min)**

Check Slack `#alerts` and Better Uptime dashboard

- **Green:** No alerts in last 24 hours
- **Yellow:** 1-2 minor alerts resolved
- **Red:** Any unresolved critical alert

### 1.2 Daily Status Report

Post to Slack `#metrics` every morning:

```
🟢 Daily Health Check - 2026-06-08
┌─────────────────────────┐
│ API Uptime: 99.95% ✅   │
│ Error Rate: 0.3% ✅     │
│ DB Latency: 450ms ✅    │
│ Revenue: $400 MRR ✅    │
│ Incidents: None ✅      │
└─────────────────────────┘
Outlook: All systems nominal. No action required.
```

**If any Yellow or Red:**

```
🟡 Daily Health Check - 2026-06-09
┌─────────────────────────┐
│ API Uptime: 98.5% ⚠️   │
│ Error Rate: 1.2% ⚠️    │
│ DB Latency: 800ms ✅    │
│ Revenue: $380 MRR ✅    │
│ Incidents: 1 alert 🔴  │
└─────────────────────────┘
Spike in 5xx errors; correlation with database slow queries.
Action: @eng-lead to investigate DB query performance.
```

---

## Part 2: Weekly Metrics Review (30 minutes)

**Schedule:** Every Friday @ 2:00 PM (team sync)  
**Owner:** Product lead + engineering lead  
**Duration:** 30 minutes  
**Participants:** 3-5 core team members  
**Output:** Markdown recap in shared doc

### 2.1 Pre-Meeting Prep (15 min before)

**Checklist:**

- [ ] Pull Supabase KPI queries (run the 6 queries from `MONITORING_SETUP.md`)
- [ ] Open Vercel Analytics dashboard; review top pages, geo, traffic sources
- [ ] Check Slack `#alerts` for any incidents from past 7 days
- [ ] Open Stripe dashboard; note new customers, churn, refunds
- [ ] Calculate week-over-week % change for each KPI (Tier 1-6)
- [ ] Prepare 1-sentence health summary (e.g., "Strong week; one churn risk")

**Quick Template (fill in 5 min before):**

```markdown
## Week of June 8-14, 2026 — Pre-Meeting Snapshot

### Adoption (Tier 1)
- New Installs: 8 (vs 6 last week) +33% ✅
- Signups: 12 (vs 10 last week) +20% ✅
- Free-to-Paid: 3.2% (vs 2.8% last week) +43bps ✅

### Engagement (Tier 2)
- DAU: 18 (vs 15) +20% ✅
- MAU: 35 (vs 32) +9% ✅
- Operations/user: 4.2 (vs 3.8) +10% ✅

### Retention (Tier 3)
- 30-day cohort: 42% (Month 1 cohort) ✅
- Churn: 0% (paid base too small yet)

### Revenue (Tier 4)
- MRR: $1,400 (vs $900) +56% ✅
- ARPU: $140 (vs $120) +17% ✅
- Customers: 10 (vs 7) +43% ✅

### Satisfaction (Tier 5)
- NPS: N/A (survey goes out end of month)
- Support tickets: 2 (both resolved <4h) ✅
- Community: 25 Discord members

### Health (Tier 6)
- API Uptime: 99.7% ✅
- Error Rate: 0.4% ✅
- DB Latency (p95): 650ms ✅

### Summary
Strong week across all metrics. Adoption accelerating; conversion rate above target. No incidents or concerns.
```

### 2.2 Meeting Agenda (30 min)

**1. Metric Review (15 min)**

Go through each tier:

1. **Adoption (2 min):** Celebrate wins, discuss channel performance
   - Question: Which channel brought highest-quality signups (lowest CAC)?
   - Decision: Double down on that channel next week?

2. **Engagement (2 min):** Policy creation, feature usage trends
   - Question: Which policy type or feature is most popular?
   - Decision: Optimize documentation/examples for that feature?

3. **Retention (2 min):** Cohort analysis, at-risk customers
   - Question: Are early cohorts sticking around?
   - Decision: Anything to adjust in onboarding?

4. **Revenue (2 min):** MRR growth, churn signals
   - Question: Any expansion revenue (upsells) or downgrades?
   - Decision: Follow up with any at-risk customers?

5. **Satisfaction (2 min):** Support trends, customer feedback
   - Question: What are the 3 most common support topics?
   - Decision: Add FAQ or doc for top topic?

6. **Health (2 min):** Uptime, errors, database performance
   - Question: Any incidents or near-misses?
   - Decision: Any operational improvements for next week?

**2. Action Items & Priorities (10 min)**

Document:

```markdown
### Action Items (Next Week)

- [ ] @eng: Optimize slow database query (p95 latency 650ms, target 500ms)
- [ ] @product: Write blog post on "5 Policy Best Practices" (low CAC content)
- [ ] @sales: Follow up with customer X (usage declining, at-risk)
- [ ] @ops: Test disaster recovery procedure (quarterly checklist item)

### Wins This Week
- 🎉 Conversion rate hit 3.2% (beats 3% target)
- 🎉 MRR $1,400 (56% WoW growth)
- 🎉 DAU consistent at 18 (healthy engagement)

### Concerns
- 🔴 1 paid customer has low engagement (visited once, no executions)
- 🟡 Blog traffic flat (top channel for signups; need to increase posts)
```

**3. Next Week Outlook (5 min)**

- Predicted metrics (based on trend)
- Anticipated events (launches, marketing campaigns, expected seasonality)
- Any forecasted operational changes

---

## Part 3: Monthly Performance Review (1 hour)

**Schedule:** First Friday of every month @ 3:00 PM  
**Owner:** Product lead + Co-founder  
**Duration:** 60 minutes  
**Participants:** All core team members (4-6 people)  
**Output:** Monthly retrospective document (see template below)

### 3.1 Pre-Meeting Prep (1 hour before)

**Data Collection:**

- [ ] Run all Supabase KPI queries from `MONITORING_SETUP.md`
- [ ] Calculate month-over-month % changes
- [ ] Segment data by:
  - Customer cohort (which signup week had best retention?)
  - Acquisition channel (organic vs paid vs referral)
  - Plan tier (free, Starter, Professional, Enterprise)
- [ ] Compile Stripe data: revenue, churn events, expansion
- [ ] Collect support ticket summary (themes, response time, CSAT)
- [ ] Pull any incident reports (if applicable)
- [ ] Prepare decision matrix (did we hit Month 1, Month 3, etc. targets?)

**Template to Fill (30 min):**

```markdown
# Month 1 (May 15 - June 15, 2026) Performance Review

## Checkpoint Decision: GO / NO-GO / EXTEND

- [ ] GO: Hit 7+ green Month 1 targets. Continue roadmap.
- [ ] NO-GO: Hit <5 green targets. Pivot immediately.
- [ ] EXTEND: Hit 5-6 green targets. 2-week extension to Month 1 review.

## Month 1 Targets (from KPI_DASHBOARD.md)

| Tier | KPI | Target | Actual | Status |
|------|-----|--------|--------|--------|
| 1 | New Installations | >20 | 18 | 🟡 |
| 1 | Signup Rate | >30/week | 28/week avg | 🟡 |
| 1 | Free-to-Paid Conversion | >2% | 3.2% | 🟢 |
| 2 | DAU | >10 | 15 | 🟢 |
| 2 | Operations/User | >2 | 4.1 | 🟢 |
| 3 | 30-Day Retention | >35% | 42% | 🟢 |
| 4 | MRR | >$1,000 | $1,400 | 🟢 |
| 4 | CLV vs CAC | >3× | 18:1 | 🟢 |
| 5 | NPS | >20 | 32 | 🟢 |
| 6 | API Uptime | >99.5% | 99.7% | 🟢 |

**Summary:** 8 green, 2 yellow → GO

## Cohort Analysis

### Quality by Acquisition Channel

| Channel | Signups | Conversion % | 30-Day Retention | CAC | Quality Score |
|---------|---------|---------|----------|-----|---|
| Organic (Search + Direct) | 12 | 4.2% | 48% | $65 | ⭐⭐⭐⭐⭐ |
| Referral (Word-of-mouth) | 8 | 3.8% | 44% | $40 | ⭐⭐⭐⭐⭐ |
| ProductHunt | 5 | 2.5% | 35% | $180 | ⭐⭐⭐ |
| Twitter/Social | 3 | 0% | N/A | $200 | ⭐⭐ |

**Recommendation:** Double down on organic + referral; pause Twitter ads.

### Quality by Plan Tier

| Tier | Customers | Engagement (ops/month) | Churn Risk | Expansion Potential |
|------|-----------|--------|----------|---|
| Free | 45 | 1.2 | N/A | 15% likely to convert |
| Starter | 7 | 8.5 | 0% | High (1 customer at 105K ops = upsell candidate) |
| Professional | 3 | 22 | 0% | Low (all satisfied) |
| Enterprise | 0 | N/A | N/A | 2 inbound leads |

## Churn & At-Risk Assessment

**Churned This Month:** 0 (too early for paid base)

**At-Risk Customers (30-day silent):**
- Customer X: Free tier, no activity past 10 days
  - Action: Send re-engagement email + offer 1:1 onboarding call

**Expansion Opportunities (usage growth):*
- Customer Y: Hit 105K ops (Professional tier limit)
  - Action: Offer 2-week trial of Enterprise tier

## Voice of Customer (VOC) Summary

**Support Tickets (Top 3 themes):**
1. Policy creation best practices (5 tickets) → Need FAQ
2. API rate limiting questions (3 tickets) → Docs unclear
3. RBAC/permission issues (2 tickets) → Product feature working as designed

**NPS Feedback Themes:**
- Promoters (9-10): Praise policy flexibility, ease of setup
- Passives (7-8): Want more templates, more integrations
- Detractors (0-6): Not enough features for their use case (consider upsell)

## Operational Incidents

**Incident 1: Database Latency Spike (June 10)**
- Duration: 45 minutes
- Cause: Unoptimized query in new reporting feature
- Resolution: Disabled feature flag; added index; re-enabled
- Impact: 1 customer support ticket; no churn
- Improvement: Add query performance test in CI

**Incident 2: Stripe webhook delivery failure (June 5-6, 12 hours)**
- Duration: 12 hours
- Cause: Supabase webhook endpoint timeout
- Resolution: Added retry logic; increased webhook timeout
- Impact: 0 payment issues (billing events backfilled)
- Improvement: Better Uptime monitoring on webhook endpoints

## Financial Summary

| Line Item | Actual | Budget | Variance |
|-----------|--------|--------|----------|
| Revenue (MRR) | $1,400 | $1,000 | +40% |
| COGS | 48% | 50% | -2% |
| Gross Profit | $728 | $500 | +46% |
| Fixed Costs | $24,500 | $24,500 | 0% |
| Net Profit | -$23,772 | -$24,000 | +$228 |
| Cash Burn | -$23,772 | -$24,000 | +$228 |
| Runway | 8.4 months | 8.3 months | +0.1 months |

## Next Month Priorities

1. **Product:** Fix RBAC permission bugs (2 support tickets); add policy templates (SOC 2, HIPAA)
2. **Growth:** Double organic signups (target 20+ vs 12 this month) via blog + Twitter
3. **Operations:** Reduce database query latency to <500ms p95 (currently 650ms)
4. **Finance:** Aim for $2,000 MRR (50% growth) via expanding Starter customer base
```

### 3.2 Meeting Agenda (60 min)

**1. Checkpoint Decision (10 min)**

- Present summary: how many green targets?
- Vote: GO / NO-GO / EXTEND?
- If NO-GO: What's broken and what's the 2-week pivot?

**2. Tier-by-Tier Deep Dive (25 min)**

For each tier:
- 2 min: Present data (compare to target)
- 2 min: Discuss root causes (why up/down?)
- 1 min: Propose next-month action

**3. Cohort & Churn Analysis (10 min)**

- Which acquisition channels are winning? (highest quality, lowest CAC)
- Which customers are at risk? (follow up needed)
- Which customers can expand? (upsell opportunities)

**4. Operational Incidents & Learnings (5 min)**

- Review any outages or issues from the month
- What process improvements are needed?
- Any security concerns?

**5. Next Month Priorities & Bets (10 min)**

- Top 3 product priorities
- Top 2 growth levers
- 1 operational improvement
- 1 financial milestone (MRR target)

---

## Part 4: Quarterly Strategy Review (2 hours)

**Schedule:** End of Month 3, Month 6, Month 9, Month 12  
**Owner:** Founders + Advisory Board (if applicable)  
**Duration:** 120 minutes  
**Participants:** Core team + advisors  
**Output:** Quarterly report (investor-ready)

### 4.1 Quarterly Review Checklist

**Strategic Assessment (30 min):**

- [ ] Have we achieved product-market fit? (KPI targets hit?)
- [ ] What's our competitive position? (vs. other AI governance tools)
- [ ] Is our unit economics healthy? (CAC < CLV/12?)
- [ ] Are we on track for breakeven? (runway sufficient?)

**Market Analysis (20 min):**

- [ ] What's changed in AI governance/compliance market?
- [ ] Are we talking to the right customers?
- [ ] What new competitors have emerged?
- [ ] Are there new integration opportunities?

**Team & Org (20 min):**

- [ ] Do we have the right team? (hiring/structure needs)
- [ ] Are we organized for growth? (process improvements needed)
- [ ] What's team morale? (any burnout signals?)

**Roadmap Confirmation (30 min):**

- [ ] Confirm next quarter's roadmap (features, launches, partnerships)
- [ ] Prioritize based on impact and customer feedback
- [ ] Allocate team capacity

**Funding & Fundraising (20 min):**

- [ ] Do we need to raise capital? (when, how much)
- [ ] What's our story for investors? (unit economics, growth, market)
- [ ] Do we have 12+ months runway? (if not, start fundraising)

### 4.2 Quarterly Report Template

```markdown
# Q3 2026 (July-Sept) Quarterly Report

## Executive Summary

DSG ONE achieved product-market fit signals in Q3:
- 150+ active organizations (+300% from Q2)
- $8,000 MRR (+350% from Q2)
- 47% 30-day retention (target: 45%)
- 3.8% free-to-paid conversion (target: 3%)

Recommendation: **Proceed with Series A fundraising** in Q4 2026.

## KPI Summary (vs. Quarter Targets)

| Metric | Q3 Target | Q3 Actual | Status | Notes |
|--------|-----------|-----------|--------|-------|
| New Customers | 100 | 115 | 🟢 | Strong channel mix |
| MRR | $5,000 | $8,000 | 🟢 | Exceeded by 60% |
| CAC | <$150 | $87 | 🟢 | Organic + referral driven |
| 30-Day Retention | >45% | 47% | 🟢 | Cohort stability |
| Churn (Paid) | <8% | 2% | 🟢 | Only 1 downgrade |
| API Uptime | >99.9% | 99.93% | 🟢 | Enterprise-grade |
| NPS | >35 | 41 | 🟢 | Strong promoters |

**Overall: 8/8 green → Proceed with growth & fundraising strategy**

## Market Opportunity

- TAM: $50B+ (AI governance + compliance)
- Addressable: $500M (compliance-heavy teams in 10K enterprises)
- Strategy: Land in mid-market (50-500 people); expand to enterprise

## Competitive Position

**Strengths:**
- Only platform with integrated deterministic + policy + audit framework
- Lowest CAC in segment (<$100 vs competitors $300-500)
- Highest NPS (41 vs industry avg 35)

**Weaknesses:**
- Smaller brand than Snorkel AI, TruERA, DeepEval
- No enterprise sales team yet
- Limited integration ecosystem

**Opportunities:**
- Partner with major cloud providers (AWS, GCP, Azure)
- Target regulated industries (FinServ, HealthCare, Gov)
- M&A target for larger AI/security companies

## Funding Recommendation

**Raise:** $1.5M Series A in Q4 2026
**Use of Funds:**
- 35% ($525K): Engineering (4 engineers, senior architect)
- 25% ($375K): Sales & Marketing (1 VP Sales, 2 AEs, content marketer)
- 20% ($300K): Operations (CFO, CS manager, HR)
- 15% ($225K): Product (PM, designer, researcher)
- 5% ($75K): Miscellaneous / Buffer

**Milestones:**
- By end of 2026: $15K MRR, 300 customers
- By Q2 2027: $40K MRR, 600 customers, break-even EBITDA
- By Q4 2027: Path to Series B

## Organizational Changes

**Hiring (Q4 2026):**
- VP Engineering (lead product roadmap + team)
- Customer Success Manager (reduce churn)
- Content Marketer (drive organic growth)

**Process Improvements:**
- Weekly product reviews (currently ad-hoc)
- Monthly customer advisory board (gathering feedback)
- Quarterly OKR planning (currently rolling roadmap)

## Next Quarter Priorities

**Product:**
- Add HIPAA compliance templates (customer request)
- Build Slack integration (top feature request)
- Improve onboarding CES score (currently 3.8, target 4.2)

**Growth:**
- Secure 1-2 enterprise pilots (contract >$10K)
- Launch ProductHunt for Q4 (aim for #1 product)
- Reach 10K Twitter followers (currently 2K)

**Operations:**
- Reduce database latency to <400ms p95 (plan: index optimization + read replicas)
- Achieve 99.99% uptime SLA (currently 99.93%)
- Security audit readiness (prepare for FY2027 customer audits)
```

---

## Part 5: Health Check Threshold Definitions

### 5.1 Red / Yellow / Green Thresholds

**Tier 1: Adoption**

| KPI | Green | Yellow | Red |
|-----|-------|--------|-----|
| Weekly New Signups | >target | 80-100% of target | <80% of target |
| Free-to-Paid Conversion | >target% | 70-100% of target | <70% of target |
| Trial Completion Rate | >target% | 80-100% of target | <80% of target |
| Channel Attribution | Leader >30%, diversified | Leader 20-30%, 1-2 channels | All <15% or highly concentrated |

**Tier 2: Engagement**

| KPI | Green | Yellow | Red |
|-----|-------|--------|-----|
| DAU | >target | 80-100% of target | <80% or declining 3+ days |
| Operations/User | >target | 80-100% of target | <60% of target |
| Policy Creation Rate | >target/week | 70-100% of target | <70% or declining 3+ weeks |
| Feature Adoption | 2+ features >40% | 1-2 features >30% | <30% adoption across all features |

**Tier 3: Retention**

| KPI | Green | Yellow | Red |
|-----|-------|--------|-----|
| 30-Day Retention | >target% | ±5% of target | >10% below target |
| 90-Day Retention | >target% | ±5% of target | >10% below target |
| Monthly Churn (Paid) | <target% | target ±1% | >target +2% |
| Feature Stickiness | >target% | ±5% of target | >10% below target |

**Tier 4: Revenue**

| KPI | Green | Yellow | Red |
|-----|-------|--------|-----|
| MRR | >target | 80-100% of target | <60% of target or declining |
| ARPU | >target | 80-100% of target | <70% of target |
| CAC | <target | target ±20% | >target +50% |
| CLV:CAC Ratio | >5:1 | 3:1 - 5:1 | <3:1 |
| Runway | >target months | ±1 month | <6 months |

**Tier 5: Satisfaction**

| KPI | Green | Yellow | Red |
|-----|-------|--------|-----|
| NPS Score | >target | target ±10 | <target -10 or negative |
| CSAT | >target% | ±5% of target | <70% satisfied |
| Product Review Rating | >4.0/5.0 | 3.5-4.0 | <3.5 |
| CES (Ease of Use) | >target% | ±5% of target | <50% rating 4-5 |

**Tier 6: Health**

| KPI | Green | Yellow | Red |
|-----|-------|--------|-----|
| API Uptime | >99.9% | 99.5-99.9% | <99.5% |
| Error Rate | <0.5% | 0.5-1.5% | >1.5% or spike >2% |
| Webhook Success | >99% | 95-99% | <95% or critical endpoint <90% |
| DB Latency (p95) | <500ms | 500-1000ms | >1000ms or >2s spike |
| Security Vulnerabilities | 0 critical | <5 medium | Any critical or >10 medium |

---

## Part 6: Escalation Procedures

**If Red Alert Triggered:**

1. **Critical (P1):** Any red in Health tier
   - Immediately page on-call engineer
   - Post incident report in Slack
   - Investigate and fix within 1 hour
   - Root cause analysis within 24 hours

2. **High (P2):** Any red in Revenue or Retention tier
   - Notify product lead + founder within 2 hours
   - Schedule 1:1 customer call for at-risk situations
   - Develop mitigation plan within 24 hours
   - Daily check-in until resolved

3. **Medium (P3):** Any red in Adoption, Engagement, or Satisfaction tier
   - Notify product lead by end of business
   - Include in next weekly review
   - Develop action plan within 1 week

---

## Implementation Checklist

- [ ] Daily health check automated (Slack bot posting summary each morning)
- [ ] Weekly review meeting scheduled every Friday 2 PM
- [ ] Monthly retrospective template created in shared doc
- [ ] Quarterly review scheduled 3 months in advance
- [ ] Slack #metrics and #alerts channels set up
- [ ] Better Uptime or equivalent monitoring configured
- [ ] Supabase KPI queries saved and tested
- [ ] Owner assigned for each health check
- [ ] Escalation procedures documented and shared

---

## Next Steps

1. **Today:** Set up daily health check Slack bot
2. **This week:** Schedule weekly review meeting
3. **Week 2:** First weekly review (Friday, 2 PM)
4. **End of Month:** First monthly retrospective
5. **End of Month 3:** First quarterly review

See `KPI_DASHBOARD.md` for KPI definitions and targets.
See `MONITORING_SETUP.md` for data collection and dashboard setup.
