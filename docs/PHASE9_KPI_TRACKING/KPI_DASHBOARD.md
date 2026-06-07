# KPI Dashboard — Phase 9+ Success Metrics Framework

**Last Updated:** 2026-06-07  
**Product:** DSG ONE / ProofGate Control Plane  
**Phase:** 9+ (Post-Launch Growth & Retention)

---

## Executive Summary

This framework defines 25+ key performance indicators across 6 measurement tiers. Each KPI includes:
- Definition and business rationale
- Target metrics by checkpoint
- Measurement methodology
- Measurement frequency
- Go/No-Go decision criteria at Week 1, Month 1, and Month 3

**Checkpoint schedule:**
- **Week 1:** Initial launch health and adoption signals
- **Month 1:** Sustainability and early engagement patterns
- **Month 3:** Product-market fit and revenue trajectory indicators

---

## Tier 1: Adoption & Market Penetration

### KPI 1.1: Monthly New Installations

**Definition:** Cumulative count of new distinct organizations/accounts installing the DSG platform (including free tier).

**Rationale:** Core adoption velocity metric. Indicates market reach and installation friction.

**Target by Checkpoint:**
- Week 1: 5-15 installations
- Month 1: 25-50 installations
- Month 3: 150-250 installations

**Measurement Method:**
- Source: Supabase `organizations` table `created_at` field
- Query: `COUNT(DISTINCT org_id) WHERE created_at > NOW() - INTERVAL`
- Vercel Analytics: Track `/products/*` landing page → installation flow conversion

**Measurement Frequency:** Daily dashboard, weekly report aggregation

**Go/No-Go Criteria:**
- Week 1 GO: >5 installations
- Month 1 GO: >20 installations
- Month 3 GO: >100 installations
- NO-GO if: Declining week-over-week for 2+ consecutive weeks

---

### KPI 1.2: Free-to-Paid Conversion Rate

**Definition:** Percentage of free-tier users who upgrade to a paid plan within 30 days of signup.

**Rationale:** Validates product value and willingness to pay. Targets 5-10% for SaaS.

**Target by Checkpoint:**
- Week 1: 2-5% (small sample)
- Month 1: 3-8%
- Month 3: 5-10%

**Measurement Method:**
- Source: Supabase `organization_subscriptions` table
- Query: `(COUNT(paid_signup_date) / COUNT(all_signup_date)) * 100` WHERE signup_date - paid_date <= 30 days
- Vercel Analytics: Track pricing page view → checkout conversion

**Measurement Frequency:** Weekly aggregation

**Go/No-Go Criteria:**
- Week 1 GO: At least 1 paid conversion or positive trend
- Month 1 GO: >2% conversion
- Month 3 GO: >3% conversion
- NO-GO if: <1% for 3+ consecutive weeks

---

### KPI 1.3: Signup Rate

**Definition:** New distinct users signing up (via GitHub OAuth or email) per week.

**Rationale:** Top-of-funnel growth indicator. Reflects marketing effectiveness and platform interest.

**Target by Checkpoint:**
- Week 1: 10-30 signups
- Month 1: 40-80 signups/week
- Month 3: 150-300 signups/week

**Measurement Method:**
- Source: Supabase `users` table `created_at`
- Query: `COUNT(DISTINCT user_id) WHERE created_at > NOW() - INTERVAL '7 days'`
- Vercel Analytics: Track `/api/auth/callback` completions

**Measurement Frequency:** Weekly

**Go/No-Go Criteria:**
- Week 1 GO: >10 signups
- Month 1 GO: >30 signups/week, showing week-over-week growth
- Month 3 GO: >100 signups/week
- NO-GO if: Flat or declining 3+ weeks in a row

---

### KPI 1.4: Trial Completion Rate

**Definition:** Percentage of free-tier users who reach their first policy creation or first governed execution within 7 days.

**Rationale:** Measures onboarding success and product engagement depth. Industry target: 30-50%.

**Target by Checkpoint:**
- Week 1: 20-40% (pilot users)
- Month 1: 25-45%
- Month 3: 35-55%

**Measurement Method:**
- Source: Supabase `runtime_intents` (policy creation), `runtime_executions` (first execution)
- Query: `(COUNT(users with >=1 policy OR >=1 execution) / COUNT(new_signups)) * 100` within 7 days
- Dashboard: Filter by `created_at` this week vs. execution/policy date

**Measurement Frequency:** Weekly

**Go/No-Go Criteria:**
- Week 1 GO: >15%
- Month 1 GO: >20%
- Month 3 GO: >30%
- NO-GO if: <15% for 2+ weeks

---

### KPI 1.5: Channel Attribution

**Definition:** Breakdown of user source (organic search, direct, referral, marketplace, partner, content, paid ads).

**Rationale:** Identifies which channels drive lowest-cost, highest-quality acquisitions.

**Target by Checkpoint:**
- Week 1: Baseline establishment (identify top 3 channels)
- Month 1: 50%+ from top-2 performing channels
- Month 3: Optimize top channel for 40%+ of signups

**Measurement Method:**
- Source: Vercel Analytics UTM parameters, Supabase `organization_metadata.acquisition_source`
- Query: Track `utm_source`, `utm_medium`, `utm_campaign` at signup
- Dashboard: Segment by channel in acquisition funnel

**Measurement Frequency:** Weekly

**Go/No-Go Criteria:**
- Week 1 GO: Track at least 3 channels with data
- Month 1 GO: Clear leader channel with 20%+ of signups
- Month 3 GO: Top channel delivering 30%+ of signups efficiently
- NO-GO if: All channels equally low (<10% each)

---

## Tier 2: Engagement & Activity

### KPI 2.1: Daily Active Users (DAU)

**Definition:** Distinct users who perform at least one action (login, policy view, execution, settings change) per calendar day.

**Rationale:** Core health metric. Indicates sustained product usage and habit formation.

**Target by Checkpoint:**
- Week 1: 5-15 DAU
- Month 1: 15-40 DAU
- Month 3: 60-150 DAU

**Measurement Method:**
- Source: Supabase `audit_logs` table (all user actions logged)
- Query: `COUNT(DISTINCT user_id) WHERE action_timestamp > NOW() - INTERVAL '1 day'`
- Vercel Analytics: Track authenticated page views (dashboard, policies, executions)

**Measurement Frequency:** Real-time dashboard, daily report

**Go/No-Go Criteria:**
- Week 1 GO: >3 DAU
- Month 1 GO: >10 DAU
- Month 3 GO: >40 DAU
- NO-GO if: Declining trend for 3+ consecutive days

---

### KPI 2.2: Monthly Active Users (MAU)

**Definition:** Distinct users with at least one action in the past 30 days.

**Rationale:** Retention and platform stickiness indicator.

**Target by Checkpoint:**
- Week 1: 10-20 MAU
- Month 1: 30-70 MAU
- Month 3: 150-300 MAU

**Measurement Method:**
- Source: Supabase `audit_logs`
- Query: `COUNT(DISTINCT user_id) WHERE action_timestamp > NOW() - INTERVAL '30 days'`
- Dashboard: Compare to beginning-of-month baseline

**Measurement Frequency:** Daily, reported weekly

**Go/No-Go Criteria:**
- Week 1 GO: >5 MAU
- Month 1 GO: >20 MAU
- Month 3 GO: >100 MAU
- NO-GO if: MAU growth rate <20% month-over-month

---

### KPI 2.3: Operations Per User Per Month

**Definition:** Average number of governed operations (executions, policy evaluations, approvals) per active user monthly.

**Rationale:** Measures depth of product usage. Distinguishes casual users from power users.

**Target by Checkpoint:**
- Week 1: 2-5 ops/user
- Month 1: 3-8 ops/user
- Month 3: 5-15 ops/user (10+ indicates paid-tier behavior)

**Measurement Method:**
- Source: Supabase `runtime_executions`, `runtime_intents`, `approval_events`
- Query: `SUM(operations) / COUNT(DISTINCT user_id)` per calendar month
- Segment by plan tier to identify paid user patterns

**Measurement Frequency:** Weekly aggregation

**Go/No-Go Criteria:**
- Week 1 GO: >1 op/user average
- Month 1 GO: >2 ops/user
- Month 3 GO: >3 ops/user; identify 10%+ of users with >10 ops
- NO-GO if: <1 op/user for 2+ weeks (indicates ghost users)

---

### KPI 2.4: Policy Creation Rate

**Definition:** Number of new policies created (across all users) per week.

**Rationale:** Indicates product exploration and governance deployment. Key engagement trigger.

**Target by Checkpoint:**
- Week 1: 2-8 policies
- Month 1: 8-25 policies/week
- Month 3: 40-100 policies/week

**Measurement Method:**
- Source: Supabase `policies` table, `created_at` field
- Query: `COUNT(policy_id) WHERE created_at > NOW() - INTERVAL '7 days'`
- Dashboard: Segment by policy type, org size

**Measurement Frequency:** Daily, aggregated weekly

**Go/No-Go Criteria:**
- Week 1 GO: >1 policy created
- Month 1 GO: >5 policies/week, trending up
- Month 3 GO: >25 policies/week
- NO-GO if: <1 policy/week for 3+ consecutive weeks

---

### KPI 2.5: Feature Adoption Rate

**Definition:** Percentage of organizations using each major feature within 30 days of signup.

**Rationale:** Measures product depth and feature-market fit.

**Target by Checkpoint (By Feature):**
- Week 1: Compliance Proof API adoption 20-30%, Policy Gates 30-40%
- Month 1: Compliance Proof API 40-50%, Policy Gates 50-70%
- Month 3: Compliance Proof API 60%+, Policy Gates 70%+, Audit Trail 80%+

**Measurement Method:**
- Source: Supabase `feature_usage` table (track first use per org per feature)
- Query: Per-feature adoption = `COUNT(orgs with >=1 use) / COUNT(total_orgs)` within 30 days signup
- Dashboard: Segment by plan tier and cohort

**Measurement Frequency:** Weekly

**Go/No-Go Criteria:**
- Week 1 GO: At least 2 features showing >15% adoption
- Month 1 GO: 3+ features each >40% adoption
- Month 3 GO: 4+ features each >50% adoption
- NO-GO if: Any feature <20% adoption after Month 1

---

## Tier 3: Retention & Churn

### KPI 3.1: 30-Day Retention Rate

**Definition:** Percentage of users active in Day 30 (or later) who were also active in Day 1 after signup.

**Rationale:** Early-stage retention signal. Industry benchmark: 40-60% for SaaS.

**Target by Checkpoint:**
- Week 1: Insufficient cohort
- Month 1: 40-55%
- Month 3: 50-65%

**Measurement Method:**
- Source: Supabase `audit_logs` and `users.created_at`
- Query: Track cohort signup date, then check activity 30 days later
- Formula: `(Returning users on Day 30 / Active users on Day 1) * 100`
- Cohort analysis by month and channel

**Measurement Frequency:** Weekly (rolling 7-day lookback)

**Go/No-Go Criteria:**
- Month 1 GO: >35% 30-day retention
- Month 3 GO: >45% 30-day retention
- NO-GO if: <30% for 2+ cohorts

---

### KPI 3.2: 90-Day Retention Rate

**Definition:** Percentage of users active on Day 90+ who were active on Day 1 after signup.

**Rationale:** Mid-stage retention and product-market fit indicator. Industry benchmark: 25-40%.

**Target by Checkpoint:**
- Week 1: Insufficient data
- Month 1: Insufficient data
- Month 3: 30-45%

**Measurement Method:**
- Source: Supabase cohort analysis from `audit_logs`
- Query: Day 90 activity against Day 1 activity for earliest cohorts
- Dashboard: Track first cohort eligible for 90-day measurement

**Measurement Frequency:** Monthly (rolling 30-day window)

**Go/No-Go Criteria:**
- Month 3 GO: >25% 90-day retention (first cohort)
- NO-GO if: <15% (indicates major product issues)

---

### KPI 3.3: Monthly Churn Rate (Paid Tiers)

**Definition:** Percentage of paid subscribers who cancel or downgrade to free tier in a given month.

**Rationale:** Revenue predictability and paid-tier satisfaction. Industry benchmark: 2-10%/month.

**Target by Checkpoint:**
- Week 1: N/A (insufficient paid base)
- Month 1: <10% churn
- Month 3: 3-7% churn

**Measurement Method:**
- Source: Supabase `organization_subscriptions` and `subscription_events`
- Query: Count cancellations/downgrades per month / total paid subs at month start
- Dashboard: Segment by cohort, plan tier, revenue value

**Measurement Frequency:** Weekly, reported monthly

**Go/No-Go Criteria:**
- Month 1 GO: No mass churn; track early drops as feedback
- Month 3 GO: <8% monthly churn; >2 paid customers at risk = red flag
- NO-GO if: >15% monthly churn (indicates fundamental dissatisfaction)

---

### KPI 3.4: Feature Stickiness

**Definition:** Percentage of users returning to the product within 7 days after their first use of a key feature.

**Rationale:** Indicates feature-to-habit conversion and product discovery.

**Target by Checkpoint:**
- Week 1: Establish baseline (likely high due to pilot cohort)
- Month 1: 50-65%
- Month 3: 60-75%

**Measurement Method:**
- Source: Supabase `audit_logs`, first use date per feature, subsequent activity
- Query: For each user's first feature use, check if they return within 7 days
- Dashboard: Track by feature, user cohort

**Measurement Frequency:** Weekly aggregation

**Go/No-Go Criteria:**
- Week 1 GO: Establish tracking and baseline
- Month 1 GO: >40% returning after feature use
- Month 3 GO: >50% returning after feature use
- NO-GO if: <30% (feature is not driving habit formation)

---

### KPI 3.5: Onboarding Completion Rate

**Definition:** Percentage of signups who complete the onboarding flow (invite team, create first policy, run first execution, or view first audit log).

**Rationale:** Early user activation and NPS predictor.

**Target by Checkpoint:**
- Week 1: 30-50%
- Month 1: 35-55%
- Month 3: 40-60%

**Measurement Method:**
- Source: Supabase `onboarding_events` table or reconstruct from `audit_logs`
- Query: Completion = (last onboarding checkpoint == 'complete') for new users
- Dashboard: Segment by signup source, device type

**Measurement Frequency:** Weekly

**Go/No-Go Criteria:**
- Week 1 GO: >20%
- Month 1 GO: >30%
- Month 3 GO: >35%
- NO-GO if: <20% (indicates UX friction)

---

## Tier 4: Revenue & Financial Health

### KPI 4.1: Monthly Recurring Revenue (MRR)

**Definition:** Predictable monthly revenue from all active paid subscriptions (excluding one-time fees, usage-based overages that month).

**Rationale:** Core business health metric. Targets profitability and runway.

**Target by Checkpoint:**
- Week 1: $0-1,000 (foundation phase)
- Month 1: $2,000-5,000
- Month 3: $10,000-20,000

**Measurement Method:**
- Source: Supabase `organization_subscriptions` table, Stripe API
- Query: Sum of `recurring_amount` for all active subscriptions as of measurement date
- Cross-check with Stripe dashboard monthly revenue
- Exclude one-time charges, failed payments, refunds

**Measurement Frequency:** Daily dashboard update, weekly report, monthly reconciliation with Stripe

**Go/No-Go Criteria:**
- Week 1 GO: Any revenue or clear path
- Month 1 GO: >$1,000 MRR
- Month 3 GO: >$5,000 MRR
- NO-GO if: Flat or declining 2+ months in a row (indicates churn issues)

---

### KPI 4.2: Customer Lifetime Value (CLV)

**Definition:** Average total revenue expected from a single customer over their lifetime with the platform.

**Formula:** (ARPU) × (Gross Margin) ÷ (Monthly Churn Rate)

**Rationale:** Determines sustainable acquisition spend and growth model viability.

**Target by Checkpoint:**
- Week 1: Estimate $5,000-10,000 based on benchmarks
- Month 1: Calculate from early cohorts; expect $5,000-15,000
- Month 3: Refine based on 3 months of actual retention data; target $10,000+

**Measurement Method:**
- Source: Historical revenue per customer, churn rates from Supabase
- Calculate for each cohort, update monthly
- Formula: If ARPU = $100, Gross Margin = 70%, Churn = 5%, then CLV = (100 × 0.70) ÷ 0.05 = $1,400
- Dashboard: Segment by acquisition channel and plan tier

**Measurement Frequency:** Monthly (requires 30+ days of cohort data)

**Go/No-Go Criteria:**
- Month 1 GO: CLV > 3× CAC (Customer Acquisition Cost); estimate CAC ~$50-200
- Month 3 GO: CLV > 5× CAC; refine CAC based on actual spend
- NO-GO if: CLV < 2× CAC (unsustainable unit economics)

---

### KPI 4.3: Average Revenue Per User (ARPU)

**Definition:** Total monthly revenue ÷ total active users (MAU).

**Rationale:** Indicates monetization efficiency. For freemium, track paid users separately.

**Target by Checkpoint:**
- Week 1: $0-50 (mostly free tier)
- Month 1: $30-80 (paid base growing)
- Month 3: $50-150 (increasing mix of paid users)

**Measurement Method:**
- Source: Monthly recurring revenue / MAU count
- Track separately: ARPU (all users) vs. ARPU (paid users only)
- Dashboard: Segment by plan tier, geography, cohort

**Measurement Frequency:** Weekly (MAU updates), reported monthly

**Go/No-Go Criteria:**
- Month 1 GO: >$20 ARPU (indicates monetization traction)
- Month 3 GO: >$40 ARPU overall; >$200 for paid users
- NO-GO if: <$10 ARPU after Month 1 (monetization not working)

---

### KPI 4.4: Customer Acquisition Cost (CAC)

**Definition:** Total marketing/sales spend ÷ number of new paid customers acquired.

**Rationale:** Validates unit economics and sustainable growth.

**Target by Checkpoint:**
- Week 1: N/A (no paid acquisition spend yet)
- Month 1: <$200 CAC for self-serve channels
- Month 3: <$150 CAC for organic/self-serve; <$300 for partner/sales-assisted

**Measurement Method:**
- Source: Stripe data on new customer dates, Vercel marketing spend, partner spend tracking
- Query: Total marketing spend / new paid customer count
- Dashboard: Segment by channel (organic, ads, partner, sales)
- Exclude brand co-marketing and content spend (attribute separately)

**Measurement Frequency:** Weekly update, monthly reconciliation

**Go/No-Go Criteria:**
- Month 1 GO: Document CAC by channel; organic should be lowest
- Month 3 GO: CAC < CLV/12 (payback within 12 months); organic <$100, paid <$300
- NO-GO if: CAC > ARPU × 12 (payback >12 months; unsustainable)

---

### KPI 4.5: Cash Burn & Runway

**Definition:** Monthly operating costs minus revenue. Runway = cash balance ÷ monthly burn.

**Rationale:** Ensures viability and informs fundraising timeline.

**Target by Checkpoint:**
- Week 1: Expected burn ~$10-15K/month; runway 12+ months
- Month 1: Actual burn recorded; path to <$5K burn by Month 3
- Month 3: Burn <$3K/month OR revenue ≥ burn (break-even)

**Measurement Method:**
- Source: Stripe (revenue), Vercel invoices, Supabase costs, team cost allocation
- Monthly P&L: Revenue - (Cloud costs + Team cost + Marketing)
- Dashboard: Monthly burn chart, runway indicator, path to profitability

**Measurement Frequency:** Monthly reconciliation

**Go/No-Go Criteria:**
- Week 1 GO: 12+ months runway confirmed
- Month 1 GO: Actual burn documented; runway > 9 months
- Month 3 GO: Burn declining; runway > 8 months OR path to profitability clear
- NO-GO if: Runway drops below 6 months without new funding

---

## Tier 5: Satisfaction & Brand Health

### KPI 5.1: Net Promoter Score (NPS)

**Definition:** Question: "How likely are you to recommend DSG ONE to a colleague?" Scale 0-10. NPS = (Promoters 9-10) - (Detractors 0-6) / Total.

**Rationale:** Predicts word-of-mouth growth and customer loyalty. Industry benchmark: 40-60 for successful SaaS.

**Target by Checkpoint:**
- Week 1: N/A (insufficient sample)
- Month 1: Target 30-50 (early adopter cohort likely positive)
- Month 3: Target 40-60

**Measurement Method:**
- Source: Email survey to active users every 2 weeks
- Dashboard: Segment by plan tier, feature usage, cohort
- Include open-ended feedback question: "What's most important feature for your team?"
- Tool: Vercel surveys, Supabase email integration, or external NPS platform

**Measurement Frequency:** Bi-weekly survey, monthly aggregate

**Go/No-Go Criteria:**
- Month 1 GO: NPS > 20 (more promoters than detractors)
- Month 3 GO: NPS > 35 (healthy range)
- NO-GO if: NPS negative (more detractors than promoters) at Month 1; investigate immediately

---

### KPI 5.2: Support Satisfaction (CSAT)

**Definition:** Post-support ticket rating. Question: "How satisfied were you with this support?" Scale 1-5.

**Rationale:** Indicates customer service quality and support team efficiency.

**Target by Checkpoint:**
- Week 1: N/A
- Month 1: >80% rating 4-5
- Month 3: >85% rating 4-5

**Measurement Method:**
- Source: Support ticket system (Slack thread with emoji reactions, email post-script, or dedicated tool)
- Track: All support interactions including Slack, email, in-app chat
- Dashboard: Weekly CSAT %, trend, and feedback summary

**Measurement Frequency:** Per ticket, aggregated weekly

**Go/No-Go Criteria:**
- Month 1 GO: >70% satisfied (4-5 rating)
- Month 3 GO: >80% satisfied
- NO-GO if: <50% satisfied (indicates poor support quality)

---

### KPI 5.3: Product Review Rating (External)

**Definition:** Average star rating across public review platforms (G2, Capterra, ProductHunt, etc.).

**Rationale:** Influences new customer acquisition and credibility.

**Target by Checkpoint:**
- Week 1: N/A (no reviews yet)
- Month 1: Target 4.0+/5.0 (aim for 3-5 reviews minimum)
- Month 3: Target 4.2+/5.0 (expect 10-20 reviews)

**Measurement Method:**
- Source: Monitor ProductHunt (if launched), G2, Capterra, GitHub stars, npm package rating
- Dashboard: Track review count and average rating
- Collect positive reviews for marketing; address negative reviews quickly

**Measurement Frequency:** Weekly check, monthly summary

**Go/No-Go Criteria:**
- Month 1 GO: At least 3 reviews, average 3.5+
- Month 3 GO: Average 4.0+; <10% 1-2 star reviews
- NO-GO if: Average <3.5 or >20% negative reviews (address product issues)

---

### KPI 5.4: Customer Effort Score (CES)

**Definition:** Survey question: "How easy was it to accomplish your goal?" Scale 1-5 (very difficult to very easy).

**Rationale:** Predicts satisfaction, support load, and churn. Industry benchmark: 70%+ rating 4-5.

**Target by Checkpoint:**
- Week 1: N/A
- Month 1: >60% rating 4-5
- Month 3: >75% rating 4-5

**Measurement Method:**
- Source: In-app survey after key actions (first policy creation, execution, approval)
- Dashboard: Segment by feature, user cohort
- Open-ended follow-up: "What made this difficult?" for 1-3 ratings

**Measurement Frequency:** Per action, aggregated weekly

**Go/No-Go Criteria:**
- Month 1 GO: >50% rating 4-5
- Month 3 GO: >70% rating 4-5
- NO-GO if: <40% (major UX issues)

---

### KPI 5.5: Community Engagement

**Definition:** Activity in community channels (Discord, GitHub Discussions, Forum) and event attendance.

**Rationale:** Indicates product adoption depth and brand loyalty.

**Target by Checkpoint:**
- Week 1: Discord server created; GitHub Discussions enabled
- Month 1: 20-50 Discord members, 5-10 discussions/month
- Month 3: 100-200 Discord members, 30-50 discussions/month, 1-2 community events

**Measurement Method:**
- Source: Discord analytics, GitHub Discussions, event registration
- Dashboard: Member count, weekly activity, top contributors
- Track: Feature requests, bug reports, use case sharing

**Measurement Frequency:** Weekly check

**Go/No-Go Criteria:**
- Month 1 GO: Community channels live; >10 members
- Month 3 GO: >50 members, regular activity, at least 1 user-generated content piece
- NO-GO if: Ghost community (no posts >2 weeks)

---

## Tier 6: Platform Health & Reliability

### KPI 6.1: API Uptime

**Definition:** Percentage of time public API routes (health, readiness, execute, intent) are reachable and responding <5s.

**Rationale:** Core product availability. SaaS benchmark: 99.5%+.

**Target by Checkpoint:**
- Week 1: >99.0% (acceptable launch)
- Month 1: >99.5%
- Month 3: >99.9% (three nines)

**Measurement Method:**
- Source: Vercel deployment status, uptime monitoring service (Uptime.com, Better Uptime, Datadog)
- Query: Monitor GET /api/health and POST /api/execute every 30 seconds from 3+ geographic regions
- Dashboard: Real-time uptime %, incident log, response time p50/p95/p99

**Measurement Frequency:** Real-time monitoring, daily summary, monthly SLA report

**Go/No-Go Criteria:**
- Week 1 GO: >98% uptime; investigate any incident >1 min
- Month 1 GO: >99.5% uptime; SLA credit policy in place for customers
- Month 3 GO: >99.9% uptime; <1 incident/month
- NO-GO if: <99% uptime; indicates infrastructure issues

---

### KPI 6.2: API Error Rate

**Definition:** Percentage of API requests returning 5xx errors (server errors).

**Rationale:** Indicates reliability and user experience degradation.

**Target by Checkpoint:**
- Week 1: <2% error rate (acceptable with ramp-up)
- Month 1: <1% error rate
- Month 3: <0.5% error rate

**Measurement Method:**
- Source: Vercel Analytics, CloudFlare logs, or centralized logging (if implemented)
- Query: COUNT(5xx responses) / COUNT(total requests)
- Dashboard: Hourly error rate, error type breakdown, affected endpoints

**Measurement Frequency:** Real-time alerts, hourly dashboard, daily summary

**Go/No-Go Criteria:**
- Week 1 GO: <3% error rate; investigate spike >1%
- Month 1 GO: <1.5% error rate
- Month 3 GO: <0.5% error rate; 99.5%+ requests succeed
- NO-GO if: >5% error rate; indicates urgent system issue

---

### KPI 6.3: Webhook Success Rate

**Definition:** Percentage of webhook deliveries (to Stripe, GitHub, partner integrations) that receive success acknowledgment (2xx response) within 10 seconds.

**Rationale:** Ensures critical integrations work; impacts billing and partner relationships.

**Target by Checkpoint:**
- Week 1: >95% (foundation phase)
- Month 1: >98%
- Month 3: >99%

**Measurement Method:**
- Source: Webhook delivery logs in Supabase `webhook_events` table, Stripe webhook delivery logs
- Query: COUNT(successful_delivery) / COUNT(total_webhooks) by endpoint
- Dashboard: Per-webhook success rate, retry count, latency

**Measurement Frequency:** Daily aggregation, real-time alerts on failure >2% per endpoint

**Go/No-Go Criteria:**
- Week 1 GO: >90% success; <5 failed webhooks/day acceptable
- Month 1 GO: >97% success
- Month 3 GO: >99% success; address any single endpoint <95%
- NO-GO if: Any critical webhook <90% success (billing, auth, compliance)

---

### KPI 6.4: Database Health & Query Performance

**Definition:** Supabase database uptime, query latency (p95, p99), and connection pool utilization.

**Rationale:** Detects scaling issues and data corruption risks.

**Target by Checkpoint:**
- Week 1: >99% uptime, p95 query latency <1s, <70% connection pool
- Month 1: >99.5% uptime, p95 <800ms, <60% pool utilization
- Month 3: >99.9% uptime, p95 <500ms, <50% pool utilization

**Measurement Method:**
- Source: Supabase Dashboard, metrics API
- Query: Monitor `performance.mean_exec_time`, `connections_active`, `connections_waiting`
- Set alerts: Query >2s, pool >80%, disk usage >80%

**Measurement Frequency:** Real-time dashboard, hourly aggregation

**Go/No-Go Criteria:**
- Week 1 GO: Database stable; <1 reboot/week
- Month 1 GO: p95 latency <1.5s; 0 emergency restarts
- Month 3 GO: p95 <800ms; proactive migration plan if pool >70%
- NO-GO if: Database unavailable >30 min/month or p95 latency >3s

---

### KPI 6.5: Dependency & Security Health

**Definition:** npm audit score (0 vulnerabilities at high+), outdated dependency count, and security scanning results.

**Rationale:** Prevents supply chain attacks and compliance failures.

**Target by Checkpoint:**
- Week 1: 0 critical vulnerabilities, 0 high (or documented exceptions)
- Month 1: 0 critical or high, <5 medium, monthly audit sweep
- Month 3: 0 critical or high, <10 medium, quarterly security review scheduled

**Measurement Method:**
- Source: `npm audit`, Vercel deployment logs, GitHub Security Advisories
- Run: `npm audit --audit-level=high` in CI, fail if violations found
- Dashboard: Track CVE count, dependency freshness, license compliance

**Measurement Frequency:** On every deployment (CI), weekly full audit

**Go/No-Go Criteria:**
- Week 1 GO: 0 critical vulnerabilities
- Month 1 GO: 0 high+ vulnerabilities (document any exceptions with remediation date)
- Month 3 GO: 0 critical/high; <5 medium; all high-age dependencies on upgrade path
- NO-GO if: Critical vulnerability not fixed within 72 hours

---

## Checkpoint Decision Matrix

### Week 1 Checkpoint (Launch Health)

| Tier | KPI | Target | GO? | Notes |
|------|-----|--------|-----|-------|
| 1 | New Installations | >5 | ✅ | Adopt/pivot if <3 |
| 1 | Signup Rate | >10 | ✅ | Adoption signals |
| 2 | DAU | >3 | ✅ | Core engagement |
| 2 | Policy Creation | >1 | ✅ | Activation signal |
| 3 | 30-Day Retention | Insufficient | ⏱️ | Track cohort only |
| 4 | Cash Runway | >12 months | ✅ | Funding buffer |
| 6 | API Uptime | >98% | ✅ | Infrastructure |
| 6 | Error Rate | <3% | ✅ | System stability |

**Decision:** GO = 6+ green. Continue execution. Iterate on low-adoption channels.

---

### Month 1 Checkpoint (Sustainability)

| Tier | KPI | Target | GO? | Notes |
|------|-----|--------|-----|-------|
| 1 | New Installations | >20 | ✅ | Month-over-month |
| 1 | Free-to-Paid Conversion | >2% | ✅ | Monetization signal |
| 2 | DAU | >10 | ✅ | Sustained engagement |
| 2 | Operations/User | >2 | ✅ | Depth of use |
| 3 | 30-Day Retention | >35% | ✅ | Cohort analysis |
| 4 | MRR | >$1,000 | ✅ | Revenue traction |
| 4 | CLV vs CAC | CLV > 3× | ✅ | Unit economics |
| 5 | NPS | >20 | ✅ | Satisfaction baseline |
| 6 | API Uptime | >99.5% | ✅ | Reliability |

**Decision:** GO = 7+ green. Continue current roadmap. If <7 green, investigate and adjust.

---

### Month 3 Checkpoint (Product-Market Fit)

| Tier | KPI | Target | GO? | Notes |
|------|-----|--------|-----|-------|
| 1 | New Installations | >100 | ✅ | Growth trajectory |
| 1 | Free-to-Paid Conversion | >3% | ✅ | Improving funnel |
| 2 | DAU | >40 | ✅ | Healthy daily active |
| 2 | Policy Creation | >25/week | ✅ | Engagement depth |
| 3 | 30-Day Retention | >45% | ✅ | Strong cohort |
| 3 | 90-Day Retention | >25% | ✅ | Mid-stage signal |
| 3 | Churn (Paid) | <8% | ✅ | Paid customer sticky |
| 4 | MRR | >$5,000 | ✅ | Revenue ramp |
| 4 | CLV vs CAC | CLV > 5× | ✅ | Unit economics healthy |
| 5 | NPS | >35 | ✅ | Product-market fit sign |
| 5 | CSAT | >80% | ✅ | Support quality |
| 6 | API Uptime | >99.9% | ✅ | Enterprise-grade |
| 6 | Error Rate | <0.5% | ✅ | Reliable platform |

**Decision:** GO = 11+ green. Execute Series A strategy. If 9-10 green, extend Month 3 by 4 weeks and recheck. If <9, investigate pivot/wind-down.

---

## Success Criteria Summary

### Phase 9 Launch Success (Week 1)

- [ ] 5-15 new installations
- [ ] 10-30 signups
- [ ] >3 DAU
- [ ] >98% API uptime
- [ ] 12+ months cash runway
- [ ] At least 1 policy created
- [ ] <3% API error rate

### Phase 9 Month 1 Confirmation

- [ ] >20 installations (month cumulative)
- [ ] >30 signups/week
- [ ] >10 DAU
- [ ] >2% free-to-paid conversion
- [ ] >$1,000 MRR from 2+ customers
- [ ] >35% 30-day retention
- [ ] >99.5% uptime
- [ ] NPS > 20 (first survey)

### Phase 9 Month 3 Product-Market Fit

- [ ] >100 installations
- [ ] >150 signups/week
- [ ] >40 DAU, >100 MAU
- [ ] 3%+ free-to-paid conversion
- [ ] $5,000+ MRR from 5+ customers
- [ ] >45% 30-day retention, >25% 90-day
- [ ] <8% monthly churn (paid)
- [ ] NPS > 35
- [ ] >99.9% uptime
- [ ] Clear path to profitability or Series A

---

## Notes for Dashboard Implementation

1. **Automated Measurement:** Query Supabase daily; Vercel analytics hourly; Stripe/billing daily.
2. **Real-time Alerts:** Set up webhook on critical metrics (>2% error, <95% uptime, churn spike).
3. **Cohort Tracking:** Tag users at signup with `acquisition_source`, `plan_tier`, `signup_date`.
4. **Red/Yellow/Green:** Define thresholds for each metric in dashboard config; color code weekly report.
5. **Stakeholder Cadence:** Daily standup (metrics snapshot), weekly review (detailed trends), monthly board update (strategic implications).

---

## Next Steps

1. **Week 1:** Implement daily metric collection via Supabase queries.
2. **Week 2:** Create Vercel monitoring dashboard; set up Slack alerts.
3. **Week 3:** Send first NPS survey (email to active users).
4. **Week 4:** Publish first monthly metrics report to stakeholders.
5. **Ongoing:** Review KPIs every Friday; adjust targets if evidence warrants.
