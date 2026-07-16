# DSG ONE Revenue System: Implementation Roadmap

**Timeline:** 4–6 weeks | **Team:** 1–2 engineers | **Effort:** ~200 hours

---

## Phase 1: Live Verification & Automation (Week 1–2) 🔴 CRITICAL

**Goal:** Verify Stripe integration works end-to-end with real transactions.

### M1-1: Verify Stripe Account Setup (2 hours)

**Checklist:**
- [ ] Stripe Account ID: `acct_1Tnbl5CVpjxFKlKT`
- [ ] Products created:
  - [ ] `prod_1Topm...` (Pro plan)
  - [ ] `prod_1Topn...` (Business plan)
  - [ ] `prod_1Topo...` (Enterprise plan)
  - [ ] Skills bundles (5 products)
- [ ] Prices created (monthly + yearly for each):
  - [ ] Pro: `price_1TopmiCVpjxFKlKT18ljNI84` (monthly), `price_1TopmiCVpjxFKlKT0EVZwCps` (yearly)
  - [ ] Business: `price_1TopmiCVpjxFKlKT...` (monthly), etc.
  - [ ] Enterprise: `price_1TopmiCVpjxFKlKT...` (monthly), etc.
- [ ] Billing Meter created: `bm_...`
- [ ] Webhook endpoint configured: `https://production-url/api/billing/webhook`
- [ ] Events subscribed:
  - [ ] `customer.created`
  - [ ] `customer.subscription.created`
  - [ ] `customer.subscription.updated`
  - [ ] `customer.subscription.deleted`
  - [ ] `payment_intent.succeeded`
  - [ ] `invoice.payment_succeeded`
  - [ ] `charge.refunded`

**Commands:**
```bash
stripe products list --live
stripe prices list --live
stripe billing meters list --live
stripe webhook_endpoints list --live
```

**Success Criteria:**
- All 3 plan products exist
- All 6+ price IDs match env vars
- 1 Meter exists
- Webhook endpoint `Ready` (green)

---

### M1-2: Configure Environment Variables (1 hour)

**File:** `.env.production` (Vercel) or `.env.local` (local)

**Set variables:**

```bash
# Stripe Authentication
STRIPE_SECRET_KEY=sk_live_...                    # Copy from Stripe Dashboard → API Keys
STRIPE_PUBLISHABLE_KEY=pk_live_...              # Public key
STRIPE_WEBHOOK_SECRET=whsec_...                 # From Webhooks settings

# Stripe Metering
STRIPE_METER_ID=bm_...                          # From Billing → Meters
STRIPE_METER_EVENT_NAME=dsg_execution           # Event name

# Price IDs (optional if using DEFAULT_PRICE_IDS fallback)
STRIPE_PRICE_PRO_MONTHLY=price_1TopmiCVpjxFKlKT18ljNI84
STRIPE_PRICE_PRO_YEARLY=price_1TopmiCVpjxFKlKT0EVZwCps
STRIPE_PRICE_BUSINESS_MONTHLY=price_1TopmsCVpjxFKlKTdpm128OG
STRIPE_PRICE_BUSINESS_YEARLY=price_1Topn0CVpjxFKlKTvxKJUsff
STRIPE_PRICE_ENTERPRISE_MONTHLY=price_1TopnACVpjxFKlKT36Pe7Zmu
STRIPE_PRICE_ENTERPRISE_YEARLY=price_1TopnICVpjxFKlKTqHhjKzhR

# Cron Authorization
CRON_SECRET=generate_secure_random_string_here

# Overage Rate (optional)
OVERAGE_RATE_USD=0.001  # $0.001 per execution (default)
```

**Deployment:**
```bash
# Via Vercel CLI:
vercel env pull .env.production
# Edit .env.production with values above
vercel env push .env.production

# Then redeploy:
vercel deploy --prod
```

**Success Criteria:**
- All env vars set in Vercel
- `npm run verify:live-env` passes
- Deployment shows green in Vercel

---

### M1-3: Verify API Endpoints Deployed (1 hour)

**Run health checks:**

```bash
# Verify webhook endpoint exists
curl -X POST https://your-production-url/api/billing/webhook \
  -H "Stripe-Signature: invalid" \
  -d "test"
# Should return 400 (invalid signature) not 404

# Verify checkout endpoint
curl -X POST https://your-production-url/api/billing/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "plan": "pro",
    "billingInterval": "monthly",
    "orgId": "test-org"
  }'
# Should return 200 with sessionId

# Verify revenue events endpoint
curl -X GET https://your-production-url/api/revenue/events \
  -H "Authorization: Bearer $DASHBOARD_TOKEN"
# Should return 200 with empty array []

# Verify meter health
curl -X GET https://your-production-url/api/billing/meter-health \
  -H "Authorization: Bearer $ADMIN_TOKEN"
# Should return { pending: 0, sent: 0, failed: 0, ... }
```

**Success Criteria:**
- All 4 endpoints return 200/400 (not 404)
- No TypeErrors or CORS errors
- Responses match expected schema

---

### M1-4: Test First Customer Checkout (3 hours)

**Manual test flow:**

1. **Create test org in Supabase:**
   ```sql
   INSERT INTO organizations (id, name, owner_id, status)
   VALUES ('test-org-001', 'Test Org', 'test-user', 'active')
   RETURNING *;
   ```

2. **Initiate checkout:**
   ```bash
   curl -X POST https://your-production-url/api/billing/checkout \
     -H "Content-Type: application/json" \
     -d '{
       "plan": "pro",
       "billingInterval": "monthly",
       "orgId": "test-org-001"
     }' | jq '.redirectUrl'
   ```

3. **Complete payment:**
   - Copy `redirectUrl` to browser
   - Use Stripe test card: `4242 4242 4242 4242` (exp: any future, CVC: any)
   - Complete checkout

4. **Verify database updates:**
   ```sql
   -- Check billing_customers created
   SELECT * FROM billing_customers WHERE org_id = 'test-org-001';

   -- Check billing_subscriptions created
   SELECT * FROM billing_subscriptions WHERE org_id = 'test-org-001';

   -- Check billing_events logged
   SELECT event_type, COUNT(*) FROM billing_events 
   WHERE stripe_customer_id IN (SELECT stripe_customer_id FROM billing_customers WHERE org_id = 'test-org-001')
   GROUP BY event_type;

   -- Check revenue_events logged
   SELECT * FROM revenue_events WHERE org_id = 'test-org-001' ORDER BY created_at DESC;
   ```

5. **Verify Stripe webhook fired:**
   - Go to Stripe Dashboard → Webhooks → select endpoint
   - See `customer.subscription.created` event
   - Status should be `Success` (green)

**Success Criteria:**
- ✅ Checkout completes without errors
- ✅ `billing_customers` row exists
- ✅ `billing_subscriptions` row with `status='active'`
- ✅ `revenue_events` row with `eventType='subscription.created'`
- ✅ Stripe webhook shows "Success"
- ✅ `organizations.plan` updated to 'pro'

---

### M1-5: Test Metered Billing (2 hours)

**Manual test flow:**

1. **Create test execution:**
   ```bash
   # Call /api/execute or manually insert execution row
   INSERT INTO executions (id, org_id, status, created_at)
   VALUES ('exec-001', 'test-org-001', 'succeeded', now())
   RETURNING *;
   ```

2. **Trigger meter event:**
   ```bash
   # Directly call meterExecution (simulating post-execution):
   curl -X POST https://your-production-url/api/cron/flush-meter-outbox \
     -H "X-Cron-Secret: $CRON_SECRET"
   # Should queue events to Stripe
   ```

3. **Check outbox:**
   ```sql
   -- Verify pending event added
   SELECT * FROM billing_meter_outbox 
   WHERE org_id = 'test-org-001'
   ORDER BY created_at DESC LIMIT 5;
   
   -- Should see status transition: pending → sent
   -- (after cron runs, may take up to 5 min)
   ```

4. **Check Stripe Meter:**
   - Stripe Dashboard → Billing → Meters → `dsg_execution`
   - View meter events log
   - Should see event from `test-org-001`

**Success Criteria:**
- ✅ `billing_meter_outbox` row created with `status='pending'`
- ✅ After 5 min, status becomes `status='sent'`
- ✅ `stripe_event_id` populated
- ✅ No errors in `error` column
- ✅ Stripe Meter events log shows event

---

### M1-6: Cron Job Automation (1 hour)

**Set up cron triggers:**

**In `vercel.json`:**
```json
{
  "crons": [
    {
      "path": "/api/cron/billing-sync",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/flush-meter-outbox",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/reconcile-meter",
      "schedule": "0 */4 * * *"
    }
  ]
}
```

**Deploy:**
```bash
git add vercel.json
git commit -m "Enable billing cron jobs"
git push origin main
# Vercel auto-deploys
```

**Verify:**
- Vercel Dashboard → Project Settings → Cron Jobs
- All 3 cron jobs should show "Enabled"
- Check logs after 5 minutes

**Success Criteria:**
- ✅ 3 cron jobs appear in Vercel dashboard
- ✅ `/api/cron/billing-sync` runs every 5 min (check logs)
- ✅ `/api/cron/flush-meter-outbox` runs every 5 min
- ✅ `/api/cron/reconcile-meter` runs every 4 hours

---

## Phase 2: Billing Reconciliation & Health (Week 2–3) 🟡 HIGH

**Goal:** Ensure billing data consistency across Stripe ↔ DB ↔ PostHog.

### M2-1: Implement Billing Reconciliation Dashboard (3 hours)

**File:** `/app/api/dashboard/billing-summary/route.ts` (create new)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { reconcileMeterOutbox } from '@/lib/billing/reconciliation';
import { handleApiError } from '@/lib/security/api-error';

export async function GET(request: NextRequest) {
  try {
    // Require dashboard auth
    const auth = await requireActiveProfile();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const supabase = getSupabaseAdmin();
    const orgId = auth.orgId;

    // Get subscription status
    const { data: subscription } = await (supabase as any)
      .from('billing_subscriptions')
      .select('status, plan_key, billing_interval, current_period_end')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Get quota usage
    const { data: usage } = await (supabase as any)
      .from('usage_counters')
      .select('executions')
      .eq('org_id', orgId)
      .eq('billing_period', new Date().toISOString().slice(0, 7))
      .maybeSingle();

    // Get quota limit for plan
    const { getQuotaForPlan } = await import('@/lib/billing/entitlements');
    const limit = getQuotaForPlan(subscription?.plan_key || 'free');

    // Get recent revenue events
    const { data: events } = await (supabase as any)
      .from('revenue_events')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Get meter outbox status
    const { data: outbox } = await (supabase as any)
      .from('billing_meter_outbox')
      .select('status')
      .eq('org_id', orgId)
      .in('status', ['pending', 'failed']);

    return NextResponse.json({
      ok: true,
      subscription: subscription || null,
      usage: {
        used: usage?.executions || 0,
        limit,
        percentUsed: ((usage?.executions || 0) / limit) * 100,
      },
      recentEvents: events || [],
      outboxHealth: {
        pendingEvents: outbox?.length || 0,
        lastCheck: new Date().toISOString(),
      },
    });
  } catch (error) {
    return handleApiError(error, 'Failed to fetch billing summary');
  }
}
```

**Success Criteria:**
- ✅ Route deployed and returns 200
- ✅ Dashboard can query org's billing summary
- ✅ Usage percentage shows correctly

---

### M2-2: Add Stripe Reconciliation to Dashboard (2 hours)

**File:** `/lib/billing/stripe-reconciliation.ts` (create new)

```typescript
import Stripe from 'stripe';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export async function reconcileSubscriptionsWithStripe(orgId: string) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const supabase = getSupabaseAdmin();

  // Get org's Stripe customer
  const { data: customer } = await (supabase as any)
    .from('billing_customers')
    .select('stripe_customer_id')
    .eq('org_id', orgId)
    .maybeSingle();

  if (!customer?.stripe_customer_id) {
    return { ok: false, error: 'No Stripe customer found' };
  }

  // Fetch subscriptions from Stripe
  const stripeSubscriptions = await stripe.subscriptions.list({
    customer: customer.stripe_customer_id,
    limit: 100,
  });

  // Fetch subscriptions from DB
  const { data: dbSubscriptions } = await (supabase as any)
    .from('billing_subscriptions')
    .select('stripe_subscription_id, status')
    .eq('org_id', orgId);

  // Compare
  const discrepancies: Array<{
    subscriptionId: string;
    dbStatus: string;
    stripeStatus: string;
    action: 'auto-correct' | 'manual-review';
  }> = [];

  for (const sub of stripeSubscriptions.data) {
    const dbSub = dbSubscriptions?.find((s) => s.stripe_subscription_id === sub.id);

    if (!dbSub) {
      discrepancies.push({
        subscriptionId: sub.id,
        dbStatus: 'missing',
        stripeStatus: sub.status,
        action: 'manual-review',
      });
    } else if (dbSub.status !== sub.status) {
      discrepancies.push({
        subscriptionId: sub.id,
        dbStatus: dbSub.status,
        stripeStatus: sub.status,
        action: dbSub.status === 'active' && sub.status !== 'canceled' ? 'auto-correct' : 'manual-review',
      });
    }
  }

  // Auto-correct safe discrepancies
  for (const disc of discrepancies) {
    if (disc.action === 'auto-correct') {
      await (supabase as any)
        .from('billing_subscriptions')
        .update({ status: disc.stripeStatus })
        .eq('stripe_subscription_id', disc.subscriptionId);
    }
  }

  return {
    ok: true,
    matched: dbSubscriptions?.length || 0,
    discrepancies: discrepancies.filter((d) => d.action === 'manual-review'),
    autoCorrected: discrepancies.filter((d) => d.action === 'auto-correct').length,
  };
}
```

**Success Criteria:**
- ✅ Reconciliation detects mismatches
- ✅ Auto-corrects safe ones (status divergence)
- ✅ Flags manual review cases

---

### M2-3: Wire Revenue Events to /api/execute (2 hours)

**File:** `/app/api/execute/route.ts` (modify)

Add at end of POST handler, after successful execution:

```typescript
// After successful spine execution:
import { meterExecution } from '@/lib/billing/metered';
import { insertRevenueEvent } from '@/lib/revenue/events';

// 1. Meter this execution for usage-based billing
await meterExecution(orgId, 1, executionId);

// 2. Log revenue event
const subscriptionStatus = ...;  // Query from DB
if (subscriptionStatus === 'active') {
  await insertRevenueEvent({
    orgId,
    userId: userId,
    eventType: 'execution',
    source: 'platform',
    amount: 0,  // Usage-based: charged at end of month
    metadata: {
      execution_id: executionId,
      agent_id: agentId,
      input_tokens: tokenCount,
    },
  });
}

return NextResponse.json({
  // ... existing response
  billing: {
    metered: true,
    eventLogged: true,
  },
});
```

**Test:**
```bash
# Execute a task
curl -X POST https://your-production-url/api/execute \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  -d '{ ... }'

# Query revenue events
SELECT * FROM revenue_events WHERE org_id = 'test-org-001' ORDER BY created_at DESC;
# Should see new row with event_type='execution'

# Query meter outbox
SELECT * FROM billing_meter_outbox WHERE org_id = 'test-org-001' ORDER BY created_at DESC;
# Should see pending → sent transition
```

**Success Criteria:**
- ✅ `revenue_events` row inserted after execution
- ✅ `billing_meter_outbox` row queued
- ✅ Cron job processes meter within 5 min

---

## Phase 3: Revenue Reporting & Dashboard (Week 3–4) 🟡 HIGH

**Goal:** Enable customers to see their revenue/usage in a dashboard.

### M3-1: Create Revenue Dashboard Widget (3 hours)

**File:** `/app/dashboard/billing/page.tsx` (create new)

```typescript
'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';

export default function BillingDashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/billing-summary')
      .then((r) => r.json())
      .then(setSummary)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading...</div>;
  if (!summary) return <div>Error loading billing summary</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Billing & Usage</h1>

      {/* Current Plan Card */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold">Current Plan</h2>
        <div className="mt-4 space-y-2">
          <p>
            Plan: <span className="font-bold uppercase">{summary.subscription?.plan_key}</span>
          </p>
          <p>
            Billing: {summary.subscription?.billing_interval === 'monthly' ? '$99/mo' : '$1,088/yr'}
          </p>
          <p>Status: {summary.subscription?.status}</p>
          <p>
            Renews:{' '}
            {new Date(summary.subscription?.current_period_end).toLocaleDateString()}
          </p>
        </div>
      </Card>

      {/* Usage Card */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold">Usage This Month</h2>
        <div className="mt-4">
          <div className="flex justify-between">
            <span>Executions</span>
            <span className="font-bold">
              {summary.usage.used} / {summary.usage.limit}
            </span>
          </div>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full"
              style={{ width: `${Math.min(summary.usage.percentUsed, 100)}%` }}
            />
          </div>
          <p className="mt-1 text-sm text-gray-600">
            {summary.usage.percentUsed.toFixed(1)}% used
          </p>
        </div>
      </Card>

      {/* Recent Transactions */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold">Recent Events</h2>
        <div className="mt-4 space-y-2">
          {summary.recentEvents.map((event) => (
            <div key={event.id} className="flex justify-between text-sm border-b pb-2">
              <span>{event.event_type}</span>
              <span className="text-gray-600">
                {new Date(event.created_at).toLocaleDateString()}
              </span>
              {event.amount && <span className="font-semibold">${event.amount.toFixed(2)}</span>}
            </div>
          ))}
        </div>
      </Card>

      {/* Outbox Health Warning */}
      {summary.outboxHealth.pendingEvents > 0 && (
        <Card className="p-4 border-yellow-200 bg-yellow-50">
          <p className="text-sm text-yellow-800">
            ⚠️ {summary.outboxHealth.pendingEvents} pending billing events.
            They will be synced within 5 minutes.
          </p>
        </Card>
      )}
    </div>
  );
}
```

**Success Criteria:**
- ✅ Dashboard displays correctly
- ✅ Shows current plan + renewal date
- ✅ Shows usage bar (used / limit)
- ✅ Shows recent revenue events

---

### M3-2: Build Delivery Proof Report Generation (5 hours)

**File:** `/app/api/webhooks/delivery-proof/generate/route.ts` (create new)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { Anthropic } from '@anthropic-ai/sdk';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { orderId, orgId, customerId, productName, amount } = await request.json();

    if (!orderId || !orgId) {
      return NextResponse.json({ error: 'orderId and orgId required' }, { status: 400 });
    }

    // 1. Verify order exists in revenue_events
    const supabase = getSupabaseAdmin();
    const { data: order } = await (supabase as any)
      .from('revenue_events')
      .select('*')
      .eq('id', orderId)
      .eq('org_id', orgId)
      .maybeSingle();

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // 2. Call Claude API to generate Delivery Proof Report
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const report = await anthropic.messages.create({
      model: 'claude-opus-4-1',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: `Generate a professional Delivery Proof Report for:
            - Product: ${productName}
            - Amount: $${amount}
            - Org: ${orgId}
            - Order Date: ${order.created_at}
            
            Include:
            1. Executive Summary
            2. Delivery Proof Details
            3. Technical Verification
            4. Compliance & Audit Trail
            5. Support Contact
            
            Format as JSON with fields: title, summary, sections[], timestamp`,
        },
      ],
    });

    const reportJson = JSON.parse(
      report.content[0].type === 'text' ? report.content[0].text : '{}'
    );

    // 3. Store report in metadata
    await (supabase as any)
      .from('revenue_events')
      .update({
        metadata: {
          ...order.metadata,
          report: reportJson,
          report_generated_at: new Date().toISOString(),
        },
      })
      .eq('id', orderId);

    // 4. Send email to customer (via Zapier or direct)
    // TODO: Integrate with email service
    console.log(`[delivery-proof] Report generated for order ${orderId}`);

    return NextResponse.json({
      ok: true,
      orderId,
      reportUrl: `/reports/${orderId}`,
      message: 'Delivery Proof Report generated and sent to customer',
    });
  } catch (error) {
    console.error('[delivery-proof] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}
```

**Trigger via Zapier:** After `order_completed` event in PostHog, call webhook.

**Success Criteria:**
- ✅ Report generated within 30 sec
- ✅ Report stored in DB metadata
- ✅ Email sent to customer
- ✅ Report accessible via dashboard link

---

## Phase 4: Subscription Management (Week 4–5) 🟠 MEDIUM

### M4-1: Upgrade/Downgrade Flow

**File:** `/app/api/billing/change-plan/route.ts` (create new)

```typescript
import Stripe from 'stripe';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  const { newPlan, billingInterval } = await request.json();
  const auth = await requireActiveProfile();

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const supabase = getSupabaseAdmin();

  // Get current subscription
  const { data: sub } = await (supabase as any)
    .from('billing_subscriptions')
    .select('*')
    .eq('org_id', auth.orgId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!sub) return NextResponse.json({ error: 'No active subscription' }, { status: 404 });

  // Get new price ID
  const { getPriceId } = await import('@/lib/billing/pricing-catalog');
  const newPriceId = getPriceId(newPlan as any, billingInterval as any);

  // Update subscription
  const updated = await stripe.subscriptions.update(sub.stripe_subscription_id, {
    items: [
      {
        id: sub.id,
        price: newPriceId,
      },
    ],
    proration_behavior: 'create_prorations', // Auto prorate
  });

  // Log event
  await insertRevenueEvent({
    orgId: auth.orgId,
    eventType: 'subscription.upgraded',
    source: 'platform',
    amount: 0,
    metadata: {
      old_plan: sub.plan_key,
      new_plan: newPlan,
      stripe_subscription_id: sub.stripe_subscription_id,
    },
  });

  return NextResponse.json({ ok: true, subscription: updated });
}
```

---

## Phase 5: Hardening & Compliance (Week 5–6) 🟠 MEDIUM

### M5-1: GDPR Deletion Workflow

**File:** `/app/api/admin/gdpr/delete-org/route.ts` (create new)

- Anonymize customer data
- Delete revenue events
- Cancel Stripe subscription
- Update audit log

### M5-2: Dunning (Failed Payment Recovery)

**File:** `/app/api/billing/handle-payment-failed/route.ts` (create new)

- Stripe event: `invoice.payment_failed`
- Send reminder email (1st, 3rd, 7th day)
- Auto-downgrade to free plan after 14 days
- Retry payment webhook

### M5-3: PCI Compliance Audit

**Checklist:**
- [ ] No card data stored in Stripe gateway
- [ ] All PII encrypted in DB
- [ ] Webhook signatures validated
- [ ] Rate limiting on payment endpoints
- [ ] Audit log for all billing events

---

## Testing Strategy

### Unit Tests (Phase 1)
```bash
npm run test:unit lib/billing/
```

### Integration Tests (Phase 1–2)
```bash
npm run test:integration tests/integration/billing-checkout.test.ts
npm run test:integration tests/integration/metered-billing.test.ts
```

### E2E Tests (Phase 2–3)
```bash
npm run test:e2e tests/e2e/revenue-happy-path.spec.ts
```

### Manual Verification (All phases)

**Checklist per phase:**
- [ ] Manual Stripe checkout in sandbox/live
- [ ] Verify DB rows created
- [ ] Verify webhook events delivered
- [ ] Verify emails sent
- [ ] Verify PostHog events captured
- [ ] Verify Slack notifications sent
- [ ] Check Vercel logs for errors
- [ ] Monitor `/api/billing/meter-health` for pending events

---

## Success Metrics (After Go-Live)

| Metric | Target | Tracking |
|--------|--------|----------|
| First revenue | $0 → $1k+ within 1 week | PostHog: `subscription.created` events |
| Payment success rate | ≥98% | Stripe Dashboard: Payment success rate |
| Billing sync latency | <5 min | `billing_meter_outbox`: max(now() - flushed_at) |
| Reconciliation drift | 0 cases | `reconcileMeterOutbox()`: discrepancies count |
| Customer churn | <5% per month | `billing_subscriptions` status canceled |
| MRR growth | +$500/week | sum(active subscriptions * monthly price) |
| Customer support requests | <10 | Zendesk/Slack: billing-related tickets |

---

## Rollback Plan

If production breaks:

1. **Immediate:** Disable cron jobs (remove from `vercel.json`)
2. **Pause charges:** Set `STRIPE_WEBHOOK_SECRET` to invalid value
3. **Investigate:** Check `/api/billing/meter-health` and Supabase logs
4. **Fix:** Push corrected code
5. **Resume:** Re-enable cron jobs and webhook

**No data loss:** All events stored durably in `billing_meter_outbox` and `revenue_events`.

---

## Timeline Summary

| Week | Phase | Tasks | Status |
|------|-------|-------|--------|
| 1–2 | Phase 1 | Verify Stripe, configure env, test checkout, cron | 🔴 CRITICAL |
| 2–3 | Phase 2 | Reconciliation, meter health, revenue logging | 🟡 HIGH |
| 3–4 | Phase 3 | Delivery Proof, billing dashboard | 🟡 HIGH |
| 4–5 | Phase 4 | Upgrade/downgrade, proration | 🟠 MEDIUM |
| 5–6 | Phase 5 | GDPR, dunning, PCI audit | 🟠 MEDIUM |

**Total Effort:** ~200 hours (4–6 weeks for 1–2 engineers)

---

## Go/No-Go Gates

### Before Phase 1 Release:
- [ ] Stripe account fully configured
- [ ] First test payment succeeds
- [ ] Database schema migrations applied
- [ ] All env vars set
- [ ] Cron jobs enabled and running

### Before Phase 2 Release:
- [ ] Reconciliation zero discrepancies
- [ ] Meter outbox delivery rate >99%
- [ ] Revenue events logging for all executions
- [ ] PostHog events captured

### Before Phase 3 Release:
- [ ] Delivery Proof reports generating
- [ ] Billing dashboard UI complete
- [ ] Customer email notifications working
- [ ] Dashboard revenue summary matches Stripe

### Before Production GA:
- [ ] All 5 phases complete
- [ ] Security audit passed
- [ ] Load testing (100+ concurrent checkouts)
- [ ] Failover procedures documented
- [ ] Team training completed

