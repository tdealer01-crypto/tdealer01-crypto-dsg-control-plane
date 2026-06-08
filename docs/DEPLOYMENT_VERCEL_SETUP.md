# Vercel Deployment Setup Guide for DSG Control Plane

Complete step-by-step instructions for setting up and deploying the DSG ONE / ProofGate Control Plane on Vercel with Stripe integration.

**Document Status**: Setup-ready  
**Last Updated**: 2026-06-07  
**Scope**: Vercel project creation, configuration, environment setup, and build verification

---

## Prerequisites

Before starting, ensure you have:

- GitHub account with access to `tdealer01-crypto-dsg-control-plane` repository
- Vercel account (free or paid)
- Stripe account with API keys
- Supabase project with:
  - Project URL
  - Anon key (public)
  - Service role key (secret)
- Upstash Redis instance (for rate limiting)
- DSG API key (if using remote DSG Core mode)

---

## Part 1: Vercel Project Creation

### Step 1.1: Import Repository

1. Go to https://vercel.com/dashboard
2. Click **"Add New..."** → **"Project"**
3. Select **"Import Git Repository"**
4. Search for and select `tdealer01-crypto-dsg-control-plane`
5. Click **"Import"**

### Step 1.2: Configure Project Settings

**Project Name**: Use default or customize (e.g., `dsg-control-plane`)

**Framework Preset**: Automatically detected as **Next.js** ✓

**Root Directory**: Leave as `.` (current directory)

**Build & Development Settings**:
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm ci`

**Node.js Version**: Select **20.x LTS** or latest stable

Click **"Deploy"** to proceed (deployment will fail until env vars are configured—this is expected).

### Step 1.3: Wait for Initial Deployment

The first deployment will fail with environment variable warnings. This is expected. Monitor the deployment logs to confirm you see messages like:

```
error: STRIPE_API_KEY is required
error: SUPABASE_URL is required
```

This confirms the build process is checking for required variables.

---

## Part 2: Build Settings Configuration

### Step 2.1: Verify Framework Settings

In Vercel dashboard:

1. Go to **Settings** → **General**
2. Confirm:
   - **Framework**: Next.js
   - **Build Command**: `npm run build`
   - **Development Command**: `npm run dev`
   - **Install Command**: `npm ci`
   - **Node.js Version**: 20.x LTS

### Step 2.2: Configure Build Caching

1. Go to **Settings** → **Build Cache**
2. Select **"Automatic"** (default)
3. This caches `node_modules` and `.next` across deployments for faster builds

### Step 2.3: Set Environment Aliases

1. Go to **Settings** → **Environments**
2. Ensure three environments are created:
   - **Production** (main branch)
   - **Preview** (pull requests)
   - **Development** (local, uses `.env.local`)

---

## Part 3: Environment Variables Configuration

### Step 3.1: Access Environment Variables

1. In Vercel dashboard, go to **Settings** → **Environment Variables**
2. You'll add variables here for all three environments (Production, Preview, Development)

### Step 3.2: Add Required Environment Variables

For **Production** environment, add each variable and its value:

#### Stripe Configuration (Required)

| Variable | Format | Source | Example |
|----------|--------|--------|---------|
| `STRIPE_API_KEY` | Live secret key | Stripe Dashboard → Developers → API Keys (Secret Key) | `[YOUR_STRIPE_SECRET_KEY]` |
| `STRIPE_PUBLISHABLE_KEY` | Live publishable key | Stripe Dashboard → Developers → API Keys (Publishable Key) | `[YOUR_STRIPE_PUBLISHABLE_KEY]` |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret | Stripe Dashboard → Developers → Webhooks → Endpoint Secret | `[YOUR_WEBHOOK_SIGNING_SECRET]` |
| `STRIPE_OAUTH_CLIENT_ID` | Client ID from OAuth app | Stripe Dashboard → Settings → OAuth Connected Apps | `ca_Axxxxxxxxxx` |
| `STRIPE_OAUTH_CLIENT_SECRET` | OAuth secret | Stripe Dashboard → Settings → OAuth Connected Apps | `oauth_secret_...` |

#### Supabase Configuration (Required)

| Variable | Format | Source | Example |
|----------|--------|--------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` | Supabase Dashboard → Project Settings → General → Project URL | `https://abc123.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Long base64 string | Supabase Dashboard → Project Settings → API → `anon` key | `eyJhbGc...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Long base64 string (secret) | Supabase Dashboard → Project Settings → API → `service_role` key | `eyJhbGc...` (longer) |

#### Rate Limiting & Redis Configuration (Required)

| Variable | Format | Source | Example |
|----------|--------|--------|---------|
| `UPSTASH_REDIS_URL` | `redis://default:password@host:port` | Upstash Console → Databases → Your Database → REST API → REDIS_URL | `redis://default:***@us1-happy-hamster.upstash.io:6379` |

#### DSG Control Plane Configuration (Required)

| Variable | Value | Source |
|----------|-------|--------|
| `DSG_API_KEY` | Your API key | DSG Control Plane deployment |
| `DSG_CORE_MODE` | `internal` or `remote` | Configuration choice (internal = no external dependency) |
| `DSG_CORE_URL` | URL to remote core (if `remote` mode) | Remote DSG Core deployment |
| `NODE_ENV` | `production` | Production marker |

#### App URL Configuration (Required)

| Variable | Value | Notes |
|----------|-------|-------|
| `NEXT_PUBLIC_APP_URL` | `https://dsg-control-plane.vercel.app` | Public URL (your Vercel domain) |
| `APP_URL` | `https://dsg-control-plane.vercel.app` | Server-side URL for redirects |

### Step 3.3: Step-by-Step Variable Addition

For each variable, in Vercel dashboard:

1. Click **"Add New"**
2. Enter **Name** (e.g., `STRIPE_API_KEY`)
3. Enter **Value** (paste the actual secret/key)
4. Select **Environments**: Choose `Production` (and `Preview` if you want staging access)
5. Click **"Save"**

**Security best practices**:
- ✓ Never paste secrets into pull requests
- ✓ Never commit `.env.local` or `.env.production` to Git
- ✓ Use Vercel's encrypted storage only
- ✓ Mark sensitive variables for Production only (not Preview)
- ✓ For Stripe secrets (`STRIPE_API_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_OAUTH_CLIENT_SECRET`), set for **Production only**
- ✓ For Stripe public keys (`STRIPE_PUBLISHABLE_KEY`, `STRIPE_OAUTH_CLIENT_ID`), you may enable Preview if testing checkout flows

### Step 3.4: Verify All Variables Are Set

After adding all 11 variables, run:

```bash
vercel env ls production
```

You should see all variables listed. Confirm count is 11 (or more if you added optional vars).

---

## Part 4: Build and Deployment Verification

### Step 4.1: Trigger a Rebuild

1. In Vercel dashboard, go to **Deployments**
2. Find the latest deployment (likely still in error state)
3. Click **"Redeploy"** → **"With current Production environment variables"**
4. Wait for build to complete (typically 2-5 minutes)

### Step 4.2: Monitor Build Logs

1. Click the deployment to view logs
2. Look for:
   - ✓ `info: Compiled successfully`
   - ✓ `info: Prerendered X static routes with `next build``
   - ✓ `info: Ready in X.XXXs`

If you see errors like `STRIPE_API_KEY is required`, verify the variable was saved:
- Refresh Vercel dashboard
- Confirm the variable appears in **Settings → Environment Variables**

### Step 4.3: Verify Deployment Status

When build completes:
- Status should be **"Ready"** (green checkmark)
- Click the URL to visit your deployment
- You should see the DSG Control Plane homepage

---

## Part 5: Post-Deployment Verification

### Step 5.1: Health Check API

Visit your deployment URL and test the public health endpoint:

```bash
curl -fsSL "https://your-deployment.vercel.app/api/health"
```

Expected response:

```json
{
  "status": "ok",
  "timestamp": "2026-06-07T12:00:00Z",
  "environment": "production"
}
```

### Step 5.2: Agent Status Check

```bash
curl -fsSL "https://your-deployment.vercel.app/api/agent/status"
```

Expected response includes:
- `"status": "ok"` or `"status": "ready"`
- Current deployed commit hash
- Database connectivity indicator

### Step 5.3: Test Stripe Integration (Optional)

If you want to verify Stripe integration is working:

1. Visit the **Billing** or **Pricing** page on your deployment
2. Attempt to initiate a checkout flow (don't complete)
3. Check Stripe Dashboard → Developers → Events to confirm webhook was triggered

### Step 5.4: Run Local Verification Script

After deploying, you can run the verification script locally:

```bash
bash scripts/setup-vercel-env.sh
```

This validates all environment variables are correctly formatted.

---

## Part 6: Supabase Schema Deployment

### Step 6.1: Apply Migrations to Production Supabase

Supabase migrations should be applied **before or immediately after** Vercel deployment.

From your local machine with Supabase CLI installed:

```bash
supabase link --project-id your_supabase_project_id
supabase db push
```

Or use the Supabase web console:

1. Go to Supabase Dashboard → SQL Editor
2. Run migrations from `supabase/migrations/` directory in order

### Step 6.2: Regenerate TypeScript Types (If Schema Changed)

If you updated any migrations:

```bash
SUPABASE_PROJECT_ID=your_project_id npm run db:types
```

Commit the updated `lib/database.types.ts` and re-deploy to Vercel.

---

## Part 7: Security Configuration

### Step 7.1: Security Headers

The `next.config.js` file automatically configures security headers:

- Content Security Policy (CSP)
- X-Frame-Options: DENY
- Strict-Transport-Security (HSTS)
- Cross-Origin-Opener-Policy

These are applied automatically on Vercel. No additional configuration needed.

### Step 7.2: Stripe Webhook Configuration

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click **"Add Endpoint"**
3. Enter your endpoint URL: `https://your-deployment.vercel.app/api/webhook/stripe`
4. Select events to listen to:
   - `charge.succeeded`
   - `charge.failed`
   - `customer.created`
   - `customer.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Click **"Add endpoint"**
6. Copy the signing secret (starts with `whsec_`)
7. Update `STRIPE_WEBHOOK_SECRET` in Vercel environment variables

### Step 7.3: CORS Configuration

CORS is handled at the route level. Update allowed origins in Vercel:

```bash
vercel env add DSG_ALLOWED_ORIGINS production
```

Value example: `https://trusted-domain.com,https://another-domain.com`

---

## Part 8: Cron Jobs Configuration

The `vercel.json` file defines scheduled cron jobs. These are automatically enabled on:

- **Pro plan and above**: Cron jobs run as configured
- **Hobby plan**: Cron jobs require manual setup via Vercel Integration Marketplace

### Cron Jobs Included

| Endpoint | Schedule | Purpose |
|----------|----------|---------|
| `/api/cron/flush-meter-outbox` | 0 0 * * * (midnight) | Flush billing meter outbox |
| `/api/cron/usage-alerts` | 0 7 * * * (7am UTC) | Send usage alerts to users |
| `/api/cron/github-leads` | 0 8 * * * (8am UTC) | Process GitHub leads |
| `/api/cron/marketing-agent` | 0 7 * * * (7am UTC) | Marketing automation |
| `/api/cron/lead-followup` | 0 10 * * * (10am UTC) | Lead follow-up emails |
| `/api/cron/drip-emails` | 0 9 * * * (9am UTC) | Drip email campaigns |
| `/api/cron/trial-invite` | 0 11 * * * (11am UTC) | Trial invitations |
| `/api/cron/agent-orchestrator` | 0 6 * * * (6am UTC) | Agent orchestration |
| `/api/cron/agent-health-check` | 0 12 * * * (noon UTC) | Agent health monitoring |
| `/api/health-check-cron` | 0 2 * * * (2am UTC) | General health check |
| `/api/cron/week3-campaign-pulse` | 0 9 * * * (9am UTC) | Campaign pulse tracking |

If using Hobby plan, you can set up external cron service (e.g., EasyCron, Cronitor) to call these endpoints.

---

## Part 9: Monitoring and Debugging

### Step 9.1: View Deployment Logs

In Vercel dashboard:

1. Go to **Deployments**
2. Click the deployment
3. Click **"Build Logs"** to see compilation output
4. Click **"Function Logs"** to see runtime logs (api routes, cron jobs)

### Step 9.2: Environment Variable Troubleshooting

If build fails with `Missing environment variable` error:

1. Verify variable is added in Vercel console
2. Check spelling and case (variables are case-sensitive)
3. Confirm variable is assigned to the **Production** environment
4. Redeploy after adding/fixing variable:
   ```bash
   vercel --prod
   ```

### Step 9.3: Common Build Errors

**Error**: `STRIPE_API_KEY is required`
- **Solution**: Add `STRIPE_API_KEY` variable to Production environment

**Error**: `Cannot find Supabase configuration`
- **Solution**: Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Error**: `Redis connection failed`
- **Solution**: Verify `UPSTASH_REDIS_URL` is set and correct format

**Error**: `Build timed out`
- **Solution**: This is rare. Check if there are dependency conflicts. Run locally:
  ```bash
  npm ci && npm run build
  ```

---

## Part 10: Preview/Staging Deployments

### Step 10.1: Enable Preview Environment Variables

For testing with real Stripe keys before production:

1. Go to **Settings → Environment Variables**
2. For sensitive variables like `STRIPE_WEBHOOK_SECRET`:
   - Keep them **Production only**
3. For testable variables like `STRIPE_PUBLISHABLE_KEY`:
   - You can enable for **Production** and **Preview**

### Step 10.2: Deploy to Preview

Create a pull request against `main` branch:

1. Push your feature branch to GitHub
2. Open a pull request
3. Vercel automatically creates a preview deployment
4. Test changes without affecting production
5. After review and approval, merge to `main`
6. Vercel automatically deploys to production

---

## Part 11: Troubleshooting Checklist

Use this checklist if deployment fails:

- [ ] Repository is linked to Vercel project
- [ ] Framework is set to **Next.js**
- [ ] Build command is `npm run build`
- [ ] Install command is `npm ci`
- [ ] Node.js version is 20.x LTS or later
- [ ] All 11 required environment variables are set
- [ ] Environment variables are assigned to **Production** environment
- [ ] Variable names are spelled correctly (case-sensitive)
- [ ] Variable values do not have extra spaces or quotes
- [ ] Stripe keys start with `sk_live_` (secret) or `pk_live_` (publishable)
- [ ] Supabase URL is valid HTTPS URL
- [ ] Supabase keys are long base64 strings
- [ ] Upstash Redis URL follows `redis://` protocol
- [ ] `DSG_API_KEY` and related values are provided
- [ ] `NODE_ENV` is set to `production`
- [ ] Run `npm run build` locally to confirm no local errors
- [ ] Check Vercel build logs for specific error messages
- [ ] If still stuck, run verification script: `bash scripts/setup-vercel-env.sh`

---

## Part 12: Next Steps After Successful Deployment

1. **Configure DNS** (optional):
   - To use custom domain, add in Vercel Settings → Domains
   - Add domain DNS records as instructed by Vercel

2. **Set up error tracking** (optional):
   - Enable Sentry integration (configured in `package.json`)

3. **Monitor production** (optional):
   - Enable Vercel Analytics (already in dependencies)
   - Set up uptime monitoring via external service

4. **Ongoing maintenance**:
   - Review build logs weekly
   - Monitor cron job execution
   - Keep dependencies updated: `npm audit` and `npm update`

5. **Security hardening** (optional):
   - Add IP allowlist in Vercel (Pro plan)
   - Enable Vercel's Analytics security features
   - Set up WAF rules (Pro plan)

---

## Additional Resources

- **Vercel Documentation**: https://vercel.com/docs
- **Next.js Deployment**: https://nextjs.org/docs/deployment
- **Stripe Integration**: https://stripe.com/docs/stripe-cli
- **Supabase Migrations**: https://supabase.com/docs/guides/migrations/intro
- **Repository RUNBOOK**: See `docs/RUNBOOK_DEPLOY.md` for control plane-specific deployment details

---

## Support

For deployment issues:

1. Check `docs/RUNBOOK_DEPLOY.md` for control plane-specific guidance
2. Check `docs/VERCEL_TROUBLESHOOTING.md` for advanced troubleshooting
3. Review Vercel build logs for specific errors
4. Check repository GitHub Issues for similar problems
5. Run `bash scripts/setup-vercel-env.sh` to validate environment

---

**Status**: Setup-ready  
**Last verified**: 2026-06-07  
**Scope**: Complete Vercel deployment with Stripe and Supabase integration
