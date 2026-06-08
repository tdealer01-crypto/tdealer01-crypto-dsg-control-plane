# Monitoring Setup & Dashboards — Phase 9 KPI Tracking

**Last Updated:** 2026-06-07  
**Purpose:** Configure real-time monitoring infrastructure for Phase 9+ KPI collection and alerting.

---

## Overview

This guide walks through connecting data sources, creating dashboards, and setting up alerts for the 25+ KPIs defined in `KPI_DASHBOARD.md`.

**Key Monitoring Targets:**
- Vercel Analytics (adoption, user behavior, web analytics)
- Supabase Metrics (database health, usage patterns)
- Stripe Dashboard (revenue, subscriptions, payments)
- Uptime Monitoring (API availability and response time)
- Custom Webhooks & Logs (audit trail, execution events)

---

## Part 1: Vercel Analytics Integration

### 1.1 Enable Vercel Web Analytics

**Setup Steps:**

1. Log into [Vercel Dashboard](https://vercel.com/dashboard)
2. Select project: `tdealer01-crypto-dsg-control-plane`
3. Go to **Settings > Analytics**
4. Click **Enable Web Analytics**
5. Copy the analytics ID (format: `abc123...`)

**Verify in Codebase:**

The `next.config.js` should already include analytics. Confirm:

```bash
grep -n "analyticsId\|@vercel/analytics" /home/user/tdealer01-crypto-dsg-control-plane/next.config.js
```

If missing, add to `next.config.js`:

```javascript
{
  analytics: {
    enabled: true,
  },
}
```

And add to `app/layout.tsx`:

```tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

### 1.2 Set Up UTM Tracking

**Configure Campaign Parameters:**

Update marketing links and email campaigns to include UTM parameters:

```
https://tdealer01-crypto-dsg-control-plane.vercel.app/?utm_source=github&utm_medium=readme&utm_campaign=phase9_launch
https://tdealer01-crypto-dsg-control-plane.vercel.app/?utm_source=twitter&utm_medium=social&utm_campaign=phase9_launch
```

**Common UTM Patterns:**

| Source | Medium | Campaign | Example |
|--------|--------|----------|---------|
| `github` | `readme` | `phase9_launch` | GitHub README link |
| `twitter` | `social` | `phase9_launch` | Twitter post |
| `email` | `newsletter` | `phase9_week1` | Weekly email |
| `producthunt` | `marketplace` | `phase9_launch` | Product Hunt listing |
| `linkedin` | `social` | `phase9_demo` | LinkedIn post |
| `referral_code` | `word-of-mouth` | `phase9_beta` | Customer referral |
| `direct` | `organic` | `N/A` | Direct visit (no params) |

### 1.3 Vercel Dashboard Metrics to Track

**Daily Checklist — Check in Vercel Dashboard:**

1. **Top Pages** (last 24h):
   - `/` → Homepage landing
   - `/dashboard` → Authenticated users
   - `/pricing` → Conversion interest
   - `/api/execute` → API usage
   - `/delivery-proof/*` → Proof reports

2. **Geo Distribution:**
   - Top countries by visitors
   - Identify regional adoption centers

3. **Device Breakdown:**
   - Desktop vs. Mobile vs. Tablet
   - Identify UX issues (if mobile <20%, may indicate friction)

4. **Browser/OS:**
   - Ensure compatibility across major browsers
   - Flag if >5% errors on specific browsers

---

## Part 2: Supabase Metrics & Monitoring

### 2.1 Enable Supabase Metrics API

**Setup Steps:**

1. Log into [Supabase Dashboard](https://app.supabase.com)
2. Select project: `tdealer01-crypto-dsg-control-plane`
3. Go to **Reports > Database Health**
4. Confirm access to metrics APIs

**API Endpoints (for programmatic access):**

```bash
# List all metrics
curl -X GET "https://api.supabase.com/v1/projects/{project-id}/analytics/query?start_date=2026-06-01&end_date=2026-06-07" \
  -H "Authorization: Bearer {supabase-api-token}"

# Database performance
curl -X GET "https://api.supabase.com/v1/projects/{project-id}/metrics/database" \
  -H "Authorization: Bearer {supabase-api-token}"
```

### 2.2 Key Supabase Queries for KPI Measurement

Store these queries in Supabase SQL Editor for weekly/monthly execution:

#### Query 1: Monthly New Organizations

```sql
-- KPI 1.1: Monthly New Installations
SELECT 
  DATE_TRUNC('week', created_at) AS week,
  COUNT(DISTINCT id) AS new_orgs,
  COUNT(DISTINCT id) FILTER (WHERE plan_tier = 'free') AS free_tier,
  COUNT(DISTINCT id) FILTER (WHERE plan_tier IN ('starter', 'pro', 'enterprise')) AS paid_tier
FROM organizations
WHERE created_at >= NOW() - INTERVAL '90 days'
GROUP BY 1
ORDER BY 1 DESC;
```

#### Query 2: Daily Active Users

```sql
-- KPI 2.1: Daily Active Users (DAU)
SELECT
  DATE_TRUNC('day', action_timestamp) AS day,
  COUNT(DISTINCT user_id) AS dau,
  COUNT(DISTINCT action_type) AS action_types_used
FROM audit_logs
WHERE action_timestamp >= NOW() - INTERVAL '30 days'
GROUP BY 1
ORDER BY 1 DESC;
```

#### Query 3: Free-to-Paid Conversion

```sql
-- KPI 1.2: Free-to-Paid Conversion Rate
WITH new_users AS (
  SELECT 
    user_id,
    MIN(created_at) AS signup_date
  FROM users
  WHERE created_at >= NOW() - INTERVAL '30 days'
  GROUP BY user_id
),
conversions AS (
  SELECT 
    nu.user_id,
    nu.signup_date,
    os.created_at AS subscription_date
  FROM new_users nu
  LEFT JOIN organization_subscriptions os
    ON nu.user_id = os.created_by_user_id
    AND os.plan_tier != 'free'
    AND os.created_at <= nu.signup_date + INTERVAL '30 days'
)
SELECT
  COUNT(DISTINCT CASE WHEN subscription_date IS NOT NULL THEN user_id END) AS converted_users,
  COUNT(DISTINCT user_id) AS total_new_users,
  ROUND(
    100.0 * COUNT(DISTINCT CASE WHEN subscription_date IS NOT NULL THEN user_id END) 
    / COUNT(DISTINCT user_id), 
    2
  ) AS conversion_rate_percent
FROM conversions;
```

#### Query 4: Monthly Active Users (MAU)

```sql
-- KPI 2.2: Monthly Active Users (MAU)
SELECT
  DATE_TRUNC('month', created_at) AS month,
  COUNT(DISTINCT user_id) AS mau,
  COUNT(DISTINCT org_id) AS active_orgs
FROM audit_logs
WHERE action_timestamp >= NOW() - INTERVAL '90 days'
GROUP BY 1
ORDER BY 1 DESC;
```

#### Query 5: 30-Day Retention

```sql
-- KPI 3.1: 30-Day Retention Rate
WITH user_cohorts AS (
  SELECT
    user_id,
    DATE_TRUNC('week', created_at) AS cohort_week,
    MIN(created_at) AS signup_date
  FROM users
  GROUP BY 1, 2
),
day_1_users AS (
  SELECT user_id
  FROM audit_logs
  WHERE DATE_TRUNC('day', action_timestamp) = DATE_TRUNC('day', 
    (SELECT signup_date FROM user_cohorts uc WHERE uc.user_id = audit_logs.user_id LIMIT 1))
  GROUP BY user_id
),
day_30_users AS (
  SELECT user_id
  FROM audit_logs
  WHERE action_timestamp >= NOW() - INTERVAL '30 days'
  GROUP BY user_id
)
SELECT
  COUNT(DISTINCT d1.user_id) AS day_1_users,
  COUNT(DISTINCT d30.user_id) AS day_30_users,
  ROUND(
    100.0 * COUNT(DISTINCT d30.user_id) / COUNT(DISTINCT d1.user_id),
    2
  ) AS retention_30_day_percent
FROM day_1_users d1
FULL OUTER JOIN day_30_users d30 ON d1.user_id = d30.user_id;
```

#### Query 6: Revenue & MRR

```sql
-- KPI 4.1: Monthly Recurring Revenue (MRR)
SELECT
  DATE_TRUNC('month', created_at) AS month,
  COUNT(DISTINCT organization_id) AS paid_customers,
  SUM(
    CASE 
      WHEN billing_cycle = 'monthly' THEN amount
      WHEN billing_cycle = 'annual' THEN amount / 12
      ELSE 0
    END
  ) AS mrr,
  SUM(amount) AS total_arr
FROM organization_subscriptions
WHERE 
  status = 'active'
  AND created_at >= NOW() - INTERVAL '90 days'
GROUP BY 1
ORDER BY 1 DESC;
```

### 2.3 Create Supabase View for Daily Metrics

Create a materialized view for efficient metric queries:

```sql
CREATE MATERIALIZED VIEW daily_metrics AS
SELECT
  CURRENT_DATE AS metric_date,
  (SELECT COUNT(DISTINCT id) FROM organizations WHERE created_at::date = CURRENT_DATE) AS new_orgs_today,
  (SELECT COUNT(DISTINCT user_id) FROM audit_logs WHERE DATE(action_timestamp) = CURRENT_DATE) AS dau,
  (SELECT COUNT(DISTINCT organization_id) FROM organization_subscriptions WHERE status = 'active') AS active_paid_customers,
  (SELECT COALESCE(SUM(
    CASE 
      WHEN billing_cycle = 'monthly' THEN amount
      WHEN billing_cycle = 'annual' THEN amount / 12
      ELSE 0
    END
  ), 0) FROM organization_subscriptions WHERE status = 'active') AS current_mrr,
  (SELECT COUNT(DISTINCT user_id) FROM audit_logs WHERE action_timestamp >= NOW() - INTERVAL '30 days') AS mau
;

-- Refresh schedule (add to cron job or Vercel cron route)
REFRESH MATERIALIZED VIEW CONCURRENTLY daily_metrics;
```

---

## Part 3: Create Vercel Monitoring Dashboard

### 3.1 Set Up Monitoring Route

Create a new API route to aggregate metrics:

**File:** `app/api/metrics/dashboard.ts`

```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    // DAU
    const { data: dau } = await supabase
      .rpc('get_dau', {});

    // MAU
    const { data: mau } = await supabase
      .rpc('get_mau', {});

    // New orgs this month
    const { count: newOrgs } = await supabase
      .from('organizations')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    // MRR
    const { data: revenue } = await supabase
      .rpc('get_mrr', {});

    // API health (from logs)
    const { data: errorRate } = await supabase
      .rpc('get_api_error_rate', { hours: 24 });

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      metrics: {
        dau: dau?.[0]?.count || 0,
        mau: mau?.[0]?.count || 0,
        newOrgs: newOrgs || 0,
        mrr: revenue?.[0]?.mrr || 0,
        apiErrorRate: errorRate?.[0]?.error_rate || 0,
      },
    });
  } catch (error) {
    console.error('Metrics fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}
```

### 3.2 Vercel Metrics Dashboard URL

Once deployed, access the real-time metrics at:

```
https://tdealer01-crypto-dsg-control-plane.vercel.app/api/metrics/dashboard
```

Display this in a browser, Slack bot, or custom dashboard UI.

---

## Part 4: Set Up Alerts

### 4.1 Slack Integration for Critical Alerts

Install Slack app or use incoming webhooks:

**Webhook Setup:**

1. Go to [Slack App Directory](https://api.slack.com/apps)
2. Create New App → "From Scratch"
3. Name: "DSG Metrics Bot"
4. Select Workspace
5. Go to **Incoming Webhooks** → Enable
6. Add New Webhook to Channel: `#metrics` (or `#alerts`)
7. Copy Webhook URL

**Example Alert Route:** `app/api/alerts/slack.ts`

```typescript
import { NextResponse } from 'next/server';

const SLACK_WEBHOOK = process.env.SLACK_METRICS_WEBHOOK;

export async function POST(request: Request) {
  const { metric, value, threshold, status } = await request.json();

  const color = status === 'critical' ? 'danger' : status === 'warning' ? 'warning' : 'good';

  const payload = {
    attachments: [
      {
        color,
        title: `Alert: ${metric}`,
        text: `Value: ${value}\nThreshold: ${threshold}`,
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  };

  try {
    await fetch(SLACK_WEBHOOK!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Slack alert failed:', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
```

### 4.2 Critical Alert Thresholds

Set up monitoring with these thresholds:

| Metric | Alert Level | Threshold | Action |
|--------|------------|-----------|--------|
| API Uptime | Critical | <98% (1h) | Page on-call |
| Error Rate | Critical | >2% (5m) | Investigate immediately |
| Webhook Success | Warning | <95% | Review integration logs |
| Database Connection | Critical | >80% utilization | Contact Supabase support |
| Churn Rate | Warning | >5%/month (paid) | Customer success review |
| Signup Decline | Warning | <20% WoW drop | Marketing review |

### 4.3 Uptime Monitoring Service

**Recommended:** Better Uptime or Uptime.com

**Setup Steps:**

1. Sign up for [Better Uptime](https://betteruptime.com)
2. Add monitors for:
   - `GET https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health` (expect 200, <1s)
   - `GET https://tdealer01-crypto-dsg-control-plane.vercel.app/api/readiness` (expect 200, <2s)
   - `POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/execute` (expect 200-400, <5s)
3. Set check interval: every 30 seconds
4. Set locations: 3-4 global regions (US, EU, APAC)
5. Configure Slack/email alerts on downtime >1 min

---

## Part 5: Weekly Review Checklist

### Every Friday @ 2 PM (team sync)

**Preparation (15 min before meeting):**

- [ ] Pull latest Supabase metrics using queries above
- [ ] Check Vercel Analytics dashboard for top pages, geo, devices
- [ ] Review Slack alerts from past week (any critical incidents?)
- [ ] Calculate weekly KPI changes (compare to last week)
- [ ] Prepare one-paragraph summary of week's health

**Meeting Agenda (30 min):**

- [ ] **Adoption Tier (3 min):** New installs, signups, trial completion trends
- [ ] **Engagement Tier (3 min):** DAU/MAU, policy creation, feature usage
- [ ] **Retention Tier (3 min):** 30-day retention cohorts, churn signals
- [ ] **Revenue Tier (3 min):** MRR growth, conversion rate, CAC trending
- [ ] **Satisfaction Tier (2 min):** NPS survey results (if sent), support tickets, feedback
- [ ] **Health Tier (3 min):** API uptime, error rates, database performance
- [ ] **Action Items (3 min):** Priority fixes, roadmap adjustments, tests to run

**Output:**

Document findings in a shared Google Doc or Markdown file:

```markdown
## Week of June 7-13, 2026

### Key Metrics
- DAU: 42 (+5 from last week) ✅
- MRR: $3,200 (+$800 from last week) ✅
- New Installs: 15 (on track) ✅
- 30-Day Retention: 48% ✅

### Alerts
- API error rate spiked to 1.8% on June 10 (fixed by June 11) ⚠️
- 1 paid customer at risk (follow up needed) ⚠️

### Wins
- Free-to-paid conversion hit 4.2% (target: 3%) 🎉
- Customer landed on ProductHunt and got 3 signups

### Next Week Focus
1. Investigate churn risk customer
2. Optimize onboarding flow (CES score 3.8, target 4.2)
3. Monitor database latency (p95 at 1.2s, target <800ms)
```

---

## Part 6: Monthly Retrospective Template

### First Friday of Every Month (1-hour meeting)

**Pre-Meeting Preparation:**

1. Compile month's KPI results (actual vs. target)
2. Generate cohort analysis report
3. Segment customers by satisfaction (NPS, CSAT, support tickets)
4. List all incidents, downtime, and resolutions
5. Prepare financial summary (revenue, burn, runway)

**Meeting Structure (60 min):**

**1. Executive Summary (10 min)**
- [ ] Did we hit go/no-go decision criteria for this month?
- [ ] 1-2 sentences on month's theme (e.g., "Strong adoption, churn concerns")

**2. Tier-by-Tier Review (35 min)**

For each tier (Adoption, Engagement, Retention, Revenue, Satisfaction, Health):

- Compare actual vs. target for all 4-5 KPIs
- Identify trends (improving, flat, declining)
- Hypothesize root causes
- Propose next-month adjustments

**3. Cohort Deep Dive (10 min)**
- Segment users by signup date and track retention
- Identify which weeks had highest-quality signups
- Recommend channel shifts for next month

**4. Customer & Support Review (5 min)**
- Summarize support ticket themes
- Highlight any product feedback patterns
- Note any churn risks or expansion opportunities

**Output Document (sample structure):**

```markdown
# Month 1 (May 15 - June 15, 2026) Retrospective

## Executive Summary
Strong product-market fit signals: 4.1% free-to-paid conversion (target: 3%), 48% 30-day retention (target: 45%), MRR $3,200 (target: $1,000). One churn risk in enterprise segment; investigating feature gap.

## Tier Results

### Tier 1: Adoption
| KPI | Target | Actual | Status |
|-----|--------|--------|--------|
| New Installations | 20-50 | 32 | ✅ |
| Signup Rate | 30-80/week | 52/week avg | ✅ |
| Free-to-Paid Conversion | >2% | 4.1% | ✅✅ |
| Trial Completion | >20% | 38% | ✅ |

**Trends:** All adoption KPIs beating targets. Top channel: organic (40%), followed by ProductHunt (25%).

**Recommendation:** Increase organic content marketing spend (+$500/month for blog + Twitter).

### Tier 2: Engagement
[Similar structure...]

## Churn Risk Assessment
- Customer X (signed up Week 2, PRO tier, $299/mo): Last login 5 days ago, support ticket about feature X
- **Action:** Schedule 1:1 call next week; offer onboarding session for feature X

## Next Month Priorities
1. Resolve enterprise customer feature gap
2. Optimize onboarding flow (current CES: 3.8, target: 4.2)
3. Test partnership with Y platform
4. Scale content marketing (1 blog post/week)
```

---

## Part 7: Dashboard Tools Recommendation

### Option A: Simple (No Cost)
- **Google Sheets + Apps Script:** Manually query Supabase, refresh weekly
- **Vercel Dashboard:** Native analytics built-in
- **Slack Bot:** Send daily/weekly snapshots via webhook

### Option B: Mid-Tier (Recommended, ~$50/month)
- **Metabase:** Self-hosted or cloud ($50/mo) — great for team sharing
- **Grafana Cloud:** Free tier + paid for more metrics
- **Mixpanel:** $50-200/mo — excellent for cohort analysis

### Option C: Enterprise ($500+/month)
- **Amplitude:** Advanced funnel, cohort, and retention analysis
- **Looker (Google Cloud):** Enterprise BI platform
- **Tableau:** Full-featured data visualization

**Recommendation for Phase 9:** Start with Google Sheets + Vercel Dashboard (free), upgrade to Metabase (cheap) at Month 2 once data volume justifies.

---

## Implementation Timeline

- **Day 1:** Enable Vercel Analytics, add UTM parameters to marketing links
- **Day 2:** Set up Supabase queries in SQL Editor; save for weekly runs
- **Day 3:** Create `/api/metrics/dashboard` route; test locally
- **Day 4:** Set up Slack webhook; configure alerts
- **Day 5:** Schedule weekly review meeting (every Friday @ 2 PM)
- **Week 2:** First weekly review meeting
- **Week 4:** First monthly retrospective
- **Month 2:** Evaluate and upgrade to Metabase if team agrees

---

## Verification Checklist

- [ ] Vercel Analytics enabled and tracking UTM parameters
- [ ] Supabase queries saved and tested
- [ ] `/api/metrics/dashboard` endpoint returns data
- [ ] Slack webhook working (test alert sent)
- [ ] Weekly review meeting scheduled in calendar
- [ ] Monthly retrospective template created in shared doc
- [ ] Better Uptime monitors configured (or equivalent)
- [ ] Team understands KPI targets and go/no-go criteria

---

## Next Steps

1. **Today:** Execute Part 1-2 setup (Vercel + Supabase)
2. **This week:** Create monitoring dashboard (Part 3-4)
3. **Next week:** Run first weekly review using checklist
4. **Next month:** Complete first monthly retrospective
5. **Month 2:** Review tool options and upgrade if needed

See `KPI_DASHBOARD.md` for detailed metric definitions and targets.
