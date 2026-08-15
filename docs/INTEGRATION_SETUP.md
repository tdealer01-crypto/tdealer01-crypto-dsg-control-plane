# Platform Integration Setup Guide
## GitHub ↔ Supabase ↔ Vercel

**Created**: 2026-07-24  
**Project**: tdealer01-crypto-dsg-control-plane  
**Status**: Integration automation configured

---

## Overview

This guide covers the complete integration between:
- **GitHub** (source repository, CI/CD, secret management)
- **Supabase** (PostgreSQL database, schema migrations, types generation)
- **Vercel** (deployment, edge functions, cron jobs, environment variables)

The automated pipeline enables:
- ✅ Automatic deployments on push to main
- ✅ Automated database migrations when schema changes
- ✅ TypeScript type regeneration after migrations
- ✅ Environment variable synchronization across platforms
- ✅ Secrets stored securely in GitHub (single source of truth)
- ✅ Cron job execution for scheduled tasks (billing, reconciliation, monitoring)

---

## 1. GitHub Secrets Configuration

### Step 1: Add Required Secrets to GitHub

Go to: **Repository Settings → Secrets and variables → Actions secrets**

**Required secrets** (must be present for all workflows):

```
NEXT_PUBLIC_SUPABASE_URL                 # https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY           # Public API key (safe to expose to client)
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY    # Same as anon key
SUPABASE_SERVICE_ROLE_KEY               # Admin key (server-only, never expose)
SUPABASE_PROJECT_ID                     # Project ID slug from Supabase dashboard
SUPABASE_DB_PASSWORD                    # Raw database password from project settings (server-only)
SUPABASE_ACCESS_TOKEN                   # Personal access token for migrations
CRON_SECRET                             # Random secret for /api/cron/* endpoints
```

**Optional secrets** (add as needed for features):

```
ANTHROPIC_API_KEY                       # For AI features
STRIPE_SECRET_KEY                       # For production billing
STRIPE_WEBHOOK_SECRET                   # For billing webhooks
STRIPE_SANDBOX_SECRET_KEY                # For sandbox/test billing
GITHUB_APP_ID                           # For GitHub App integration
GITHUB_APP_PRIVATE_KEY                  # For GitHub App callbacks
GITHUB_APP_WEBHOOK_SECRET               # For GitHub App webhook verification
```

### Step 2: Get Supabase Credentials

From Supabase Dashboard:

1. **Project URL & Keys**: 
   - Settings → API
   - Copy: Project URL, Anon Public Key, Service Role Key

2. **Database Password**:
   - Settings → Database
   - Reset the database password if the existing value is unknown
   - Store the raw value in `SUPABASE_DB_PASSWORD`
   - Percent-encode it only when manually embedding it inside a PostgreSQL connection URI; do not percent-encode the GitHub secret itself

3. **Access Token**:
   - Account Settings → Access Tokens
   - Create a new personal access token (name: "GitHub CI/CD")
   - Scopes: `database` (migrations)

---

## 2. Vercel Configuration

### Step 1: Link GitHub Repository

In Vercel Dashboard:

1. **New Project** → Connect Git repository → Select `tdealer01-crypto-dsg-control-plane`
2. Framework: Next.js 15
3. Root directory: `./`
4. Install command: `npm ci`
5. Build command: `npm run build`

### Step 2: Add Environment Variables

Go to: **Project Settings → Environment Variables**

Add these across **all three environments** (Production, Preview, Development):

| Variable | Value | Environments |
|----------|-------|--------------|
| NEXT_PUBLIC_SUPABASE_URL | From GitHub Secrets | Prod, Preview, Dev |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | From GitHub Secrets | Prod, Preview, Dev |
| SUPABASE_SERVICE_ROLE_KEY | From GitHub Secrets | Prod, Preview, Dev |
| SUPABASE_PROJECT_ID | From GitHub Secrets | Prod, Preview, Dev |
| CRON_SECRET | From GitHub Secrets | Prod, Preview, Dev |
| ANTHROPIC_API_KEY | From GitHub Secrets (if set) | Prod only |
| STRIPE_SECRET_KEY | From GitHub Secrets (if set) | Prod only |

### Step 3: Verify Deployment Settings

- **Auto-deploy on push to main**: Enabled
- **Auto-deploy PR previews**: Enabled
- **Serverless Function region**: iad (US East, default)
- **Build output validation**: Enabled
- **Automatic git integration**: Enabled

---

## 3. GitHub Actions Workflows

### CI Workflow (`ci.yml`)

Runs on every push and PR:

```bash
npm ci
npm run lint
npm run typecheck
npm run test (with Supabase secrets)
npm run build
npm run verify:production-manifest
```

**Required secrets**: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_ANON_KEY

### Database Migration Workflow (`supabase-migrations.yml`)

Triggers when `supabase/migrations/**` files change:

```bash
supabase db push --linked
npm run db:types
git commit lib/database.types.ts (if changed)
git push
```

**Required secrets**: SUPABASE_ACCESS_TOKEN, SUPABASE_DB_PASSWORD, SUPABASE_PROJECT_ID

### Manual Sync Workflow (on-demand)

Run `scripts/sync-secrets.mjs` to push GitHub Secrets → Vercel Environment Variables:

```bash
VERCEL_TOKEN=<token> VERCEL_PROJECT_ID=<id> node scripts/sync-secrets.mjs
```

---

## 4. Database Migrations

### Automated Workflow

1. **Developer** creates migration file:
   ```bash
   supabase migration new add_new_table
   # Edit supabase/migrations/TIMESTAMP_add_new_table.sql
   ```

2. **Push to GitHub**:
   ```bash
   git add supabase/migrations/
   git commit -m "chore: add new table migration"
   git push
   ```

3. **GitHub Actions** automatically:
   - Detects migration file change
   - Runs `supabase db push --linked`
   - Regenerates `lib/database.types.ts`
   - Commits type updates
   - Pushes back to repository

4. **Vercel** automatically:
   - Redeploys application with new types
   - Updates database schema (via Supabase)

### Manual Migration (if automation fails)

```bash
# Local testing
supabase migration list
supabase db push --linked

# Verify schema
supabase db pull

# Regenerate types
npm run db:types
npm run typecheck
```

---

## 5. Environment Variable Hierarchy

The application resolves environment variables in this order:

```
1. Vercel Environment Variables (deployed app)
   ↓
2. GitHub Secrets (CI/CD workflows)
   ↓
3. Local .env.local (development, git-ignored)
   ↓
4. .env.example (template/documentation only)
```

### Public vs. Private Variables

| Variable | Scope | Exposure |
|----------|-------|----------|
| NEXT_PUBLIC_* | Client + Server | Visible in frontend code |
| SUPABASE_SERVICE_ROLE_KEY | Server only | Not exposed to client |
| STRIPE_SECRET_KEY | Server only | Not exposed to client |
| CRON_SECRET | Server only | Not exposed to client |

---

## 6. Secrets Management Best Practices

### Do's ✅

- Store all secrets in **GitHub Secrets** (single source of truth)
- Use environment-specific secret values (prod vs. staging)
- Rotate secrets periodically (every 90 days recommended)
- Audit who has access to secrets
- Use fine-grained personal access tokens (scope: minimal required)
- Document secret names in `.env.example` (never values)

### Don'ts ❌

- Never commit `.env` files to Git
- Never print secrets in logs or console output
- Never share secrets via email or Slack
- Never use the same secret across multiple environments
- Never hardcode secrets in application code
- Never commit GitHub token to repository

---

## 7. Complete Deployment Pipeline

### Trigger Flow

```
Push to main branch
    ↓
GitHub Actions CI runs
    ├─ Lint & typecheck
    ├─ Run tests (with Supabase secrets)
    ├─ Build Next.js app
    └─ Production manifest verification
    ↓
On success:
    ├─ Vercel auto-deploys to production
    ├─ If migrations changed: Auto-run DB migrations
    ├─ If migrations changed: Regenerate types & commit
    └─ Health checks confirm deployment
    ↓
Vercel production deployment:
    ├─ Fetch environment variables from Vercel
    ├─ Build optimized Next.js bundle
    ├─ Deploy to edge nodes globally
    ├─ Enable cron jobs (billing, reconciliation, etc.)
    └─ Propagate to CDN
    ↓
Monitoring:
    ├─ Check /api/health for status
    ├─ Check /api/agent/status for deployed version
    ├─ Monitor runtime logs in Vercel dashboard
    └─ Alert on deployment failures
```

### Pull Request Preview Flow

```
Create/push to PR branch
    ↓
GitHub Actions CI runs (same as main)
    ↓
On success:
    ├─ Vercel auto-creates preview deployment
    ├─ Preview uses staging Supabase (if configured)
    └─ Preview URL: https://dsg-xxxxx-pr-NNN.vercel.app
    ↓
Review:
    ├─ Test feature in preview
    ├─ Check /api/health on preview URL
    ├─ Verify database changes work
    └─ Comment approval when ready
    ↓
Merge to main:
    └─ Triggers production deployment flow (see above)
```

---

## 8. Verification Checklist

Before considering integration complete:

### GitHub Setup
- [ ] Repository secrets added (all required secrets)
- [ ] CI workflow runs successfully on push
- [ ] Integration tests pass with Supabase credentials

### Vercel Setup
- [ ] Project linked to GitHub repository
- [ ] Environment variables configured (Prod, Preview, Dev)
- [ ] Deploy on push to main: working
- [ ] Deploy PR previews: working
- [ ] Production URL accessible and responds to /api/health

### Supabase Setup
- [ ] Migrations have been applied to project database
- [ ] TypeScript types (`lib/database.types.ts`) generated successfully
- [ ] Database schema verified (check via Supabase dashboard)
- [ ] Connection string working (test with `npm run test`)

### Integration Pipeline
- [ ] Push to main → Vercel deploys (observe in dashboard)
- [ ] Migration file created and pushed → Auto-runs on production
- [ ] Types regenerated and committed (check latest commit)
- [ ] Production health check passes: `curl https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health`

---

## 9. Troubleshooting

### Deployment Failed: "Build failed"

**Check**:
1. Vercel build logs (Vercel dashboard → Deployments → [deployment] → Logs)
2. All required environment variables are set
3. TypeScript compiles: `npm run typecheck`
4. Application builds locally: `npm run build`

**Solution**:
```bash
# Test locally
npm ci
npm run typecheck
npm run build

# If successful locally, env vars likely missing in Vercel
# If failing locally, fix and commit
```

### Migration Failed: "supabase db push" error

**Check**:
1. Migration file is valid SQL
2. `SUPABASE_ACCESS_TOKEN` is present in GitHub Secrets
3. `SUPABASE_DB_PASSWORD` is correct
4. Migration doesn't conflict with existing schema

**Solution**:
```bash
# Test locally
supabase link --project-ref YOUR_PROJECT_ID
supabase db push

# If success locally, check GitHub Actions logs
# If failure, fix SQL and re-push
```

### Types Not Regenerated: "lib/database.types.ts" didn't update

**Check**:
1. Database migration actually ran (check Supabase dashboard)
2. Migration changed schema (not just data)
3. `SUPABASE_PROJECT_ID` in GitHub Secrets is correct

**Solution**:
```bash
# Regenerate manually
npm run db:types

# Verify types file updated
git diff lib/database.types.ts

# Commit and push
git add lib/database.types.ts
git commit -m "chore: regenerate Supabase types"
git push
```

### Health Check Failed: "Cannot reach production URL"

**Check**:
1. Vercel deployment shows "Ready" status
2. URL is correct (check Vercel dashboard)
3. No network connectivity issues
4. Supabase connection string valid

**Solution**:
```bash
# Test from production URL
curl -i https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health

# Check Vercel runtime logs
# Check Supabase connection in middleware.ts
# Verify NEXT_PUBLIC_SUPABASE_URL is set
```

---

## 10. Recovery Procedures

### Rollback Failed Deployment

1. In Vercel dashboard, find the last successful deployment
2. Click the deployment
3. Click **"Promote to Production"**
4. Verify health check passes

### Revert Failed Migration

If a migration causes production issues:

```bash
# 1. Create rollback migration
supabase migration new revert_failing_change

# 2. Write SQL to undo changes (manual or inverse SQL)
# 3. Test locally
supabase db push

# 4. Commit and push
git add supabase/migrations/
git commit -m "chore: revert failed migration"
git push
```

### Reset Environment Variables

If environment variables become corrupted:

```bash
# 1. Verify GitHub Secrets are correct
# 2. Re-sync to Vercel
node scripts/sync-secrets.mjs

# 3. Manually verify in Vercel dashboard
# Settings → Environment Variables
```

---

## 11. Monitoring and Alerts

### Key Metrics to Monitor

- **Deployment success rate**: 100% target
- **Migration run time**: Track to detect schema issues
- **Type regeneration time**: <30s expected
- **Health check response**: <500ms expected
- **Cron job execution**: All should complete on schedule

### Useful Commands

```bash
# Check deployment status
curl https://tdealer01-crypto-dsg-control-plane.vercel.app/api/agent/status

# Check database connection
curl https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health

# Check runtime logs (Vercel CLI)
vercel logs --tail

# Check local app
npm run dev
```

### GitHub Actions Notifications

Enable notifications in GitHub:

1. Settings → Notifications → Actions
2. Choose: Email on failure
3. Workflows affected: All

---

## 12. Next Steps

1. ✅ **Immediate** (5-10 min)
   - Add GitHub Secrets
   - Configure Vercel environment variables
   - Verify Vercel deployment succeeds

2. ✅ **Short-term** (30-60 min)
   - Push a migration file to test automated workflow
   - Verify types regenerated automatically
   - Test preview deployment on a PR

3. ⏳ **Medium-term** (Ongoing)
   - Monitor CI/CD success rates
   - Set up deployment alerts
   - Document runbooks for team
   - Schedule periodic secret rotation

---

## Contact & Support

For integration issues:
- Check logs: Vercel dashboard → Deployments → Runtime logs
- GitHub Actions logs: Repository → Actions → Workflow runs
- Supabase status: Dashboard → Health check

For questions about this setup, refer to:
- `CLAUDE.md` for development conventions
- `.github/workflows/` for workflow details
- `docs/RUNBOOK_DEPLOY.md` for deployment procedures
