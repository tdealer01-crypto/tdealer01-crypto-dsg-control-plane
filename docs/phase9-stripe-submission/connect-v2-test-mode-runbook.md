# Connect V2 Test Mode Runbook

This runbook is for the Connect V2 sample integration branch only.

## Truth boundary

- Test mode only.
- Use `sk_test_...` only.
- Do not use `sk_live_...`.
- Do not submit this as live production evidence.
- Do not claim production readiness.
- Do not paste full secrets into issues, pull requests, chat, screenshots, or logs.

## Branch

```bash
git fetch origin
git switch fix/stripe-app-docs-aligned-connect-v2
git pull --ff-only origin fix/stripe-app-docs-aligned-connect-v2
```

## Install and build gate

```bash
cd packages/stripe-app
npm install
npm run type-check
npm run build
```

Stop if either command fails.

## Required test environment

```env
STRIPE_SECRET_KEY=sk_test_REPLACE_ME
STRIPE_CONNECT_ROOT_URL=http://localhost:3001
APPLICATION_FEE_AMOUNT_CENTS=123
CONNECTED_ACCOUNT_SUBSCRIPTION_PRICE_ID=price_REPLACE_ME
STRIPE_CONNECT_V2_THIN_WEBHOOK_SECRET=whsec_REPLACE_ME
STRIPE_BILLING_WEBHOOK_SECRET=whsec_REPLACE_ME
```

## Start local server

```bash
npm run dev
```

Expected local root:

```text
http://localhost:3001
```

## 1. Create a test connected account

```bash
curl -X POST http://localhost:3001/connect-v2/accounts \
  -H "Content-Type: application/json" \
  -d '{"display_name":"DSG Test Merchant","contact_email":"test@example.com"}'
```

Expected output contains:

```json
{"accountId":"acct_..."}
```

## 2. Open the storefront test UI

Open this in the browser:

```text
http://localhost:3001/connect-v2-storefront/acct_REPLACE_ME
```

## 3. Complete Stripe-hosted onboarding

Click:

```text
Open Stripe-hosted onboarding
```

If Stripe returns `requirements.currently_due`, onboarding is not complete yet. The connected account must finish the required fields in Stripe-hosted onboarding. Do not collect or paste identity documents or full ID numbers in chat.

Common due fields include:

- business profile
- business URL or product description
- external bank account
- representative name, address, DOB, phone, email
- ID number / secondary ID number where legally required
- liveness proof
- Terms of Service acceptance

## 4. Confirm account readiness

```bash
curl http://localhost:3001/connect-v2/account-status/acct_REPLACE_ME
```

Expected final state before checkout:

```json
{
  "readyToProcessPayments": true,
  "onboardingComplete": true
}
```

## 5. Create a connected-account product from UI

Open:

```text
http://localhost:3001/connect-v2-storefront/acct_REPLACE_ME
```

Use the form:

- Name: `DSG Test Product`
- Description: `Test product created on the connected account.`
- Price in cents: `2500`
- Currency: `usd`

Submit the form.

## 6. Verify product list by API

```bash
curl http://localhost:3001/connect-v2/products/acct_REPLACE_ME
```

Expected output includes an active product and a default price.

## 7. Test direct-charge Checkout with application fee

Use the storefront button:

```text
Checkout direct charge
```

This creates a hosted Checkout Session on the connected account using `stripeAccount`, and includes `payment_intent_data.application_fee_amount`.

## 8. Listen for Connect V2 thin events

```bash
stripe listen \
  --thin-events 'v2.core.account[requirements].updated,v2.core.account[configuration.merchant].capability_status_updated,v2.core.account[configuration.customer].capability_status_updated' \
  --forward-thin-to http://localhost:3001/connect-v2/thin-webhook
```

Copy the CLI `whsec_...` value into `STRIPE_CONNECT_V2_THIN_WEBHOOK_SECRET`.

## 9. Listen for billing events

```bash
stripe listen \
  --events 'customer.subscription.updated,customer.subscription.deleted,payment_method.attached,payment_method.detached,customer.updated,customer.tax_id.created,customer.tax_id.deleted,customer.tax_id.updated,billing_portal.configuration.created,billing_portal.configuration.updated,billing_portal.session.created,invoice.paid,invoice.payment_failed,checkout.session.completed' \
  --forward-to http://localhost:3001/connect-v2/billing-webhook
```

Copy the CLI `whsec_...` value into `STRIPE_BILLING_WEBHOOK_SECRET`.

## 10. Evidence checklist

Record only non-secret evidence:

- branch name
- commit SHA
- `npm run type-check` result
- `npm run build` result
- connected test account id prefix only, for example `acct_...last4`
- storefront URL without secrets
- Checkout Session id prefix only, for example `cs_test_...last4`
- webhook event type and event id prefix only

## Stop conditions

Stop and do not proceed if:

- a live key is present
- Stripe asks for real identity documents for a person who is not the correct legal representative
- onboarding shows a different representative name than expected
- build/type-check fails
- webhook signature verification fails
- account readiness stays false after hosted onboarding
