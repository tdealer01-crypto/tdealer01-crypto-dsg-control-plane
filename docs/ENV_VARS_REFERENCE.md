# Environment Variables Reference

Complete documentation for all environment variables required for DSG Control Plane deployment on Vercel with Stripe integration.

**Status**: Setup-ready
**Last Updated**: 2026-07-04
**Verified against**: actual `process.env.*` reads in `app/` and `lib/` (grep-audited, not guessed) — see note below
**Scope**: production environment variables with acquisition and format specifications

> **2026-07-04 correction**: an earlier version of this table used variable names (`STRIPE_API_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_OAUTH_CLIENT_ID`, `STRIPE_OAUTH_CLIENT_SECRET`, `UPSTASH_REDIS_URL`) that the running code never reads. Setting env vars under those old names has no effect. The table below matches what the code actually reads.

---

## Quick Reference Table

| Variable | Type | Required | Format | Source |
|----------|------|----------|--------|--------|
| `STRIPE_SECRET_KEY` | Secret | Yes | `sk_live_*` | Stripe Dashboard |
| `STRIPE_WEBHOOK_SECRET` | Secret | Yes | `whsec_*` | Stripe Webhooks |
| `NEXT_PUBLIC_STRIPE_CLIENT_ID` | Public | Only if using Stripe Connect install flow | `ca_*` | Stripe Dashboard → Apps |
| `STRIPE_CLIENT_SECRET` | Secret | Only if using Stripe Connect install flow | OAuth Secret | Stripe Dashboard → Apps |
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Yes | `https://*.supabase.co` | Supabase Dashboard |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Yes | Base64 string | Supabase API Keys |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | Yes | Base64 string | Supabase API Keys |
| `UPSTASH_REDIS_REST_URL` | Secret | Recommended (rate limiting) | `https://*.upstash.io` | Upstash Console → REST API |
| `UPSTASH_REDIS_REST_TOKEN` | Secret | Recommended (rate limiting) | Long token string | Upstash Console → REST API |
| `DSG_API_KEY` | Secret | Yes (or `DSG_CORE_API_KEY`) | API key | DSG Control Plane |
| `ZAPIER_WEBHOOK_SECRET` | Secret | Yes (for Zapier revenue automation) | Random string, 32+ chars | Self-generated, shared with your Zapier "Code by Zapier" step |
| `NODE_ENV` | Public | Yes | `production` | Configuration |

Live check anytime, no guessing: `GET /api/setup/status` reports `true`/`false` per category (Supabase/Stripe/Anthropic/GitHub) from the running production deployment.

---

## Detailed Variable Documentation

### STRIPE_SECRET_KEY

**Purpose**: Secret API key for server-side Stripe API calls (checkout sessions, payments, customers, invoices). Read via `process.env.STRIPE_SECRET_KEY` in 20+ routes across `app/api/billing/**`, `app/api/marketplace/**`, `app/api/webhooks/**`, `lib/stripe-products.ts`, `lib/billing/**`.

**Type**: Secret *(store in Vercel Production environment only)*

**Format**: Stripe Live Secret Key (starts with `sk_live_`)

**Where to Get**:

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Click **Developers** (left sidebar)
3. Click **API Keys**
4. Under **Secret Keys**, copy the key starting with `sk_live_` (or `sk_test_` for sandbox)

**Security Notes**:
- ✓ Never expose in client-side code
- ✓ Only set in Vercel **Production** environment
- ✓ Rotate keys periodically (Stripe allows creating new restricted keys)
- ✓ Use restricted keys when possible (with limited scopes)
- Sandbox/test-mode calls use `STRIPE_SANDBOX_SECRET_KEY` instead (see `lib/stripe-app/oauth-config.ts`)

**Example**:
```
STRIPE_SECRET_KEY=[YOUR_STRIPE_SECRET_KEY_STARTS_WITH_sk_live_]
```

**Validation**: Must start with `sk_live_` for production or `sk_test_` for testing

**Note on price IDs**: `app/api/billing/checkout/route.ts` also has hardcoded fallback price IDs for pro/business/enterprise plans that are verified-live in the connected Stripe account, so checkout works even before `STRIPE_PRICE_*` env vars are set. Setting `STRIPE_PRICE_PRO_MONTHLY`/`_YEARLY`, `STRIPE_PRICE_BUSINESS_MONTHLY`/`_YEARLY`, `STRIPE_PRICE_ENTERPRISE_MONTHLY`/`_YEARLY` (or the legacy `STRIPE_PRICE_PRO`/`STRIPE_PRICE_BUSINESS`) overrides those defaults but is optional.

---

### STRIPE_PUBLISHABLE_KEY (not currently required)

No route in this codebase reads `process.env.STRIPE_PUBLISHABLE_KEY` (grep-verified against `app/` and `lib/`). Checkout uses redirect-based Stripe Checkout Sessions (`stripe.checkout.sessions.create`), which does not need a publishable key server- or client-side. The only reference in the repo is a static display list in `app/marketplace/deploy/page.tsx`. Do not spend time setting this unless you add Stripe.js/Elements to the client.

---

### STRIPE_WEBHOOK_SECRET

**Purpose**: Secret key for validating webhook requests from Stripe (payment confirmations, charge updates, etc.)

**Type**: Secret *(store in Vercel Production environment only)*

**Format**: Stripe Webhook Signing Secret (40+ characters, starts with `whsec_`)

**Where to Get**:

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Click **Developers** → **Webhooks**
3. Click on your endpoint (if exists) or **Add Endpoint**
   - URL: `https://your-deployment.vercel.app/api/webhooks/stripe` (per `.env.example`; `app/api/billing/webhook` and `app/api/stripe/webhook` also read the same `STRIPE_WEBHOOK_SECRET` if you register additional endpoints there)
   - Events: Select all relevant events (charge.*, customer.*, invoice.*)
4. Click the endpoint
5. Under **Signing secret**, click **Reveal**
6. Copy the secret (starts with `whsec_`)

**Security Notes**:
- ✓ Store securely (Vercel encrypted storage)
- ✓ Used to verify webhook authenticity
- ✓ Never expose in logs or error messages
- ✓ Rotate if compromised (Stripe allows rekeying)

**Example**:
```
STRIPE_WEBHOOK_SECRET=[YOUR_WEBHOOK_SIGNING_SECRET_STARTS_WITH_whsec_]
```

---

### ZAPIER_WEBHOOK_SECRET

**Purpose**: Verifies that `POST /api/webhooks/zapier/{revenue,quota,communication}` requests actually came from your Zapier Zaps, not an anonymous caller. The route rejects with 401 when the `x-zapier-signature` header doesn't match, or fails closed (also 401) when this variable is unset.

**Type**: Secret *(store in Vercel Production environment only)*

**Format**: Any random string, 32+ characters (e.g. generate with `openssl rand -hex 32`)

**Where to Get**: You generate this value yourself — it isn't issued by Zapier. Set the same value in Vercel and in your Zap.

**Setup**:

1. Generate a secret: `openssl rand -hex 32`
2. Set it on Vercel as `ZAPIER_WEBHOOK_SECRET`
3. In each Zap that calls the control plane, add a **Code by Zapier** step *before* the "Webhooks by Zapier" POST action that computes:
   ```js
   const crypto = require('crypto');
   const signature = crypto.createHmac('sha256', 'YOUR_SECRET').update(JSON.stringify(inputData.body)).digest('hex');
   output = [{ signature }];
   ```
4. Reference `{{signature}}` as the `x-zapier-signature` header value on the webhook action, and ensure the POST body sent is byte-for-byte the same JSON string that was hashed.

**Security Notes**:
- ✓ Never commit this value to git or print it in logs
- ✓ Rotate by generating a new value and updating both Vercel and the Zap's Code step together (mismatched values fail closed, not open)

**Example**:
```
ZAPIER_WEBHOOK_SECRET=[YOUR_RANDOM_32+_CHAR_SECRET]
```

**Validation**: Must start with `whsec_`

**Required Events** (configure in Stripe Webhooks):
- `charge.succeeded`
- `charge.failed`
- `charge.refunded`
- `customer.created`
- `customer.updated`
- `customer.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

---

### NEXT_PUBLIC_STRIPE_CLIENT_ID

**Purpose**: Client ID for the DSG Governance Gate Stripe App install/connect flow. Read via `resolveStripeClientId()` in `lib/stripe-app/oauth-config.ts` as `process.env.STRIPE_CONNECT_CLIENT_ID || process.env.NEXT_PUBLIC_STRIPE_CLIENT_ID` (sandbox mode uses `STRIPE_SANDBOX_CONNECT_CLIENT_ID` / `NEXT_PUBLIC_STRIPE_SANDBOX_CLIENT_ID` instead).

**Type**: Public

**Format**: Client ID (starts with `ca_`)

**Where to Get**:

1. Go to [Stripe Dashboard](https://dashboard.stripe.com) → Settings → Apps → your app
2. Copy the **Client ID**

**Required only if** you're using the Stripe App install/Connect flow (`app/api/stripe-app/oauth/**`, `app/api/stripe/connect/install`). Not required for plain checkout/billing.

**Example**:
```
NEXT_PUBLIC_STRIPE_CLIENT_ID=ca_aBcDeFgHiJkLmNoPqRsTuVwXyZ123456789
```

---

### STRIPE_CLIENT_SECRET

**Purpose**: Documented in `.env.example` for server-side OAuth token exchange (code → access_token) for the Stripe App install flow.

**Type**: Secret *(store in Vercel Production environment only)*

**Where to Get**: Stripe Dashboard → Settings → Apps → your app → Client Secret

**Verification note**: grep of `app/api/stripe-app/oauth/callback/route.ts` shows the current callback verifies a signed HMAC state (`STRIPE_CONNECT_STATE_SECRET` / `NEXTAUTH_SECRET` / `AUTH_SECRET`) and resolves the account secret key directly — it does not currently perform an explicit `client_secret` code-exchange call. Set this only if you are implementing/maintaining that exchange; it is not read anywhere else in the codebase today.

**Example**:
```
STRIPE_CLIENT_SECRET=[YOUR_STRIPE_APP_CLIENT_SECRET]
```

---

## SUPABASE_URL (NEXT_PUBLIC_SUPABASE_URL)

**Purpose**: Base URL for Supabase API calls from client and server

**Type**: Public *(NEXT_PUBLIC_ prefix means it's visible in browser)*

**Format**: `https://{PROJECT_ID}.supabase.co`

**Where to Get**:

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Click **Settings** (left sidebar)
4. Click **General**
5. Copy the **Project URL** (format: `https://xxxxx.supabase.co`)

**Example**:
```
NEXT_PUBLIC_SUPABASE_URL=https://abc123def456.supabase.co
```

**Security Notes**:
- ✓ OK to expose (used in browser for authentication)
- ✓ Only allows reading public data and authenticated user data
- ✓ RLS (Row Level Security) policies control actual access

---

### NEXT_PUBLIC_SUPABASE_ANON_KEY

**Purpose**: Public API key for client-side Supabase authentication and data access

**Type**: Public *(NEXT_PUBLIC_ prefix means it's visible in browser)*

**Format**: Long base64 string (130+ characters)

**Where to Get**:

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Click **Settings** → **API**
4. Under **API Keys**, look for the table with:
   - `service_role` (secret, do not expose)
   - `anon` (public, safe to expose)
5. Copy the **anon** key

**Example**:
```
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiYzEyM2RlZjQ1NiIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjE5MjAwMDAwMDB9.xxxxxxxxxxx
```

**Security Notes**:
- ✓ Safe to expose in frontend
- ✓ Limited by RLS policies to public data only
- ✓ Cannot access `service_role` data
- ✓ Cannot modify policies or schema

**Difference from Service Role Key**: 
- `anon` key = limited, browser-safe, read public data
- `service_role` key = privileged, never expose, can modify anything

---

### SUPABASE_SERVICE_ROLE_KEY

**Purpose**: Secret API key for privileged server-side Supabase operations (creating users, modifying data, bypassing RLS)

**Type**: Secret *(store in Vercel Production environment only)*

**Format**: Long base64 string, longer than anon key (130+ characters)

**Where to Get**:

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Click **Settings** → **API**
4. Under **API Keys**, find the **service_role** key
5. Copy it (you may need to click a "reveal" button)

**Security Notes**:
- ✗ NEVER expose in client-side code
- ✗ NEVER log or commit to Git
- ✓ Only use on server-side (Next.js API routes)
- ✓ Store in Vercel **Production environment only**
- ✓ Can modify any data, bypass RLS, create users

**Example**:
```
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiYzEyM2RlZjQ1NiIsInJvbGUiOiJzZXJ2aWNlX3JvbGUiLCJpYXQiOjE2MDAwMDAwMDAsImV4cCI6MTkyMDAwMDAwMH0.xxxxxxxxxxxxx
```

**Difference from Anon Key**:
- Service role = can do anything (administrator)
- Anon = limited to public data only (regular user)

---

### UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN

**Purpose**: Upstash REST API credentials for rate limiting. Read via `process.env.UPSTASH_REDIS_REST_URL` and `process.env.UPSTASH_REDIS_REST_TOKEN` in `lib/security/rate-limit.ts`. **Only these two REST-style vars are read** — the plain `UPSTASH_REDIS_URL` (`redis://...`) connection-string format is never read anywhere in this codebase; setting it has no effect.

**Type**: Secret *(store in Vercel Production environment only)*

**Format**: `UPSTASH_REDIS_REST_URL=https://{name}.upstash.io`, `UPSTASH_REDIS_REST_TOKEN={token}`

**Where to Get**:

1. Go to [Upstash Console](https://console.upstash.com)
2. Click **Redis** → your database → **Connect**
3. Select **REST API** tab (not "Redis CLI"/ioredis)
4. Copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` exactly as shown

**Example**:
```
UPSTASH_REDIS_REST_URL=https://us1-happy-hamster-123456.upstash.io
UPSTASH_REDIS_REST_TOKEN=AbCdEf123...
```

**Security Notes**:
- ✓ Token grants full access to the Redis database — store securely
- ✓ Only set in Vercel **Production** environment
- If unset, `lib/security/rate-limit.ts` logs a warning and falls back to in-memory rate limiting (works, but does not share state across serverless instances)

---

### DSG_API_KEY

**Purpose**: Authentication key for DSG Control Plane API calls (policy evaluation, governance decisions)

**Type**: Secret *(store in Vercel Production environment only)*

**Format**: API key format (variable length, typically 30-50 characters)

**Where to Get**:

1. If you're running DSG Control Plane:
   - Generate a key in your DSG Control Plane admin panel, or
   - Use the DSG CLI to create API keys
2. If you're integrating with external DSG:
   - Request from your DSG provider

**Example**:
```
DSG_API_KEY=dsg_live_abc123def456ghi789jkl
```

**Security Notes**:
- ✓ Store securely (never commit to Git)
- ✓ Only set in Vercel **Production** environment
- ✓ Used for server-side API calls
- ✓ Rotate periodically

**Related Variables**:
- `DSG_CORE_MODE`: Set to `remote` if using external DSG Core
- `DSG_CORE_URL`: URL to remote DSG Core (if remote mode)

---

### NODE_ENV

**Purpose**: Indicates to Node.js and Next.js which environment this is running in

**Type**: Configuration

**Format**: One of: `development`, `test`, `production`

**For Production Deployment**: Set to `production`

**Example**:
```
NODE_ENV=production
```

**What It Does**:
- Disables Next.js verbose logging
- Enables code optimization
- Affects error reporting (less verbose in production)
- Enables minification and tree-shaking
- Stripe uses this to know whether to validate keys (will reject `sk_test_` in production mode)

**Security Notes**:
- ✓ Set to `production` for Vercel deployment
- ✓ Development features are disabled in production mode
- ✓ Affects security header behavior (e.g., CSP in production is stricter)

---

## Optional Configuration Variables

These are not required for basic deployment but enable additional features:

| Variable | Purpose | Format |
|----------|---------|--------|
| `DSG_CORE_MODE` | Internal or remote DSG Core | `internal` or `remote` |
| `DSG_CORE_URL` | URL to remote DSG Core | `https://...` |
| `APP_URL` | Server-side canonical app URL | `https://...` |
| `NEXT_PUBLIC_APP_URL` | Client-side canonical app URL | `https://...` |
| `STRIPE_PRICE_PRO_MONTHLY` / `_YEARLY` | Stripe price ID for Pro plan (or legacy `STRIPE_PRICE_PRO` for monthly) | Stripe price ID |
| `STRIPE_PRICE_BUSINESS_MONTHLY` / `_YEARLY` | Stripe price ID for Business plan (or legacy `STRIPE_PRICE_BUSINESS` for monthly) | Stripe price ID |
| `STRIPE_PRICE_ENTERPRISE_MONTHLY` / `_YEARLY` | Stripe price ID for Enterprise plan | Stripe price ID |
| `OVERAGE_RATE_USD` | Metered billing overage rate | Decimal (e.g., `0.001`) |
| `ACCESS_MODE` | Access control mode | `strict`, `open`, etc. |

---

## Setup Workflow

### 1. Gather All Values

Use this checklist:

- [ ] `STRIPE_SECRET_KEY` - from Stripe Dashboard
- [ ] `STRIPE_WEBHOOK_SECRET` - from Stripe Webhooks
- [ ] `NEXT_PUBLIC_STRIPE_CLIENT_ID` / `STRIPE_CLIENT_SECRET` - only if using the Stripe App install flow
- [ ] `NEXT_PUBLIC_SUPABASE_URL` - from Supabase Settings
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - from Supabase API Keys
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - from Supabase API Keys
- [ ] `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` - from Upstash Console (REST API tab)
- [ ] `DSG_API_KEY` (or `DSG_CORE_API_KEY`) - from DSG Control Plane
- [ ] `NODE_ENV` - set to `production`

After setting these, verify live (no guessing) with:
```bash
curl -fsSL https://tdealer01-crypto-dsg-control-plane.vercel.app/api/setup/status
```

### 2. Add to Vercel

In Vercel dashboard:

1. Go to **Settings** → **Environment Variables**
2. For each variable:
   - Click **Add New**
   - Enter **Name** (variable name exactly as shown)
   - Enter **Value** (copied from source)
   - For **sensitive** variables (STRIPE_API_KEY, SUPABASE_SERVICE_ROLE_KEY, etc.):
     - Select **Production** environment only
     - Do not add to Preview
   - For **public** variables (NEXT_PUBLIC_*, NODE_ENV):
     - You can add to Production and Preview
   - Click **Save**

### 3. Verify

Run verification script:

```bash
bash scripts/setup-vercel-env.sh
```

Expected output:
```
✓ All critical checks passed!
```

### 4. Deploy

In Vercel dashboard or CLI:

```bash
vercel --prod
```

Monitor build logs. Build should complete successfully.

---

## Troubleshooting

### Variable Not Being Recognized

1. Check spelling (case-sensitive)
2. Confirm it's added to **Production** environment
3. Refresh Vercel dashboard
4. Redeploy: `vercel --prod`

### Format Errors

1. Run: `bash scripts/setup-vercel-env.sh`
2. Check format warnings
3. Copy value again from source (avoid extra spaces)

### Build Still Failing

1. Check Vercel build logs
2. Look for specific missing variable
3. Add variable in Vercel console
4. Redeploy: `vercel --prod`

### Security Issues

1. Never commit `.env.local` or secrets to Git
2. Never paste secrets in logs or error messages
3. Use Vercel's encrypted variable storage only
4. Rotate secrets periodically

---

## Security Best Practices

### Do's ✓

- Store secrets in Vercel encrypted storage
- Use different keys for development vs. production
- Use restricted API keys when possible
- Rotate keys periodically
- Audit key usage in Stripe/Supabase dashboards
- Keep service role key confidential

### Don'ts ✗

- Never commit `.env.production.local` to Git
- Never expose service role keys in client-side code
- Never log secret values
- Never share API keys in emails or chat
- Never use test keys in production
- Never hardcode keys in source code

---

## Reference Links

- **Stripe API Keys**: https://stripe.com/docs/keys
- **Stripe Webhooks**: https://stripe.com/docs/webhooks
- **Supabase API Keys**: https://supabase.com/docs/guides/api
- **Supabase Auth**: https://supabase.com/docs/auth/overview
- **Upstash Redis**: https://upstash.com/docs/redis/overall/getstarted
- **Vercel Env Vars**: https://vercel.com/docs/projects/environment-variables
- **Next.js Security**: https://nextjs.org/docs/deployment/production-checklist

---

## Support

For issues:

1. Check `docs/DEPLOYMENT_VERCEL_SETUP.md` for setup instructions
2. Run `bash scripts/setup-vercel-env.sh` to validate
3. Check `docs/VERCEL_TROUBLESHOOTING.md` for advanced issues
4. Review Vercel build logs
5. Contact respective service providers (Stripe, Supabase, Upstash)

---

**Status**: Setup-ready
**Last verified against code**: 2026-07-04 (grep-audited `process.env.*` reads in `app/` and `lib/`)
