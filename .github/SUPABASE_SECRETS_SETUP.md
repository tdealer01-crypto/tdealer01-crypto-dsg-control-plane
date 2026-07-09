# GitHub Secrets Setup - Supabase Configuration

This file provides quick reference for setting up GitHub repository secrets.

## ⚠️ Important: Manual UI Step Required

GitHub repository secrets **cannot be added via API or scripts** for security reasons. You must add them manually through the GitHub web interface.

## Quick Setup (5 minutes)

### Step 1: Open GitHub Secrets Settings

Go to: **https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane/settings/secrets/actions**

### Step 2: Add Three Secrets

Click **"New repository secret"** and add each of these three secrets:

#### Secret 1: NEXT_PUBLIC_SUPABASE_URL
- **Name:** `NEXT_PUBLIC_SUPABASE_URL`
- **Value:** Your Supabase project URL (from Supabase Dashboard → Settings → API → Project URL)
  - Format: `https://[project-ref].supabase.co`
- Click **Add secret**

#### Secret 2: NEXT_PUBLIC_SUPABASE_ANON_KEY
- **Name:** `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Value:** Your Supabase anon public key (from Supabase Dashboard → Settings → API → anon key)
  - Long string starting with `eyJ...`
- Click **Add secret**

#### Secret 3: SUPABASE_SERVICE_ROLE_KEY
- **Name:** `SUPABASE_SERVICE_ROLE_KEY`
- **Value:** Your Supabase service role secret (from Supabase Dashboard → Settings → API → service_role key)
  - Long string starting with `eyJ...` (⚠️ **SENSITIVE** - different from anon key)
  - ⚠️ **Never** commit this to version control
- Click **Add secret**

### Step 3: Verify Secrets Are Listed

After adding all three, refresh the secrets page. You should see:
```
✓ NEXT_PUBLIC_SUPABASE_ANON_KEY
✓ NEXT_PUBLIC_SUPABASE_URL
✓ SUPABASE_SERVICE_ROLE_KEY
```

(Listed alphabetically with lock icons)

### Step 4: Trigger CI Pipeline

Once secrets are confirmed visible:

```bash
git commit --allow-empty -m "test: trigger CI with Supabase secrets configured"
git push origin claude/dsg-one-revenue-blockers-h4494i
```

### Step 5: Monitor CI

Go to **GitHub Actions** tab and watch for:
- ✅ `test` - Unit & integration tests
- ✅ `verify` - Verification checks
- ✅ `e2e` - End-to-end tests
- ✅ `smoke-test` - Application smoke tests
- ✅ `CCVS Evidence Tests` - Compliance testing
- ✅ `DSG Proof Gate` - Governance validation
- ✅ `security` - Security scanning
- ✅ Vercel deployment - Build success

All 8 should transition from ❌ FAILED to ✅ PASSED within 2-3 minutes.

## Troubleshooting

### Secrets not appearing after adding
- **Wait 2-3 minutes** for GitHub to sync
- Refresh the page (Ctrl+R or Cmd+R)
- Check that you're in the correct repository settings

### Still failing after secrets added
- Verify **exact secret names** (case-sensitive):
  - `NEXT_PUBLIC_SUPABASE_URL` ✓
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` ✓
  - `SUPABASE_SERVICE_ROLE_KEY` ✓
- Verify values are **complete** (no truncation)
- Verify you used **service_role key**, not anon key, for `SUPABASE_SERVICE_ROLE_KEY`
- Check workflow logs (Actions → [workflow] → [job]) for environment variable errors

## Reference Documents

- **Detailed Setup Guide:** [docs/SUPABASE_ENV_SETUP.md](../../docs/SUPABASE_ENV_SETUP.md)
- **Vercel Setup:** [docs/VERCEL_ENV_SETUP.md](../../docs/VERCEL_ENV_SETUP.md) (already complete)
- **CI Workflows:** [.github/workflows/](../)

## Security Notes

✅ **NEXT_PUBLIC_*** variables are safe to expose (public client use)
⚠️ **SUPABASE_SERVICE_ROLE_KEY** is secret - guard carefully
- Never share via email, chat, or screenshots
- Never commit to git
- Rotate periodically in Supabase dashboard

---

**Status:** Ready for GitHub secrets configuration
**Next Step:** Add 3 secrets to GitHub (manual UI action)
**Time Estimate:** 5 minutes total
