# Success Metrics Setup & ROI Dashboard

**Estimated time: 15 minutes**  
**For: Business stakeholders, operations teams**  
**Goal: Measure the business impact of DSG Governance Gate**

This guide shows you how to set up key performance indicators (KPIs), connect your dashboard, and calculate ROI from governance.

---

## What Success Looks Like

Before we measure, let's define what we're measuring:

### Operational Metrics

| Metric | What It Measures | Target | Why It Matters |
|--------|------------------|--------|---|
| **Policies Active** | How many governance rules are running | 5-20+ | More policies = more control |
| **Decisions Made** | Total policy evaluations per month | >100 | Shows engagement and usage |
| **Decision Speed** | Average time to evaluate a policy | <100ms | Fast decisions = good UX |
| **Blocked Transactions** | How many were blocked by policies | 5-15% of total | Risk mitigation effectiveness |
| **Review Queue** | Pending approvals waiting for team | <48hrs SLA | Approval velocity |
| **False Positive Rate** | Legitimate txns incorrectly blocked | <2% | Policy fine-tuning |

### Business Metrics

| Metric | What It Measures | Baseline | Goal | ROI |
|--------|------------------|----------|------|-----|
| **Fraud Prevention** | $ saved by blocked fraud | $0 (manual) | Varies | Prevented losses |
| **Approval Time** | Avg hours to approve transaction | 4-8 hours | <2 hours | Faster cash flow |
| **Compliance Prep** | Hours to prepare for audit | 40 hours | 10 hours | 75% time savings |
| **Team Efficiency** | FTE hours spent on approvals | Baseline | Reduced by X% | Reallocation of staff |
| **Audit Readiness** | % of evidence available | 20% | 100% | Full compliance trail |

### Compliance Metrics

| Metric | What It Measures | Status | Why It Matters |
|--------|------------------|--------|---|
| **Audit Trail** | All decisions logged immutably | ✓ | Proof of governance |
| **Evidence Chain** | Full context for each decision | ✓ | Auditor confidence |
| **Policy Versioning** | Track policy changes over time | ✓ | Regulatory traceability |
| **Compliance Reports** | Auto-generated audit reports | ✓ | SOC 2, ISO compliance |
| **Evidence Export** | Download audit trail for review | ✓ | Auditor-ready format |

---

## How to Access Your Metrics Dashboard

### Dashboard Location

**URL:** `https://tdealer01-crypto-dsg-control-plane.vercel.app/dashboard/metrics`

Or from your main dashboard:
1. Click "Dashboard" in left sidebar
2. Click "Metrics" tab
3. You'll see your KPI overview

### Dashboard Sections

#### Section 1: Quick Stats (Top of Page)

```
┌─────────────────────────────────────────────────────────┐
│  Policies Active: 8          Decisions Made: 1,247       │
│  Team Members: 3            Audit Entries: 1,247        │
└─────────────────────────────────────────────────────────┘
```

#### Section 2: Decision Timeline (30-Day Chart)

Shows:
- Total decisions per day
- Blocked vs. reviewed vs. allowed
- Trends over time
- Spike detection

#### Section 3: Policy Performance (Table)

| Policy | Triggered | Blocked | Reviewed | Allowed | Accuracy |
|--------|-----------|---------|----------|---------|----------|
| Block >$10K | 156 | 47 | 47 | 62 | 100% |
| Refund Flag | 89 | 0 | 89 | 0 | 95% |
| Agent Limit | 34 | 8 | 8 | 18 | 98% |

#### Section 4: Team Approvals (Approval Queue)

- Total pending approvals
- Avg approval time (target <4 hours)
- Most common review types
- Team member approval rates

#### Section 5: Compliance Evidence (Audit Stats)

- Total audit entries
- Export availability
- Last export date
- Retention policy

---

## How to Calculate ROI

### Step 1: Baseline Your Current State

#### Before DSG (Manual Governance)

**Operational Costs:**
```
Manual approval per transaction:
  - Time to review: 10-20 minutes
  - Person cost: $50/hour
  - Cost per approval: $8.33 - $16.67

Monthly transactions needing approval: 100
  Monthly approval cost: $833 - $1,667
  Annual approval cost: $10,000 - $20,000
```

**Compliance Costs:**
```
Audit preparation time per year:
  - Gathering evidence: 20 hours
  - Documentation: 15 hours
  - Interview prep: 5 hours
  Total: 40 hours × $75/hour = $3,000/year

Emergency compliance requests:
  - Response time: 2-3 days
  - Staff hours: 8 hours × $75 = $600 per request
  Average 4 requests/year: $2,400/year

Total annual compliance cost: ~$5,400
```

**Risk Costs (Estimated):**
```
Fraud incidents caught manually: 5/year
Average fraud cost: $5,000
Recovery rate: 20%
Net fraud cost: 5 × $5,000 × 80% = $20,000/year

Approval delays causing lost sales:
  - Delayed approvals: 10/month
  - Average sale value: $2,000
  - Lost sales: 10/month × $2,000 = $20,000/month
  - Annual impact: $240,000/year
```

**Total Annual Cost (Before DSG):**
```
Approval costs:       $15,000
Compliance costs:     $5,400
Fraud losses:         $20,000
Approval delays:      $240,000
                     ─────────
TOTAL:               $280,400
```

### Step 2: Record Current DSG Costs

**DSG Subscription Cost:**
- Starter plan: $299/month = $3,588/year
- Professional plan: $999/month = $11,988/year
- Enterprise plan: Custom

**Implementation Cost (One-time):**
- Setup & integration: 8 hours × $100 = $800
- Training: 2 hours × $50 = $100
- Total setup: $900

**Total DSG Cost (Year 1):**
```
Subscription (e.g., Professional): $11,988
One-time setup:                    $900
                                   ─────────
TOTAL:                             $12,888
```

### Step 3: Calculate Savings with DSG

**Operational Savings:**
```
Automated approvals (policies execute <100ms):
  - Approval cost reduced by 90%
  - Remaining manual reviews: 10/month
  - Cost per manual review: $8.33 (faster team because policies pre-filter)
  - New monthly cost: 10 × $8.33 = $83
  - Annual cost: $996
  Savings: $15,000 - $996 = $14,004/year
```

**Compliance Savings:**
```
Audit preparation with DSG:
  - Evidence auto-generated: 2 hours (vs 20)
  - Documentation: 1 hour (vs 15)
  - Interview prep: 0.5 hours (vs 5)
  - Total: 3.5 hours × $75 = $262.50
  Savings: $40 × 75 = $3,000/year

Emergency compliance requests:
  - Response time: <1 hour (auto-export)
  - Staff hours: 0.5 hours × $75 = $37.50 per request
  - 4 requests/year: $150
  Savings: $2,400 - $150 = $2,250/year

Total compliance savings: $5,250/year
```

**Risk Reduction:**
```
Fraud detection improvement:
  - Current detection: 5 caught/year
  - With DSG policies: 8 caught/year
  - Additional fraud prevented: 3 × $5,000 × 80% = $12,000

Approval delays eliminated:
  - DSG prevents delays with automated policies
  - Remaining delays: 1/month (vs 10/month)
  - Recovered sales: 9 transactions/month × $2,000 = $18,000/month
  - Annual recovery: $216,000

Total risk reduction: $12,000 + $216,000 = $228,000/year
```

**Total Annual Savings with DSG:**
```
Operational savings:   $14,004
Compliance savings:    $5,250
Risk reduction:        $228,000
                       ─────────
TOTAL SAVINGS:         $247,254/year
```

### Step 4: Calculate ROI

**Simple ROI Formula:**
```
ROI = (Total Savings - DSG Cost) / DSG Cost × 100%

ROI = ($247,254 - $12,888) / $12,888 × 100%
ROI = $234,366 / $12,888 × 100%
ROI = 1,819%
```

**Payback Period:**
```
Payback = DSG Cost / Monthly Savings

Monthly Savings = $247,254 / 12 = $20,605
Payback = $12,888 / $20,605 = 0.63 months

= Less than 3 weeks!
```

---

## ROI Dashboard Template

Use this spreadsheet template to track your ROI:

### Excel / Google Sheets Setup

**Column A: Metric**
```
Approval Cost Reduction
Compliance Prep Reduction
Fraud Prevention
Approval Delay Recovery
Support Overhead Reduction
----
Total Benefits
DSG Cost
----
Net ROI
```

**Column B: Monthly (Current Month)**
```
$1,167
$438
$1,000
$18,000
$500
----
$21,105
$1,074
----
$20,031 (88.4% ROI/month)
```

**Column C: YTD (Year-to-Date)**
```
$5,835
$2,190
$5,000
$90,000
$2,500
----
$105,525
$5,370
----
$100,155 (1,766% YTD ROI)
```

**Column D: Projected Annual**
```
$14,004
$5,250
$12,000
$216,000
$6,000
----
$253,254
$12,888
----
$240,366 (1,865% Annual ROI)
```

---

## Connect Your Dashboard Data

### From Supabase (Live Data)

Your metrics pull from these Supabase tables:

1. **`decisions`** — Every policy decision
   - Columns: `id`, `policy_id`, `decision`, `timestamp`, `transaction_amount`

2. **`policies`** — Your governance policies
   - Columns: `id`, `name`, `conditions`, `action`, `created_at`, `status`

3. **`audit_trail`** — Compliance evidence
   - Columns: `id`, `decision_id`, `entry_id`, `timestamp`, `evidence_hash`

4. **`team_members`** — Your team
   - Columns: `id`, `email`, `role`, `created_at`

**Dashboard auto-refreshes** every 5 minutes with fresh data from these tables.

### From Vercel (Deployment Metrics)

You can also connect Vercel to see:
- Uptime percentage
- Response time (P50, P95, P99)
- Error rate
- API calls/month

**Connect Vercel:**
1. Go to Settings → Integrations
2. Click "Connect Vercel"
3. Authorize your Vercel project
4. Dashboard shows live deployment metrics

---

## Monthly Review Checklist

Use this checklist every month to track success:

### First Friday of Month (15 minutes)

- [ ] **Review Dashboard Metrics**
  - [ ] Policies active: Is the number growing?
  - [ ] Decisions made: Is usage increasing?
  - [ ] Blocked transactions: Is risk being caught?
  - [ ] Approval time: Is it under target (<4 hours)?

- [ ] **Review Policy Performance**
  - [ ] Any policies with low accuracy? Edit or disable
  - [ ] Any policies not triggering? Check conditions
  - [ ] Are false positives acceptable? (<2%)

- [ ] **Review Team Activity**
  - [ ] Approval queue empty? (<48 hours SLA)
  - [ ] Team members active? (Check usage)
  - [ ] Any team member overwhelmed? Redistribute roles

- [ ] **Review Compliance Status**
  - [ ] Audit trail complete? (All decisions recorded)
  - [ ] Evidence export working? (Test export)
  - [ ] Policy versions tracked? (For audit trail)

- [ ] **Update ROI Calculation**
  - [ ] Savings increased from last month?
  - [ ] New fraud prevented?
  - [ ] Approval delays eliminated?

- [ ] **Plan Next Month**
  - [ ] New policies to deploy?
  - [ ] Existing policies to refine?
  - [ ] Team training needed?

### Quarterly Business Review (1 hour)

**Q1, Q2, Q3, Q4 (same month as monthly check)**

- [ ] **Quarterly Metrics Review**
  - [ ] Compare to last quarter
  - [ ] Identify trends
  - [ ] Update annual forecast

- [ ] **ROI Deep Dive**
  - [ ] Calculate quarterly ROI
  - [ ] Compare to targets
  - [ ] Update business case

- [ ] **Compliance Audit**
  - [ ] Export full quarter evidence pack
  - [ ] Share with audit team
  - [ ] Resolve any gaps

- [ ] **Team Feedback**
  - [ ] Get feedback from team on policies
  - [ ] Ask what's working / what's not
  - [ ] Plan feature requests

- [ ] **Next Quarter Planning**
  - [ ] Set targets for next quarter
  - [ ] Identify new use cases
  - [ ] Plan team growth

---

## KPI Targets by Company Size

### Small Business (1-10 employees)

| Metric | Q1 | Q2 | Q3 | Q4 |
|--------|----|----|----|----|
| Policies Active | 3 | 5 | 7 | 10 |
| Approval Time | 6 hours | 4 hours | 2 hours | <1 hour |
| Fraud Caught | 0 | 1 | 2 | 3 |
| ROI | -$500 | $5,000 | $15,000 | $30,000 |

### Mid-Market (10-100 employees)

| Metric | Q1 | Q2 | Q3 | Q4 |
|--------|----|----|----|----|
| Policies Active | 8 | 15 | 25 | 35 |
| Decisions/Month | 500 | 1500 | 3000 | 5000 |
| Approval Time | 4 hours | 2 hours | 1 hour | <30 min |
| Fraud Caught | 5 | 12 | 20 | 30 |
| ROI | $50,000 | $150,000 | $300,000 | $500,000 |

### Enterprise (100+ employees)

| Metric | Q1 | Q2 | Q3 | Q4 |
|--------|----|----|----|----|
| Policies Active | 50+ | 75+ | 100+ | 150+ |
| Decisions/Month | 50,000+ | 100,000+ | 150,000+ | 200,000+ |
| Approval Time | <30 min | <15 min | <5 min | Real-time |
| Fraud Caught | 100+ | 250+ | 400+ | 600+ |
| ROI | $500,000+ | $1.5M+ | $3M+ | $5M+ |

---

## Support for ROI Planning

**Need help calculating your ROI?**
- Email: hello@dsg.one
- Subject: "ROI Calculation Help"
- Include: Your transaction volume, approval team size, current fraud rate

**Want a personalized ROI model?**
- Schedule a 30-minute call: https://calendly.com/dsg-onboarding
- We'll model your specific business and show potential savings

---

## Next Steps

1. ✓ Complete this guide
2. Access your metrics dashboard (link above)
3. Record your baseline costs (before DSG)
4. Calculate your Month 1 ROI
5. Schedule monthly 15-minute review
6. Set team targets for next quarter
7. Plan quarterly business reviews

You now have the tools to measure DSG's impact on your business.

Let's show the CFO what governance is worth.

— The DSG Team
