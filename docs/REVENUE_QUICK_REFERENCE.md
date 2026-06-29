# Revenue Channels — Quick Reference

**One-page summary of all revenue opportunities for DSG Control Plane.**

---

## 🟢 Active Channels (Live Now)

### 1. Subscription Tiers
```
Pro       $99/mo   →  10K executions, 10 agents
Business  $299/mo  →  100K executions, 50 agents  
Enterprise $799/mo →  1M executions, unlimited agents
```
📍 **Location:** `app/dashboard/billing/page.tsx`  
✅ **Status:** Live with Stripe checkout

---

### 2. Skills Bundles (Add-ons)
```
Finance       +$199/mo   →  Payment gates, billing controls
Dev           +$99/mo    →  CI/CD gates, deployments
Compliance    +$249/mo   →  ISO/NIST compliance, audit trails
Operations    +$149/mo   →  Team mgmt, webhooks, monitoring
Enterprise    +$599/mo   →  All features + implementation
```
📍 **Location:** `app/api/billing/checkout/route.ts` (SKILLS_BUNDLE_CONFIG)  
✅ **Status:** Ready to sell

---

### 3. Usage-Based Overages
```
Per execution overage pricing (configurable)
Tracked via: Supabase meter tables + billing outbox
```
📍 **Location:** `supabase/migrations/20260523000000_billing_meter_outbox.sql`  
🟡 **Status:** Infrastructure ready, pricing not yet configured

---

### 4. Stripe Connect
```
White-label Stripe integration for customers
```
📍 **Location:** `app/dashboard/stripe-app/connect/`  
🟡 **Status:** Infrastructure ready, not monetized

---

### 5. API Key Management
```
Granular scopes, rate limits, expiry
Premium: Unlimited keys, custom scopes
```
📍 **Location:** `/dashboard/api-keys` + `/api/api-keys/`  
✅ **Status:** Implemented, quota enforcement ready

---

## 🟡 Potential Channels (Not Yet Implemented)

| Channel | Price Point | Effort | Revenue Potential |
|---------|-------------|--------|-------------------|
| **Premium Support** | $2K-$10K/mo | Low | $$$$ |
| **Managed Agents** | $199-$5K/mo | Medium | $$$$ |
| **Policy Marketplace** | $99-$10K each | Medium | $$ |
| **Compliance Audits** | $3K-$15K each | Medium | $$$$ |
| **Advanced Analytics** | +$99-$499/mo | Low | $$ |
| **Webhook Premium** | +$99/mo | Low | $ |
| **Training & Certs** | $99-$2K each | Medium | $$ |
| **Custom Regions** | +$500-$5K/mo | High | $$$$ |

---

## 📊 Current Setup

### Checkout Flow
```
User → /api/billing/checkout (POST)
     → Stripe session → Webhook (/api/webhooks/stripe)
     → Database update → Success
```

### Metering System
```
Execution → Usage tracked → Meter outbox → Stripe invoice
```

### Rate Limiting
```
API key → Rate limit check → Quota enforcement → Execute
```

---

## 🚀 Quick Wins (Low effort, good revenue)

1. **Activate overage pricing** (5 min config change)
   - `OVERAGE_PRICE_PER_EXECUTION` in env vars
   - Enables infinite scaling revenue

2. **Launch Premium Support** (1 day)
   - Add pricing page + contact form
   - Route to sales team

3. **Webhook SLA Premium** (2 days)
   - Add retry/delivery tracking
   - +$99/mo for guaranteed delivery

4. **Advanced Analytics Dashboard** (1 week)
   - Expose usage metrics to users
   - +$99/mo upsell

5. **Compliance Report Export** (3 days)
   - Package CCVS evidence as PDF
   - +$499 per report or +$99/mo

---

## 💰 Revenue Projection

| Scenario | Year 1 | Notes |
|----------|--------|-------|
| Conservative | $239K | 100 Pro, 20 Business, 5 Enterprise |
| Growth | $1.2M | 500 Pro, 100 Business, 20 Enterprise + bundles |
| Enterprise | $2.3M+ | Above + services + compliance + managed agents |

---

## ✅ Implementation Priority

### Phase 1 (This week) 
- [ ] Activate overage pricing
- [ ] Add pricing page

### Phase 2 (Next month)
- [ ] Premium support tiers
- [ ] Webhook SLA feature

### Phase 3 (Q4)
- [ ] Compliance audit service
- [ ] Agent execution service
- [ ] Advanced analytics

### Phase 4 (2027)
- [ ] Policy marketplace
- [ ] Training/certification
- [ ] Multi-region deployment

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `app/api/billing/checkout/route.ts` | Stripe checkout + plan config |
| `app/dashboard/billing/page.tsx` | Customer billing UI |
| `lib/usage/quota.ts` | Usage tracking & limits |
| `app/pricing/` | Pricing pages |
| `docs/REVENUE_CHANNELS.md` | Full detailed guide |

---

## 🎯 Action Items

- [ ] Review revenue channels with business team
- [ ] Set overage pricing in env vars
- [ ] Launch first premium support offering
- [ ] Add advanced analytics dashboard
- [ ] Create compliance audit service partnership
- [ ] Monitor MRR in PostHog dashboard

---

**Status:** 🟢 Live with core tiers  
**Next Review:** Weekly revenue metrics check
