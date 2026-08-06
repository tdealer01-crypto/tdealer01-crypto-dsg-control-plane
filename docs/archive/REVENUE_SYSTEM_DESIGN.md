# DSG ONE Revenue System: Complete Design & Implementation Roadmap

**Status:** Evidence-ready ✓ | Live transactions: Pending | Revenue automation: Phase 1+2 design

---

## Executive Summary

DSG ONE has **foundational billing infrastructure** (Stripe integration, Supabase schema, pricing catalog) but lacks **end-to-end revenue automation**. This document designs a complete revenue system that:

1. ✅ Accepts payments via Stripe checkout
2. ✅ Tracks usage via metered billing
3. ✅ Logs revenue events in DB
4. ⏳ Delivers revenue reports to customers automatically
5. ⏳ Reconciles billing across channels (Stripe ↔ DB ↔ PostHog)

---

## Part 1: Current Revenue Architecture

### 1.1 Pricing Models

| Plan | Monthly | Annual | Trial | Target |
|------|---------|--------|-------|--------|
| **Pro** | $99 | $1,088/yr | 14 days | Developers |
| **Business** | $199 | $2,188/yr | 14 days | Teams |
| **Enterprise** | $499 | $5,488/yr | 30 days | Enterprises |
| **Delivery Proof** | $0 (free) / $49 (pro scan) / $199 (unlimited) | One-time or included | — | All plans |
| **Skills Bundles** | $9–$59 | $89–$539 | — | Add-ons |

**Source:** `/lib/billing/pricing-catalog.ts` + `GATE_PLANS`

### 1.2 Existing API Routes (✅ All Implemented)

| Route | Method | Purpose | Status |
|-------|--------|---------|--------|
| `/api/billing/checkout` | POST | Stripe Checkout Session creation (subscriptions + skills bundles) | ✅ Implemented |
| `/api/billing/webhook` | POST | **Canonical** Stripe webhook handler (signature-verified, idempotent) | ✅ Implemented |
| `/api/billing/portal` | POST | Stripe customer portal session (self-service) | ✅ Implemented |
| `/api/billing/meter-health` | GET | Meter outbox health dashboard (delivery rate, dead letters, per-org stats) | ✅ Implemented |
| `/api/revenue/events` | POST | Record revenue event (internal service auth) | ✅ Implemented |
| `/api/revenue/events` | GET | List org revenue events (dashboard auth) | ✅ Implemented |
| `/api/revenue/[action]` | POST | Multi-action revenue dashboard (checkout, analytics, events, simulate) | ✅ Implemented |
| `/api/cron/billing-sync` | POST | Batch sync pending usage to Stripe metering (every 5 min) | ✅ Implemented |
| `/api/cron/flush-meter-outbox` | POST | Retry pending/failed meter outbox rows (idempotent) | ✅ Implemented |
| `/api/cron/reconcile-meter` | POST | Reconcile local outbox vs Stripe meter summaries | ✅ Implemented |
| `/api/marketplace/checkout` | POST | Stripe payment for marketplace templates | ✅ Implemented |
| `/api/marketplace/seller-checkout` | POST | Seller checkout flow | ✅ Implemented |
| `/api/stripe-app/oauth/{authorize,callback}` | GET/POST | OAuth for Stripe Connect app | ✅ Implemented |

### 1.3 Database Schema (Current)

```sql
billing_customers (stripe_customer_id PK)
  ├─ stripe_customer_id (PK)
  ├─ org_id
  ├─ email
  ├─ name
  └─ metadata

billing_subscriptions (stripe_subscription_id PK)
  ├─ stripe_subscription_id (PK)
  ├─ stripe_customer_id (FK)
  ├─ org_id
  ├─ status (active|trialing|past_due|canceled|paused)
  ├─ plan_key (pro|business|enterprise)
  ├─ billing_interval (monthly|yearly)
  ├─ price_id
  ├─ product_id
  ├─ current_period_start/end
  ├─ trial_start/end
  └─ metadata (JSONB)

billing_events (stripe_event_id PK)
  ├─ stripe_event_id (PK)
  ├─ event_type (customer.created|subscription.created|payment_intent.succeeded|invoice.payment_succeeded)
  ├─ stripe_customer_id
  ├─ stripe_subscription_id
  ├─ payload (full Stripe event JSONB)
  └─ processed_at

billing_meter_outbox (id PK) — Transactional Outbox Pattern
  ├─ id (UUID)
  ├─ execution_id (idempotency key)
  ├─ org_id
  ├─ stripe_customer_id
  ├─ event_name (dsg_execution)
  ├─ quantity
  ├─ status (pending|sent|failed)
  ├─ stripe_event_id
  └─ flushed_at

revenue_events (id PK)
  ├─ id (UUID)
  ├─ org_id
  ├─ event_type (execution|signup|upgrade|refund|support)
  ├─ amount (numeric)
  ├─ currency (USD)
  ├─ source (stripe|platform|manual)
  ├─ metadata (JSONB)
  └─ created_at
```

### 1.4 Libraries & Helpers (Complete Toolset)

| Module | File | Key Functions | Status |
|--------|------|---|--------|
| **Pricing** | `lib/billing/pricing-catalog.ts` | `GATE_PLANS`, `getPriceId()`, `SKILLS_BUNDLES`, `DELIVERY_PROOF_PRICING` | ✅ Complete |
| **Metering** | `lib/billing/metered.ts` (342 lines) | `reportMeterEvent()`, `flushMeterOutbox()`, `meterExecution()`, `isMeteredBillingConfigured()` | ✅ Complete |
| **Revenue Events** | `lib/revenue/events.ts` | `insertRevenueEvent()`, `listRevenueEvents()` (with dedup on stripe_event_id) | ✅ Complete |
| **Quotas** | `lib/billing/quota-policy.ts` | `checkQuota()`, `incrementQuota()` via RPC | ✅ Complete |
| **Quotas (Advanced)** | `lib/usage/quota.ts` | `getUserQuotaTier()`, `getQuotaUsage()`, `isQuotaExhausted()`, `logQuotaConsumption()` | ✅ Complete |
| **Entitlements** | `lib/billing/entitlements.ts` | `getQuotaForPlan()`, `effectivePlan()`, status enums (ACTIVE, REVOKED) | ✅ Complete |
| **Fulfillment** | `lib/billing/fulfillment.ts` | `fulfillSubscription()` (idempotent on checkout/subscription events), `revokeSubscription()` | ✅ Complete |
| **Reconciliation** | `lib/billing/reconciliation.ts` (150+ lines) | `reconcileMeterOutbox()`, `getOrgBillingStats()`, reconciliation statuses | ✅ Complete |
| **Overage Config** | `lib/billing/overage-config.ts` | `INCLUDED_EXECUTIONS` per plan, `getOverageRateUsd()` | ✅ Complete |
| **Seats** | `lib/billing/seat-activation.ts` | Seat-based entitlements | ✅ Complete |
| **Email** | `lib/email/sales.ts` | `sendTrialWelcome()`, `sendUpgradeSuccess()` (called by webhook) | ✅ Complete |
| **Database Quotas** | `lib/database/quotas.ts` | Quota tier retrieval and usage aggregation | ✅ Complete |

---

## Part 2: Revenue Flows (Current State)

### 2.1 Subscription Checkout Flow ✅

```
Customer → Stripe Checkout
           ↓ (session.completed webhook)
        Record billing_events row
           ↓
        Extract customer email & org_id
           ↓
        Create/update billing_customers
           ↓
        Create billing_subscriptions row
           ↓
        Trigger /api/revenue/events (internal POST)
           ↓
        Insert revenue_events row
           ↓
        PostHog event capture (order_completed)
           ↓
        Log to Google Sheets (Zapier)
           ↓
        Send order confirmation email (Gmail via Zapier)
           ↓
        Notify team on Slack
```

**Missing:** Webhook endpoint to receive `customer.subscription.created`, `payment_intent.succeeded`.

### 2.2 Usage-Based Metering ✅

```
Execution completes
  ↓
meterExecution(orgId, quantity, executionId)
  ↓
Check if org has Stripe customer
  ↓
If yes:
  ├─ Create outbox row (billing_meter_outbox)
  ├─ reportMeterEvent() → Stripe Meter API
  ├─ Mark outbox status=sent
  └─ Retry via /api/cron/billing-sync (every 5 min)
  ↓
Stripe accumulates meter events → invoice at period end
```

**Status:** Ready to use if `STRIPE_METER_EVENT_NAME` + `STRIPE_SECRET_KEY` configured.

### 2.3 Revenue Event Tracking ✅

```
Internal service (or cron) calls:
  POST /api/revenue/events
  {
    orgId: "org_xxx",
    eventType: "execution" | "subscription.upgraded" | "refund",
    source: "stripe" | "platform",
    amount: 99.00,
    metadata: { stripe_event_id: "evt_...", ... }
  }
  ↓
insertRevenueEvent() writes to revenue_events table
  ↓
Dashboard can query: GET /api/revenue/events?limit=50
  ↓
PostHog queries for analytics/revenue tracking
```

**Status:** Ready; needs integration into execution flow.

---

## Part 3: Missing Pieces (Critical Path)

**Status Update:** From agent audit — **Webhook handler ALREADY EXISTS** at `/app/api/billing/webhook/route.ts` ✅

### 3.1 Webhook Integration Status (Priority 1)

**File:** `/app/api/billing/webhook/route.ts` (✅ EXISTS and is CANONICAL)

**Events to handle:**
- `customer.created` → Create billing_customers row
- `customer.subscription.created` → Create billing_subscriptions row + revenue event
- `customer.subscription.updated` → Update status/plan/metadata
- `customer.subscription.deleted` → Mark cancelled
- `payment_intent.succeeded` → Record payment in revenue_events
- `invoice.payment_succeeded` → Reconcile payment with DB
- `charge.refunded` → Log refund event + update subscription status

**Implementation:**

```typescript
// app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { handleStripeEvent } from '@/lib/billing/webhook-handler';

export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!signature || !secret) {
    return NextResponse.json({ error: 'missing_auth' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = Stripe.webhooks.constructEvent(
      await request.text(),
      signature,
      secret
    );
  } catch {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 });
  }

  const result = await handleStripeEvent(event);
  return NextResponse.json(result, { status: 200 });
}
```

**New file:** `/lib/billing/webhook-handler.ts`
- Route events to handlers
- Implement idempotency via event deduplication
- Log to revenue_events
- Trigger PostHog event capture

---

### 3.2 Delivery Proof Report Generation (Priority 1)

**File:** `/app/api/webhooks/delivery-proof/generate/route.ts` (does not exist)

**Trigger:** After successful checkout (Zapier webhook or manual)

**Implementation:**
```typescript
// Phase 2 of Zapier automation (currently manual)
POST /api/webhooks/delivery-proof/generate
{
  orderId: "...",
  customerId: "cus_...",
  orgId: "org_...",
  productName: "Pro Plan",
  amount: 99.00
}
  ↓
1. Verify order exists in revenue_events
2. Call Claude API → generate Delivery Proof Report (HTML + JSON)
3. Store report in signed Google Drive folder / Vercel blob storage
4. Update revenue_events metadata with report_url
5. Send email to customer: "Your report is ready → [link]"
6. PostHog event: report_delivered
```

---

### 3.3 Billing Reconciliation Cron (Priority 2)

**File:** `/app/api/cron/billing-reconcile/route.ts` (does not exist)

**Daily task:**
```
1. Query billing_subscriptions for all active
2. For each: Call Stripe API get subscription(id)
3. Compare: DB status ↔ Stripe status
4. If mismatch:
   - Log warning to audit table
   - Auto-correct if safe (e.g., Stripe says "active" but DB says "trialing")
   - Alert team if high-risk (e.g., Stripe says "canceled" but DB says "active")
5. Report discrepancies to PostHog (billing_drift event)
```

---

### 3.4 Subscription Upgrade/Downgrade Flow (Priority 2)

**File:** `/app/api/billing/update-subscription/route.ts` (does not exist)

**Endpoint for dashboard:**
```typescript
POST /api/billing/update-subscription
{
  stripeSubscriptionId: "sub_...",
  newPlanKey: "business" | "enterprise",
  billingInterval: "monthly" | "yearly"
}
  ↓
1. Call Stripe API: subscription update
2. Extract new amount
3. Log upgrade event to revenue_events
4. PostHog: subscription_upgraded
5. Send confirmation email
```

---

### 3.5 Refund/Cancellation Flow (Priority 3)

**File:** `/app/api/billing/cancel-subscription/route.ts` (does not exist)

**Endpoint:**
```typescript
POST /api/billing/cancel-subscription
{
  stripeSubscriptionId: "sub_...",
  immediate: boolean
}
  ↓
1. Call Stripe: update subscription (cancel_at_period_end or delete)
2. Log to revenue_events (refund type)
3. PostHog: subscription_canceled
4. Update billing_subscriptions status
5. Optional: Auto-refund if within 7 days
```

---

### 3.6 Revenue Dashboard Widget (Priority 3)

**Endpoint:** `/api/dashboard/revenue-summary`

**Returns:**
```json
{
  "mrrNow": 5420.00,
  "mrrTrend": "+$1200 vs last month",
  "activeSubscriptions": 45,
  "activeTrials": 12,
  "churn": 2,
  "upcomingInvoices": 18,
  "topPlans": {
    "pro": 20,
    "business": 15,
    "enterprise": 8,
    "free": 2
  },
  "eventsThisMonth": [
    { date: "2026-07-15", signups: 3, upgrades: 1, refunds: 0 }
  ]
}
```

---

## Part 4: Implementation Roadmap

### Phase 1: Foundations (Week 1–2)

- [x] Pricing catalog defined
- [ ] Stripe Webhook Handler (`/lib/billing/webhook-handler.ts`)
- [ ] Webhook endpoint (`/app/api/webhooks/stripe/route.ts`)
- [ ] Revenue event logging integrated into execution
- [ ] Test suite: webhook → DB flow
- [ ] Manual test: Create test subscription in Stripe, verify DB row created

### Phase 2: Automation (Week 2–3)

- [ ] Billing sync cron every 5 min (VERIFY existing `/app/api/cron/billing-sync`)
- [ ] Meter event outbox retry (`flushMeterOutbox`)
- [ ] PostHog event capture for revenue events
- [ ] Reconciliation cron daily
- [ ] Alert on billing drift

### Phase 3: Revenue Reporting (Week 3–4)

- [ ] Delivery Proof report generation (`/api/webhooks/delivery-proof/generate`)
- [ ] Email templates (confirmation, report delivery, renewal notice)
- [ ] Dashboard widget: revenue summary
- [ ] Revenue → Google Sheets sync (if Zapier doesn't cover)

### Phase 4: Monetization (Week 4–5)

- [ ] Upgrade/downgrade flow
- [ ] Proration logic (charge/credit for mid-month changes)
- [ ] Refund flow with 7-day grace period
- [ ] Entitlement enforcement (quota blocking per plan)
- [ ] License provisioning per org/plan

### Phase 5: Scaling & Hardening (Week 5–6)

- [ ] Volume testing: 100+ concurrent checkouts
- [ ] Failure scenario: Stripe → DB sync loss (retry logic)
- [ ] PCI compliance check
- [ ] Security audit: no secrets in logs/errors
- [ ] GDPR compliance: deletion workflow

---

## Part 5: Data Models & Examples

### Webhook Event Handler

```typescript
// lib/billing/webhook-handler.ts
import Stripe from 'stripe';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { insertRevenueEvent } from '@/lib/revenue/events';

export async function handleStripeEvent(event: Stripe.Event) {
  const supabase = getSupabaseAdmin();
  
  // Deduplication: Check if event already processed
  const existing = await (supabase as any)
    .from('billing_events')
    .select('id')
    .eq('stripe_event_id', event.id)
    .maybeSingle();
  
  if (existing?.data) {
    return { ok: true, idempotent: true, eventId: event.id };
  }

  switch (event.type) {
    case 'customer.subscription.created':
      return await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
    case 'payment_intent.succeeded':
      return await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
    case 'invoice.payment_succeeded':
      return await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
    default:
      return { ok: true, ignored: true };
  }
}

async function handleSubscriptionCreated(sub: Stripe.Subscription) {
  const supabase = getSupabaseAdmin();
  
  // Extract org_id from metadata or subscription
  const orgId = sub.metadata?.['org_id'] || 'unknown';
  
  // Create subscription row
  const { error } = await (supabase as any)
    .from('billing_subscriptions')
    .insert({
      stripe_subscription_id: sub.id,
      stripe_customer_id: sub.customer,
      org_id: orgId,
      status: sub.status,
      plan_key: sub.metadata?.['plan_key'],
      billing_interval: sub.items.data[0].billing_thresholds ? 'usage' : (sub.items.data[0].price.recurring?.interval || 'month'),
      price_id: sub.items.data[0].price.id,
      product_id: sub.items.data[0].price.product,
      current_period_start: new Date(sub.current_period_start * 1000),
      current_period_end: new Date(sub.current_period_end * 1000),
      trial_start: sub.trial_start ? new Date(sub.trial_start * 1000) : null,
      trial_end: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
      metadata: sub.metadata || {},
    });

  if (error) throw new Error(error.message);

  // Log revenue event
  const amount = sub.items.data[0].price.unit_amount ? sub.items.data[0].price.unit_amount / 100 : 0;
  await insertRevenueEvent({
    orgId,
    eventType: 'subscription.created',
    source: 'stripe',
    amount: sub.status === 'trialing' ? 0 : amount,
    metadata: {
      stripe_event_id: sub.id,
      stripe_subscription_id: sub.id,
      plan_key: sub.metadata?.['plan_key'],
      trial_days: sub.trial_end ? Math.ceil((sub.trial_end - sub.trial_start) / 86400) : 0,
    },
  });

  return { ok: true, subscriptionId: sub.id };
}

async function handlePaymentSucceeded(pi: Stripe.PaymentIntent) {
  const orgId = pi.metadata?.['org_id'] || 'unknown';
  const amount = pi.amount / 100; // Convert cents to dollars
  
  await insertRevenueEvent({
    orgId,
    eventType: 'payment.succeeded',
    source: 'stripe',
    amount,
    metadata: {
      stripe_event_id: pi.id,
      customer: pi.customer,
      description: pi.description,
    },
  });

  return { ok: true, paymentIntentId: pi.id };
}
```

---

## Part 6: Verification & Success Metrics

### Pre-GO Checklist

- [ ] Webhook endpoint deployed and receiving events
- [ ] billing_subscriptions has ≥5 test rows with correct status
- [ ] revenue_events has ≥10 rows from real checkout
- [ ] Stripe balance shows pending charge
- [ ] PostHog event count for `subscription.created` ≥ 5
- [ ] Delivery Proof reports generating within 30 sec of checkout
- [ ] Customer email received within 2 min of checkout
- [ ] Slack team notification received
- [ ] Dashboard revenue summary matches Stripe
- [ ] Reconciliation cron detected no drift

### KPIs to Track (PostHog)

```json
{
  "mrr": "sum of active subscription monthly value",
  "arr": "MRR * 12",
  "active_subscriptions": "count(billing_subscriptions where status='active')",
  "active_trials": "count(billing_subscriptions where status='trialing')",
  "churn_rate": "(canceled_this_month / active_last_month) * 100",
  "nrr": "1 + (expansion / baseline_mrr)",
  "average_subscription_value": "MRR / active_subscriptions",
  "customer_lifetime_value": "avg(total_spent_per_customer)",
  "payback_period": "(CAC / monthly_contribution_margin) in months"
}
```

---

## Part 7: Configuration Checklist

### Required Env Vars

```
# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_METER_EVENT_NAME=dsg_execution
STRIPE_METER_ID=bm_...

# Price IDs (fallback if env not set)
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_YEARLY=price_...
STRIPE_PRICE_BUSINESS_MONTHLY=price_...
STRIPE_PRICE_BUSINESS_YEARLY=price_...
STRIPE_PRICE_ENTERPRISE_MONTHLY=price_...
STRIPE_PRICE_ENTERPRISE_YEARLY=price_...

# Integrations
POSTHOG_API_KEY=phc_...
POSTHOG_PROJECT_ID=...
```

### Stripe Account Setup

1. Create products: Pro, Business, Enterprise, Delivery Proof, Skills bundles
2. Create prices: monthly + yearly for each plan
3. Create a Billing Meter: `dsg_execution`
4. Configure webhook endpoint: `https://dsg-one.vercel.app/api/webhooks/stripe`
5. Subscribe to events: `customer.subscription.*`, `payment_intent.*`, `invoice.*`, `charge.refunded`
6. (Optional) Set up Stripe Sigma reports for revenue queries

---

## Part 8: Gaps & Known Limits

| Gap | Severity | Workaround | Target Fix |
|-----|----------|-----------|-----------|
| No Stripe webhook handler | 🔴 Critical | Manual event logging | Phase 1 |
| No delivery proof generation | 🔴 Critical | Manual email + link | Phase 3 |
| No reconciliation cron | 🟡 High | Manual spot checks via dashboard | Phase 2 |
| No upgrade/downgrade UI | 🟡 High | API endpoint only, no dashboard | Phase 4 |
| No refund automation | 🟠 Medium | Manual Stripe refund + note in DB | Phase 5 |
| No PCI compliance audit | 🟠 Medium | No card data stored locally (Stripe only) | Phase 5 |
| No GDPR deletion workflow | 🟠 Medium | Manual Supabase anonymization | Phase 5 |

---

## Conclusion

DSG ONE has **solid foundations** for a revenue system (pricing, Stripe integration, metering, event logging). The roadmap above fills gaps in webhook handling, report generation, automation, and monitoring.

**Estimated effort:** 3–4 weeks to full production revenue automation.

**Go-live criteria:** All Phase 1 + Phase 2 items done + verification checklist passed.

