# CI/CD Environment Secrets Setup Guide

This guide provides step-by-step instructions for configuring GitHub Actions secrets required for full CI/CD pipeline operation in the DSG control plane.

## Overview

The DSG control plane requires **25+ environment variables/secrets** to enable:
- Security scanning (npm audit, Gitleaks, CodeQL, SBOM)
- Database operations (Supabase/Neon)
- Deployment (Vercel)
- Billing (Stripe)
- Notifications (Resend, Telegram)
- Blockchain integration (Solana)

**Current Status:** Workflows gracefully fall back to placeholder values for local testing, but live DB operations and production deployments require real secrets.

---

## Required Secrets by Category

### ✅ Database (Supabase) — CRITICAL for CI

These 3 secrets are required for integration tests and live database operations.

| Secret | Source | Format | Example |
|--------|--------|--------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard | URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → API → Public Key | JWT key | `eyJhbGc...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → API → Service Role Key | JWT key | `eyJhbGc...` |

**Steps to obtain Supabase secrets:**

1. Visit [supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your DSG Control Plane project
3. Go to **Settings** → **API**
4. Find and copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role secret** → `SUPABASE_SERVICE_ROLE_KEY`

### ⚠️ Deployment (Vercel) — Optional for Preview Deployments

Required only when using Vercel CLI for manual deployments or custom CI steps.

| Secret | Source | Format |
|--------|--------|--------|
| `VERCEL_TOKEN` | Vercel Dashboard → Settings → Tokens | Long alphanumeric string |
| `VERCEL_ORG_ID` | Vercel Dashboard → Settings → Team Settings | UUID format |
| `VERCEL_PROJECT_ID` | Vercel Dashboard → Project Settings → Project ID | UUID format |

**Steps to obtain Vercel secrets:**

1. Visit [vercel.com/dashboard](https://vercel.com/dashboard)
2. Go to **Settings** → **Tokens**
3. Create a new token (or copy existing one)
4. Go to **Settings** → **Team Settings** for Org ID
5. Go to project settings page for Project ID

### ⚠️ Payments (Stripe) — Optional for Production

Required only for live billing and Stripe webhook processing.

| Secret | Source | Format |
|--------|--------|--------|
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API Keys | sk_live_... |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Developers → Webhooks | whsec_... |

**Steps to obtain Stripe secrets:**

1. Visit [dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys)
2. Select "Live" mode (not test mode)
3. Copy "Secret key"
4. Go to **Webhooks** and copy webhook signing secret
5. **⚠️ Never commit these values to code**

### ⚠️ AWS (Infrastructure) — Optional for CDK Deployment

Required only if using AWS CDK for infrastructure deployment.

| Secret | Source | Example |
|--------|--------|---------|
| `AWS_ACCOUNT_ID` | AWS Console → Account Settings | `123456789012` |
| `AWS_REGION` | AWS deployment region | `us-east-1` |
| `AWS_ROLE_TO_ASSUME` | AWS IAM role ARN | `arn:aws:iam::123456789012:role/DSGDeployRole` |

### ⚠️ AI/LLM (Optional for Production Features)

Required only when using external LLM services.

| Secret | Source | Format |
|--------|--------|--------|
| `ANTHROPIC_API_KEY` | Anthropic Console → API Keys | sk-ant-... |
| `OPENROUTER_API_KEY` | OpenRouter.ai → API Keys | sk-or-... |

### ⚠️ Notifications (Optional)

| Secret | Source |
|--------|--------|
| `RESEND_API_KEY` | Resend.com → API Keys |
| `TELEGRAM_BOT_TOKEN` | Telegram BotFather |

### ⚠️ Blockchain (Solana) — Optional for Devnet Testing

Required only for Solana integration testing.

| Secret | Source | Format |
|--------|--------|--------|
| `SOLANA_RPC_ENDPOINT` | Helius, QuickNode, or Alchemy | https://... |
| `SOLANA_TREASURY_PRIVATE_KEY` | Local keypair (Base64-encoded) | `...base64...` |

---

## Phase 1: Setup Instructions

### Step 1: Navigate to GitHub Repository Secrets

1. Go to GitHub repository: `tdealer01-crypto/tdealer01-crypto-dsg-control-plane`
2. Click **Settings** (top navigation)
3. Click **Secrets and variables** → **Actions** (left sidebar)
4. You should see the "Repository secrets" section

### Step 2: Add Supabase Secrets (Required)

1. Click **"New repository secret"** button
2. Add three secrets:

#### Secret 1: NEXT_PUBLIC_SUPABASE_URL
- **Name:** `NEXT_PUBLIC_SUPABASE_URL`
- **Value:** (from Supabase Dashboard → Settings → API → Project URL)
- Click **"Add secret"**

#### Secret 2: NEXT_PUBLIC_SUPABASE_ANON_KEY
- **Name:** `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Value:** (from Supabase Dashboard → Settings → API → anon public)
- Click **"Add secret"**

#### Secret 3: SUPABASE_SERVICE_ROLE_KEY
- **Name:** `SUPABASE_SERVICE_ROLE_KEY`
- **Value:** (from Supabase Dashboard → Settings → API → service_role secret)
- Click **"Add secret"**

### Step 3: Verify Secrets (Optional but Recommended)

After adding secrets:

1. Go to **Actions** → **CI** workflow
2. Trigger a manual run with **"Run workflow"** button
3. In the logs, look for environment variable names (values will show as `***`)
4. Verify no "secret not found" errors appear

### Step 4: Add Additional Secrets (As Needed)

Repeat the process for any other secrets your team uses:
- Stripe keys (for billing tests)
- Vercel token (for deployment automation)
- AWS credentials (for CDK deployment)

---

## Environment Variables Used by Workflows

### In `.github/workflows/ci.yml`

```yaml
env:
  NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co' }}
  SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY || 'ci-service-role-key-placeholder' }}
  NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'ci-anon-key-placeholder' }}
  NEON_PG_CONNECTION_STRING: ${{ secrets.NEON_PG_CONNECTION_STRING || '' }}
  NEON_PG_POOLED_CONNECTION_STRING: ${{ secrets.NEON_PG_POOLED_CONNECTION_STRING || '' }}
```

### In `.github/workflows/production-quality-gates.yml`

Same Supabase and Neon variables as above.

### In `.github/workflows/m1-go-no-go.yml`

Same Supabase and Neon variables for both `runtime-proof` and `staging-proof` jobs.

---

## Verification Checklist

After adding secrets, verify the CI pipeline works:

- [ ] Navigate to **Actions** tab in GitHub
- [ ] Select **CI** workflow
- [ ] Click **"Run workflow"** → **"Run workflow"** button
- [ ] Watch the workflow run
- [ ] Verify all steps pass (look for ✅ checkmarks)
- [ ] Check that no step failed with "secret not found" error
- [ ] Verify `npm audit` passes (should show "No moderate/high vulnerabilities")
- [ ] Verify integration tests pass (should show "X passed | Y skipped")
- [ ] Verify build completes successfully

---

## Troubleshooting

### Issue: "npm audit: Found vulnerabilities (exit code: 1)"

**Solution:**
- Review `artifacts/security/npm-audit.json` in workflow artifacts
- If vulnerabilities are real, fix them in `package.json` or add overrides
- If false positives, update `package.json` overrides

### Issue: "Gitleaks: Found potential secrets"

**Solution:**
- Review `artifacts/security/gitleaks.json` to see what was detected
- If false positives, add to `.gitleaks.toml` in the `[allowlist]` section
- If real secrets, remove from code and rotate the secret

### Issue: "SUPABASE_SERVICE_ROLE_KEY not set"

**Solution:**
- Re-check the secret name is exactly `SUPABASE_SERVICE_ROLE_KEY` (case-sensitive)
- Verify it's in **Repository secrets**, not **Organization secrets**
- Re-read the value from Supabase (may have been modified)

### Issue: Integration tests fail with "Connection refused"

**Solution:**
- Verify all three Supabase secrets are present and correct
- Check that Supabase project is not paused
- Verify Supabase project has database migrations applied
- Run locally: `npm run test:integration` with real env vars

---

## Security Notes

### Never commit or expose:

- Supabase service-role keys
- Stripe secret keys
- Vercel tokens
- AWS credentials
- API keys of any kind

### Safe practices:

- Secrets are stored encrypted in GitHub
- Values will show as `***` in workflow logs
- Rotate secrets quarterly as part of security maintenance
- Revoke old secrets when team members leave

### Reference files:

- See `.env.example` for all variable names (values are never committed)
- See `CLAUDE.md` section 10 for security conventions

---

## Next Steps

1. ✅ Complete Step 1-3 above (add required Supabase secrets)
2. ✅ Run CI workflow verification (check Verification Checklist)
3. ⏳ Add optional secrets as needed (Stripe, Vercel, AWS)
4. ⏳ Monitor workflow runs for any environment-related failures
5. ⏳ Schedule quarterly secret rotation

---

## Support

For questions about secret setup:

- Supabase: See [supabase.com/docs](https://supabase.com/docs/guides/api)
- Vercel: See [vercel.com/docs](https://vercel.com/docs/concepts/projects/overview)
- GitHub Secrets: See [GitHub documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- This repository: See `CLAUDE.md` section 23 for deployment/environment info
