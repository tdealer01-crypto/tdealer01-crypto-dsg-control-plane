# Environment Variables Security Guide

## Phase 8 Deployment - Secure Credential Management

This guide covers best practices for managing environment variables, API keys, and secrets across development, staging, and production environments.

---

## Table of Contents

1. [Overview](#overview)
2. [Never Commit Secrets](#never-commit-secrets)
3. [Local Development Setup](#local-development-setup)
4. [Production Deployment](#production-deployment)
5. [Key Rotation](#key-rotation)
6. [Team Credential Sharing](#team-credential-sharing)
7. [Password Manager Setup](#password-manager-setup)
8. [Vercel Configuration](#vercel-configuration)
9. [Security Checklist](#security-checklist)
10. [Incident Response](#incident-response)

---

## Overview

### What Are Environment Variables?

Environment variables are configuration values that change between environments (development, staging, production) without changing code. Examples:

- **API Keys** (Stripe, Supabase, etc.)
- **Webhook Secrets** (used to validate incoming events)
- **Database Credentials** (connection strings, auth tokens)
- **URLs** (app domain, API endpoints)
- **Feature Flags** (enable/disable functionality)

### Security Principles

1. **Never commit secrets to version control** - Once committed, they're permanently in Git history
2. **Different secrets per environment** - Test/dev keys differ from production
3. **Minimal exposure** - Only store secrets in secure systems, never print them
4. **Rotation ready** - Design systems to handle key rotation without downtime
5. **Audit trail** - Track who accessed what credentials and when

---

## Never Commit Secrets

### Why This Matters

Once a secret is committed to Git:

1. **It's in history forever** - `git revert` doesn't remove it from past commits
2. **Clones include history** - Anyone who clones the repo gets the secret
3. **GitHub will find it** - GitHub scans repos for leaked keys and alerts the token owner
4. **Public archives exist** - Even deleted repos are archived on the public internet
5. **Revocation is reactive, not preventive** - You can revoke a key but it's already exposed

### Real-World Example

A developer accidentally commits `STRIPE_SECRET_KEY=sk_live_abc123...` to GitHub:

1. GitHub's automated scanner detects the Stripe key
2. Stripe receives a notification that a key was exposed
3. Stripe revokes the key to prevent unauthorized charges
4. The developer must generate a new key in Stripe Dashboard
5. The developer must update Vercel and local environment
6. The developer must redeploy the application
7. **Total response time: 15-30 minutes of panic**

### Prevention: .gitignore

Ensure `.env.local` is in `.gitignore`:

```bash
# Check if it's already there
grep '.env.local' .gitignore

# Add it if it's missing
echo '.env.local' >> .gitignore
```

Add to `.gitignore`:

```
# Environment variables - NEVER commit
.env.local
.env.*.local
.env.production.local
.env.*.backup*

# IDE
.vscode/
.idea/
*.swp
*.swo

# Dependencies
node_modules/
```

### Validate Before Committing

```bash
# See what files would be committed
git status

# Never see .env.local or .env.*.local in the list
# If you do see it, STOP and add it to .gitignore immediately

# Check git history for secrets (use with caution)
git log -p --all -- '*.env*'  # WARNING: This shows all secrets!
```

---

## Local Development Setup

### Step 1: Use the Setup Wizard

The interactive setup script guides you through entering variables safely:

```bash
./scripts/env-setup-wizard.sh
```

This script:
- ✓ Validates each variable format before saving
- ✓ Shows which variables are set vs. missing
- ✓ Saves to `.env.local` with restricted permissions (mode 600)
- ✓ Backs up existing configuration
- ✓ Allows editing individual variables
- ✓ Never prints sensitive values to terminal

### Step 2: Create .env.local

```bash
# Copy the template
cp .env.example.stripe-app .env.local

# Edit with your actual values
# Use a secure editor that doesn't log content
nano .env.local
# or
vim .env.local
```

### Step 3: Verify Permissions

```bash
# Check file permissions (should be 600 = owner read/write only)
ls -la .env.local
# Expected: -rw------- 1 user group ...
#           ^-- restrictive permissions

# Set permissions if needed
chmod 600 .env.local
```

### Step 4: Load Variables

For development with `npm run dev`:

```bash
# Next.js automatically loads .env.local
npm run dev

# For other tools/scripts, source explicitly
source .env.local  # But be careful - this prints them in bash history!
```

### Best Practices for Local Development

1. **Never print secrets to console**
   ```bash
   # BAD - logs the secret to terminal history
   echo $STRIPE_SECRET_KEY
   
   # GOOD - no output
   if [[ -z "$STRIPE_SECRET_KEY" ]]; then echo "Missing!"; fi
   ```

2. **Use a terminal multiplexer** (tmux/screen)
   - Isolates each environment session
   - Prevents accidental secret display
   - Enables session persistence

3. **Clear terminal history** when done
   ```bash
   # Clear current session history
   history -c
   exit
   ```

4. **Don't share development machines** with others on the same login

---

## Production Deployment

### Vercel Configuration

Vercel is our production deployment platform and provides native environment variable encryption.

#### Option 1: Vercel Dashboard (Recommended for Teams)

1. Go to [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Select project: **tdealer01-crypto-dsg-control-plane**
3. Click **Settings** → **Environment Variables**
4. For each variable:
   - Click **Add New**
   - Set **Name**: (e.g., `STRIPE_SECRET_KEY`)
   - Set **Value**: (from your `.env.local`)
   - Select environments (Production/Preview/Development)
   - Click **Save**

5. Redeploy to apply variables:
   - Go to **Deployments** tab
   - Click **Redeploy** on the latest deployment
   - Wait for build completion (2-3 minutes)

#### Option 2: Vercel CLI

```bash
# Install Vercel CLI if not already installed
npm install -g vercel

# Link project (one time)
vercel link

# Set environment variables
vercel env add STRIPE_SECRET_KEY sk_live_...
vercel env add STRIPE_WEBHOOK_SECRET whsec_...
# ... repeat for each variable

# Redeploy with new variables
vercel redeploy --prod
```

#### Option 3: Migration Helper Script

```bash
./scripts/env-to-vercel.sh
```

This interactive script:
- ✓ Displays formatted variables for copy-paste
- ✓ Shows Vercel CLI commands
- ✓ Guides manual dashboard setup
- ✓ Shows which variables are public vs. secret
- ✓ Explains verification and rotation procedures

### Environment Variable Visibility

**CRITICAL**: Set correct visibility in Vercel to prevent exposing secrets to browsers.

#### Server-Side Only (NEVER PUBLIC)

These must ONLY be available in Function (server) environment:

```
STRIPE_SECRET_KEY            → Server only
STRIPE_WEBHOOK_SECRET        → Server only
SUPABASE_SERVICE_ROLE_KEY    → Server only
UPSTASH_REDIS_REST_TOKEN     → Server only
INTERNAL_SERVICE_TOKEN       → Server only
```

In Vercel, check:
- ✓ Production
- ✓ Preview
- ✓ Development
- ✗ Do NOT expose to "Browser"

#### Client-Safe (PUBLIC OK)

These can be exposed to browsers safely:

```
NEXT_PUBLIC_SUPABASE_URL      → Can be public
NEXT_PUBLIC_SUPABASE_ANON_KEY → Can be public
NEXT_PUBLIC_APP_URL           → Can be public
```

In Vercel, check:
- ✓ Production
- ✓ Preview
- ✓ Development
- ✓ Browser (OK for these)

### Verify Deployment

After deploying with new variables:

```bash
# Check if deployment is live and healthy
curl https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health

# Verify environment and database connectivity
curl https://tdealer01-crypto-dsg-control-plane.vercel.app/api/agent/status

# Run integration tests
npm run test:integration

# Check Vercel logs for errors
vercel logs --follow
```

---

## Key Rotation

### When to Rotate Keys

- **Quarterly** - Regular rotation best practice
- **Compromised** - Immediately if you suspect exposure
- **Employee departure** - When team member leaves
- **Service incident** - If service has security issue
- **Regulatory requirement** - Per audit/compliance mandate

### Stripe Key Rotation

1. **Generate new keys in Stripe Dashboard**
   - https://dashboard.stripe.com/apikeys
   - Click **+ Create restricted key** (recommended)
   - Give it specific permissions needed
   - Copy the new secret key

2. **Update Vercel**
   - Go to Vercel Dashboard → Settings → Environment Variables
   - Click edit on `STRIPE_SECRET_KEY`
   - Replace value with new key
   - Click Save

3. **Update local development**
   ```bash
   # Edit .env.local with new key
   nano .env.local
   
   # Change: STRIPE_SECRET_KEY=sk_live_OLD_KEY
   # To:     STRIPE_SECRET_KEY=sk_live_NEW_KEY
   ```

4. **Redeploy**
   - Vercel auto-redeploys or manual redeploy
   - Test with integration tests: `npm run test:integration`

5. **Verify old key is revoked**
   - Stripe Dashboard → Developers → API Keys
   - Click "Archive" on old key to revoke it
   - Old key stops working (prevents accidental use)

6. **Update webhook endpoint secret** (if needed)
   - Stripe Dashboard → Developers → Webhooks
   - Find the webhook endpoint
   - Click "Reveal" to see signing secret if changed
   - If secret was rotated, update `STRIPE_WEBHOOK_SECRET`

### Supabase Key Rotation

1. **Generate new keys in Supabase**
   - Go to https://app.supabase.com → Project Settings → API
   - Under Service Role Key section, click **Rotate key** or **Create new**
   - Copy the new key

2. **Update Vercel**
   - Environment Variables → Edit `SUPABASE_SERVICE_ROLE_KEY`
   - Paste new key
   - Save and redeploy

3. **Update local development**
   ```bash
   nano .env.local
   # Update: SUPABASE_SERVICE_ROLE_KEY=eyJ...NEW...
   ```

4. **Test database connectivity**
   ```bash
   npm run test:integration -- --grep Supabase
   ```

5. **Verify RLS policies still work**
   - Check Supabase Dashboard → Authentication
   - Verify session tokens still authenticate correctly
   - Run authenticated tests to ensure row-level security works

### Upstash Redis Token Rotation

1. **Generate new token in Upstash Console**
   - https://console.upstash.com → Redis Database → Settings
   - Click **Reset Token** or **Generate New Token**
   - Copy new token

2. **Update Vercel**
   - Environment Variables → Edit `UPSTASH_REDIS_REST_TOKEN`
   - Paste new token
   - Save and redeploy

3. **Update local development**
   ```bash
   nano .env.local
   # Update: UPSTASH_REDIS_REST_TOKEN=AXX...NEW...
   ```

4. **Monitor cache behavior**
   - Old token stops working immediately
   - Cache data is preserved (same database)
   - First request after rotation might be slower (cache miss)

### GitHub App Secrets Rotation

If using GitHub App integration:

1. **Regenerate private key in GitHub**
   - Go to GitHub.com → Settings → Developer settings → GitHub Apps
   - Select the DSG app
   - Click **Regenerate private key**
   - Copy new key (looks like `-----BEGIN RSA PRIVATE KEY-----...`)

2. **Update Vercel**
   - Environment Variables → Edit `GITHUB_APP_PRIVATE_KEY`
   - Replace entire key (multiline)
   - Save and redeploy

3. **Regenerate webhook secret** (optional but recommended)
   - GitHub App page → Webhook → Secret
   - Generate new secret
   - Update `GITHUB_APP_WEBHOOK_SECRET`

---

## Team Credential Sharing

### Best Practices

1. **Never share credentials via email, Slack, or SMS**
   - Email is not encrypted
   - Slack messages are logged on servers
   - SMS is unencrypted

2. **Use Vercel's team features** (Vercel Pro/Team Plan)
   - Vercel securely manages environment variables per team
   - No need to share credentials directly
   - Audit logs track access

3. **Use a password manager** (see next section)
   - 1Password, Bitwarden, or LastPass
   - Enables secure sharing with team
   - Maintains audit trail

4. **For contractors/partners**
   - Use read-only API keys when possible
   - Give limited scope (specific Stripe products, Supabase schemas, etc.)
   - Rotate keys immediately after engagement ends
   - Never give production secrets to contractors

5. **Document key owner**
   ```
   STRIPE_SECRET_KEY
   └─ Owner: John Doe (john@example.com)
   └─ Created: 2024-06-07
   └─ Last rotated: 2024-06-07
   └─ Location: Vercel Dashboard
   ```

### Access Control

**Development Environment**
- All team members can access `.env.local` instructions
- Each developer creates their own `.env.local` with test keys
- Test keys shared via team password manager

**Staging Environment**
- Limited to senior developers/DevOps
- Staging secrets in shared Vercel team
- Rotation once per month

**Production Environment**
- Only production deployment team (usually 1-2 people)
- Production secrets in dedicated Vercel team or admin account
- Rotation quarterly or on demand
- Comprehensive audit logs

---

## Password Manager Setup

### Recommended Password Managers

#### 1. **1Password** (Recommended for Teams)
- Industry-standard for secure credential sharing
- Excellent team collaboration features
- Audit logs and activity history
- Price: $14.99/month (individuals) or $19/month (teams)
- https://1password.com

**Setup for team:**

1. Create 1Password team account
2. Create "API Keys" vault
3. Add each credential as separate item:
   ```
   Title: Stripe Secret Key (Production)
   URL: https://dashboard.stripe.com
   Username: (leave blank)
   Password: sk_live_abc123...
   Notes: Last rotated: 2024-06-07 by John Doe
   ```
4. Share vault with team members (adjust permissions)
5. Generate secure password share link if needed

#### 2. **Bitwarden** (Open Source Alternative)
- Free tier available
- Self-hosted option available
- Good API and developer experience
- Price: Free tier or $10/month premium
- https://bitwarden.com

**Setup:**

1. Create Bitwarden account
2. Create "API Keys" collection
3. Add each credential as separate item
4. Share with team (free tier limited, premium unlimited)

#### 3. **LastPass**
- Large user base
- Good browser integration
- Password sharing available
- Price: Free or $36/year
- https://www.lastpass.com

**Setup:**

1. Create LastPass account
2. Create "API Keys" folder
3. Add credentials with shared access
4. Note: Sharing features vary by plan

### What to Store in Password Manager

Store in password manager (shared):
- API key values
- Service names and URLs
- Rotation schedule
- Owner and contact info
- Related documentation links

Example format:

```
Title: Stripe Secret Key - Prod
URL: https://dashboard.stripe.com
Username: (not applicable)
Password: sk_live_abc123def456...
Notes:
  Service: Stripe Payment Processing
  Environment: Production
  Owner: Finance Team
  Last rotated: 2024-06-07
  Next rotation: 2024-09-07 (quarterly)
  Shared with: @john, @jane, @backend-team
  How to rotate: See docs/ENV_VARS_SECURITY_GUIDE.md
```

### What NOT to Store in Password Manager

- Source code or configuration files
- Entire .env files (store individual keys instead)
- Database dumps or sensitive data
- Session tokens or temporary credentials

---

## Vercel Configuration

### Team Environment Setup

1. **Create Vercel Team** (if not already)
   - Vercel Dashboard → Teams
   - Click **Create Team**
   - Name: (e.g., "DSG Control Plane")
   - Invite team members

2. **Set per-environment variables**

   **Development** (local machines)
   ```
   - Test/staging API keys
   - Test/staging URLs
   - Shared among all developers
   ```

   **Preview** (pull request previews)
   ```
   - Staging API keys
   - Staging URLs
   - Similar to production, different keys
   - For testing before production deploy
   ```

   **Production** (live deployment)
   ```
   - Production API keys (MOST SENSITIVE)
   - Production URLs
   - Limited to few deployers
   - Audited and monitored
   ```

3. **Set visibility for each variable**

   ```
   Environment Variables → Add Variable

   Name: STRIPE_SECRET_KEY
   Value: sk_live_...
   Production: ✓
   Preview: ✓
   Development: ✓

   Set Prod environment only for sensitive vars:
   (no checkboxes for Preview/Development)
   ```

### Vercel Security Settings

1. **Enable deployer restrictions** (Pro/Team plan)
   - Settings → Deployment Protection
   - Require approval for production deployments
   - Configure who can deploy

2. **Enable automatic deployments**
   - Settings → Git → Auto-deploy on main
   - Ensures consistent deployment process

3. **Review audit logs**
   - Settings → Audit Log
   - Track who changed what and when
   - Verify only authorized changes

4. **Limit secret access**
   - Only production team members can view production variables
   - Use role-based access control (if available)

### Vercel CLI Configuration

```bash
# Install CLI
npm install -g vercel

# Link to project (creates .vercel/project.json)
vercel link

# Verify linking
cat .vercel/project.json | grep projectId

# Pull environment variables
vercel env pull  # Creates .env.local with values (gitignored)

# Set variable
vercel env add STRIPE_SECRET_KEY sk_live_...

# List variables
vercel env list

# Delete variable
vercel env rm STRIPE_SECRET_KEY
```

**Important**: `.vercel/project.json` should be committed (contains only projectId), but `.env.local` should NOT.

---

## Security Checklist

Before deploying to production, verify:

### Local Development
- [ ] `.env.local` is in `.gitignore`
- [ ] `.env.local` file permissions are 600 (`chmod 600 .env.local`)
- [ ] Used setup wizard for configuration: `./scripts/env-setup-wizard.sh`
- [ ] Never printed secrets to terminal
- [ ] Cleared bash history: `history -c`
- [ ] All tests pass locally: `npm run test`

### Vercel Setup
- [ ] All environment variables are set in Vercel Dashboard
- [ ] Production variables are NOT exposed to Preview/Development
- [ ] Sensitive variables (secret keys) are NOT marked as public
- [ ] Server-only secrets are NOT prefixed with `NEXT_PUBLIC_`
- [ ] Used migration helper: `./scripts/env-to-vercel.sh`

### Deployment
- [ ] Deployment status is "Ready" on Vercel Dashboard
- [ ] `/api/health` endpoint responds successfully
- [ ] `/api/agent/status` confirms correct environment
- [ ] Integration tests pass: `npm run test:integration`
- [ ] No errors in Vercel Function logs
- [ ] Stripe webhook is properly configured and working
- [ ] Supabase database connectivity verified

### Team & Access
- [ ] Team members have access to password manager with shared credentials
- [ ] Only authorized people can deploy to production
- [ ] Audit logs are enabled and monitored
- [ ] Incident response plan is in place
- [ ] Key rotation schedule is documented and calendar-based

### Ongoing
- [ ] Monthly: Review who has access to production
- [ ] Quarterly: Rotate API keys
- [ ] Annually: Third-party penetration test or security audit
- [ ] On-demand: Rotate any compromised credentials immediately

---

## Incident Response

### If a Secret is Exposed

**Immediate actions (next 5 minutes):**

1. **Stop the leak**
   - If committed to GitHub: Contact GitHub support for history removal
   - If shared in Slack/email: Ask recipient to delete the message
   - If exposed in logs: Request log purge from system

2. **Revoke the exposed secret**
   - Stripe: https://dashboard.stripe.com/apikeys → Archive key
   - Supabase: https://app.supabase.com → Project Settings → Rotate key
   - GitHub App: Settings → Developer settings → Regenerate private key
   - Service-specific revocation (varies by service)

3. **Generate a new secret**
   - Most services allow immediate new key generation
   - Note the new key value

**Short-term recovery (30 minutes):**

4. **Update all locations**
   - Update `.env.local` on your machine
   - Update Vercel Dashboard environment variables
   - Update any other deployment platforms
   - Update password manager shared credentials

5. **Redeploy**
   ```bash
   # For Vercel
   vercel redeploy --prod

   # Test immediately
   npm run test:integration
   curl https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health
   ```

6. **Notify your team**
   - Slack: @channel "Security incident: [SERVICE] key rotated. All systems updated. Status: RESOLVED"
   - Create incident ticket with timeline
   - Document in incident log

**Long-term (next 24 hours):**

7. **Review for unauthorized activity**
   - Stripe: Check recent charges and refunds
   - Supabase: Check database access logs
   - Vercel: Check deployment logs for anomalies
   - GitHub: Check for unexpected commits or branch access

8. **Audit log review**
   - Who had access to the exposed key?
   - When was it last rotated?
   - Was there any suspicious activity between exposure and revocation?

9. **Process improvement**
   - Did this get caught by automated scanning?
   - Do we need better secret detection in CI/CD?
   - Do we need better access controls?
   - Document lessons learned

### Example Incident Timeline

```
14:30 - Developer accidentally commits STRIPE_SECRET_KEY
14:31 - GitHub sends notification of exposed key
14:32 - Developer realizes mistake, creates incident in Slack
14:33 - Team acknowledges, immediately revokes key in Stripe
14:35 - Generate new key in Stripe Dashboard
14:36 - Update Vercel environment variables
14:37 - Vercel redeploys with new key
14:38 - Run integration tests, all pass
14:40 - Team confirmed no suspicious activity
14:45 - Force push to remove commit from public history
15:00 - Post-incident review scheduled
---
Total downtime: ~10-15 minutes of re-deployment
Impact: None (tested before deployment)
Root cause: No pre-commit hook to detect secrets
Action: Add husky + commitlint + gitleaks
```

---

## Additional Resources

- **Stripe API Key Management**: https://stripe.com/docs/keys
- **Supabase Security**: https://supabase.com/docs/guides/security
- **OWASP Secrets Management**: https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html
- **Node.js Environment Variables**: https://nodejs.org/en/learn/how-to-read-environment-variables-from-nodejs/
- **Vercel Environment Variables**: https://vercel.com/docs/concepts/projects/environment-variables
- **GitHub Security**: https://docs.github.com/en/code-security

---

## Quick Reference

### Setup Commands

```bash
# Initial setup
./scripts/env-setup-wizard.sh

# Deploy to Vercel
./scripts/env-to-vercel.sh

# Test deployment
curl https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health

# Check status
curl https://tdealer01-crypto-dsg-control-plane.vercel.app/api/agent/status
```

### File Permissions

```bash
# Check .env.local permissions (should be 600)
ls -la .env.local

# Set correct permissions
chmod 600 .env.local

# Verify only owner can read
stat .env.local | grep Access
```

### Vercel CLI Quick Commands

```bash
# Link to project
vercel link

# Pull environment variables
vercel env pull

# Set a variable
vercel env add KEY_NAME key_value

# Redeploy
vercel redeploy --prod

# View logs
vercel logs --follow
```

---

## Document History

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2024-06-07 | 1.0 | Initial creation | Claude Code |

---

**Last Updated**: 2024-06-07  
**Author**: Claude Code / DSG Control Plane Team  
**Status**: Ready for Production
