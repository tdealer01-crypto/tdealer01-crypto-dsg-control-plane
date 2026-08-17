# Railway Deployment Setup — DSG ONE / ProofGate Control Plane

## Overview

This guide walks you through deploying DSG ONE to Railway with PostgreSQL (via Supabase) and Redis support.

**Platform**: Railway  
**Cost**: FREE ($5/month credit, then pay-as-you-go)  
**Auto-Deploy**: Yes (on every push to main)  
**Time to Live**: ~5-10 minutes after setup

---

## Prerequisites

- GitHub account (linked to https://github.com/tdealer01-crypto)
- Railway account (sign up at https://railway.app/?referralCode=koQJVj)
- Supabase project URL and API keys
- Anthropic API key (for Claude integration)
- Optional: Stripe secret key (for billing)

---

## Deployment Flow

### Step 1: Sign Up to Railway (2 minutes)

1. Visit: https://railway.app/?referralCode=koQJVj
2. Click "GitHub" to sign in with your GitHub account
3. Authorize Railway to access your GitHub repositories
4. Complete onboarding

### Step 2: Create Railway Project (2 minutes)

1. In Railway Dashboard, click "New Project"
2. Select "Deploy from GitHub"
3. Authorize GitHub access if prompted
4. Search for and select: `tdealer01-crypto-dsg-control-plane`
5. Click "Deploy Now"

Railway will:
- Auto-detect Next.js
- Create a new project
- Link to your GitHub repository
- Trigger the first deployment

### Step 3: Configure Environment Variables (3 minutes)

**In Railway Dashboard:**

1. Go to Project → Settings → Variables
2. Add these variables from your `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
ANTHROPIC_API_KEY=your-anthropic-api-key-here
STRIPE_SECRET_KEY=sk_... (optional)
CRON_SECRET=your-cron-secret-here
```

⚠️ **Important**: 
- Never commit secrets to git
- Use Railway dashboard for all sensitive values
- Service role key should only be in production Railway, never in `.env` files

3. Click "Save" after adding variables

### Step 4: Verify Deployment (2 minutes)

**Monitor in Railway:**

1. Go to Project → Deployments
2. Watch the active deployment progress
3. Once "Ready" appears, click to view logs
4. Look for: "ready - started server on ... url: http://localhost:3000"

**Test health endpoint:**

```bash
curl https://<your-railway-url>/api/health
```

Expected response:
```json
{
  "status": "ok",
  "environment": "production",
  "timestamp": "2026-08-17T..."
}
```

**Get your live URL:**

1. In Railway → Deployments
2. Click on active deployment
3. Under "Domain" tab, copy the `.railway.app` URL
4. Your app is live at: `https://<generated-name>.railway.app`

### Step 5: Auto-Deploy Setup (1 minute)

Railway is **already configured to auto-deploy on push** to main.

Every push to main branch will:
1. Trigger GitHub Actions
2. Run tests/typecheck (if configured)
3. Push to Railway
4. Rebuild and deploy within 2-5 minutes

**Push and auto-deploy:**

```bash
git push origin main
```

Watch in Railway Dashboard → Deployments for live progress.

---

## Database Integration

### Supabase PostgreSQL

Railway works seamlessly with your existing Supabase project.

**No extra setup needed** — just configure `SUPABASE_SERVICE_ROLE_KEY` in Railway variables.

Database queries will automatically route to your Supabase project.

### Redis (Optional)

If your app needs Redis caching or session storage:

1. In Railway Dashboard → Project Settings → Add Service
2. Select "Redis"
3. Railway creates a managed Redis instance
4. Get connection URL from Service Details
5. Add to variables: `REDIS_URL=redis://...`

Your app will auto-connect to the Railway-managed Redis.

---

## Health Checks and Monitoring

### Built-in Health Endpoints

Railway monitors these routes automatically:

- `GET /api/health` — Basic health check
- `GET /api/agent/status` — Deployment and DB status
- `GET /api/readiness` — Readiness check

If `GET /api/health` returns non-2xx for 2+ consecutive checks, Railway will restart the deployment.

### View Logs

**In Railway Dashboard:**

1. Project → Deployments → [active deployment]
2. Click "Logs" tab
3. Stream live output in real-time
4. Download full logs for debugging

### Rollback

If a deployment breaks:

1. Go to Deployments → Previous successful deployment
2. Click "Redeploy"
3. Previous version comes back online immediately

---

## Revenue Tracking (Optional)

Once app is live on Railway, activate revenue dashboard:

```bash
npm run revenue:dashboard
```

This requires:
- Stripe secret key configured in Railway variables
- Your Stripe account linked
- Active Stripe webhook events

Real-time metrics:
- Monthly Recurring Revenue (MRR)
- Annual Recurring Revenue (ARR)
- Customer growth
- Forecast (customizable growth rate)

Monitor continuously:

```bash
npm run revenue:watch
```

---

## Custom Domain (Optional)

If you want `yourdomain.com` instead of `railway.app`:

1. In Railway → Project Settings → Domains
2. Click "Add Domain"
3. Enter your custom domain
4. Railway shows CNAME records
5. Update your domain registrar DNS to point to Railway
6. Takes 5-15 minutes to activate

Example DNS update (your registrar):

```
CNAME yourdomain.com → your-railway-domain.railway.app
```

---

## Troubleshooting

### Build Fails

**Check logs:** Railway Dashboard → Deployments → Logs

**Common issues:**

1. **Missing env vars**: Check all required variables are added in Railway Settings
2. **npm install fails**: Clear npm cache, rebuild
3. **TypeScript errors**: Run `npm run typecheck` locally first
4. **Supabase connection fails**: Verify `SUPABASE_SERVICE_ROLE_KEY` is correct

**Fix and retry:**

```bash
# Fix locally
npm run typecheck
git add .
git commit -m "Fix deployment issues"
git push origin main
# Railway auto-redeploys
```

### Runtime Errors

**View real-time logs:**

1. Railway Dashboard → Deployments → Logs (streaming)
2. Look for error stack traces
3. Fix in code locally
4. Commit and push → auto-redeploy

### Environment Variables Not Applied

1. Verify variables are in Railway Settings (not `.env` file)
2. Click "Save" after changes
3. Click "Redeploy" to apply new variables
4. Wait ~2 minutes for restart

### Database Connection Failed

1. Check `SUPABASE_SERVICE_ROLE_KEY` is correct in Railway variables
2. Verify Supabase project is not paused (check Supabase dashboard)
3. Test locally with same credentials first
4. Ensure database migrations are applied to Supabase

---

## Production Readiness Checklist

Before going live:

- [ ] All environment variables configured in Railway
- [ ] Supabase migrations applied to production database
- [ ] `GET /api/health` returns 200 OK
- [ ] `GET /api/agent/status` confirms deployment info
- [ ] Authentication/login works (test with real account)
- [ ] Dashboard loads and displays data
- [ ] Revenue tracking configured (if using Stripe)
- [ ] Custom domain configured (if needed)
- [ ] Monitoring/alerts set up

Once complete:

```bash
curl https://<your-railway-url>/api/health
# Should return: {"status":"ok",...}
```

---

## Costs

| Item | Price |
|------|-------|
| Compute (included) | $0 (first $5/month) |
| After free credit | $0.50/vCPU-hour |
| Database (Supabase) | Your Supabase plan |
| Redis (if used) | $2/month |
| Bandwidth | Free |
| Deployments | Free unlimited |

**Typical Monthly:**
- MVP/testing: $0 (within free tier)
- Small production: $5-10/month
- Medium production: $20-50/month

---

## Next Steps

1. **Go live**: Follow steps 1-4 above
2. **Monitor**: Watch Railway Deployments dashboard
3. **Auto-deploy**: Push to main for automatic updates
4. **Revenue**: Activate `npm run revenue:dashboard` when ready
5. **Custom domain**: Add your domain (optional)
6. **Scale**: Railway handles auto-scaling automatically

---

## Resources

- Railway Docs: https://docs.railway.app
- Next.js on Railway: https://docs.railway.app/guides/nextjs
- Environment Variables: https://docs.railway.app/reference/variables
- GitHub Integration: https://docs.railway.app/guides/github
- Custom Domains: https://docs.railway.app/guides/custom-domains
- Pricing: https://railway.app/pricing

---

## Support

- Railway Support: https://railway.app/support
- Issue with deployment? Check Railway Docs first
- Need help? Contact Railway support with deployment ID from Dashboard

---

**Status**: Production-Ready Setup  
**Time to Live**: ~15 minutes total  
**Complexity**: Minimal (web-based dashboard, no CLI needed)  
**Cost**: FREE (first $5/month credit)

Ready to deploy? https://railway.app/?referralCode=koQJVj
