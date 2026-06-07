# Scripts Reference — DSG ONE Control Plane

**Purpose:** Complete index of all scripts available in this repository, what they do, when to use them, and what to expect.

---

## Quick Script Index by Phase

| Phase | Script | Purpose | Run When | Time |
|-------|--------|---------|----------|------|
| 1 | `openssl rand -hex 32` | Generate CRON_SECRET | Phase 1 | < 1 min |
| 2 | `npm run build` | Verify Next.js build | Before committing | 1-2 min |
| 2 | `vercel env ls production` | List Vercel env vars | After setting variables | < 1 min |
| 2 | `vercel --prod` | Rebuild in production | After changing env vars | 3-5 min |
| 3 | `supabase db push` | Apply database migrations | Phase 3 | 2-3 min |
| 3 | `npm run go:no-go <url>` | Go/No-Go gate check (MAIN) | Before claiming GO | 2 min |
| 3 | `./scripts/deployment-verification.sh <url>` | Detailed verification report | Troubleshooting | 1 min |
| 3 | `./scripts/smoke-test-suite.sh <url>` | API smoke tests | Verification | 2 min |
| Any | `npm run test` | Run all local tests | Before committing code | 2-5 min |
| Any | `npm run typecheck` | TypeScript type check | Before committing code | 1-2 min |

---

## Phase 1: Setup & Preparation

### 1. Generate CRON_SECRET

**What it does:** Generates a cryptographically secure random hex string for cron job authentication.

**Run command:**
```bash
openssl rand -hex 32
```

**Expected output:**
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0
```

**Add to .env.local:**
```bash
CRON_SECRET=<paste-output-here>
```

**When to use:** Phase 1, one-time setup

**Common issues:**
- `command not found: openssl` → Install OpenSSL: `brew install openssl` (macOS) or `apt-get install openssl` (Linux)

---

### 2. Copy & Edit Environment Template

**What it does:** Creates local environment file from template.

**Run command:**
```bash
# Copy template
cp .env.example .env.local

# Edit and fill in all values
nano .env.local  # or use your editor

# Verify syntax
bash -n .env.local
```

**Expected output:**
- `.env.local` file exists
- No bash syntax errors

**When to use:** Phase 1, one-time setup

**Common issues:**
- `.env.local` not in `.gitignore` → Check: `grep .env.local .gitignore` (should already be there)
- Syntax errors → Run `bash -n .env.local` to find the problem

---

## Phase 2: Build & Deploy

### 3. Build Verification

**What it does:** Verifies that the Next.js application builds successfully without errors.

**Run command:**
```bash
npm run build
```

**Expected output:**
```
Route (app)                              Size     First Load JS
├ ○ / (ISR)                            1.2 kB         89 kB
├ ○ /api/execute                        ...
├ /api/health                           ...
...
✓ Route generation complete.
```

**When to use:**
- Before committing code changes
- Before pushing to main
- Troubleshooting deployment failures

**Common issues:**
- `error TS1234: ...` → TypeScript compilation error; review the error and fix code
- `out of memory` → Increase Node.js heap: `NODE_OPTIONS=--max-old-space-size=4096 npm run build`
- Long build time → Normal for full build; use `npm run dev` for development

---

### 4. List Vercel Environment Variables

**What it does:** Lists all environment variables set in Vercel for a specific scope (production, preview, development).

**Run command:**
```bash
# List production env vars
vercel env ls production

# List preview env vars
vercel env ls preview

# List development env vars
vercel env ls development
```

**Expected output:**
```
NAME                              VALUE                                   TARGET
NEXT_PUBLIC_SUPABASE_URL          https://xxxxx.supabase.co               Production, Preview
NEXT_PUBLIC_SUPABASE_ANON_KEY     eyJ...                                  Production, Preview
SUPABASE_SERVICE_ROLE_KEY         eyJ... (secret)                         Production
STRIPE_SECRET_KEY                 sk_test_... (secret)                    Production
... (13+ total variables)
```

**When to use:**
- After setting env vars to verify they're all there
- Troubleshooting missing env var errors
- Auditing production configuration

**Common issues:**
- `unauthorized` → Run `vercel login` first
- `No matching .vercelconfig or vercel.json` → Run from repository root
- Missing variables → Use `vercel env add VAR_NAME scope` to add them

---

### 5. Add/Update Vercel Environment Variable

**What it does:** Adds or updates a single environment variable in Vercel.

**Run command:**
```bash
# Interactive (prompts for value)
vercel env add VARIABLE_NAME production

# With value on stdin
echo "your_value_here" | vercel env add VARIABLE_NAME production

# Example
vercel env add STRIPE_SECRET_KEY production
# (Paste value when prompted, or pipe it)
```

**Expected output:**
```
✓ Environment variable added [production]
STRIPE_SECRET_KEY
```

**When to use:**
- Adding env vars one at a time (safer than batch)
- Updating a single variable
- Phase 2 setup via CLI

**Common issues:**
- `unauthorized` → Run `vercel login` first
- Value not accepted → Check value format (e.g., `sk_` for Stripe keys)
- Wrong scope → Use `production`, `preview`, or `development` only

---

### 6. Rebuild Production Deployment

**What it does:** Triggers a new production build/deployment in Vercel using the latest code and environment variables.

**Run command:**
```bash
# Via CLI
vercel --prod

# Or go to Vercel Dashboard → Deployments → Latest deployment → Redeploy button
```

**Expected output:**
```
Deploying tdealer01-crypto-dsg-control-plane to production
✓ Production deployment created [https://...]
Inspect: https://vercel.com/...
```

**When to use:**
- After changing environment variables
- After committing code changes (optional if using Git integration)
- Troubleshooting deployment-related issues

**Common issues:**
- `Error: Invalid token` → Run `vercel login` and authenticate
- Build fails → Check error in Vercel Function Logs or output
- Takes too long → Wait; large projects can take 5-10 minutes

---

## Phase 3: Test & Verify

### 7. Apply Supabase Migrations

**What it does:** Applies all pending database migrations to your Supabase project.

**Run command:**
```bash
# Install CLI (if not already installed)
npm install -g supabase

# Login to your account
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Apply migrations
supabase db push

# Verify migrations (in Supabase SQL Editor)
SELECT * FROM pg_migrations;
```

**Expected output:**
```
Applying migration 20240101_initial.sql...
✓ Applied migration 20240101_initial.sql
✓ Applied migration 20240102_users_table.sql
... (14 total migrations)
```

**When to use:**
- Phase 3, after code is deployed to Vercel
- Creating new database schema for the first time
- Applying schema updates

**Common issues:**
- `unauthorized` → Run `supabase login` first
- `Could not find project` → Check project ref: `supabase link --project-ref YOUR_CORRECT_REF`
- Migration fails with SQL error → Migration file may be broken; check `supabase/migrations/` folder
- Want to verify from SQL Editor:
  ```sql
  SELECT name, inserted_at, SUCCESS FROM pg_migrations ORDER BY inserted_at;
  ```

---

### 8. Go/No-Go Gate Check (MAIN VERIFICATION)

**What it does:** Comprehensive production readiness gate check. This is the primary verification script.

**Run command:**
```bash
npm run go:no-go https://tdealer01-crypto-dsg-control-plane.vercel.app
```

**Expected output:**
```
== Trust surface checks for https://... ==
✅ /terms -> HTTP 200
✅ /privacy -> HTTP 200
✅ /security -> HTTP 200
✅ /support -> HTTP 200

== Runtime baseline checks ==
✅ /api/health -> HTTP 200 ok=true
✅ /api/readiness -> HTTP 200 ok=true

... (additional checks)

Exit code 0 (all checks passed)
```

**When to use:**
- Phase 3, final verification before claiming GO status
- Regular production health checks (can run via cron)
- Troubleshooting deployment readiness

**What it checks:**
1. Public trust surface pages (terms, privacy, security, support)
2. Health endpoint (`/api/health`)
3. Readiness endpoint (`/api/readiness`)
4. Agent status endpoint (`/api/agent/status`)
5. Optional: Playwright user flow audit

**Exit codes:**
- `0` = All checks passed → GO status
- `1` = One or more checks failed → NO-GO status
- `2` = Usage error

**Common issues:**
- `CONNECT tunnel failed, response 403` → Proxy issue; run from direct network or GitHub Actions
- Some endpoints fail, others pass → Check specific endpoint with curl:
  ```bash
  curl -fsSL https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health | jq .
  ```

---

### 9. Deployment Verification Script

**What it does:** Runs detailed deployment verification report covering Vercel status, environment variables, database connectivity, webhooks, security headers, and critical endpoints.

**Run command:**
```bash
./scripts/deployment-verification.sh https://tdealer01-crypto-dsg-control-plane.vercel.app

# With custom timeout (seconds)
DEPLOYMENT_TIMEOUT=60 ./scripts/deployment-verification.sh https://...

# Skip DSG Hermes checks
DEPLOYMENT_CHECK_HERMES=false ./scripts/deployment-verification.sh https://...

# Skip Stripe checks
DEPLOYMENT_CHECK_STRIPE=false ./scripts/deployment-verification.sh https://...
```

**Expected output:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DEPLOYMENT VERIFICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. VERCEL DEPLOYMENT STATUS
✅ Deployment is responding (HTTP 200)
ℹ️  Deployed commit: 1a2b3c4...
ℹ️  Environment: production

2. READINESS ENDPOINT CHECKS
✅ Readiness endpoint responding
✅ Environment variables: OK
✅ NextAuth secret: OK
✅ Supabase service role: OK

... (sections for database, webhooks, security, CORS, etc.)

VERIFICATION SUMMARY
Passed checks: 15
Critical failures: 0
Warnings: 0

✅ DEPLOYMENT VERIFICATION PASSED
```

**When to use:**
- Phase 3, detailed verification
- Troubleshooting specific deployment issues
- Regular health checks
- Post-incident verification

**Exit codes:**
- `0` = All critical checks passed
- `1` = One or more critical checks failed

**What it checks:**
1. Vercel deployment status
2. Health & readiness endpoints
3. Database connectivity (Supabase)
4. Webhook endpoints
5. Security headers (CSP, X-Frame-Options, HSTS, etc.)
6. CORS configuration
7. DSG/Hermes components (optional)
8. Critical path endpoints

**Common issues:**
- `Proxy tunnel failure detected` → Run from direct network, not behind proxy
- Missing security headers → May be intentional for your setup
- Database check fails → Verify SUPABASE_SERVICE_ROLE_KEY is correct

---

### 10. Smoke Test Suite

**What it does:** Runs a series of API endpoint smoke tests to verify core functionality.

**Run command:**
```bash
./scripts/smoke-test-suite.sh https://tdealer01-crypto-dsg-control-plane.vercel.app

# With auth token for authenticated endpoints
./scripts/smoke-test-suite.sh https://... YOUR_BEARER_TOKEN

# With custom timeout
CURL_TIMEOUT=30 ./scripts/smoke-test-suite.sh https://...

# Verbose output
VERBOSE=1 ./scripts/smoke-test-suite.sh https://...
```

**Expected output:**
```
=== Runtime Baseline Probes ===
[PASS] GET /api/health
[PASS] GET /api/readiness
[PASS] GET /api/agent/status

=== Critical Path Endpoints ===
[PASS] POST /api/execute (method check)
[PASS] GET /api/usage (auth required)

... (more tests)

VERIFICATION COMPLETE
✅ Tests: PASSED=10 FAILED=0 SKIPPED=0
```

**When to use:**
- Phase 3, quick smoke test of API endpoints
- Post-deployment verification
- Regular monitoring

**Exit codes:**
- `0` = All tests passed
- `1` = One or more tests failed

**What it tests:**
1. Health endpoint
2. Readiness endpoint
3. Agent status endpoint
4. Execute endpoint (POST availability)
5. Usage endpoint (with auth)
6. Audit endpoint (with auth)
7. Policies endpoint (with auth)
8. Additional integration endpoints

---

## Continuous Development Scripts

### 11. Run All Tests

**What it does:** Runs the complete test suite (unit + integration tests).

**Run command:**
```bash
npm run test

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run only failure/adversarial tests
npm run test:failure

# Run with coverage report
npm run test:coverage

# Watch mode (re-run on file changes)
npm run test -- --watch
```

**Expected output:**
```
PASS tests/unit/lib/runtime.test.ts
PASS tests/integration/api/execute.test.ts
...

Test Files  5 passed (5)
Tests     42 passed (42)
Duration  2.34s
```

**When to use:**
- Before committing code changes
- CI/CD pipeline
- Verifying bug fixes
- Before deploying to production

**Exit codes:**
- `0` = All tests passed
- `1` = One or more tests failed

**Common issues:**
- Tests timeout → Increase timeout: `npm run test -- --testTimeout=10000`
- Test file not found → Check file path in tests/ folder
- Supabase required → Some tests need live DB; use `npm run test:live:db` with proper env vars

---

### 12. TypeScript Type Check

**What it does:** Runs TypeScript compiler in type-check mode (no build).

**Run command:**
```bash
npm run typecheck
```

**Expected output:**
```
✓ No errors
```

**When to use:**
- Before committing code
- IDE integration (many editors run this automatically)
- Verifying TypeScript migration
- CI/CD pipeline

**Exit codes:**
- `0` = No type errors
- `1` = Type errors found

**Common issues:**
- Long output with many errors → Fix the most fundamental ones first (often fix cascading errors)
- `Cannot find module` → Missing dependency or import path issue
- `Type 'X' is not assignable to type 'Y'` → Type mismatch; review function signature

---

### 13. Development Server

**What it does:** Starts the Next.js development server on `http://localhost:3000`.

**Run command:**
```bash
npm run dev

# Or specify port
PORT=3001 npm run dev
```

**Expected output:**
```
  ▲ Next.js 15.5.18
  - Local:        http://localhost:3000
  - Environments: .env.local

✓ Ready in 2.3s
```

**When to use:**
- Local development
- Testing UI changes
- Debugging issues

**Common issues:**
- Port 3000 already in use → Use different port: `PORT=3001 npm run dev`
- `.env.local` not loaded → Ensure file exists and is readable
- CSS/static files not loading → Restart dev server

---

## Advanced & Optional Scripts

### 14. Production Manifest Verification

**What it does:** Verifies the production manifest and policy configuration.

**Run command:**
```bash
npm run verify:production-manifest
```

**When to use:** Verifying policy configuration before deploy

---

### 15. Deterministic Module Verification

**What it does:** Verifies deterministic proof/gate module integrity.

**Run command:**
```bash
npm run verify:deterministic
```

**When to use:** Verifying DSG deterministic gate functionality

---

### 16. Policy Verification

**What it does:** Runs formal policy verification using Z3 solver.

**Run command:**
```bash
npm run verify:policy
```

**When to use:** Verifying policy constraints and formal properties

---

### 17. Revenue/Billing Proof

**What it does:** Runs formal proof for billing/revenue system correctness.

**Run command:**
```bash
npm run proof:revenue
```

**When to use:** Verifying billing system correctness

---

### 18. CCVS Pipeline (Compliance Evidence)

**What it does:** Runs full CCVS (Compliance, Coverage, Verification, Scoring) pipeline.

**Run command:**
```bash
npm run ccvs:pipeline
```

**Output:** Generates:
- `ccvs-unit-evidence.json` — Test coverage evidence
- `ccvs-compliance-matrix.json` — Compliance matrix

**When to use:** Generating compliance/audit artifacts

---

## Quick Command Reference

### Health Checks

```bash
# Simple health check
curl -fsSL https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health | jq .

# Readiness check
curl -fsSL https://tdealer01-crypto-dsg-control-plane.vercel.app/api/readiness | jq .

# Agent status
curl -fsSL https://tdealer01-crypto-dsg-control-plane.vercel.app/api/agent/status | jq .
```

### Environment Checks

```bash
# View .env.local
cat .env.local

# Verify syntax
bash -n .env.local

# Check env var is set
echo $STRIPE_SECRET_KEY

# List Vercel production env vars
vercel env ls production
```

### Deployment Checks

```bash
# Get latest Vercel deployment status
vercel list

# View Vercel logs
vercel logs production

# View specific deployment logs
vercel logs <deployment-id>
```

### Database Checks

```bash
# View migration status (in Supabase SQL Editor)
SELECT * FROM pg_migrations;

# List tables
\dt

# Check service role key (from Supabase Dashboard)
# Settings → API → service_role secret
```

---

## Script Organization

All scripts are in `scripts/` directory:

```
scripts/
├── SCRIPTS_REFERENCE.md (this file)
├── phase8-setup-checklist.txt (interactive checklist)
├── deployment-verification.sh (detailed verification)
├── smoke-test-suite.sh (API smoke tests)
├── go-no-go-gate.sh (main verification)
├── auto-setup-env.sh (automated env var setup)
├── verify-policy.sh (policy verification)
├── health-check.sh (simple health check)
├── test-stripe-webhook.sh (Stripe webhook test)
└── ... (other scripts)
```

---

## Exit Code Reference

| Exit Code | Meaning |
|-----------|---------|
| `0` | Success / All checks passed |
| `1` | Failure / One or more checks failed |
| `2` | Usage error / Invalid arguments |
| `124` | Timeout / Command took too long |

---

## Troubleshooting Scripts

### Debug Mode

Enable debug output for most scripts:
```bash
VERBOSE=1 ./scripts/deployment-verification.sh https://...
```

### Check Specific Endpoint

```bash
curl -vvv https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health
```

### View Raw Response

```bash
curl -s https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health | jq . --raw-output
```

### Timeout Issues

Increase timeout for slow networks:
```bash
DEPLOYMENT_TIMEOUT=60 ./scripts/deployment-verification.sh https://...
CURL_TIMEOUT=30 ./scripts/smoke-test-suite.sh https://...
```

---

## Automation Ideas

### Run Go/No-Go Check Periodically

```bash
# Check production every 5 minutes
while true; do
  npm run go:no-go https://tdealer01-crypto-dsg-control-plane.vercel.app
  sleep 300
done
```

### Automated Health Monitoring

```bash
# Store in health-history.log
{
  echo "$(date): $(curl -s https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health | jq -r .ok)"
} >> health-history.log
```

### Pre-Commit Hook

```bash
# In .git/hooks/pre-commit
npm run typecheck || exit 1
npm run test || exit 1
npm run build || exit 1
```

---

## Support & Escalation

**Script fails?**
1. Run with verbose flag: `VERBOSE=1 ./script.sh ...`
2. Check script output for specific error
3. Review "Common issues" section above for your script
4. Check Vercel/Supabase/external service logs

**Still stuck?**
- Review `PHASE8_QUICK_START.md` troubleshooting section
- Check `docs/RUNBOOK_DEPLOY.md` for deployment issues
- Escalate to service providers (Vercel, Supabase, Stripe, etc.)

---

**Last Updated:** 2026-06-07  
**Status:** Setup-Ready  
**Total Scripts:** 18+ documented
