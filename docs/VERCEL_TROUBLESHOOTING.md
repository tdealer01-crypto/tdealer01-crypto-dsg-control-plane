# Vercel Deployment Troubleshooting Guide

Advanced troubleshooting and resolution procedures for DSG Control Plane deployments on Vercel.

**Status**: Setup-ready  
**Last Updated**: 2026-06-07  
**Scope**: Build failures, environment issues, cold starts, and deployment health checks

---

## Quick Diagnosis

### Step 1: Check Deployment Status

In Vercel dashboard:

1. Go to **Deployments**
2. Click the latest deployment
3. Note the status:
   - 🔵 **Building** = currently building (wait)
   - 🟢 **Ready** = deployed successfully
   - 🔴 **Error** = build or deployment failed
   - 🟡 **Canceled** = deployment was canceled

### Step 2: Review Build Logs

Click the deployment → **Build Logs** tab to see:

```
✓ Analyzed source code in XX seconds
✓ Creating Docker image from cache
✓ Using cached npm dependencies
error: STRIPE_API_KEY is required
```

### Step 3: Identify Error Category

Match your error to one of these categories below.

---

## Build Failure Categories

### Category 1: Missing Environment Variables

**Symptoms**:
```
error: STRIPE_API_KEY is required
error: SUPABASE_URL is required
error: Environment variable XYZ not found
```

**Root Cause**: Required environment variable not set in Vercel

**Resolution**:

1. Verify variable is set in Vercel:
   ```bash
   vercel env ls production
   ```
   If variable doesn't appear, it's missing.

2. Add variable in Vercel dashboard:
   - Go to **Settings** → **Environment Variables**
   - Click **Add New**
   - Name: (exact name from error, case-sensitive)
   - Value: (paste value from source—no extra spaces)
   - Environment: **Production**
   - Click **Save**

3. Redeploy:
   ```bash
   vercel --prod
   ```

4. Monitor build logs to confirm variable is now recognized

**Prevention**: Use `bash scripts/setup-vercel-env.sh` to validate all variables before redeploying

---

### Category 2: Incorrect Environment Variable Format

**Symptoms**:
```
error: STRIPE_API_KEY must start with 'sk_live_' or 'sk_test_'
error: SUPABASE_URL must be a valid HTTPS URL
error: Invalid Redis connection string
```

**Root Cause**: Environment variable value is correct but wrong format

**Common Mistakes**:

| Variable | Wrong Format | Correct Format |
|----------|--------------|----------------|
| `STRIPE_API_KEY` | `stripe_api_key_...` | `sk_live_...` or `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | `webhook_...` | `whsec_...` |
| `NEXT_PUBLIC_SUPABASE_URL` | `supabase.example.com` | `https://xxx.supabase.co` |
| `UPSTASH_REDIS_URL` | `upstash_redis://...` | `redis://default:...` |

**Resolution**:

1. Identify which variable has wrong format (check error message)

2. Go to the source and copy the correct value:
   - **Stripe**: Dashboard → Developers → API Keys
   - **Supabase**: Dashboard → Settings → General (URL) or API (Keys)
   - **Upstash**: Console → Database → Connect → REDIS_URL

3. Update in Vercel:
   - Go to **Settings** → **Environment Variables**
   - Find the variable
   - Click the pencil icon to edit
   - Clear the value completely
   - Paste the correct value
   - Click **Save**

4. Redeploy:
   ```bash
   vercel --prod
   ```

**Validation**: Run `bash scripts/setup-vercel-env.sh` to check formats locally before pushing to Vercel

---

### Category 3: Stripe Configuration Errors

**Symptoms**:
```
Error: Stripe API key mismatch
Error: Webhook signing failed
Error: OAuth credentials invalid
```

**Root Cause**: Stripe keys are invalid, mismatched, or from wrong Stripe account

**Resolution**:

#### 3a: Stripe API Key Issues

1. Verify you're using the correct Stripe account:
   - Go to Stripe Dashboard
   - Check the account name/email at top-right

2. Verify key format:
   - `STRIPE_API_KEY` should start with `sk_live_` (not `sk_test_`)
   - `STRIPE_PUBLISHABLE_KEY` should start with `pk_live_` (not `pk_test_`)

3. Check if key is enabled:
   - Go to **Developers** → **API Keys**
   - Look for your key in the list
   - Confirm status is "Active"

4. If key is disabled, create a new one:
   - Click **Create** (if available) or use an existing active key
   - Copy the correct key

5. Update in Vercel and redeploy

#### 3b: Webhook Secret Issues

1. Verify webhook endpoint is configured:
   - Go to Stripe Dashboard → **Developers** → **Webhooks**
   - Look for endpoint: `https://your-domain.vercel.app/api/webhook/stripe`
   - If not found, create new endpoint

2. Get the correct signing secret:
   - Click the endpoint
   - Under **Signing secret**, click **Reveal**
   - Copy the secret (starts with `whsec_`)

3. Update `STRIPE_WEBHOOK_SECRET` in Vercel

4. Verify webhook events:
   - Click the endpoint
   - Look at **Events** tab
   - Ensure these are enabled:
     - `charge.succeeded`
     - `charge.failed`
     - `customer.*`
     - `invoice.*`

5. Test webhook:
   - Click **Send test webhook**
   - Select an event
   - Confirm it's delivered (check Vercel function logs)

#### 3c: OAuth Configuration Issues

1. Verify OAuth app is created:
   - Go to Stripe Dashboard → **Settings**
   - Click **Connected applications** or **OAuth**
   - Find your app or create new one

2. Get credentials:
   - Copy **Client ID** → `STRIPE_OAUTH_CLIENT_ID`
   - Copy **Client Secret** → `STRIPE_OAUTH_CLIENT_SECRET`

3. Verify redirect URI is set correctly:
   - Should be: `https://your-domain.vercel.app/auth/stripe/callback`
   - Or as configured in your app

4. Update Vercel environment variables and redeploy

---

### Category 4: Supabase Configuration Errors

**Symptoms**:
```
Error: Failed to connect to Supabase
Error: Invalid API key
Error: RLS policy denied access
```

**Root Cause**: Supabase URL or keys are invalid or from wrong project

**Resolution**:

#### 4a: Connection Issues

1. Verify Supabase project is active:
   - Go to Supabase Dashboard
   - Check project status (should be "Active")

2. Verify URL and keys are from the same project:
   - Go to **Settings** → **General**
   - Copy **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - Go to **Settings** → **API**
   - Copy **anon key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Copy **service_role key** → `SUPABASE_SERVICE_ROLE_KEY`

3. Test connection locally:
   ```bash
   # Create a test file
   cat > test-supabase.js << 'EOF'
   import { createClient } from '@supabase/supabase-js'

   const supabase = createClient(
     process.env.NEXT_PUBLIC_SUPABASE_URL,
     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
   )

   const { data, error } = await supabase.from('users').select('count()')
   console.log(error ? 'FAILED' : 'OK', error)
   EOF

   # Run with env vars
   NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_ANON_KEY=... node test-supabase.js
   ```

4. If still failing, verify database is ready:
   - Go to Supabase Dashboard
   - Click **SQL Editor**
   - Run: `SELECT 1;` → should return success

5. Update Vercel variables and redeploy

#### 4b: RLS Policy Errors

If you see `RLS policy violation` errors:

1. This is usually fine in development
2. In production, verify RLS policies are correctly configured:
   - Go to Supabase Dashboard
   - Click **Authentication** → **Policies**
   - Confirm policies allow anon access to public data

3. If you need to temporarily allow broader access for debugging:
   - Edit the policy in SQL Editor
   - But remember to restrict again for security

---

### Category 5: Redis/Upstash Configuration Errors

**Symptoms**:
```
Error: Failed to connect to Redis
Error: Invalid Redis URL
Error: Authentication failed
```

**Root Cause**: Redis URL is invalid or service is down

**Resolution**:

1. Verify Upstash database is active:
   - Go to Upstash Console
   - Click **Redis** → Your Database
   - Status should be "Active"

2. Get correct connection string:
   - Click the database
   - Click **Connect**
   - Select **Redis CLI**
   - Copy the **REDIS_URL**

3. Verify format:
   - Should be: `redis://default:password@host:port`
   - Should start with `redis://` (not `http://`)
   - Should include password

4. Test connection locally:
   ```bash
   redis-cli -u "redis://default:password@host:port" ping
   # Should return: PONG
   ```

5. If connection fails:
   - Database might be inactive or deleted
   - Create new database in Upstash
   - Copy new URL

6. Update `UPSTASH_REDIS_URL` in Vercel and redeploy

---

### Category 6: TypeScript/Build Errors

**Symptoms**:
```
error TS1005: ',' expected
error TS2307: Cannot find module 'some-module'
error TS7030: Not all code paths return a value
```

**Root Cause**: TypeScript compilation error in source code

**Resolution**:

1. Check if error occurs locally:
   ```bash
   npm run build
   ```

2. If error is local, fix the code:
   - Review the error message
   - Check the file and line number
   - Fix the TypeScript error
   - Commit and push

3. If error only happens in Vercel:
   - Verify build command: `npm run build`
   - Verify Node.js version matches (20.x LTS)
   - Clear Vercel cache:
     - Go to **Settings** → **Build Cache**
     - Click **Clear** (all)
   - Redeploy: `vercel --prod`

4. If still failing, try clean rebuild:
   ```bash
   # Locally:
   rm -rf .next node_modules
   npm ci
   npm run build
   ```

---

### Category 7: Dependency/NPM Errors

**Symptoms**:
```
npm ERR! code ERESOLVE
npm ERR! ERESOLVE unable to resolve dependency tree
error: Failed to install dependencies
```

**Root Cause**: Package.json dependencies have conflicts

**Resolution**:

1. Check locally:
   ```bash
   npm ci
   ```

2. If error is local:
   - Check what package is causing conflict
   - Update package.json to resolve conflict
   - Or use `npm audit fix` to fix vulnerabilities
   - Test: `npm ci && npm run build`
   - Commit and push

3. If only in Vercel:
   - Clear Vercel build cache:
     - Go to **Settings** → **Build Cache**
     - Click **Clear** (all)
   - Redeploy: `vercel --prod`

4. Common issues:
   - Different Node.js versions (dev vs. Vercel)
   - Missing package-lock.json
   - npm version mismatch

---

### Category 8: Memory/Timeout Errors

**Symptoms**:
```
FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed
Error: Build timeout (timeout after 900 seconds)
```

**Root Cause**: Build uses too much memory or takes too long

**Resolution**:

#### Memory Error:

1. Build should not use more than 3GB
2. If exceeding, reduce bundle size:
   ```bash
   npm run build -- --analyze
   ```

3. Look for:
   - Large dependencies (use lighter alternatives)
   - Unused code (remove or tree-shake)
   - Large test files in node_modules

4. Check `package.json` for oversized deps:
   - Remove unused dependencies
   - Use lighter alternatives
   - Check transitive deps: `npm ls`

5. Test locally:
   ```bash
   npm run build
   ```

6. If local build is OK but Vercel fails:
   - Clear Vercel cache
   - Redeploy

#### Timeout Error:

1. Build typically takes 2-5 minutes
2. If exceeding 15 minutes:
   - Check for hanging processes
   - Verify no infinite loops in build scripts
   - Check `package.json` scripts for long-running tasks

3. For database migrations or setup:
   - Run migrations separately, not in build
   - Build should only compile code, not run migrations

---

## Cold Start and Performance Issues

### Issue: Slow Initial Load (Cold Start)

**Symptoms**: First request after deployment takes 10+ seconds

**Root Cause**: Vercel needs to initialize function and load dependencies

**Why It Happens**:
- Serverless functions are created on demand
- Node.js runtime loads all dependencies
- TypeScript compilation happens at runtime if not pre-built

**Mitigation**:

1. **Pre-compilation**: Already done by `npm run build`

2. **Reduce bundle size**:
   ```bash
   npm audit
   npm update
   npm ci && npm run build
   ```

3. **Enable build caching** in Vercel:
   - Go to **Settings** → **Build Cache**
   - Set to **Automatic** (default)

4. **Keep dependencies up to date**:
   ```bash
   npm update
   ```

5. **Monitor performance**:
   - Go to **Deployments** → Click deployment → **Logs**
   - Look for function initialization time

### Issue: High Memory Usage

**Symptoms**: Function terminates with "out of memory"

**Root Cause**: Function uses more than allocated memory (1GB)

**Resolution**:

1. Profile memory usage:
   ```bash
   # Add to Next.js API route:
   console.log('Memory:', process.memoryUsage())
   ```

2. Identify heavy operations:
   - Large data processing
   - Stripe API calls (batch processing)
   - Supabase queries without limits

3. Optimize:
   - Paginate database queries
   - Stream large responses
   - Use batch processing for Stripe operations

4. If still exceeding 1GB:
   - Contact Vercel support about higher memory limit
   - Some operations may need to run outside functions (cron jobs, background tasks)

---

## Edge Function and Deployment Issues

### Issue: Edge Function Deployment Fails

**Symptoms**:
```
Error: Edge Function could not be created
```

**Root Cause**: Middleware or Edge Function has unsupported code

**Resolution**:

1. Check `middleware.ts`:
   - Edge functions only support a subset of Node.js APIs
   - Cannot use full file system access, child processes, etc.

2. If middleware has unsupported code:
   - Move logic to API routes (serverless functions)
   - Or use simpler middleware logic

3. Common unsupported in Edge Functions:
   - File system access (`fs` module)
   - Child processes (`child_process` module)
   - Certain npm packages (check Vercel docs)

---

### Issue: CORS Errors in Production

**Symptoms**:
```
Cross-Origin Request Blocked
Access to XMLHttpRequest from... blocked by CORS policy
```

**Root Cause**: Browser blocks cross-origin requests (by design)

**This is expected when**:
- Frontend on `vercel.app` domain
- API on different domain
- No CORS headers configured

**Resolution**:

1. If API is same domain:
   - No CORS issues (both on `vercel.app`)
   - Requests should work

2. If API is different domain:
   - Configure CORS headers in API route
   - Or use rewrites in `next.config.js` (already done)

3. Check `next.config.js`:
   - Verify rewrites for `/api/*` to remote API
   - Verify CORS headers are set

4. Test with curl:
   ```bash
   curl -i https://your-domain.vercel.app/api/health
   ```

---

## Deployment Health Checks

### Comprehensive Deployment Check

After deploying, run this checklist:

```bash
#!/bin/bash

DOMAIN="your-deployment.vercel.app"

echo "1. Testing health endpoint..."
curl -fsSL "https://$DOMAIN/api/health" | jq .

echo "2. Testing agent status..."
curl -fsSL "https://$DOMAIN/api/agent/status" | jq .

echo "3. Testing readiness (if available)..."
curl -fsSL "https://$DOMAIN/api/readiness" | jq . || echo "Readiness endpoint not found (OK)"

echo "4. Checking security headers..."
curl -i "https://$DOMAIN/" | grep -E "X-Frame-Options|Strict-Transport-Security|Content-Security-Policy"

echo "5. Verifying environment..."
curl -fsSL "https://$DOMAIN/api/agent/status" | jq .environment

echo "Deployment check complete!"
```

### Manual Health Check Commands

**Health Endpoint**:
```bash
curl https://your-deployment.vercel.app/api/health
# Expected: 200 OK with JSON
```

**Agent Status**:
```bash
curl https://your-deployment.vercel.app/api/agent/status
# Expected: 200 OK with environment and DB check
```

**Security Headers**:
```bash
curl -i https://your-deployment.vercel.app/ | grep -E "X-Frame|HSTS|CSP"
# Expected: Headers present
```

**Stripe Webhook Endpoint**:
```bash
curl -i https://your-deployment.vercel.app/api/webhook/stripe
# Expected: 400 (invalid signature) or 401 if no Stripe header
# NOT 404 (endpoint exists)
```

---

## Common Issues by Error Message

### "Module not found: can't resolve 'X'"

**Cause**: Dependency not installed or import path wrong

**Fix**:
```bash
npm ci
npm run build
vercel --prod
```

### "ENOSPC: no space left on device"

**Cause**: Vercel build environment out of disk space

**Fix**:
- Clear build cache: Vercel dashboard → Settings → Build Cache → Clear
- Redeploy

### "Deployment cancelled"

**Cause**: Deployment was manually cancelled or deployment limit reached

**Fix**:
- Try again: Click "Redeploy"
- Or wait a few minutes and redeploy

### "Function cold start exceeded timeout"

**Cause**: Function took >10s to initialize

**Fix**:
- Reduce bundle size
- Clear build cache
- Check for heavy imports at top level

---

## Vercel CLI Debugging

### View Logs

```bash
# Install Vercel CLI if needed
npm install -g vercel

# View function logs
vercel logs

# View logs for specific function
vercel logs /api/execute

# View logs with timestamps
vercel logs --follow
```

### List Environment Variables

```bash
# List production env vars
vercel env ls production

# List preview env vars
vercel env ls preview
```

### Redeploy

```bash
# Redeploy to production
vercel --prod

# Redeploy to preview
vercel

# Redeploy without prompt
vercel --prod --yes
```

### Clear Cache

```bash
# View build cache
vercel cache ls

# Clear all caches
vercel cache rm
```

---

## When to Contact Support

Contact **Vercel Support** if:

- Build fails with infrastructure error (not dependency error)
- Deployment has persistent 500 errors
- Performance is degraded (>30s response times)
- Rate limits seem to be hit incorrectly
- Function memory needs to exceed 1GB

Provide:

- Deployment URL
- Deployment ID (from dashboard)
- Exact error message
- Build logs (not screenshots)
- Steps to reproduce

---

## Recovery Procedures

### Rollback to Previous Deployment

1. In Vercel dashboard, click **Deployments**
2. Find the last known-good deployment
3. Click **More** (three dots)
4. Click **Promote to Production**
5. Confirm

This redeploys the previous version without re-running build.

### Emergency Rollback (if needed)

```bash
vercel rollback
# Select the deployment to rollback to
```

### Delete Failing Deployment

Don't usually need to, but if needed:

1. Click deployment
2. Click **More** (three dots)
3. Click **Delete**

Does not affect production if not promoted.

---

## Monitoring and Alerts

### Enable Vercel Analytics

1. Go to **Settings** → **Analytics**
2. Enable **Web Analytics**
3. Provides insights into:
   - Page load times
   - Core Web Vitals
   - Error rates

### Monitor Cron Jobs

1. Go to **Deployments** → **Function Logs**
2. Filter by `/api/cron/*` endpoints
3. Check execution frequency and success rate

### Set Up External Monitoring (Optional)

1. Use a service like UptimeRobot or Cronitor
2. Monitor: `https://your-domain.vercel.app/api/health`
3. Alert if endpoint is down

---

## Additional Resources

- **Vercel Troubleshooting**: https://vercel.com/docs/troubleshoot
- **Vercel CLI**: https://vercel.com/docs/cli
- **Vercel Build**: https://vercel.com/docs/projects/overview#build-step
- **Next.js Deployment**: https://nextjs.org/docs/deployment
- **Stripe API Issues**: https://stripe.com/docs/api/errors
- **Supabase Troubleshooting**: https://supabase.com/docs/guides/troubleshooting

---

**Status**: Setup-ready  
**Last verified**: 2026-06-07  
**Scope**: Comprehensive Vercel deployment troubleshooting and recovery procedures
