# Phase 8 Environment Variables - Quick Start Guide

## What You've Just Created

Four tools for secure environment variable management:

### 1. **Interactive Setup Wizard** 🧙
- **File**: `scripts/env-setup-wizard.sh`
- **Purpose**: Guide you through entering 11 environment variables safely
- **Usage**: `./scripts/env-setup-wizard.sh`
- **Features**:
  - Validates Stripe key format (sk_live_, sk_test_)
  - Validates Supabase URL format
  - Shows which vars are set vs. missing
  - Interactive menu for editing individual vars
  - Backs up existing configuration
  - Saves to `.env.local` with restricted permissions (mode 600)

### 2. **Vercel Migration Helper** 🚀
- **File**: `scripts/env-to-vercel.sh`
- **Purpose**: Guide copying environment variables from `.env.local` to Vercel Dashboard
- **Usage**: `./scripts/env-to-vercel.sh`
- **Features**:
  - Displays formatted output ready for copy-paste
  - Groups variables by category (Stripe, Supabase, URLs, Other)
  - Shows Vercel CLI commands if installed
  - Explains environment variable visibility (public vs. secret)
  - Shows verification and rotation procedures
  - Security warnings and best practices

### 3. **Configuration Template** 📋
- **File**: `.env.example.stripe-app`
- **Purpose**: Template with all 11 required variables and descriptions
- **Usage**: `cp .env.example.stripe-app .env.local`
- **Contains**:
  - Example formats for each variable
  - Detailed descriptions of what each variable does
  - Security warnings
  - Links to where to find each value
  - Setup instructions

### 4. **Security Guide** 🔐
- **File**: `docs/ENV_VARS_SECURITY_GUIDE.md`
- **Purpose**: Comprehensive security reference for environment variables
- **Usage**: `cat docs/ENV_VARS_SECURITY_GUIDE.md`
- **Covers**:
  - Why .env.local should never be committed
  - How to rotate API keys safely
  - Password manager recommendations (1Password, Bitwarden, LastPass)
  - Team credential sharing best practices
  - Vercel environment variable security
  - Incident response procedures
  - Complete security checklist

---

## Getting Started: 3 Steps

### Step 1: Create Your Local Configuration (5 minutes)

```bash
# Run the interactive setup wizard
./scripts/env-setup-wizard.sh
```

**What happens:**
- Opens interactive menu
- Asks you for 11 environment variables
- Validates each one before saving
- Shows which are required vs. optional
- Saves to `.env.local` (mode 600 = secure permissions)
- Allows editing individual variables later

**Available variables:**
1. `APP_URL` - Your app's internal base URL
2. `NEXT_PUBLIC_APP_URL` - Public-facing app URL
3. `STRIPE_SECRET_KEY` - Stripe API key (secret)
4. `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret
5. `STRIPE_PRICE_PRO` - Stripe Pro plan price ID
6. `STRIPE_PRICE_BUSINESS` - Stripe Business plan price ID
7. `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
8. `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase public key
9. `SUPABASE_SERVICE_ROLE_KEY` - Supabase secret key
10. `UPSTASH_REDIS_REST_URL` - Redis cache URL
11. `UPSTASH_REDIS_REST_TOKEN` - Redis API token

**After setup:**
```bash
# Verify it created the file
ls -la .env.local

# Start developing with all variables loaded
npm run dev
```

### Step 2: Deploy to Vercel (10 minutes)

```bash
# Run the Vercel migration helper
./scripts/env-to-vercel.sh
```

**What you'll see:**
- Menu with multiple options
- Select "1" to view formatted variables ready for copy-paste
- Vercel CLI commands (if installed)
- Dashboard instructions for manual setup

**Manually in Vercel Dashboard:**
1. Go to https://vercel.com/dashboard
2. Select project: **tdealer01-crypto-dsg-control-plane**
3. Click **Settings** → **Environment Variables**
4. For each variable:
   - Click **Add New**
   - Name: (e.g., `STRIPE_SECRET_KEY`)
   - Value: (copy from `.env.local`)
   - Check: Production, Preview, Development (unless it's a secret)
   - Save
5. Redeploy:
   - Go to **Deployments** tab
   - Click **Redeploy** on latest deployment
   - Wait 2-3 minutes for completion

**Verify deployment:**
```bash
# Check health
curl https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health

# Verify environment
curl https://tdealer01-crypto-dsg-control-plane.vercel.app/api/agent/status

# Run tests
npm run test:integration
```

### Step 3: Understand Security Best Practices (Read Only)

```bash
# Read the comprehensive security guide
cat docs/ENV_VARS_SECURITY_GUIDE.md

# Or open in your editor
code docs/ENV_VARS_SECURITY_GUIDE.md
```

**Key points:**
- Never commit `.env.local` to git
- Use password managers (1Password, Bitwarden) for team sharing
- Rotate keys quarterly or when compromised
- Keep server secrets away from client code
- Follow the incident response procedure if a secret leaks

---

## 11 Environment Variables Reference

| Variable | Purpose | Type | Required | Where to Find |
|----------|---------|------|----------|---------------|
| `APP_URL` | Internal app URL | URL | Yes | Your domain |
| `NEXT_PUBLIC_APP_URL` | Public app URL | URL | Yes | Your domain |
| `STRIPE_SECRET_KEY` | Stripe API key | Secret | Yes | Stripe Dashboard |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret | Secret | Yes | Stripe Dashboard |
| `STRIPE_PRICE_PRO` | Pro plan price ID | ID | Yes | Stripe Products |
| `STRIPE_PRICE_BUSINESS` | Business plan price ID | ID | Yes | Stripe Products |
| `NEXT_PUBLIC_SUPABASE_URL` | Database URL | URL | Yes | Supabase Settings |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public database key | Key | Yes | Supabase Settings |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin database key | Secret | Yes | Supabase Settings |
| `UPSTASH_REDIS_REST_URL` | Cache URL | URL | No | Upstash Console |
| `UPSTASH_REDIS_REST_TOKEN` | Cache API token | Secret | No | Upstash Console |

---

## Common Questions

### Q: Can I use the setup wizard multiple times?
**A:** Yes! Run `./scripts/env-setup-wizard.sh` anytime to update variables.

### Q: What if I skip a variable in the setup wizard?
**A:** It's fine - optional variables (Redis) can be skipped. Required ones (Stripe, Supabase) should be set.

### Q: How do I edit a single variable?
**A:** 
```bash
# Option 1: Run the wizard again and select option 2 (Edit individual)
./scripts/env-setup-wizard.sh

# Option 2: Edit directly in editor
nano .env.local
```

### Q: Is `.env.local` committed to git?
**A:** No! It's in `.gitignore`. Never commit it.

### Q: How do I share credentials with my team?
**A:** Use Vercel's native environment variables (encrypted) or a password manager like 1Password. See `docs/ENV_VARS_SECURITY_GUIDE.md` for details.

### Q: What happens if I commit `.env.local` by accident?
**A:** It's in `.gitignore`, so git should prevent it. If it happens, immediately:
1. Revoke all exposed keys in their respective services
2. Generate new keys
3. Update Vercel
4. Redeploy
5. See incident response section in security guide

### Q: How often should I rotate keys?
**A:** Quarterly (3 months) as a best practice, or immediately if compromised. See `docs/ENV_VARS_SECURITY_GUIDE.md` for rotation procedures.

### Q: Can I use test keys (sk_test_) in production?
**A:** No - test keys don't process real charges. Always use sk_live_ for production.

### Q: What if my Vercel deployment fails?
**A:** Check Vercel logs and verify:
1. All variables are set in Vercel Dashboard
2. No typos in variable names
3. Secrets are not exposed to "Browser" scope
4. Run `npm run test:integration` locally first
5. Check deployment logs: https://vercel.com/dashboard → Deployments

---

## File Locations

```
/home/user/tdealer01-crypto-dsg-control-plane/
├── .env.local                           (created by wizard, gitignored)
├── .env.example.stripe-app              (template, safe to commit)
├── scripts/
│   ├── env-setup-wizard.sh              (interactive setup tool)
│   └── env-to-vercel.sh                 (migration helper)
└── docs/
    ├── ENV_VARS_SECURITY_GUIDE.md       (comprehensive security reference)
    └── PHASE_8_ENV_VARS_QUICKSTART.md   (this file)
```

---

## Recommended Workflow

### Day 1: Initial Setup
```bash
# 1. Create your local configuration
./scripts/env-setup-wizard.sh

# 2. Test locally
npm run dev
npm run test:integration

# 3. Deploy to Vercel
./scripts/env-to-vercel.sh  # Follow the menu
```

### Day 2: Verification
```bash
# 1. Verify deployment
curl https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health

# 2. Check status
curl https://tdealer01-crypto-dsg-control-plane.vercel.app/api/agent/status

# 3. Run full test suite
npm run test
npm run test:integration
```

### Quarterly: Key Rotation
```bash
# 1. Rotate each key in its service (Stripe, Supabase, Upstash)
# 2. Update Vercel environment variables
# 3. Update .env.local
./scripts/env-setup-wizard.sh  # Edit variables

# 4. Redeploy
vercel redeploy --prod

# 5. Verify
npm run test:integration
curl https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health
```

---

## Troubleshooting

### Scripts won't run
```bash
# Make sure they're executable
chmod +x scripts/env-setup-wizard.sh
chmod +x scripts/env-to-vercel.sh

# Run with bash if needed
bash scripts/env-setup-wizard.sh
```

### Colors look weird in terminal
- Try: `export TERM=xterm-256color`
- Or: Run scripts in a different terminal (try tmux, screen, or iTerm)

### Can't find variable in script
- Use the search feature in your terminal (Ctrl+F)
- Or open the script in an editor: `code scripts/env-setup-wizard.sh`

### Vercel deployment stuck
- Check logs: https://vercel.com/dashboard → Deployments → [Latest] → Logs
- Wait 30 seconds for variables to propagate
- Force redeploy: `vercel redeploy --prod`

### Stripe integration failing
- Verify `STRIPE_SECRET_KEY` starts with `sk_live_` (production) or `sk_test_` (testing)
- Check Stripe Dashboard for active keys
- Verify webhook secret matches Stripe Dashboard

### Supabase connection failing
- Verify URL format: `https://[project].supabase.co`
- Check service role key is not expired
- Verify RLS policies allow your user/role
- Test with: `npm run test:integration -- --grep Supabase`

---

## What's Next?

After Phase 8 environment variable setup:

1. **Run integration tests** to verify everything works
   ```bash
   npm run test:integration
   ```

2. **Test Stripe checkout flow** in your staging environment

3. **Test OAuth flow** if using Supabase Auth

4. **Set up monitoring** in Vercel Dashboard

5. **Configure CI/CD** to automatically test before deployment

6. **Document rotation schedule** in your team wiki

7. **Add team members** to Vercel with appropriate permissions

---

## Support

If you have questions:

1. **Check the security guide**: `docs/ENV_VARS_SECURITY_GUIDE.md`
2. **Review the template**: `.env.example.stripe-app`
3. **Look at the scripts**: `scripts/env-setup-wizard.sh`, `scripts/env-to-vercel.sh`
4. **Check Vercel docs**: https://vercel.com/docs/concepts/projects/environment-variables
5. **Contact team**: Reach out to @t.dealer01@dsg.pics

---

## Checklist: Phase 8 Environment Variables Complete

- [ ] Created `.env.local` using `./scripts/env-setup-wizard.sh`
- [ ] All 11 variables are set and validated
- [ ] `.env.local` is in `.gitignore`
- [ ] Local tests pass: `npm run test:integration`
- [ ] Local dev works: `npm run dev` (no errors)
- [ ] Deployed to Vercel using `./scripts/env-to-vercel.sh`
- [ ] All variables set in Vercel Dashboard
- [ ] Production deployment status is "Ready"
- [ ] Deployment verification passed:
  - [ ] `/api/health` returns success
  - [ ] `/api/agent/status` shows correct environment
- [ ] Stripe integration tested
- [ ] Supabase connection verified
- [ ] Team members have access (via Vercel or password manager)
- [ ] Read security guide: `docs/ENV_VARS_SECURITY_GUIDE.md`
- [ ] Key rotation schedule documented
- [ ] Incident response plan understood

---

**Version**: 1.0  
**Created**: 2024-06-07  
**Status**: Ready for Production  
**Author**: Claude Code / Phase 8 Team

