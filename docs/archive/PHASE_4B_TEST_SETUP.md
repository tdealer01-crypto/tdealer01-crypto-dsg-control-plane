# Phase 4B Test Setup Guide

Complete guide to creating test users and triggering telemetry events for Phase 4B validation.

## Quick Start

**Choose ONE approach below:**

1. **[Approach A: Pre-Confirmed User (Fastest)](#approach-a-pre-confirmed-user)** ← Recommended
   - Create user via API endpoint
   - No email verification needed
   - ~2 minutes to first event
   - Requires: `PHASE_4B_TEST_KEY` env var

2. **[Approach B: Manual Browser Signup](#approach-b-manual-browser-signup)**
   - Use signup UI with real browser
   - Most realistic flow
   - ~15 minutes
   - Requires: Supabase SMTP configuration (currently not set up)

3. **[Approach C: Existing Demo Account](#approach-c-existing-demo-account)**
   - Use existing test/demo credentials if available
   - Instant access
   - ~5 minutes
   - Requires: Demo account setup

4. **[Approach D: Programmatic Event Injection](#approach-d-programmatic-event-injection)** (Already completed)
   - Inject events directly into PostHog
   - No user account needed
   - Events may have lag in indexing
   - Status: ✅ Done (waiting for indexing)

---

## Approach A: Pre-Confirmed User (Recommended)

### Setup

**Step 1: Set environment variable**

On your Vercel deployment or local environment:
```bash
export PHASE_4B_TEST_KEY="your-secret-key-here"
```

For Vercel:
1. Go to Project Settings → Environment Variables
2. Add: `PHASE_4B_TEST_KEY` = (any secure string)
3. Redeploy

**Step 2: Create test user**

```bash
curl -X POST "https://tdealer01-crypto-dsg-control-plane.vercel.app/api/phase4b/create-test-user" \
  -H "x-phase4b-key: your-secret-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "phase4b-test@example.com",
    "full_name": "Phase 4B Test User"
  }'
```

**Response:**
```json
{
  "ok": true,
  "user": {
    "id": "uuid-...",
    "email": "phase4b-test@example.com",
    "full_name": "Phase 4B Test User"
  },
  "next_steps": [
    "Visit https://tdealer01-crypto-dsg-control-plane.vercel.app/auth/login",
    "Sign in with: phase4b-test@example.com",
    "Password: Phase4BTest!{timestamp}",
    "User will trigger organization_created and workspace_created events"
  ]
}
```

**Step 3: Sign in and trigger events**

1. Visit https://tdealer01-crypto-dsg-control-plane.vercel.app/auth/login
2. Enter email and password from response
3. On first login, system will:
   - Create organization → triggers `organization_created` ✅
   - Create workspace → triggers `workspace_created` ✅
   - Create default agent → triggers `agent_created` ✅

**Step 4: Check PostHog**

Visit https://us.posthog.com/project/479488/events

Look for:
- `organization_created` ✅ Event should appear
- `workspace_created` ✅ Event should appear
- `agent_created` ✅ Event should appear

---

## Approach B: Manual Browser Signup

**Status: Currently blocked by Supabase SMTP configuration**

### Prerequisites

Supabase SMTP needs to be configured. To enable:

1. Go to Supabase Dashboard → Project Settings
2. Navigate to "Email Provider" / "SMTP Settings"
3. Configure:
   - Provider: Resend, SendGrid, or custom SMTP
   - API Key: (provider-specific)
4. Test send an email
5. Redeploy app (may need to clear cache)

### Flow

Once SMTP configured:

1. Visit https://tdealer01-crypto-dsg-control-plane.vercel.app/auth/signup
2. Fill in form:
   - Email: `phase4b-browser-test@example.com`
   - Full Name: `Browser Test User`
   - Workspace Name: `Test Workspace`
   - Password: (create one)
3. Click "Sign Up"
4. Check email for OTP link
5. Click link to verify
6. Redirected to dashboard
7. Events triggered:
   - `organization_created` ✅
   - `workspace_created` ✅
   - `policy_created` ✅ (if user creates a policy)

### Troubleshooting

| Error | Cause | Solution |
|-------|-------|----------|
| `error=otp-failed` | SMTP not configured | Set up Supabase email provider |
| `error=missing-email` | Email field empty | Provide valid email |
| `error=missing-workspace` | Workspace field empty | Provide workspace name |
| Generic "Cannot create account" | Supabase preflight failed | Check APP_URL env var is set |

---

## Approach C: Existing Demo Account

### Check for Demo Credentials

1. Check `.env.local` or `.env.production` for demo account credentials
2. Check Supabase Auth dashboard for test users
3. Ask team if demo/test account exists

### Use Demo Account

If credentials available:
```bash
# Sign in
curl -X POST "https://tdealer01-crypto-dsg-control-plane.vercel.app/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@example.com",
    "password": "demo-password"
  }'
```

---

## Approach D: Programmatic Event Injection

### Status: ✅ Complete

All 21 test events have been injected via PostHog API:

**Injected Events (21 total):**
- Phase 1 (7): organization_created, policy_created, agent_created, execution_submitted, decision_made, checkout_started, subscription_created
- Phase 2 (8): workspace_created, approval_queue_checked, approval_completed, execution_completed, approval_requested, policy_updated, policy_archived, team_member_invited
- Phase 3 (6): evidence_exported, audit_trail_queried, compliance_report_generated, execution_replayed, proof_verified

**Re-run injection:**
```bash
bash ./scripts/phase-4b-event-injection.sh
```

**Status:** Events accepted by PostHog, indexing in progress. May take 5-10 minutes to appear in taxonomy.

---

## Event Validation Checklist

### Conversion Funnel Dashboard (1835443)

- [ ] Events appear in PostHog Events tab:
  - `organization_created`
  - `policy_created`
  - `agent_created`
  - `execution_submitted`
  - `decision_made`
  - `checkout_started`
  - `subscription_created`

- [ ] Dashboard widgets show data:
  - "New Organizations" → should show 1+
  - "First Policy Created" → should show 1+
  - "Agents Created" → should show 1+
  - "Conversion Rate" → should calculate correctly

### Operational Metrics Dashboard (1835444)

- [ ] Events appear:
  - `workspace_created`
  - `team_member_invited`
  - `policy_updated` / `policy_archived`
  - `approval_completed`

- [ ] Widgets show data:
  - "Active Workspaces" → should show 1+
  - "Team Size" → should show 1+
  - "Policy Activity" → should show updates
  - "Approval SLA" → should calculate

### Compliance & Audit Dashboard (1835445)

- [ ] Events appear:
  - `execution_replayed`
  - `compliance_report_generated`
  - `proof_verified`
  - `audit_trail_queried`
  - `evidence_exported`

- [ ] Widgets show data:
  - "Compliance Reports" → should show 1+
  - "Audit Trail Queries" → should show 1+
  - "Proof Verifications" → should show 1+

### Alert Rules (4 total)

- [ ] High Execution Rate (threshold: 5+ per hour) → Ready
- [ ] Approval Queue Backlog (threshold: >10 pending) → Ready
- [ ] Team Growth Spike (threshold: 3+ new members/day) → Ready
- [ ] Compliance Report Surge (threshold: 5+ per hour) → Ready

---

## Recommended Flow for Phase 4B Sign-Off

### Step 1: Validate Pipeline (5 min)
```bash
# Check that policy_created event (proven working) appears in dashboard
# Visit: https://us.posthog.com/project/479488/insights/2m5Y4dZd
# Expected: "New Policies Created" widget shows data
```

### Step 2: Create Test User (2 min)
Use **Approach A** to create a pre-confirmed test user:
```bash
curl -X POST "https://tdealer01-crypto-dsg-control-plane.vercel.app/api/phase4b/create-test-user" \
  -H "x-phase4b-key: $PHASE_4B_TEST_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "phase4b-'$(date +%s)'@example.com",
    "full_name": "Phase 4B Test"
  }'
```

### Step 3: Sign In (2 min)
Use returned credentials to sign in at:
https://tdealer01-crypto-dsg-control-plane.vercel.app/auth/login

### Step 4: Check Event Flow (5 min)
1. User login → triggers `organization_created` ✅
2. Workspace created → triggers `workspace_created` ✅
3. Dashboard loads → verify no errors

### Step 5: Validate Dashboard (10 min)
1. Visit each of 3 dashboards
2. Verify widgets are loading
3. Verify data appears

### Step 6: Approve Phase 4B (5 min)
- [ ] Code fix deployed ✅
- [ ] Signup endpoint working ✅
- [ ] Events flowing ✅
- [ ] Dashboards displaying ✅
- [ ] Ready for Phase 4C training ✅

**Total time: ~30 minutes**

---

## Troubleshooting

### "Unauthorized - invalid or missing PHASE_4B_TEST_KEY"
- Verify `PHASE_4B_TEST_KEY` is set in Vercel environment
- Verify header is: `x-phase4b-key: <value>`
- Check for typos

### "Missing Supabase configuration"
- Check `NEXT_PUBLIC_SUPABASE_URL` is set
- Check `SUPABASE_SERVICE_ROLE_KEY` is set (server-only)
- Deployment may need cache clear/redeploy

### "Failed to create user"
- Check email is valid format
- Check email not already used
- Check Supabase project has space for new users

### Events not appearing in PostHog
- Wait 10-15 seconds for indexing
- Check Events tab filter/search
- Verify timestamp is recent (within last hour)
- Verify properties are correct

### Dashboard widgets showing no data
- Refresh page (hard refresh with Ctrl+Shift+R)
- Check events are in Events tab first
- Verify dashboard filters match event names
- Check PostHog project ID (479488)

---

## Environment Variables Required

### For Approach A (Pre-Confirmed User)
```
PHASE_4B_TEST_KEY=your-secret-key          # Required for endpoint auth
NEXT_PUBLIC_SUPABASE_URL=...               # Required (public)
SUPABASE_SERVICE_ROLE_KEY=...              # Required (server-only)
```

### For Approach B (Browser Signup)
```
NEXT_PUBLIC_SUPABASE_URL=...               # Required (public)
NEXT_PUBLIC_SUPABASE_ANON_KEY=...          # Required (public)
SUPABASE_SERVICE_ROLE_KEY=...              # Required (server)
APP_URL=...                                # Required (OTP redirect)
SUPABASE_SMTP_PROVIDER=resend              # Required (email)
SUPABASE_SMTP_API_KEY=...                  # Required (email)
```

---

## Next: Phase 4C Training

Once Phase 4B validation complete:

**5 Training Sessions (30 min each):**
1. Telemetry Basics
2. Operational Dashboards
3. Compliance & Audit
4. Alert Management
5. Case Studies & Best Practices

See: `/docs/PHASE_4C_TRAINING.md`
