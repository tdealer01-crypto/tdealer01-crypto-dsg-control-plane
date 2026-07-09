# Supabase Environment Variables Setup for CI/CD

## Quick Summary

This document provides step-by-step instructions to configure Supabase environment variables in GitHub Actions CI/CD and Vercel production deployment. Once configured, 8 failing CI checks will pass.

**Required Variables:** 3  
**Estimated Time:** 10-15 minutes  
**Impact:** Enables database connectivity for tests, compliance checks, and production crons

---

## Prerequisites

Before starting, you'll need:
1. GitHub repository write access (to add secrets)
2. Vercel project admin access (to add environment variables)
3. Supabase project dashboard access (to retrieve credentials)
4. Active Supabase project (create at https://supabase.com if needed)

---

## Step 1: Retrieve Supabase Credentials

### 1.1 Log into Supabase Dashboard
- Go to: https://app.supabase.com
- Select your project (or create a new one)

### 1.2 Navigate to Settings → API

In the left sidebar:
1. Click **Settings** (gear icon at bottom)
2. Click **API** in the submenu
3. You'll see three credential sections:
   - Project URL
   - API Keys (anon public key, service_role secret)

### 1.3 Copy Three Values

Copy these exact values (you'll need them in the next steps):

**Value 1: Project URL**
- Section: "Project URL"
- Format: `https://[project-ref].supabase.co`
- Example: `https://abcdef123456.supabase.co`
- **Copy this as:** `NEXT_PUBLIC_SUPABASE_URL`

**Value 2: Anon Public Key**
- Section: "API Keys"
- Label: "anon public" or "public key"
- Format: Long string starting with `eyJ...`
- **Copy this as:** `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Value 3: Service Role Secret** ⚠️ **SENSITIVE**
- Section: "API Keys"
- Label: "service_role" or "secret"
- Format: Long string starting with `eyJ...` (different from anon key)
- **Copy this as:** `SUPABASE_SERVICE_ROLE_KEY`
- ⚠️ **WARNING:** This is a secret key. Never share or commit to version control.

---

## Step 2: Add GitHub Repository Secrets

These secrets enable CI/CD pipelines to access your Supabase database during testing.

### 2.1 Navigate to GitHub Repository Settings

1. Go to: `https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane`
2. Click **Settings** tab (top right)
3. In left sidebar, expand **Secrets and variables**
4. Click **Actions** (not "Codespaces" or "Dependabot")

### 2.2 Add Three Repository Secrets

For each of the three values from Step 1:

**To add each secret:**
1. Click **New repository secret** button (top right)
2. Enter the "Name" (exact text from below)
3. Paste the value you copied from Supabase
4. Click **Add secret**

**Secret 1: NEXT_PUBLIC_SUPABASE_URL**
- Name: `NEXT_PUBLIC_SUPABASE_URL`
- Value: Paste the Project URL from Step 1.3
- Example: `https://abcdef123456.supabase.co`

**Secret 2: NEXT_PUBLIC_SUPABASE_ANON_KEY**
- Name: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Value: Paste the Anon Public Key from Step 1.3

**Secret 3: SUPABASE_SERVICE_ROLE_KEY**
- Name: `SUPABASE_SERVICE_ROLE_KEY`
- Value: Paste the Service Role Secret from Step 1.3
- ⚠️ Ensure this is the **service_role** key, not the anon key

**Verification:** After adding all three, you should see them listed on the "Actions secrets" page:
```
✓ NEXT_PUBLIC_SUPABASE_ANON_KEY
✓ NEXT_PUBLIC_SUPABASE_URL
✓ SUPABASE_SERVICE_ROLE_KEY
```

---

## Step 3: Configure Vercel Environment Variables

These variables enable your production deployment and preview branches to connect to Supabase.

### 3.1 Navigate to Vercel Project Settings

1. Go to: https://vercel.com
2. Select the project: `tdealer01-crypto-dsg-control-plane`
3. Click **Settings** tab (top navigation)
4. In left sidebar, click **Environment Variables**

### 3.2 Add Three Environment Variables

For each variable, the workflow is:
1. Click **Add New**
2. Select environment(s): Check **Production**, **Preview**, **Development**
3. Enter the name and value
4. Click **Save**

**Variable 1: NEXT_PUBLIC_SUPABASE_URL**
- Name: `NEXT_PUBLIC_SUPABASE_URL`
- Value: Paste the Project URL from Step 1.3
- Environments: ✓ Production, ✓ Preview, ✓ Development

**Variable 2: NEXT_PUBLIC_SUPABASE_ANON_KEY**
- Name: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Value: Paste the Anon Public Key from Step 1.3
- Environments: ✓ Production, ✓ Preview, ✓ Development

**Variable 3: SUPABASE_SERVICE_ROLE_KEY**
- Name: `SUPABASE_SERVICE_ROLE_KEY`
- Value: Paste the Service Role Secret from Step 1.3
- Environments: ✓ Production, ✓ Preview, ✓ Development

**Verification:** After adding all three, refresh the page. You should see all three variables listed with a lock icon (✓) next to them.

### 3.3 Redeploy Vercel

To activate the environment variables:

1. Go to **Deployments** tab (top navigation)
2. Hover over the latest deployment
3. Click **Redeploy** (or the three-dot menu → Redeploy)
4. Watch the deployment logs for success

Expected behavior:
- Deployment status: ✅ Ready (or building...)
- No environment variable errors in logs

---

## Step 4: Verify Configuration

Once all secrets and variables are configured, verify the setup by checking the CI/CD pipeline.

### 4.1 Check GitHub Actions CI Pipeline

1. Go to: `https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane`
2. Click **Actions** tab
3. Push a small change or create a test commit to trigger CI
4. Watch these checks pass:
   - ✅ `test` workflow (unit & integration tests)
   - ✅ `verify` workflow (verification checks)
   - ✅ `e2e` workflow (end-to-end tests)
   - ✅ `CCVS Evidence Tests` (compliance testing)
   - ✅ `DSG Proof Gate` (governance validation)
   - ✅ `smoke-test` (application smoke tests)

**Troubleshooting if checks still fail:**
- Wait 2-3 minutes for secrets to propagate
- Verify secret names are **exactly** correct (case-sensitive)
- Verify values are **complete** (no accidental truncation)
- Check if workflow logs show environment variable errors (visible in Actions → [workflow] → [job])

### 4.2 Test Vercel Deployment

1. Go to Vercel dashboard: https://vercel.com
2. Select project: `tdealer01-crypto-dsg-control-plane`
3. Click **Deployments** tab
4. Verify the latest deployment shows ✅ Ready

**Test connectivity:**

Once deployed, test that the database connection works:

```bash
# Test health check endpoint
curl https://[your-vercel-deployment-url]/api/readiness
```

Expected response:
```json
{
  "status": "ready",
  "timestamp": "2026-07-09T09:30:00Z",
  "database": "connected"
}
```

### 4.3 Monitor First Run

After configuration:
1. GitHub Actions CI should start green (all checks pass)
2. Live database tests should execute successfully
3. Vercel deployments should complete without environment errors
4. Cron jobs should trigger without authentication errors

---

## Configuration Reference

### What These Variables Do

| Variable | Used By | Purpose |
|----------|---------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client & Server | Database connection URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client & Server Auth | User authentication |
| `SUPABASE_SERVICE_ROLE_KEY` | Server Only (Crons, Admin ops) | Administrative database access |

### Files That Use These Variables

**Client-side (browser):**
- `/lib/supabase/client.ts` - Initializes Supabase client with anon key

**Server-side (Node.js):**
- `/lib/supabase-server.ts` - Uses service role key for admin operations
- `/lib/supabase/agent-profile.ts` - Admin client initialization
- All `/app/api/*/route.ts` files - API route database access
- `/app/api/cron/*` files - Cron job database operations

**Tests:**
- `/tests/integration/helpers/supabase-test-factory.ts` - Creates admin test client
- All live database tests in `/tests/integration/` - Requires service role key

### Environment Variables Already Configured

The following are already set up (no action needed):
- `.env.example` - Documents variables for developers
- `.github/workflows/ci.yml` - References `${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}` etc.
- `.github/workflows/e2e.yml` - References secrets for live E2E tests
- `/next.config.js` - Includes Supabase domain in CSP connect-src
- `/lib/supabase/client.ts` - Already initializes with env vars
- `/lib/supabase-server.ts` - Already initializes with env vars

---

## Troubleshooting

### Issue: "Environment variables not found" errors in CI logs

**Cause:** Secrets not yet propagated (takes 2-3 minutes after adding)  
**Fix:** Wait 3 minutes, then trigger a new CI run

### Issue: "NEXT_PUBLIC_SUPABASE_ANON_KEY is undefined" in build logs

**Cause:** Variable name mismatch (typo or wrong case)  
**Fix:** 
1. Go to GitHub Settings → Secrets and variables → Actions
2. Verify the name is **exactly** `NEXT_PUBLIC_SUPABASE_ANON_KEY` (case-sensitive)

### Issue: Vercel deployment still fails after adding variables

**Cause:** Variables added but deployment not redeployed  
**Fix:**
1. Go to Vercel Deployments tab
2. Click **Redeploy** on the latest deployment
3. Wait for new deployment to complete

### Issue: "Test database connection failed" in test logs

**Cause:** Service role key is incorrect or truncated  
**Fix:**
1. Go back to Supabase dashboard → Settings → API
2. Find the **service_role** key (different from anon key)
3. Delete the secret in GitHub and re-add with correct value

### Issue: "Database connected" but live tests still skip

**Cause:** May need to run database migrations  
**Fix:** Check if migrations in `/supabase/migrations/` need to be applied:
```bash
# Run migrations locally
supabase db push
```

---

## Next Steps

After configuration is complete:

1. ✅ All 8 CI checks pass (test, verify, e2e, smoke-test, CCVS, DSG Proof Gate)
2. ✅ Vercel deployment succeeds
3. ✅ Database connectivity verified via health check
4. ✅ Production cron jobs run successfully
5. ✅ Live database tests execute without errors

Once verified, the DSG control plane is ready for:
- Feature development with live database tests
- Compliance verification (CCVS Evidence Tests)
- Governance validation (DSG Proof Gate)
- Production deployment with full database access

---

## Security Notes

### Public vs. Secret Variables

**NEXT_PUBLIC_* variables (public, safe in client code):**
- `NEXT_PUBLIC_SUPABASE_URL` - Can be exposed (project URL is public)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Designed for public client use (limited permissions)

**Secret variables (server-only, never expose):**
- `SUPABASE_SERVICE_ROLE_KEY` - Has full admin permissions
- Never commit to git, never log, never expose to client

### Best Practices

- ✅ Rotate service role keys periodically in Supabase dashboard
- ✅ Use different keys for dev/staging/production if possible
- ✅ Monitor Supabase dashboard for unauthorized access attempts
- ✅ Keep `.env.local` file in `.gitignore` (already configured)
- ✗ Don't share screenshots of dashboard with credentials
- ✗ Don't paste secrets in chat, emails, or unencrypted channels

---

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [GitHub Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [DSG Control Plane README](../README.md)
- [Vercel Deployment Setup](./VERCEL_ENV_SETUP.md)

---

**Document Version:** 1.0  
**Last Updated:** 2026-07-09  
**Scope:** tdealer01-crypto/tdealer01-crypto-dsg-control-plane
