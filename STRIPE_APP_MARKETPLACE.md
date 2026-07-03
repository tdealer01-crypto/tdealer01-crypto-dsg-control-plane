# DSG Control Plane — Stripe App Marketplace

AI governance platform with built-in Stripe billing for regulated workflows.

Live: https://tdealer01-crypto-dsg-control-plane.vercel.app

---

## App Overview

**DSG Control Plane** integrates directly with Stripe to provide automated revenue tracking, subscription management, and quota-based usage billing for AI governance operations.

---

## Features for Stripe Merchants

### 📊 Automated Revenue Event Tracking
- Every subscription action captured as a Stripe revenue event
- `customer.subscription.created`, `updated`, `deleted` all handled
- Per-event logging to Supabase for audit trail
- Real-time webhook processing with retry on failure

### 🔄 Subscription Management for Tiers
- Free → Pro ($49/mo) → Business ($199/mo) → Enterprise (custom)
- Automatic tier upgrades and downgrades
- Per-org subscription isolation
- Proration handled by Stripe Billing

### 📈 Quota-Based Usage Billing
- DSG Gate evaluations metered per org
- Delivery Proof scans metered individually
- Usage reported to Stripe Meter Events API
- Overage notifications before hard limits

### 📉 Real-Time KPI Dashboards
- MRR, ARR, churn rate visible in `/dashboard/revenue`
- Per-tier conversion metrics
- Trial-to-paid conversion funnel
- Revenue event timeline

### 🔔 Webhook Event Logging
- All Stripe events logged to `revenue_events` table
- Indexed by org, event type, and timestamp
- Replay capability for failed webhook deliveries
- Audit trail for every billing state change

### 🛡️ Churn Prevention Analytics
- Trial expiry alerts
- Failed payment retry notifications
- Downgrade intent signals
- Customer health scoring

---

## Integration Benefits

### ✅ No Additional Payment Processing Setup
- DSG Control Plane connects to your existing Stripe account
- No separate payment gateway configuration
- Uses your existing Stripe API keys

### ✅ Automatic Stripe Webhook Handling
- Webhook endpoint auto-created at `/api/webhooks/stripe`
- All billing events handled server-side
- Idempotent processing — no duplicate charges
- `STRIPE_WEBHOOK_SECRET` verification enforced

### ✅ Real-Time Revenue Metrics
- Live MRR calculation from active subscriptions
- Event-driven updates — no polling required
- Dashboard reflects Stripe state within seconds of webhook delivery

### ✅ Per-Org Billing Isolation
- Each organization has its own Stripe customer record
- No cross-org billing contamination
- RLS enforced at database level
- Billing disputes isolated per org

### ✅ Fraud Prevention Built-In
- Stripe Radar integration via default checkout settings
- Finance Governance gate blocks suspicious payment patterns
- Approval workflow required for high-value operations
- Audit trail for every financial action

---

## Installation

### Step 1: Connect Your Stripe Account

1. Navigate to your DSG Control Plane instance
2. Go to **Dashboard → Settings → Billing**
3. Click **"Connect Stripe Account"**
4. Complete Stripe OAuth flow
5. DSG Control Plane receives access to your Stripe account

### Step 2: Auto-Configure Webhooks

After connecting:

1. DSG Control Plane registers a webhook endpoint in Stripe:
   ```
   https://<your-deployment>/api/webhooks/stripe
   ```
2. The following events are subscribed automatically:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `checkout.session.completed`
   - `customer.created`
   - `customer.updated`
3. `STRIPE_WEBHOOK_SECRET` is saved to your deployment environment

### Step 3: Live Event Tracking Immediately

Once webhooks are configured:

- Revenue events appear in `/dashboard/revenue` within seconds
- Subscription state reflects real Stripe customer data
- Quota tracking starts counting from first event
- Billing KPIs update in real time

---

## API Endpoints

| Endpoint | Description | Auth |
|----------|-------------|------|
| `POST /api/webhooks/stripe` | Receive Stripe webhook events | Stripe signature |
| `GET /api/revenue/events` | List revenue events | Dashboard user or internal-service |
| `POST /api/revenue/events` | Record revenue event | Internal-service |
| `GET /api/usage/kpis` | Billing KPI metrics | Dashboard user |
| `GET /api/quotas/usage` | Quota usage per org | Authenticated user |
| `GET /api/delivery-proof/pricing` | Delivery Proof pricing tiers | Public |
| `GET /api/dsg/v1/pricing` | DSG Gate pricing tiers | Public |

---

## Supported Stripe Products

| Stripe Product | Usage in DSG Control Plane |
|----------------|---------------------------|
| Stripe Checkout | Self-serve tier upgrades (Pro, Business) |
| Stripe Billing / Subscriptions | Monthly subscription management |
| Stripe Webhooks | Real-time event processing |
| Stripe Meter Events | Usage-based quota billing |
| Stripe Radar | Fraud prevention on checkout |

---

## Environment Variables Required

| Variable | Description |
|----------|-------------|
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_live_...`) |
| `STRIPE_WEBHOOK_SECRET` | Webhook endpoint signing secret (`whsec_...`) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Publishable key for client-side checkout |

---

## Data Handling

- No Stripe secret keys stored in browser or client state
- Webhook payloads validated with `stripe-signature` header before processing
- Revenue event data stored in Supabase with RLS per org
- Stripe customer IDs stored, not raw card data
- PCI compliance handled entirely by Stripe

---

## Support

- **Documentation**: [MARKETPLACE.md](./MARKETPLACE.md)
- **Issues**: [GitHub Issues](https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane/issues)
- **Discussions**: [GitHub Discussions](https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane/discussions)
- **Stripe Partner page**: (add when published)
