# GitHub Marketplace Pricing Tiers

## Tier Configuration for GitHub Marketplace Submission

All pricing is displayed and charged through GitHub Marketplace. Stripe integration is backend-only (users don't see it).

---

## Tier Structure

### Tier 1: Free
- **Monthly price:** $0
- **Unit model:** Flat (no per-unit charges)
- **Billing cycle:** N/A (free tier)
- **Free trial:** N/A
- **Description:** 
  ```
  Trial tier with 1 Delivery Proof scan/month, basic governance, 
  and 30-day audit trail history.
  ```

**Features:**
- ✅ 1 Delivery Proof scan per month
- ✅ Basic policy gate evaluation
- ✅ 30-day audit trail retention
- ✅ Community support (GitHub Discussions)
- ✅ Governance dashboard read-only access

---

### Tier 2: Pro ($49/month)
- **Monthly price:** $49.00 USD
- **Unit model:** Flat (no per-unit charges)
- **Billing cycle:** Monthly or Yearly
- **Free trial:** 14 days
- **Description:**
  ```
  Unlimited Delivery Proof scans + priority support. Ideal for dev teams 
  managing AI agent governance in production repositories.
  ```

**Features:**
- ✅ Unlimited Delivery Proof scans
- ✅ Unlimited policy gate evaluations
- ✅ 90-day audit trail retention
- ✅ Real-time Slack/email notifications
- ✅ Custom policy editor (basic)
- ✅ Priority email support (24h response)
- ✅ Up to 3 team members

**Price Breakdown:**
- Monthly: $49/month (charged monthly)
- Yearly: $490/year (2.5% savings vs monthly, if GitHub supports yearly)

---

### Tier 3: Business ($199/month)
- **Monthly price:** $199.00 USD
- **Unit model:** Flat (no per-unit charges)
- **Billing cycle:** Monthly or Yearly
- **Free trial:** 14 days
- **Description:**
  ```
  Unlimited scans + full governance features + compliance exports + SLA.
  For enterprises needing audit-ready evidence and advanced controls.
  ```

**Features:**
- ✅ Everything in Pro, plus:
- ✅ Compliance evidence export (EU AI Act, ISO 42001, NIST RMF)
- ✅ Automated compliance reporting
- ✅ Finance governance controls
- ✅ Advanced policy editor (custom rules)
- ✅ 1-year audit trail retention
- ✅ Webhook integrations (Zapier, Make.com)
- ✅ Up to 10 team members
- ✅ Phone support (business hours)
- ✅ 99.5% uptime SLA

**Price Breakdown:**
- Monthly: $199/month (charged monthly)
- Yearly: $1990/year (slightly discounted)

---

### Tier 4: Enterprise (Contact Sales)
- **Monthly price:** Contact for pricing
- **Unit model:** Custom (negotiated per customer)
- **Billing cycle:** Negotiated (monthly, annual, or multi-year)
- **Free trial:** Custom (typically 30 days)
- **Description:**
  ```
  Unlimited everything + dedicated support + SLA + custom integrations.
  For large enterprises with bespoke governance requirements.
  ```

**Features:**
- ✅ Everything in Business, plus:
- ✅ Dedicated account manager
- ✅ Custom integrations (GitHub Actions, CI/CD, custom APIs)
- ✅ On-premise / air-gapped deployment options
- ✅ Single Sign-On (SSO) via SAML 2.0
- ✅ 24/7 phone + email support
- ✅ 99.9% uptime SLA
- ✅ Custom compliance frameworks
- ✅ Unlimited team members
- ✅ Training + onboarding
- ✅ Quarterly business reviews

**Typical Pricing:** $500–5,000/month depending on:
- Organization size
- Usage volume (number of policy gates)
- Compliance requirements
- Integration complexity

---

## Pricing Strategy Notes

### Why This Pricing?

1. **Free Tier:** Entry point for individual developers, no commitment required
2. **Pro ($49/mo):** Targets dev teams (cost: ~$1/developer/month for a 50-person team)
3. **Business ($199/mo):** Enterprise compliance + support, justified by evidence export value
4. **Enterprise:** Negotiated contracts for large orgs with bespoke needs

### Competitive Positioning

| Product | Monthly | Target | Key Differentiator |
|---------|---------|--------|-------------------|
| **Vanta** (compliance) | $500–5000 | Enterprises | Cloud compliance, no AI governance |
| **Sonar** (observability) | $300+ | Enterprise dev | Post-execution logging only |
| **DSG (ours)** | $49–199 | Dev + Enterprise | **Pre-execution governance + compliance proof** |

### Revenue Model

**Projected Monthly Recurring Revenue (MRR):**

| Segment | Users | Avg Price | Monthly MRR |
|---------|-------|-----------|------------|
| **Free** | 100 | $0 | $0 |
| **Pro** | 50 | $49 | $2,450 |
| **Business** | 20 | $199 | $3,980 |
| **Enterprise** | 3 | $2,000 avg | $6,000 |
| **Total (Month 3)** | 173 | — | **$12,430/month** |

**12-Month Projection:** $50K–150K ARR (conservative; assumes 10–30% adoption from GitHub Marketplace traffic)

---

## GitHub Marketplace Submission Instructions

When submitting to GitHub Marketplace (`https://github.com/marketplace/new`):

### Step 1: Select Pricing Model
- [ ] Choose: **"Flat-rate pricing"** (not per-unit/metered for main tiers)
- [ ] Note: GitHub Marketplace doesn't support freemium directly; we'll handle free tier via our app

### Step 2: Add Pricing Plans
For each paid tier, click **"Add plan"**:

#### Plan 1: Pro
- **Name:** `Pro`
- **Price (USD):** `49.00`
- **Unit:** per month
- **Pricing model:** Flat
- **Free trial:** 14 days
- **Description:** `Unlimited Delivery Proof scans + priority support`
- **Features:**
  - Unlimited policy gate evaluations
  - Priority support (24h response)
  - Real-time notifications

#### Plan 2: Business
- **Name:** `Business`
- **Price (USD):** `199.00`
- **Unit:** per month
- **Pricing model:** Flat
- **Free trial:** 14 days
- **Description:** `Unlimited scans + compliance export + SLA`
- **Features:**
  - Compliance evidence export (GDPR, ISO, NIST)
  - Advanced policy editor
  - Phone support
  - 99.5% uptime SLA

#### Plan 3: Enterprise (Contact Sales)
- **Name:** `Enterprise`
- **Price:** Leave blank or mark as "Contact for pricing"
- **Description:** `Custom pricing for large enterprises`
- **Features:**
  - Dedicated account manager
  - Custom integrations
  - On-premise options
  - 24/7 support

### Step 3: Free Tier (Handled by Our App)
- GitHub Marketplace doesn't offer a "free" tier option
- **Solution:** All users start with Free tier automatically in our app (`organizations.plan = 'free'`)
- Users can upgrade to Pro/Business through the Marketplace
- No GitHub billing for free tier users (we track internally)

---

## Metered Billing (Future Enhancement)

GitHub Marketplace supports **metered billing** for usage-based charges:

```
Example: $0.01 per policy gate evaluation beyond included limit
```

**Currently:** Not implemented (flat-rate only)

**Future Implementation:**
1. Pro tier: 10,000 gates/month included
2. Business tier: Unlimited
3. Overages: $0.001–0.01 per gate

---

## Sync Between Stripe and GitHub Marketplace

**Current Architecture:**

```
GitHub Marketplace (user-facing)
         ↓
   Webhook: /api/webhooks/marketplace
         ↓
   marketplace_events table (logged)
         ↓
   syncMarketplaceSubscription()
         ↓
   billing_subscriptions table (Stripe record)
         ↓
   organizations.plan (Pro/Business/Free)
```

**Why this approach:**
- GitHub Marketplace handles billing (users see charges on GitHub bill)
- We log events for audit trail + replay
- Stripe doesn't receive transactions from GitHub; we track subscription state
- If a user cancels on GitHub, our webhook updates their `organizations.plan` to `free`

---

## Cancellation & Refund Policy

- **Cancellation:** Immediate (on GitHub's side; we honor same day)
- **Refund:** Follow GitHub Marketplace refund policy (GitHub handles)
- **Data retention:** 30 days after cancellation (can reactivate if user reinstalls)
- **Grace period:** None (cancellation takes effect immediately)

---

## FAQ

**Q: Can users pay annually?**
A: GitHub Marketplace supports yearly billing. Recommend 20% discount for annual (e.g., Pro: $49/mo → $470/year)

**Q: What if GitHub Marketplace review rejects our pricing?**
A: GitHub typically accepts any pricing model. If rejected, they'll specify reason. Most common: pricing mismatch with product value or misleading claims.

**Q: How do we handle free trial?**
A: GitHub Marketplace automatically grants trial. Users enter credit card, trial period runs, then charges begin. We sync this via webhook.

**Q: Can we change pricing after launch?**
A: Yes, but affects only new customers. Existing subscribers keep old price until renewal.

---

## Checklist for Marketplace Submission

- [ ] Free tier handled in app (automatic for new users)
- [ ] Pro tier: $49/month, 14-day trial
- [ ] Business tier: $199/month, 14-day trial
- [ ] Enterprise: Custom pricing noted in listing
- [ ] Feature descriptions match capability
- [ ] Pricing communicated clearly to customers
- [ ] Webhook handler ready to process GitHub events
- [ ] Billing_subscriptions table tracking state
- [ ] Support team trained on pricing tiers
