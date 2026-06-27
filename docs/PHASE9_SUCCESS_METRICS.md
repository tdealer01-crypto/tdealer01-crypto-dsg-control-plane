# Phase 9: Success Metrics & KPI Dashboard

**Status:** Post-Launch Monitoring Framework  
**Updated:** 2026-06-07  
**Owner:** Growth, Product, Analytics  
**Review Frequency:** Weekly (first 30 days), then monthly

---

## Overview

This document defines the Key Performance Indicators (KPIs) that prove Phase 9 launch was successful. Use these metrics to:

1. **Track progress** during launch week/month
2. **Make go/no-go decisions** at critical milestones
3. **Optimize marketing & product** based on real data
4. **Report to leadership** on ROI and product-market fit

**Success looks like:** Hitting 50+ installations and 500+ operations within first month, with 70%+ retention and growing MRR.

---

## KPI Framework

### Tier 1: Adoption (Top-Level Health)

These metrics answer: "Are customers installing and using the app?"

| KPI | Definition | Target (Month 1) | Target (Month 3) | Measurement |
|-----|-----------|-----------------|-----------------|-------------|
| **Installations** | Unique merchants who connected app via OAuth | 50+ | 200+ | Supabase: COUNT(DISTINCT stripe_account_id FROM stripe_connections) |
| **Active Users (MAU)** | Merchants who executed ≥1 operation in the month | 40+ | 160+ | Supabase: COUNT(DISTINCT merchant_id FROM stripe_operations WHERE DATE_TRUNC('month', created_at) = CURRENT_MONTH) |
| **Operations Processed** | Total gated operations (charges, payouts, refunds) | 500+ | 5,000+ | Supabase: COUNT(*) FROM stripe_operations WHERE created_at >= MONTH_START |

**Interpretation:**
- `Installations` shows top-of-funnel interest
- `Active Users` shows engagement (not all who install use it)
- `Operations` shows true utilization & recurring value

**Go/No-Go Thresholds:**
- ✅ **GO:** 50+ installations by Day 30
- ⚠️ **CAUTION:** 25-49 installations (needs investigation)
- 🔴 **NO-GO:** <25 installations (product-market fit issue)

---

### Tier 2: Engagement (How Customers Use It)

These metrics answer: "Are customers getting real value from the app?"

| KPI | Definition | Target (Month 1) | Target (Month 3) | Measurement |
|-----|-----------|-----------------|-----------------|-------------|
| **Avg Ops/Merchant** | Average operations gated per merchant | 10+ | 25+ | SUM(operations) / COUNT(DISTINCT merchant_id) |
| **Policy Creation Rate** | % of merchants who created ≥1 policy | 80%+ | 90%+ | COUNT(merchants_with_policies) / COUNT(installations) * 100 |
| **Feature Usage Mix** | % of operations using advanced features (rules, thresholds, etc) | 40%+ | 60%+ | COUNT(ops_with_rules) / COUNT(total_ops) * 100 |
| **Onboarding Completion** | % who complete getting started flow | 80%+ | 85%+ | COUNT(completed_onboarding) / COUNT(installations) * 100 |

**Interpretation:**
- `Avg Ops/Merchant` shows depth of use (is it sticky?)
- `Policy Creation Rate` shows "aha moment" achievement
- `Feature Usage Mix` shows feature adoption
- `Onboarding Completion` shows product clarity

**Go/No-Go Thresholds:**
- ✅ **GO:** 80%+ policy creation, 80%+ onboarding completion
- ⚠️ **CAUTION:** 60-79% (onboarding needs improvement)
- 🔴 **NO-GO:** <60% (product not solving customer problem)

---

### Tier 3: Retention (Is It Sticky?)

These metrics answer: "Do customers stay and keep using the app?"

| KPI | Definition | Target (Month 1) | Target (Month 3) | Measurement |
|-----|-----------|-----------------|-----------------|-------------|
| **Day 30 Retention** | % of Day 1 installs still active on Day 30 | 70%+ | 75%+ | COUNT(active_on_day_30) / COUNT(installed_on_day_1) * 100 |
| **Day 90 Retention** | % of Day 1 installs still active on Day 90 | N/A | 60%+ | COUNT(active_on_day_90) / COUNT(installed_on_day_1) * 100 |
| **Churn Rate (Monthly)** | % of merchants who disconnect app | <15% | <10% | (COUNT(disconnected) / COUNT(active_start_of_month)) * 100 |
| **Reactivation Rate** | % of churned merchants who reconnect | 20%+ | 30%+ | COUNT(reactivated) / COUNT(disconnected) * 100 |

**Interpretation:**
- `Day 30 Retention` shows product-market fit (SaaS standard: 80%+)
- `Churn Rate` shows ongoing satisfaction
- `Reactivation Rate` shows willingness to give it another try

**Go/No-Go Thresholds:**
- ✅ **GO:** 70%+ Day 30 retention
- ⚠️ **CAUTION:** 50-69% retention (product quality issue)
- 🔴 **NO-GO:** <50% retention (fundamental problem)

---

### Tier 4: Revenue (Is It Sustainable?)

These metrics answer: "Are we making money and growing?"

| KPI | Definition | Target (Month 1) | Target (Month 3) | Measurement |
|-----|-----------|-----------------|-----------------|-------------|
| **MRR (Monthly Recurring Revenue)** | Monthly revenue from active subscriptions | $500+ | $5,000+ | SUM(monthly_subscription_amount) for active subscriptions |
| **Freemium → Paid Conversion** | % of free users who upgrade to paid plan | 10%+ | 20%+ | COUNT(converted_to_paid) / COUNT(freemium_signups) * 100 |
| **CAC (Customer Acquisition Cost)** | $ spent on marketing per new customer | <$500 | <$300 | SUM(marketing_spend) / COUNT(new_customers) |
| **LTV (Lifetime Value)** | Expected total revenue per customer over lifetime | $3,000+ | $5,000+ | AVG(customer_lifetime_revenue) |
| **LTV:CAC Ratio** | Lifetime value vs. acquisition cost | 6:1+ | 15:1+ | LTV / CAC |

**Interpretation:**
- `MRR` shows revenue growth trajectory
- `Freemium → Paid Conversion` shows monetization viability
- `LTV:CAC Ratio` shows business unit economics (3:1 = break-even, 5:1+ = healthy)
- `LTV` shows customer value (longer they stay, higher LTV)

**Go/No-Go Thresholds:**
- ✅ **GO:** LTV:CAC > 3:1, conversion rate 10%+
- ⚠️ **CAUTION:** LTV:CAC 2:1-3:1 (needs better retention or pricing)
- 🔴 **NO-GO:** LTV:CAC < 2:1 (not sustainable)

---

### Tier 5: Customer Satisfaction (Quality & Sentiment)

These metrics answer: "Do customers love the product?"

| KPI | Definition | Target (Month 1) | Target (Month 3) | Measurement |
|-----|-----------|-----------------|-----------------|-------------|
| **NPS (Net Promoter Score)** | Customer likelihood to recommend (0-100 scale) | 40+, | 50+ | (% promoters - % detractors) |
| **Support Ticket Volume** | Number of support emails/issues per month | <50 | <100 | COUNT(tickets) FROM support_system |
| **Ticket Resolution Time** | Avg time to resolve support issue | <24 hours | <12 hours | AVG(resolution_time) |
| **Customer Rating** | Average rating from in-app surveys | 4.0+/5.0 | 4.3+/5.0 | AVG(rating_score) FROM customer_surveys |

**Interpretation:**
- `NPS` is the gold standard for product satisfaction
- `Ticket Volume` shows product clarity (fewer = better)
- `Resolution Time` shows support quality
- `Customer Rating` shows feature quality

**Go/No-Go Thresholds:**
- ✅ **GO:** NPS 40+, rating 4.0+/5.0
- ⚠️ **CAUTION:** NPS 30-39 (needs improvement)
- 🔴 **NO-GO:** NPS <30 (customers don't recommend)

---

### Tier 6: Operational Health (Is the Service Reliable?)

These metrics answer: "Can we scale without breaking?"

| KPI | Definition | Target | Alert Threshold | Measurement |
|-----|-----------|--------|-----------------|-------------|
| **Uptime** | % of time service is available | 99.5%+ | Alert if <99.0% | Vercel / Uptime monitoring |
| **Error Rate** | % of API requests that fail | <1% | Alert if >2% | (failed_requests / total_requests) * 100 |
| **Latency (p99)** | 99th percentile response time | <500ms | Alert if >1000ms | Vercel Analytics |
| **Webhook Success Rate** | % of Stripe webhooks processed without error | 99%+ | Alert if <98% | (successful_webhooks / total_webhooks) * 100 |
| **Database Connection Pool** | % of available DB connections in use | <80% | Alert if >90% | Current_connections / max_connections * 100 |

**Interpretation:**
- `Uptime` is a customer SLA commitment (99.9% is industry standard)
- `Error Rate` shows code quality and infrastructure stability
- `Latency` affects user experience (>1s = noticeable slowness)
- `Webhook Success Rate` is critical for Stripe integration trust
- `Database Pool` shows scaling headroom

**Go/No-Go Thresholds:**
- ✅ **GO:** 99%+ uptime, <1% error rate
- ⚠️ **CAUTION:** 98-98.9% uptime, 1-2% error rate
- 🔴 **NO-GO:** <98% uptime or >2% error rate

---

## Dashboard Setup Instructions

### In Vercel Analytics

1. **Log in** to Vercel → Your Project → **Analytics** tab
2. **Create custom charts** for:
   - API response times (p50, p95, p99)
   - Request count by endpoint
   - Error rate by status code (4xx, 5xx)
   - Cache hit ratio

3. **Set up alerts:**
   ```
   Alert if error rate > 1% for 5 minutes → Slack #incidents
   Alert if p99 latency > 1000ms for 5 minutes → Slack #platform
   Alert if uptime < 99.5% in 24h → Slack #incidents
   ```

### In Supabase

1. **Log in** to Supabase → Your Project → **Reports** tab
2. **Create queries** for key metrics:

```sql
-- Daily adoption (installations)
SELECT 
  DATE_TRUNC('day', created_at) as day,
  COUNT(DISTINCT stripe_account_id) as new_installations,
  COUNT(DISTINCT stripe_account_id) FILTER (WHERE updated_at >= DATE_TRUNC('day', NOW())) as active_merchants
FROM stripe_connections
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY day
ORDER BY day DESC;

-- Daily operations
SELECT 
  DATE_TRUNC('day', created_at) as day,
  COUNT(*) as total_operations,
  SUM(CASE WHEN decision = 'ALLOW' THEN 1 ELSE 0 END) as allowed,
  SUM(CASE WHEN decision = 'BLOCK' THEN 1 ELSE 0 END) as blocked,
  SUM(CASE WHEN decision = 'REVIEW' THEN 1 ELSE 0 END) as review
FROM stripe_operations
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY day
ORDER BY day DESC;

-- Policy adoption
SELECT 
  COUNT(DISTINCT merchant_id) as merchants_with_policies,
  COUNT(*) as total_policies,
  AVG(rule_count) as avg_rules_per_policy
FROM policies
WHERE created_at >= NOW() - INTERVAL '30 days';

-- Retention (Day 30)
SELECT 
  DATE_TRUNC('day', creation_date) as install_day,
  COUNT(*) as installed_day_1,
  COUNT(*) FILTER (WHERE last_active >= (creation_date + INTERVAL '30 days')) as still_active_day_30,
  ROUND(COUNT(*) FILTER (WHERE last_active >= (creation_date + INTERVAL '30 days')) * 100.0 / COUNT(*), 1) as retention_pct
FROM stripe_connections
WHERE created_at >= NOW() - INTERVAL '60 days'
GROUP BY install_day
ORDER BY install_day DESC;

-- Revenue metrics
SELECT 
  DATE_TRUNC('month', created_at) as month,
  COUNT(DISTINCT merchant_id) as merchants,
  SUM(monthly_amount) as mrr,
  COUNT(*) FILTER (WHERE plan = 'paid') as paid_customers,
  ROUND(COUNT(*) FILTER (WHERE plan = 'paid') * 100.0 / COUNT(*), 1) as paid_pct
FROM subscriptions
WHERE status = 'active'
GROUP BY month
ORDER BY month DESC;
```

3. **Save as custom views** for weekly review

### In Google Data Studio (or Tableau)

1. Connect Supabase as data source
2. Create dashboard with:
   - Adoption trend (line chart: installs over time)
   - Operations breakdown (pie chart: ALLOW vs BLOCK vs REVIEW)
   - Retention curve (line chart: % active by day)
   - Revenue forecast (bar chart: MRR growth)
   - Support ticket volume (line chart: tickets over time)

---

## Weekly Review Template

Every Friday, run this review:

```markdown
# DSG Governance Gate — Weekly Metrics Review
**Week of [DATE]**

## Tier 1: Adoption
- Installations (cumulative): [X] (target: [Y])
- New installations this week: [X]
- Active merchants (MAU): [X] (target: [Y])
- Operations this week: [X] (daily avg: [X])

## Tier 2: Engagement
- % merchants with policies: [X]% (target: 80%)
- Avg operations per merchant: [X] (target: 10+)
- % using advanced features: [X]% (target: 40%)
- Onboarding completion rate: [X]% (target: 80%)

## Tier 3: Retention
- Day 30 retention: [X]% (target: 70%)
- Monthly churn rate: [X]% (target: <15%)
- Reactivation rate: [X]% (target: 20%+)

## Tier 4: Revenue
- MRR: $[X] (target: $500+ at month 1)
- New paid signups this week: [X]
- Freemium → Paid conversion: [X]% (target: 10%)
- LTV:CAC ratio: [X]:1 (target: 6:1)

## Tier 5: Satisfaction
- NPS: [X] (target: 40+)
- Support tickets (open): [X]
- Avg resolution time: [X] hours (target: <24h)
- Customer rating: [X]/5.0 (target: 4.0+)

## Tier 6: Health
- Uptime this week: [X]% (target: 99.9%)
- Error rate: [X]% (alert: >2%)
- P99 latency: [X]ms (alert: >1000ms)
- Webhook success: [X]% (target: 99%+)

## What's Working
- [Key win 1]
- [Key win 2]

## What Needs Fixing
- [Issue 1 + proposed fix]
- [Issue 2 + proposed fix]

## Action Items for Next Week
- [ ] [Action 1 + owner]
- [ ] [Action 2 + owner]

## Traffic & Visibility
- Blog traffic: [X] visits (trending: ↑ / → / ↓)
- Twitter impressions: [X] (trending: ↑ / → / ↓)
- Marketplace search visibility: [ranking for app name]

## Leadership Summary
**Overall Status:** [🟢 ON TRACK / 🟡 AT RISK / 🔴 BLOCKED]

**Key Insight:** [One sentence summary of biggest learning]

**Recommendation:** [One recommendation for next week]
```

---

## Monthly Review & Planning

At end of each month, conduct deeper analysis:

### Month 1 Review (Days 30-31)

**Questions to Answer:**
1. Did we hit adoption targets (50+ installs)?
2. Do customers find value (80%+ onboarding completion)?
3. Are they sticky (70%+ Day 30 retention)?
4. Are we making money (10%+ conversion to paid)?
5. Is the service reliable (99%+ uptime)?

**Action Items:**
- [ ] Document why targets were/weren't hit
- [ ] Identify top 3 levers for improvement
- [ ] Update product roadmap based on feedback
- [ ] Plan Month 2 marketing push
- [ ] Brief leadership (see template above)

### Month 3 Review (Days 90-91)

**Analysis:**
- Assess Month 1 + Month 2 + Month 3 trends
- Compare to baseline expectations
- Calculate LTV and predict full-year revenue
- Evaluate product-market fit signals

**Decision Gates:**
- ✅ **ACCELERATE:** Hitting targets → double marketing spend, hire
- ⚠️ **OPTIMIZE:** At targets but opportunity → improve retention, add features
- 🔴 **PIVOT:** Missing targets significantly → reassess positioning, product

---

## Dashboards to Build

### Public Metrics Page (Optional)

Publish a public status page at `https://yourcompany.com/status/` showing:

- Uptime % (last 30 days)
- API latency (current, last 24h)
- Incident history (link to postmortems)
- System status (All Systems Green / Minor Issues / Major Incident)

### Internal Metrics Dashboard

Share weekly/monthly dashboard with:
- Adoption & engagement (Tier 1-2)
- Retention (Tier 3)
- Revenue (Tier 4)
- NPS & satisfaction (Tier 5)
- Operational health (Tier 6)

**Who accesses:**
- Product: Daily
- Executive team: Weekly
- Full company: Monthly (all-hands presentation)

---

## Benchmarks vs. Competition

How does DSG compare?

| Metric | DSG Target | Stripe App Avg | Enterprise SaaS | Notes |
|--------|-----------|---|---|---|
| Day 30 Retention | 70%+ | 60% | 80%+ | Stripe apps avg lower due to long sales cycles |
| Freemium → Paid | 10%+ | 3-5% | 15%+ | Higher conversion = better product fit |
| NPS | 40+ | 35-40 | 50+ | SaaS average; Stripe apps often higher |
| Uptime | 99.5%+ | 99.0% | 99.9%+ | Stripe requirement for listed apps |
| Support Response | <24h | 24-48h | <4h | Aim for top-tier |

---

## Red Flags & Escalation

If you see these signals, escalate immediately:

| Red Flag | Threshold | Action |
|----------|-----------|--------|
| **Error rate spike** | >5% for >30 min | Page engineer; investigate logs |
| **Adoption stalling** | <10 installs by Day 14 | Product/marketing review call |
| **Churn spike** | >30% monthly churn | Customer calls; gather feedback |
| **Support overload** | >20 tickets/day | Add support staff; improve FAQ |
| **Retention drop** | <50% Day 30 | Urgent onboarding improvement needed |

---

## Forecasting & Growth Planning

### Month 1 Forecast (Conservative)

```
Installations: 50
MAU: 40
Operations: 500
MRR: $500 (freemium + 5 paid customers @ $100/mo)
```

### Month 3 Forecast (With Marketing)

```
Installations: 200 (4x growth)
MAU: 160 (4x growth)
Operations: 5,000 (10x growth)
MRR: $5,000 (50 paid customers @ $100/mo)
```

### Month 6 Forecast (Full Ramp)

```
Installations: 500 (10x growth)
MAU: 350 (8.75x growth)
Operations: 25,000 (50x growth)
MRR: $20,000 (increasing ASP + better conversion)
```

**Assumptions:**
- Month 1: Word-of-mouth + early adopters
- Month 3: Content marketing + partnerships kicking in
- Month 6: Full sales motion + case studies driving demand

---

## Reporting Templates

### For Weekly All-Hands

```markdown
# DSG Governance Gate — Weekly Update

**This week's wins:**
- [Win 1]
- [Win 2]

**Numbers that matter:**
- 📊 Installs: [X] (up X% from last week)
- 📈 Operations: [X] (trending [direction])
- 👥 Active users: [X]
- 💰 MRR: $[X]

**What needs attention:**
- [Issue 1]
- [Issue 2]

**Next week focus:**
- [Priority 1]
- [Priority 2]
```

### For Monthly Board/Exec Review

```markdown
# DSG Governance Gate — Monthly Metrics Report

**Executive Summary**
[1-2 sentences on status vs. plan]

**Key Metrics**
| Metric | This Month | Last Month | Target | Status |
|--------|-----------|-----------|--------|--------|
| Installations | X | Y | 50-200 | 🟢 |
| MRR | $X | $Y | $500-5K | 🟢 |
| D30 Retention | X% | Y% | 70%+ | 🟡 |
| NPS | X | Y | 40+ | 🟢 |
| Uptime | X% | Y% | 99.5%+ | 🟢 |

**Narrative**
[2-3 paragraphs explaining trends, challenges, opportunities]

**Forecast**
[Updated projection for next 3-6 months based on current trends]

**Recommendations**
[Top 2-3 actions to accelerate growth or fix issues]
```

---

## Data Privacy & Compliance

When tracking these metrics:

- ✅ Track aggregate/anonymous metrics (no PII)
- ✅ Track merchant IDs (your own namespace)
- ❌ Never log customer payment data
- ❌ Never log customer PII without consent
- ✅ Retain usage logs ≥12 months (compliance)
- ✅ Delete on customer request (GDPR right to delete)

Reference: `CLAUDE.md` Section 10 (Data Security), PHASE9_MARKETPLACE_SUBMISSION.md Section D (Privacy)

---

**Last Updated:** 2026-06-07  
**Status:** ✅ Ready for Implementation (Post-Launch)  
**Owner:** Growth, Analytics, Product
