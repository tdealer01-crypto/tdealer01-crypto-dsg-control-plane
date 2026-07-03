# Stripe Products Roadmap for DSG ONE

## 📋 Product Matrix

### Tier 1: Core (Currently Active ✅)
Directly supporting revenue and billing operations.

| Product | Status | Implementation | Cost Impact | Notes |
|---------|--------|-----------------|-------------|-------|
| **Payments** | ✅ Live | Checkout Sessions | -70% with Startups credit | Main revenue stream |
| **Billing** | ✅ Live | Subscriptions + Metered | -70% with Startups credit | Plans & skills bundles |
| **Connect** | ✅ Live | OAuth + Payouts | Reduced with credit | Marketplace/agent payouts |
| **Webhooks** | ✅ Live | Event handlers | Free | Revenue tracking |

### Tier 2: Security & Compliance (Low-hanging fruit 🎯)
Easy to add, high compliance value, zero-cost with startup credit.

| Product | Status | Benefit | Implementation | Timeline |
|---------|--------|---------|-----------------|----------|
| **Radar** | 🔲 Ready | Fraud prevention | Add to Checkout Sessions | 1-2 days |
| **Identity** | 🔲 Ready | KYC/AML verification | API endpoint + webhook | 3-5 days |
| **Tax** | 🔲 Ready | Tax automation | Sync with Billing | 1-2 days |

#### How to Add Radar:
```typescript
// In checkout session creation:
const session = await stripe.checkout.sessions.create({
  // ... existing config
  enable_radar: true,  // 1-line change
  metadata: { fraud_score: true },
});
```

#### How to Add Identity:
```typescript
// New route: POST /api/stripe/identity/verify
const verificationSession = await stripe.identity.verificationSessions.create({
  type: 'id_number',
  metadata: { org_id: profile.org_id },
});

// Return session.url to user
```

#### How to Add Tax:
```typescript
// In checkout session creation:
const session = await stripe.checkout.sessions.create({
  // ... existing config
  enable_tax_calculation: true,  // 1-line change
});
```

---

### Tier 3: Advanced Monetization (Optional extensions 💡)

| Product | Use Case | Startup Credit | Recommended |
|---------|----------|---|-----------|
| **Issuing** | Virtual/physical cards for agents | ✅ Covered | For marketplace payout cards |
| **Terminal** | In-person DSG events/hardware | ✅ Covered | Future (events, physical retail) |
| **Treasury** | Financial accounts, fund holding | ✅ Covered | Marketplace settlement |
| **Eps** | Bank transfers (SEPA, ACH) | ✅ Covered | International payouts |
| **Finch** | Bank account aggregation | ✅ Covered | Business analytics |

---

## 🎯 Quick Win Opportunities

### Week 1: Activate & Monitor
```
[ ] Activate Stripe Startups credit in Dashboard
[ ] Configure email notifications for credit balance
[ ] Add credit tracking to monitoring dashboard
[ ] Document activation in internal wiki
```

### Week 2-3: Add Radar + Tax (Zero effort, high impact)
```
[ ] Review Radar pricing ($0.01-0.05/txn normally)
[ ] Update Checkout Session creation (1-line change)
[ ] Add tax calculation to Billing (1-line change)
[ ] Test with sandbox transactions
[ ] Monitor fraud score in webhook events
```

### Week 4: Add Identity Verification (KYC)
```
[ ] Create identity verification API route
[ ] Add verification UI component
[ ] Connect to agent onboarding flow
[ ] Test with demo agents
[ ] Document verification requirements
```

---

## 💰 ROI Calculation

### Current Setup (without Startups credit):
```
Monthly Transactions: 1,000
Average Transaction: $50
Fee Rate: 2.9% + $0.30
Monthly Fee: (1,000 × $50 × 0.029) + (1,000 × $0.30) = $1,450 + $300 = $1,750
```

### With Startups Credit (70% discount):
```
Base Monthly Fee: $1,750
Startup Discount: -70% = -$1,225
Actual Monthly Fee: $525
Monthly Savings: $1,225

Annual Savings: $1,225 × 12 = $14,700
```

### Adding Free Security (Radar + Tax + Identity):
```
Normally costs: $0.02-0.03 per transaction
With credit: Free (cost absorbed by startup credit)
Value added: $1,000-1,500+ per year
```

---

## 🔄 Integration Checklist

### Payments (Already done ✅)
- [x] Checkout Sessions
- [x] Customer management
- [x] Subscription tracking
- [x] Webhook handlers
- [x] Revenue dashboard

### Next: Radar
- [ ] Enable in checkout session
- [ ] Monitor fraud scores
- [ ] Set up rules/blocking
- [ ] Dashboard visualization

### Next: Tax
- [ ] Enable tax calculation
- [ ] Configure tax rates
- [ ] Sync with invoicing
- [ ] Compliance reporting

### Next: Identity
- [ ] Create verification endpoint
- [ ] Add to onboarding flow
- [ ] Store verification status
- [ ] Automate approval

---

## 📊 Metrics to Track

```sql
-- Add to monitoring:
SELECT 
  COUNT(*) as total_transactions,
  SUM(amount) as total_volume,
  AVG(fraud_risk_score) as avg_fraud_score,
  COUNT(CASE WHEN verified = true THEN 1 END) as verified_users,
  SUM(tax_amount) as tax_collected
FROM billing_events
WHERE created_at > NOW() - INTERVAL '30 days';
```

---

## 🎁 Bonus: Free Stripe Features (No startup credit required)

| Feature | Benefit | How to Use |
|---------|---------|-----------|
| **API Reference** | Official docs | stripe.com/docs |
| **Stripe CLI** | Local testing | `brew install stripe/stripe-cli/stripe` |
| **Test mode** | Sandbox transactions | Use key_test_* keys |
| **Webhooks** | Event listeners | Built-in to system |
| **Dashboard reports** | Analytics | Live in Stripe Dashboard |
| **Radar Rules** | Custom blocking logic | Dashboard: Radar → Rules |
| **SVG libraries** | Payment UI components | stripe.com/blog/open-source |

---

## 🚀 Implementation Priority

```
Priority 1 (This week):
  ✅ Activate Stripe Startups credit
  ✅ Monitor dashboard for credit balance
  ✅ Document benefits

Priority 2 (Next 2 weeks):
  🔄 Add Radar fraud detection (1-2 lines)
  🔄 Add Tax calculation (1-2 lines)
  🔄 Test & monitor

Priority 3 (Following month):
  📋 Add Identity verification (API + UI)
  📋 Integrate with onboarding
  📋 Compliance automation

Priority 4 (Future):
  💡 Issuing for agent cards
  💡 Terminal for events
  💡 Treasury for settlement
```

---

**Last Updated:** 2026-06-29  
**Status:** Planning Phase  
**Owner:** DSG Billing Team
