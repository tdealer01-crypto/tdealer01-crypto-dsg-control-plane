# Stripe Connect V2 Sample Integration

This folder is a **non-production sample** for adding Stripe Connect to DSG without changing the currently submitted Stripe Marketplace app code.

It demonstrates:

- Creating Stripe V2 connected accounts with the requested account shape.
- Onboarding connected accounts with V2 account links.
- Showing live onboarding status from the Stripe Accounts API.
- Creating connected-account Products and default Prices using the Stripe-Account header.
- Rendering a small storefront per connected account.
- Creating direct-charge Checkout Sessions with an application fee.
- Charging a connected account for a platform subscription using `customer_account`.
- Opening Billing Portal for the connected account.
- Handling Connect V2 thin events and Billing snapshot webhook events.

## Files

```txt
examples/stripe-connect-v2-sample/
├── package.json
├── .env.example
├── server.js
└── README.md
```

## Run locally

```bash
cd examples/stripe-connect-v2-sample
npm install
cp .env.example .env
# Edit .env and fill Stripe test keys / webhook secrets.
npm run dev
```

Open:

```txt
http://localhost:4242
```

## Required environment variables

```txt
STRIPE_SECRET_KEY=sk_test_...
ROOT_URL=http://localhost:4242
APPLICATION_FEE_AMOUNT_CENTS=123
CONNECTED_ACCOUNT_SUBSCRIPTION_PRICE_ID=price_...
STRIPE_CONNECT_V2_THIN_WEBHOOK_SECRET=whsec_...
STRIPE_BILLING_WEBHOOK_SECRET=whsec_...
PORT=4242
```

The sample fails early with a helpful error if a required value is missing or still uses a placeholder.

## Connect V2 thin-event listener

Use Stripe CLI thin-event forwarding for local testing:

```bash
stripe listen \
  --thin-events 'v2.core.account[requirements].updated,v2.core.account[configuration.recipient].capability_status_updated,v2.core.account[configuration.merchant].capability_status_updated,v2.core.account[configuration.customer].capability_status_updated' \
  --forward-thin-to http://localhost:4242/webhooks/connect-v2-thin
```

Set the printed `whsec_...` value as:

```txt
STRIPE_CONNECT_V2_THIN_WEBHOOK_SECRET=whsec_...
```

## Billing webhook listener

Billing subscription events are normal snapshot events, not thin events:

```bash
stripe listen \
  --events customer.subscription.updated,customer.subscription.deleted,payment_method.attached,payment_method.detached,customer.updated,customer.tax_id.created,customer.tax_id.deleted,customer.tax_id.updated,billing_portal.configuration.created,billing_portal.configuration.updated,billing_portal.session.created \
  --forward-to http://localhost:4242/webhooks/billing
```

Set the printed `whsec_...` value as:

```txt
STRIPE_BILLING_WEBHOOK_SECRET=whsec_...
```

## Production hardening checklist

Before moving this into DSG production routes:

1. Replace the in-memory `Map` objects with Supabase tables.
2. Use authenticated DSG user IDs and organization IDs instead of demo query-string user IDs.
3. Store connected account mappings as `user_id/org_id -> stripe_account_id`.
4. Encrypt any persisted token-like values.
5. Add CSRF protection for dashboard forms.
6. Add RBAC and organization-scope checks before product creation, onboarding links, billing portal, or subscription checkout.
7. Do not expose connected account IDs as public storefront slugs permanently; create a public shop slug and map it to the account ID.
8. Add automated tests for OAuth, product creation, checkout, and webhook handlers.
9. Run the sample against Stripe test mode before using live mode.

## DSG truth boundary

This sample is **not** a production-ready claim by itself. It is a code starting point. Production readiness requires successful live endpoint smoke tests, webhook delivery proof, OAuth flow proof, database write proof, and audit evidence.
