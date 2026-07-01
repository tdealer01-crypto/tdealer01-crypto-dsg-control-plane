# Stripe Production Keys Setup (Phase 2 Monetization)

This guide covers production Stripe key setup for DSG Control Plane Phase 2 monetization.
It extends existing materials and avoids duplicating low-level webhook/signature docs:

- Existing product setup automation: `scripts/stripe-setup.ts`
- Existing baseline validator: `scripts/validate-stripe-config.sh`
- Existing Vercel env helper: `./set-vercel-stripe-env.sh`
- Existing webhook signature deep dive: `docs/STRIPE_WEBHOOK_SIGNATURE_VERIFICATION.md`

Use your own production domain in all endpoint/redirect examples below.
Example placeholder: `https://YOUR_PRODUCTION_DOMAIN`
Current repo production URL reference: `https://tdealer01-crypto-dsg-control-plane.vercel.app`

---

## 1) Stripe Dashboard Configuration (manual)

### 1.1 Confirm Live mode
1. Open Stripe Dashboard: https://dashboard.stripe.com
2. Toggle to **Live mode** (top-left environment switch).
3. Confirm account is activated for live processing.

### 1.2 Collect API keys
Path: **Developers → API keys**

- **Secret key**: starts with `sk_live_` (or `rk_live_` for restricted key)
- **Publishable key**: starts with `pk_live_`

Recommended: use restricted API keys (`rk_live_`) for automation where possible (least privilege).

### 1.3 Collect OAuth Client ID
Path: **Settings → Apps → [Your Stripe App]**

- **Client ID** format: `ca_...`
- Map to `NEXT_PUBLIC_STRIPE_CLIENT_ID`

### 1.4 Configure OAuth Redirect URIs
In the same App/OAuth settings page, include:

- `https://tdealer01-crypto-dsg-control-plane.vercel.app/stripe/oauth/callback`
- Any approved preview/staging callback URIs you actively use
- Local callback for manual testing (optional): `http://localhost:3000/stripe/oauth/callback`

### 1.5 Configure webhook endpoint
Use `/api/billing/webhook` for Phase 2 billing lifecycle events.

- Endpoint URL (replace with your domain): `https://YOUR_PRODUCTION_DOMAIN/api/billing/webhook`
- Signing secret value should be treated as production secret

Detailed event setup and troubleshooting are in:
`docs/STRIPE_WEBHOOK_SETUP.md`

---

## 2) Local Environment Setup (.env.local)

Run the interactive setup script:

```bash
bash scripts/setup-stripe-production.sh
```

What it does:
- Prompts for keys with hidden input (no terminal echo)
- Validates key formats
- Tests Stripe API connectivity for secret/publishable keys
- Backs up `.env.local`
- Writes/updates required keys
- Prints copy-paste-ready Vercel CLI commands

Required variables:

```bash
STRIPE_SECRET_KEY=sk_live_YOUR_KEY_HERE
STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_live_YOUR_SECRET_HERE
NEXT_PUBLIC_STRIPE_CLIENT_ID=ca_YOUR_CLIENT_ID_HERE
```

Compatibility note: script also updates `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` for existing flows that still read that variable.

---

## 3) Vercel Environment Variables (Production)

Preferred: use Vercel project secrets/environment variables (never commit real keys).

```bash
# Example from setup script output
printf '%s' 'sk_live_...' | vercel env add STRIPE_SECRET_KEY production
printf '%s' 'pk_live_...' | vercel env add STRIPE_PUBLISHABLE_KEY production
printf '%s' 'whsec_live_...' | vercel env add STRIPE_WEBHOOK_SECRET production
printf '%s' 'ca_...' | vercel env add NEXT_PUBLIC_STRIPE_CLIENT_ID production
```

Then redeploy production:

```bash
vercel --prod
```

If you already use `set-vercel-stripe-env.sh` for Stripe pricing IDs, keep using it; this setup complements that workflow.

---

## 4) Webhook Configuration (Stripe → Your App)

1. Dashboard → Developers → Webhooks → **Add endpoint**
2. URL (replace with your domain): `https://YOUR_PRODUCTION_DOMAIN/api/billing/webhook`
3. Subscribe required events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.deleted`
   - `customer.subscription.updated`
   - `invoice.payment_succeeded`
   - `charge.refunded`
4. Reveal and copy webhook signing secret
5. Set/update `STRIPE_WEBHOOK_SECRET` in local + Vercel production

For full webhook guide: `docs/STRIPE_WEBHOOK_SETUP.md`

---

## 5) Verification & Testing (automated)

Run production validation:

```bash
bash scripts/verify-stripe-production.sh
```

Validator checks:
- Required key presence
- Key format validation
- Stripe API account + products API calls
- Webhook endpoint reachability
- Signed webhook probe delivery
- Final color-coded readiness result

Optional existing checks:

```bash
bash scripts/validate-stripe-config.sh
bash scripts/test-stripe-webhook.sh --help
```

---

## Security Best Practices

- Never commit real Stripe keys to git.
- Prefer restricted keys (`rk_live_...`) for automation tasks.
- Keep live and test keys separated.
- Rotate keys after suspected exposure or personnel changes.
- Verify webhook signatures (`stripe-signature`) before processing.
- Do not log full keys or secrets.
- Use Vercel environment variables/secrets for production storage.

---

## Rollback Procedure

If production key rollout causes issues:

1. Roll back Vercel env vars to previous known-good values.
2. Redeploy production.
3. Re-run verification script.
4. If exposure suspected:
   - Immediately roll/disable compromised key in Stripe Dashboard.
   - Update Vercel + `.env.local` with rotated key.
   - Re-test webhooks and checkout flows.
5. Confirm recovery using:

```bash
bash scripts/verify-stripe-production.sh
```
