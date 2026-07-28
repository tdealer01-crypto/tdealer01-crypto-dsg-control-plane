# DSG ONE Stripe Billing Setup

## Overview

Configure Stripe for DSG ONE pricing tiers and automated invoicing:
- **Pro**: $99/month
- **Business**: $199-299/month (early-bird $199, standard $299)
- **Enterprise**: Custom per-deal pricing

---

## Step 1: Create Products in Stripe Dashboard

### Product 1: DSG ONE Pro

```
Name: DSG ONE - Pro Tier
Description: 5,000 AI governance gates/month, basic policies, email support
SKU: dsg-pro-99
Pricing:
  - Recurring (Monthly): $99 USD
  - Billing cycle: Monthly on subscription anniversary
  - No trial period (unless customer requests)
```

### Product 2: DSG ONE Business

```
Name: DSG ONE - Business Tier
Description: 50,000-500,000 AI governance gates/month, custom policies, priority support
SKU: dsg-business-299
Pricing (Standard):
  - Recurring (Monthly): $299 USD
  - Billing cycle: Monthly
  - No trial period

Pricing (Early-Bird for first customers):
  - Recurring (Monthly): $199 USD
  - Billing cycle: Monthly
  - Coupon code: EARLY_BIRD_2024 (25% discount, apply manually per customer)
```

### Product 3: DSG ONE Enterprise

```
Name: DSG ONE - Enterprise Tier
Description: Custom pricing for unlimited gates, compliance consulting, SLA support
SKU: dsg-enterprise-custom
Pricing: Custom per deal
  - Usually set via quote + invoice (not subscription)
  - Typical range: $1,000-5,000/month
  - Billing cycle: Monthly or Annual (per agreement)
```

---

## Step 2: Create Customers in Stripe

For each signed customer, create a Stripe Customer object:

### Example: Phantom Crypto (Signed Week 4)

```
Email: billing@phantom.example.com
Name: Phantom Crypto
Description: Crypto exchange managing $50M monthly fund movements
Metadata:
  company_id: phantom-001
  tier: business
  sales_rep: [Your name]
  signed_date: 2024-08-22
```

### Retrieve Customer ID

When customer signs agreement:
1. Go to Stripe Dashboard → Customers
2. Create new customer (name, email, optional metadata)
3. Copy `cus_XXXXXX` ID
4. Store in database / CRM / DSG GTM pipeline MCP

---

## Step 3: Create Subscriptions

Once customer is created in Stripe, create subscription:

### API Call (Example: Phantom Crypto → Business tier @ $299/mo)

```bash
curl https://api.stripe.com/v1/subscriptions \
  -u sk_live_XXXXXXX: \
  -d customer=cus_XXXXXX \
  -d items[0][price]=price_YYYYYYY \
  -d metadata[company]=phantom-crypto \
  -d metadata[agreement_date]=2024-08-22 \
  -d default_payment_method=pm_ZZZZZZZ
```

**Response**: Subscription ID `sub_AAAAAA`, Status: `active`

Store subscription ID in DSG GTM MCP:
```json
{
  "customer_id": "stripe-cus_XXXXXX",
  "subscription_id": "stripe-sub_AAAAAA",
  "tier": "Business",
  "monthly_mrr": 299,
  "stripe_status": "active",
  "billing_start_date": "2024-08-22"
}
```

---

## Step 4: Set Up Automated Invoicing

### Option A: Automatic Invoice + Email (Recommended)

**Configure in Stripe Dashboard:**
1. Go to Settings → Billing → Invoice Settings
2. Enable "Automatically send invoices"
3. Set: Send 3 days before payment due
4. Email template: Use Stripe default or customize

**Result**: Invoice automatically sent to customer 3 days before monthly charge

### Option B: Manual Invoice (Fallback)

If customer prefers manual invoicing:
1. Generate invoice 3 days before due date
2. Send via email (manually or via CRM)
3. Mark as "sent" in Stripe Dashboard

---

## Step 5: Payment Method Configuration

### Automatic Retry Logic (Stripe Default)

Stripe automatically retries failed payments:
- **Day 1**: Payment attempt 1 (charge day)
- **Day 2**: Retry attempt 1
- **Day 4**: Retry attempt 2
- **Day 6**: Final retry + dunning notification

If all retries fail → Subscription `past_due`

### Response to Failed Payments

**Manual process**:
1. Stripe sends notification (Webhook `charge.failed`)
2. CSM emails customer: "Payment failed, please update card"
3. Customer updates payment method in Stripe billing portal
4. Automatic retry after 24 hours

**Suspension process**:
- After 10 days past due → suspend access (via API)
- Send final notice: "Account suspended due to failed payment"
- Reactivate when payment succeeds

---

## Step 6: Monitor Revenue via Stripe Dashboard

### MRR Calculation

**Manual (Weekly)**:
```bash
# Get all active subscriptions
curl https://api.stripe.com/v1/subscriptions?status=active&limit=100 \
  -u sk_live_XXXXXXX:
```

Parse response, sum `items[].plan.amount` for all active subscriptions.

**Automated (Recommended)**:
Use Stripe Sigma (Stripe Dashboard → Sigma → SQL queries):

```sql
SELECT 
  COUNT(DISTINCT customer_id) as customer_count,
  SUM(plan.amount) / 100 as monthly_mrr_usd,
  plan.interval
FROM subscriptions
WHERE status = 'active'
  AND plan.interval = 'month'
GROUP BY plan.interval
```

### Revenue Dashboard Metrics

Track weekly:
- Total MRR (sum of all active subscription amounts)
- New customers this week
- Churned customers (canceled subscriptions)
- Failed payment rate (failures / total customers)
- Upgrade rate (Pro → Business tier)

---

## Step 7: Handle Upgrades & Downgrades

### Upgrade: Pro → Business

**When customer wants to upgrade**:
1. Create new subscription for Business tier
2. Cancel old Pro subscription (prorated refund)
3. Manually adjust timing so both bill on same day (optional, reduces confusion)

**API call**:
```bash
# Cancel old subscription
curl https://api.stripe.com/v1/subscriptions/sub_OLD \
  -u sk_live_XXXXXXX: \
  -X DELETE \
  -d at_period_end=false

# Create new subscription
curl https://api.stripe.com/v1/subscriptions \
  -u sk_live_XXXXXXX: \
  -d customer=cus_XXXXXX \
  -d items[0][price]=price_BUSINESS_TIER
```

### Downgrade: Business → Pro

Similar process, but reverse:
1. Create new Pro subscription
2. Cancel Business subscription
3. Stripe automatically prorates

---

## Step 8: Invoices & Billing Portal

### Customer Self-Service Portal

Set up Stripe Billing Portal so customers can:
- View invoices
- Update payment method
- View subscription details
- Request refunds (via support ticket, you approve)

**Setup in Stripe Dashboard**:
1. Settings → Billing Portal
2. Enable: Invoices, Payment Methods, Subscription Management
3. Copy portal URL: `https://billing.stripe.com/...`
4. Provide link to customers in onboarding email

**Example email**:
```
Hi Sarah,

Your DSG ONE subscription is active. Here's your billing info:

Subscription ID: sub_AAAAAA
Tier: Business ($299/month)
Billing date: 22nd of each month
Manage billing: [Stripe Billing Portal Link]

You can update your payment method, view invoices, and manage your subscription above.

Questions? Reply to this email.
```

---

## Step 9: Webhooks for Sync

Set up webhooks in Stripe Dashboard → Developers → Webhooks:

### Webhook Events to Monitor

```json
{
  "events": [
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "charge.succeeded",
    "charge.failed",
    "invoice.created",
    "invoice.paid",
    "invoice.payment_failed"
  ],
  "endpoint": "https://api.dsg.example.com/webhooks/stripe",
  "api_version": "2024-04-10"
}
```

### Webhook Handler

When webhook received, sync to DSG GTM MCP:

```typescript
// Pseudo-code
app.post('/webhooks/stripe', async (req, body) => {
  const event = req.body;
  
  switch (event.type) {
    case 'customer.subscription.created':
      // Add to DSG MCP: convert_to_customer()
      const sub = event.data.object;
      mcp.convert_to_customer({
        company: sub.metadata.company,
        tier: sub.metadata.tier,
        monthlyMRR: sub.items[0].price.unit_amount / 100,
        invoiceEmail: sub.customer.email
      });
      break;
      
    case 'charge.failed':
      // Alert CSM for follow-up
      console.log(`Payment failed for ${event.data.object.customer}`);
      break;
  }
});
```

---

## Step 10: Financial Reconciliation (Monthly)

At end of each month:

1. **Stripe MRR vs DSG MCP MRR**
   - Pull MRR from Stripe: 3 active subscriptions × average price
   - Pull MRR from DSG MCP: sum all customers' monthlyMRR
   - Should match within $1 (rounding)

2. **Invoice issued vs subscriptions**
   - Count invoices issued: Should equal # active subscriptions
   - Check no customers missing invoices

3. **Revenue recognized**
   - Record MRR in finance system (accounting, revenue recognition)
   - Note: For monthly subscriptions, revenue recognized on billing date (not subscription start)

---

## Pricing Strategy Notes

### Early-Bird Discount ($199 Business tier)

Use early-bird discount for first 5-10 customers:
- Creates urgency ("limited-time offer")
- Rewards early pilots
- Still generates $2,400+ MRR vs. $3,000 at full price

**Example announcement** (to pilot customers):
```
Congratulations on being selected for DSG ONE's early access program!

As an early customer, you qualify for our early-bird pricing:

Standard Business tier: $299/month
Early-bird Business tier: $199/month (Limited to first 10 customers)

Ready to convert your pilot? Reply with yes and I'll send the agreement.
```

### Annual Prepay Discount (Optional)

If customer wants to commit to annual prepayment, offer 10% discount:
- Monthly: $299 × 12 = $3,588/year
- Annual prepay: $3,229/year (10% discount)

**Use case**: Customer wants to lock in long-term, you get cash upfront.

---

## Testing Checklist

Before going live with first customers:

- [ ] All 3 products created in Stripe (Pro, Business, Enterprise)
- [ ] Test subscription creation for each tier
- [ ] Test automatic invoice sending
- [ ] Test payment method update workflow
- [ ] Confirm webhook endpoint is working
- [ ] Test prorated refund (cancel mid-month)
- [ ] Verify billing portal link works
- [ ] Confirm CSM can view all subscriptions in Stripe Dashboard

---

## Launch Timeline (Week 1-4)

| Week | Task | Owner |
|------|------|-------|
| **1** | Stripe setup: Create products, test flow | Finance + Eng |
| **2** | Demo to prospects (don't charge yet) | Sales |
| **3** | Pilot launches (still free tier) | Eng |
| **4** | First customers sign: Create Stripe subs + send invoices | Finance + Sales |
| **5** | First invoices sent + first payments received | Finance |

---

## Success Metrics (Monthly)

- ✅ MRR matches DSG MCP customer records (within $1)
- ✅ All active subscriptions have invoices issued
- ✅ Payment failure rate < 5%
- ✅ Avg days-to-payment < 3 days (customers pay on time)
- ✅ 0 billing disputes or chargebacks

---

## Support & Escalation

**Billing questions** → Customer replies to invoice email → Finance handles

**Payment issues** → Stripe auto-retry handles most; manual intervention if > 3 retries fail

**Refund requests** → Customer emails support → You approve or deny based on 30-day money-back guarantee

**Upgrade/Downgrade** → Customer requests via billing portal or email → Finance creates new subscription + cancels old

