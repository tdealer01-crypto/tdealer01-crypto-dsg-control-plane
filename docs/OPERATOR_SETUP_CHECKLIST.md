# Operator Setup Checklist

One-time setup checklist for deploying `tdealer01-crypto-dsg-control-plane` to production.
Run these commands from a machine with network access to Vercel and Supabase.

## Prerequisites
- Vercel account with project linked to this repo
- Supabase project created at https://supabase.com/dashboard
- Node.js 20+ installed locally
- `gh` CLI installed (for PR creation)

## Step 1: Vercel Environment Variables

```bash
# Login to Vercel CLI
npx vercel login

# Add required env vars (values from your Supabase project Settings → API)
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
npx vercel env add SUPABASE_SERVICE_ROLE_KEY production

# Set app URL
echo "https://tdealer01-crypto-dsg-control-plane.vercel.app" | npx vercel env add APP_URL production
echo "https://tdealer01-crypto-dsg-control-plane.vercel.app" | npx vercel env add NEXT_PUBLIC_APP_URL production

# Set DSG core mode
echo "internal" | npx vercel env add DSG_CORE_MODE production

# Verify all vars are set
npx vercel env ls production
```

## Step 2: Supabase Migrations

```bash
# Option A: Supabase CLI (recommended)
npx supabase login
npx supabase link --project-ref <YOUR_PROJECT_REF>
npx supabase db push

# Option B: Manual SQL
# Go to Supabase Dashboard → SQL Editor
# Execute each file in supabase/migrations/ in timestamp order (14 files)
```

## Step 3: Supabase Authentication Settings

In Supabase Dashboard:

1. **Authentication → Providers → Email** → Enable
2. **Authentication → URL Configuration**
   - Site URL: `https://tdealer01-crypto-dsg-control-plane.vercel.app`
   - Redirect URLs: add `https://tdealer01-crypto-dsg-control-plane.vercel.app/auth/confirm`

## Step 4: Deploy

```bash
# If Git integration works (verified commits)
git push origin main
# Wait for Vercel auto-deploy

# If deployment is canceled (unverified commit), deploy directly
npx vercel --prod
```

## Step 5: Verify

```bash
# Health check
curl -sS https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health

# Core monitor
curl -sS https://tdealer01-crypto-dsg-control-plane.vercel.app/api/core/monitor
```

Open login page:
- macOS: `open https://tdealer01-crypto-dsg-control-plane.vercel.app/login`
- Termux: `termux-open-url https://tdealer01-crypto-dsg-control-plane.vercel.app/login`

## Step 6: First Login

1. Go to `/login`
2. Click **Start Free Trial** tab
3. Enter email: `t.dealer01@dsg.pics`
4. Enter Workspace name, for example `DSG Ops`
5. Click **Start free trial**
6. Check email for magic link → click to complete login

## Troubleshooting

| Error | Cause | Fix |
|---|---|---|
| `missing-supabase-url` | Missing `NEXT_PUBLIC_SUPABASE_URL` | Add env var in Vercel |
| `missing-anon-key` | Missing `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Add env var in Vercel |
| `missing-service-key` | Missing `SUPABASE_SERVICE_ROLE_KEY` | Add env var in Vercel |
| `send-failed` | Supabase Email provider disabled | Enable in Supabase Dashboard |
| `not-allowed` | `ACCESS_MODE=invite_only` | Change to `self_serve_trial` or remove |
| `missing-workspace` | Used Login tab instead of Start Free Trial | Switch to Start Free Trial tab |
| `invalid-link` | Magic link expired or Redirect URL mismatch | Check Supabase URL Configuration |
| `rate-limited` | Too many login attempts | Wait 1 minute |
| `unexpected` | Server error | Check Vercel Function Logs |
