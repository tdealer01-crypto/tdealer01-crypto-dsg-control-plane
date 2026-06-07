# Environment Variables Reference

Complete documentation for all environment variables required for DSG Control Plane deployment on Vercel with Stripe integration.

**Status**: Setup-ready  
**Last Updated**: 2026-06-07  
**Scope**: 11 production environment variables with acquisition and format specifications

---

## Quick Reference Table

| Variable | Type | Required | Format | Source |
|----------|------|----------|--------|--------|
| `STRIPE_API_KEY` | Secret | Yes | `sk_live_*` | Stripe Dashboard |
| `STRIPE_PUBLISHABLE_KEY` | Public | Yes | `pk_live_*` | Stripe Dashboard |
| `STRIPE_WEBHOOK_SECRET` | Secret | Yes | `whsec_*` | Stripe Webhooks |
| `STRIPE_OAUTH_CLIENT_ID` | Public | Yes | Client ID | Stripe OAuth Apps |
| `STRIPE_OAUTH_CLIENT_SECRET` | Secret | Yes | OAuth Secret | Stripe OAuth Apps |
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Yes | `https://*.supabase.co` | Supabase Dashboard |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Yes | Base64 string | Supabase API Keys |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | Yes | Base64 string | Supabase API Keys |
| `UPSTASH_REDIS_URL` | Secret | Yes | `redis://default:*@*:6379` | Upstash Console |
| `DSG_API_KEY` | Secret | Yes | API key | DSG Control Plane |
| `NODE_ENV` | Public | Yes | `production` | Configuration |

---

## Detailed Variable Documentation

### STRIPE_API_KEY

**Purpose**: Secret API key for server-side Stripe API calls (payments, customers, invoices)

**Type**: Secret *(store in Vercel Production environment only)*

**Format**: Stripe Live Secret Key (50+ characters, starts with `sk_live_`)

**Where to Get**:

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Click **Developers** (left sidebar)
3. Click **API Keys**
4. Under **Secret Keys**, you will see:
   - Publishable key (starts with `pk_`)
   - Secret key (starts with `sk_`)
5. Copy the **Secret Key** (the one starting with `sk_live_`)
6. Click the copy icon to copy to clipboard

**Security Notes**:
- ✓ Never expose in client-side code
- ✓ Only set in Vercel **Production** environment
- ✓ Rotate keys periodically (Stripe allows creating new restricted keys)
- ✓ Use restricted keys when possible (with limited scopes)

**Example**:
```
STRIPE_API_KEY=[YOUR_STRIPE_SECRET_KEY_STARTS_WITH_sk_live_]
```

**Validation**: Must start with `sk_live_` for production or `sk_test_` for testing

---

### STRIPE_PUBLISHABLE_KEY

**Purpose**: Public key for client-side Stripe operations (Checkout, Payment Methods, embedded forms)

**Type**: Public *(safe to expose in frontend)*

**Format**: Stripe Live Publishable Key (50+ characters, starts with `pk_live_`)

**Where to Get**:

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Click **Developers** → **API Keys**
3. Under **Publishable Keys**, copy the key starting with `pk_live_`

**Security Notes**:
- ✓ OK to include in client-side JavaScript
- ✓ OK to expose in HTML/browser
- ✓ Cannot be used to access funds or sensitive data
- ✓ Used for Stripe.js initialization

**Example**:
```
STRIPE_PUBLISHABLE_KEY=[YOUR_STRIPE_PUBLISHABLE_KEY_STARTS_WITH_pk_live_]
```

**Validation**: Must start with `pk_live_` for production or `pk_test_` for testing

---

### STRIPE_WEBHOOK_SECRET

**Purpose**: Secret key for validating webhook requests from Stripe (payment confirmations, charge updates, etc.)

**Type**: Secret *(store in Vercel Production environment only)*

**Format**: Stripe Webhook Signing Secret (40+ characters, starts with `whsec_`)

**Where to Get**:

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Click **Developers** → **Webhooks**
3. Click on your endpoint (if exists) or **Add Endpoint**
   - URL: `https://your-deployment.vercel.app/api/webhook/stripe`
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

### STRIPE_OAUTH_CLIENT_ID

**Purpose**: OAuth application client ID for Stripe Connect (connecting merchant Stripe accounts)

**Type**: Public

**Format**: Client ID from OAuth app settings (20-30 characters)

**Where to Get**:

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Click **Settings** (gear icon, bottom left)
3. Click **Connected applications** or **OAuth Connected Apps**
4. Find your application or create one:
   - Click **Create application**
   - Name: Your application name
   - Type: Select your use case
5. Copy the **Client ID** from the application settings

**Example**:
```
STRIPE_OAUTH_CLIENT_ID=ca_aBcDeFgHiJkLmNoPqRsTuVwXyZ123456789
```

**Used For**: Stripe Connect flow for merchant onboarding

---

### STRIPE_OAUTH_CLIENT_SECRET

**Purpose**: OAuth secret for Stripe Connect (must be kept confidential)

**Type**: Secret *(store in Vercel Production environment only)*

**Format**: Long alphanumeric string (40+ characters)

**Where to Get**:

1. Same as above (Stripe Settings → Connected applications)
2. Click your application
3. Under **Credentials**, copy the **Client Secret**
4. Keep this secret—never expose in frontend

**Security Notes**:
- ✓ Store only in server-side environment variables
- ✓ Never log or expose in error messages
- ✓ Rotate if compromised

**Example**:
```
STRIPE_OAUTH_CLIENT_SECRET=oauth_secret_live_1234567890abcdefghijklmnopqrstuvwxyzABC
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

### UPSTASH_REDIS_URL

**Purpose**: Redis connection string for rate limiting, caching, and session storage

**Type**: Secret *(store in Vercel Production environment only)*

**Format**: `redis://default:{PASSWORD}@{HOST}:{PORT}`

**Where to Get**:

1. Go to [Upstash Console](https://console.upstash.com)
2. Click **Redis** → Your Database
3. Click **Connect**
4. Select **REST API** or **Redis CLI**
5. For **Redis CLI**, copy the **REDIS_URL** (format: `redis://...`)
6. This is the full connection string including password

**Example**:
```
UPSTASH_REDIS_URL=redis://default:ae123bcde456fgh789ijklmno@us1-happy-hamster-123456.upstash.io:6379
```

**Components**:
- `default` = username
- `ae123bcde456fgh789ijklmno` = password
- `us1-happy-hamster-123456` = host
- `6379` = port

**Security Notes**:
- ✓ Includes password—store securely
- ✓ Only set in Vercel **Production** environment
- ✓ Used by `@upstash/redis` npm package

**Alternative Usage**:
- If you prefer REST API instead of Redis protocol:
  - Use environment variables: `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
  - But the Redis URL approach is more common

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
| `STRIPE_PRICE_PRO` | Stripe price ID for Pro plan | Stripe price ID |
| `STRIPE_PRICE_BUSINESS` | Stripe price ID for Business plan | Stripe price ID |
| `OVERAGE_RATE_USD` | Metered billing overage rate | Decimal (e.g., `0.001`) |
| `ACCESS_MODE` | Access control mode | `strict`, `open`, etc. |

---

## Setup Workflow

### 1. Gather All Values

Use this checklist:

- [ ] `STRIPE_API_KEY` - from Stripe Dashboard
- [ ] `STRIPE_PUBLISHABLE_KEY` - from Stripe Dashboard
- [ ] `STRIPE_WEBHOOK_SECRET` - from Stripe Webhooks
- [ ] `STRIPE_OAUTH_CLIENT_ID` - from Stripe OAuth Apps
- [ ] `STRIPE_OAUTH_CLIENT_SECRET` - from Stripe OAuth Apps
- [ ] `NEXT_PUBLIC_SUPABASE_URL` - from Supabase Settings
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - from Supabase API Keys
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - from Supabase API Keys
- [ ] `UPSTASH_REDIS_URL` - from Upstash Console
- [ ] `DSG_API_KEY` - from DSG Control Plane
- [ ] `NODE_ENV` - set to `production`

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
**Last verified**: 2026-06-07  
**Scope**: 11 production environment variables with detailed specifications
