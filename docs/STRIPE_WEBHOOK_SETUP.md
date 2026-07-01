# Stripe Webhook Setup for Phase 2 Monetization

This guide is focused on webhook setup for production monetization and complements existing references:

- Signature internals: `/home/runner/work/tdealer01-crypto-dsg-control-plane/tdealer01-crypto-dsg-control-plane/docs/STRIPE_WEBHOOK_SIGNATURE_VERIFICATION.md`
- General webhook testing toolkit: `/home/runner/work/tdealer01-crypto-dsg-control-plane/tdealer01-crypto-dsg-control-plane/docs/WEBHOOK_TESTING_GUIDE.md`

---

## 1) Create webhook endpoint in Stripe Dashboard

1. Go to https://dashboard.stripe.com (Live mode).
2. Open **Developers → Webhooks**.
3. Click **Add endpoint**.
4. Endpoint URL:
   - Production: `https://tdealer01-crypto-dsg-control-plane.vercel.app/api/billing/webhook`
5. Click **Select events** and subscribe to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.deleted`
   - `customer.subscription.updated`
   - `invoice.payment_succeeded`
   - `charge.refunded`
6. Save endpoint.
7. Reveal **Signing secret** and store it as `STRIPE_WEBHOOK_SECRET`.

---

## 2) Signature verification process

Your app must verify `stripe-signature` against raw request body using `STRIPE_WEBHOOK_SECRET`.

High-level formula:

```text
signed_payload = <timestamp> + "." + <raw_body>
expected = HMAC_SHA256(STRIPE_WEBHOOK_SECRET, signed_payload)
```

In this repository, billing webhook verification is implemented in:

- `/home/runner/work/tdealer01-crypto-dsg-control-plane/tdealer01-crypto-dsg-control-plane/app/api/billing/webhook/route.ts`

Do not parse JSON before signature verification.

---

## 3) Test webhook with Stripe CLI

### Local forwarding

```bash
stripe login
stripe listen --forward-to localhost:3000/api/billing/webhook
```

Then trigger sample event:

```bash
stripe trigger checkout.session.completed
```

### Script-based signed tests

```bash
bash /home/runner/work/tdealer01-crypto-dsg-control-plane/tdealer01-crypto-dsg-control-plane/scripts/test-stripe-webhook.sh \
  --url https://tdealer01-crypto-dsg-control-plane.vercel.app/api/billing/webhook \
  --secret whsec_live_YOUR_SECRET_HERE \
  --event checkout.session.completed
```

### Full production readiness check

```bash
bash /home/runner/work/tdealer01-crypto-dsg-control-plane/tdealer01-crypto-dsg-control-plane/scripts/verify-stripe-production.sh
```

---

## 4) Troubleshooting webhook delivery failures

### 4.1 HTTP 400 (invalid signature)

Common causes:
- Wrong `STRIPE_WEBHOOK_SECRET`
- Secret copied from wrong endpoint/environment
- Request body was parsed/changed before verification

Actions:
- Re-copy signing secret from Stripe Dashboard endpoint detail
- Confirm route uses raw body for `constructEvent`
- Re-run signed webhook test

### 4.2 HTTP 401/403

- Endpoint behind auth middleware/gate not intended for Stripe callbacks
- Upstream blocking Stripe requests

Action:
- Ensure webhook route is publicly reachable for Stripe with signature enforcement

### 4.3 HTTP 404

- Incorrect endpoint URL in Stripe Dashboard

Action:
- Update endpoint to `/api/billing/webhook` on current production domain

### 4.4 HTTP 5xx

- Server/runtime/database issue while processing event

Action:
- Check Vercel logs and application logs
- Re-send failed events from Stripe Dashboard
- Validate env vars in production

### 4.5 Event not appearing in application state

- Endpoint returns success but downstream processing path failed or skipped

Action:
- Confirm event type is subscribed
- Confirm event type is handled by billing/webhook logic
- Inspect Stripe event payload + server logs side-by-side

---

## 5) Operational checklist

- Webhook endpoint uses HTTPS
- Signing secret is stored in Vercel production env, not in git
- Required events are subscribed
- Signed test event reaches endpoint successfully
- Delivery retries are monitored in Stripe Dashboard
