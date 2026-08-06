# Environment Setup Guide

This guide explains how to set up environment variables for local development and production deployment.

## Quick Start (Local Development)

### Step 1: Initialize `.env.local`

A template `.env.local` file has been created in the project root. This file is automatically ignored by Git (see `.gitignore`).

```bash
# File location
.env.local
```

**DO NOT commit this file.** It contains secrets and configuration specific to your environment.

### Step 2: Fill in Required Variables

Edit `.env.local` and provide values for these **CRITICAL** variables:

```env
# From your Supabase project Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# DSG Core mode (internal = use local routes, remote = use external API)
DSG_CORE_MODE=internal

# App URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
APP_URL=http://localhost:3000
```

### Step 3: Verify Setup

```bash
./scripts/verify-env-setup.sh
```

Expected output: `✅ Environment setup verification PASSED`

### Step 4: Build and Run

```bash
# Type checking
npm run typecheck

# Start dev server
npm run dev

# Or full build (production-like)
npm run build
```

## Production Deployment (Vercel)

### Prerequisites

- Vercel account with this repository linked
- Supabase project created and migrations applied
- Vercel CLI installed: `npm install -g vercel`

### Step 1: Login to Vercel

```bash
npx vercel login
```

### Step 2: Set Environment Variables in Vercel

Set values for **all three environments**: `production`, `preview`, `development`

```bash
# CRITICAL variables (required for all environments)
for ENV in production preview development; do
  echo "Setting environment: $ENV"
  
  # Supabase public URL
  npx vercel env add NEXT_PUBLIC_SUPABASE_URL "$ENV" \
    --value="https://your-project.supabase.co"
  
  # Supabase public key (anon or publishable)
  npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY "$ENV" \
    --value="your-anon-key-here"
  
  # Service role key (server-side only, never in client)
  npx vercel env add SUPABASE_SERVICE_ROLE_KEY "$ENV" \
    --value="your-service-role-key-here"
done

# REQUIRED variables
npx vercel env add APP_URL production --value="https://tdealer01-crypto-dsg-control-plane.vercel.app"
npx vercel env add NEXT_PUBLIC_APP_URL production --value="https://tdealer01-crypto-dsg-control-plane.vercel.app"

# DSG Core mode
npx vercel env add DSG_CORE_MODE production --value="internal"

# Verify
npx vercel env ls production
npx vercel env ls preview
npx vercel env ls development
```

### Step 3: Deploy

```bash
# If using Vercel Git integration:
git push origin main

# Or deploy directly:
npx vercel --prod
```

### Step 4: Verify Deployment

```bash
# Health check
curl -sS https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health

# Core monitor
curl -sS https://tdealer01-crypto-dsg-control-plane.vercel.app/api/core/monitor
```

## Environment Variable Reference

### CRITICAL (Build + Runtime Required)

| Variable | Purpose | Example |
|----------|---------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://xyz.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public auth key | `eyJhbGc...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side admin key | `eyJhbGc...` (never expose) |
| `DSG_CORE_MODE` | Execution mode | `internal` or `remote` |

### REQUIRED (Functionality)

| Variable | Purpose | Example |
|----------|---------|---------|
| `APP_URL` | Server-side app origin | `http://localhost:3000` |
| `NEXT_PUBLIC_APP_URL` | Client-side app origin | `http://localhost:3000` |

### DSG Core Mode

**If `DSG_CORE_MODE=internal`:**
- Leave `DSG_CORE_URL` empty
- Uses local `/api/*` routes for all operations
- Suitable for local dev and single-service deployments

**If `DSG_CORE_MODE=remote`:**
- Set `DSG_CORE_URL` to external API endpoint
- Set `DSG_CORE_API_KEY` for authentication
- Routes all requests to remote control plane

### Optional: Stripe Integration

| Variable | Purpose | When Needed |
|----------|---------|-------------|
| `STRIPE_SECRET_KEY` | Live API key | For billing/payments |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing | For webhook processing |
| `STRIPE_PRICE_PRO` | Pro tier pricing | For plan management |
| `STRIPE_PRICE_BUSINESS` | Business tier pricing | For plan management |

### Optional: GitHub App

| Variable | Purpose | When Needed |
|----------|---------|-------------|
| `GITHUB_APP_ID` | GitHub App ID | For DSG gate webhook |
| `GITHUB_APP_PRIVATE_KEY` | Private key | For GitHub authentication |
| `GITHUB_APP_WEBHOOK_SECRET` | Webhook signing | For webhook processing |

### Optional: AI & Language

| Variable | Purpose | Default |
|----------|---------|---------|
| `OPENROUTER_API_KEY` | Multi-model LLM access | (optional) |
| `OPENROUTER_MODEL_CHAT` | Chat model ID | (fallback to free) |
| `PREFERRED_LANGUAGE` | UI language | `en` (English) |

## Troubleshooting

### Build Error: "Missing Supabase public environment variables"

**Cause:** `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` is missing

**Fix:**
```bash
# Local dev
# Update .env.local and ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set

# Production (Vercel)
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
npx vercel --prod
```

### Runtime Error: "SUPABASE_SERVICE_ROLE_KEY is missing"

**Cause:** Server-side routes cannot access the service role key

**Fix:**
```bash
# Local dev
# Update .env.local with SUPABASE_SERVICE_ROLE_KEY

# Production (Vercel)
npx vercel env add SUPABASE_SERVICE_ROLE_KEY production
```

### "Invalid agent_id or API key"

**Cause:** DSG Core configuration or agent credentials issue

**Fix:**
1. Verify `DSG_CORE_MODE` is correctly set
2. If `remote`, verify `DSG_CORE_URL` and `DSG_CORE_API_KEY` are reachable
3. Check agent credentials in Supabase

### Stripe Setup Script Fails

**Cause:** `STRIPE_SECRET_KEY` is not set

**Fix:**
```bash
# Set the environment variable with your Stripe secret key
export STRIPE_SECRET_KEY="sk_live_..." # (from Stripe Dashboard)
node run-setup.mjs
```

## Verification Checklist

After setup, verify:

- [ ] `.env.local` exists and is in `.gitignore` (local dev only)
- [ ] All CRITICAL variables are populated
- [ ] `./scripts/verify-env-setup.sh` passes without errors
- [ ] `npm run typecheck` completes successfully
- [ ] `npm run dev` or `npm run build` works without "Missing Supabase" errors
- [ ] Local dev: `curl http://localhost:3000/api/health` returns `{"ok":true}`
- [ ] Production: `curl https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health` returns `{"ok":true}`

## Security Notes

### Never Commit Secrets

- `.env.local` is ignored (local dev)
- Never print secrets in CI logs
- Never hardcode keys in source code
- Use GitHub Secrets for CI/CD variables

### Stripe Secret Key

The `run-setup.mjs` script now reads `STRIPE_SECRET_KEY` from the environment instead of using a hardcoded value.

**If you've used the old version with a hardcoded key:**
1. ⚠️ **Rotate that key immediately** in your Stripe Dashboard
2. The key is publicly compromised and must not be reused
3. Use the new approach with environment variables

### Service Role Keys

- Never expose `SUPABASE_SERVICE_ROLE_KEY` to clients
- Keep it server-side only
- Use `NEXT_PUBLIC_SUPABASE_ANON_KEY` for client-side operations

## Related Documentation

- [docs/OPERATOR_SETUP_CHECKLIST.md](./OPERATOR_SETUP_CHECKLIST.md) - One-time production setup
- [docs/RUNBOOK_DEPLOY.md](./RUNBOOK_DEPLOY.md) - Deployment runbook
- [.env.example](../.env.example) - Complete environment variable reference
- [CLAUDE.md](../CLAUDE.md) - AI assistant operating guide
