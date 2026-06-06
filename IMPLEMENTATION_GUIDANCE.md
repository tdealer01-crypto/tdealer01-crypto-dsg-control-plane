# Implementation Guidance for Development Team
## From PR #700 → Production Ready

**Date**: 2026-06-06  
**Target**: Complete Phases 5-9 implementation (4-6 weeks)  
**Owners**: Engineering lead, QA lead, DevOps lead

---

## Overview

PR #700 contains complete **scaffolding and documentation** for all 9 phases. This document guides the dev team through **immediate action items** to move from setup-ready → production-ready.

### Current State
- ✅ Architecture designed (Phase 1-4)
- ✅ Database schema created (Phase 3)
- ✅ API routes defined (Phase 5)
- ✅ Dashboard UI built (Phase 6)
- ✅ Test framework created (Phase 7)
- ✅ Deployment config ready (Phase 8)
- ✅ Marketing plan documented (Phase 9)
- ⏳ **NOT YET**: API logic, test fixtures, live integration, Stripe review

---

## Phase 5: API Handler Implementation (Week 1-2)

### Priority 1: Webhook Handler (`src/handlers/webhook-handler.ts`)

**Current State**: Stub with signature validation skeleton  
**Task**: Replace stubs with real Stripe SDK integration

```typescript
// BEFORE (current stub):
export async function handleWebhook(event: Stripe.Event): Promise<Decision> {
  // TODO: Implement actual policy evaluation
  return { decision: 'ALLOW', reason: 'Stub implementation' };
}

// AFTER (production):
export async function handleWebhook(event: Stripe.Event): Promise<Decision> {
  // 1. Validate webhook signature using raw body
  // 2. Route to specific handler (charge, payout, etc.)
  // 3. Evaluate via DSG gateway
  // 4. Record decision in audit trail
  // 5. Execute auto-reverse if blocked (refund/freeze)
}
```

**Critical Requirements**:
- ✅ Use `rawBody` (not parsed JSON) for HMAC-SHA256 validation
- ✅ Implement idempotency check (same event ID = same result)
- ✅ Add Stripe-Signature header validation
- ✅ Timeout handling (<500ms hard target)

**Code Location**: `packages/stripe-app/src/handlers/webhook-handler.ts` (line 1-157)

**Implementation Checklist**:
```
[ ] Import Stripe SDK and initialize client
[ ] Implement verifyWebhookSignature(rawBody, signature, secret)
[ ] Add event routing: charge → chargeHandler, payout → payoutHandler, etc.
[ ] Implement deduplication logic (check if event_id already processed)
[ ] Call DSG gateway evaluator via dsg-client
[ ] Record decision in stripe_operation_audits table
[ ] For BLOCK decisions: auto-reverse (refund/freeze payout)
[ ] Return decision + reason + proof hash
[ ] Add error logging and metric tracking
```

---

### Priority 2: Route Handlers (`src/routes/*.ts`)

**Current State**: Hono route stubs with empty implementations  
**Task**: Implement each route with validation, auth, error handling

#### Route: `POST /stripe/webhook/events`
```typescript
// Must:
// - Accept raw request body (not parsed)
// - Extract Stripe-Signature header
// - Verify signature before processing
// - Respond <500ms
// - Validate event schema
// - Return 200 even if processing fails (idempotent)
```

#### Routes: Policies, Audit, Approvals
```typescript
// Must:
// - Require Bearer token authentication
// - Check org/account scope (RLS via session)
// - Validate input schemas (amount, duration, etc.)
// - Call StripeStateManager ORM
// - Invalidate policy cache on write
// - Return paginated responses for lists
// - Include sorting/filtering where applicable
```

**Code Locations**:
- `packages/stripe-app/src/routes/webhooks.ts` (line 1-50)
- `packages/stripe-app/src/routes/policies.ts` (line 1-120)
- `packages/stripe-app/src/routes/audit.ts` (line 1-100)
- `packages/stripe-app/src/routes/approvals.ts` (line 1-80)

---

### Priority 3: OAuth Handler (`src/handlers/oauth-handler.ts`)

**Current State**: State generation + token exchange skeleton  
**Task**: Wire to Supabase auth system

```typescript
// Must:
// - Generate cryptographically secure state + PKCE
// - Validate state expiration (10 minutes)
// - Exchange code → token via Stripe OAuth endpoint
// - Store token in StripeStateManager (encrypted)
// - Link stripe_account_id → dsg_org_id
// - Return to DSG dashboard with success message
```

**Stripe OAuth Endpoint** (production):
```
https://connect.stripe.com/oauth/authorize?
  client_id=YOUR_CLIENT_ID
  &state=STATE_TOKEN
  &scope=read_write
  &stripe_user[business_type]=individual
```

**Error Handling**:
- Invalid state: Return 400 Bad Request
- Code expired: Return 400 Bad Request
- Token exchange failed: Return 500 Server Error + log

---

## Phase 7: Test Implementation (Week 2-3)

### Test Fixtures

Create `packages/stripe-app/tests/fixtures/` with sample data:

```typescript
// charge.fixture.ts
export const mockCharge = {
  id: 'ch_test_1234567890',
  amount: 5000, // $50.00
  currency: 'usd',
  customer: 'cus_test_1234567890',
  description: 'Test charge',
  metadata: { order_id: 'order_12345' }
};

// Generate variants:
// - High amount ($10,000)
// - Low amount ($10)
// - Rate-limit scenario (10 charges in 1 minute)
// - Blocked customer (in blocklist)
// - Approved customer (in allowlist)
```

### Test Implementation Strategy

**Unit Tests** (Fast, no DB):
```bash
npm run test:unit -- packages/stripe-app/tests/unit/
# Uses fixtures, not Stripe API
# Target: <500ms total
```

**Integration Tests** (With Stripe mock):
```bash
npm run test:integration -- packages/stripe-app/tests/integration/
# Use stripe-mock (https://github.com/stripe/stripe-mock)
# OR intercept HTTP via nock/msw
# Target: <5s total
```

**E2E Tests** (Full browser flow):
```bash
npm run test:e2e -- packages/stripe-app/tests/e2e/
# Playwright + local dev server
# Use Stripe test mode account
# Target: <30s total
```

### Mock Strategy

**Option A: stripe-mock** (Recommended)
```bash
# Install stripe-mock binary
brew install stripe/stripe-cli/stripe

# Start in test mode
stripe fixtures

# Then run tests against localhost:12111
STRIPE_API_KEY=sk_test_... npm run test:integration
```

**Option B: MSW (Mock Service Worker)**
```typescript
// tests/fixtures/msw.ts
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  rest.post('https://api.stripe.com/v1/charges', (req, res, ctx) => {
    return res(ctx.json(mockCharge));
  })
);

beforeAll(() => server.listen());
```

### Test Priority Order

1. **Webhook Security** (integration/webhook-security.test.ts)
   - Signature validation (valid + invalid)
   - Rate limiting + deduplication
   - Malformed event rejection

2. **Policy Evaluation** (unit/adapters.test.ts)
   - Charge → GatewayRequest conversion
   - Payout → GatewayRequest conversion
   - Decision mapping (ALLOW/BLOCK/REVIEW)

3. **API Routes** (unit/route-handlers.test.ts)
   - Authentication (valid + invalid tokens)
   - Input validation (missing fields, wrong types)
   - Error responses (401, 400, 500)

4. **Performance** (integration/performance.test.ts)
   - Policy evaluation <2s
   - Webhook response <500ms
   - Database queries <100ms

---

## Phase 8: Deployment Checklist (Week 3-4)

### Pre-Deployment (Day 1-2)

**Verify Secrets** (Vercel + GitHub Actions):
```bash
# 1. Stripe API keys (sk_test_*, pk_test_*)
# 2. Supabase URL + service-role key
# 3. Upstash Redis URL
# 4. DSG Control Plane API key
# 5. OAuth client ID + secret (from Stripe)

# CRITICAL: Never print or commit these
# Store in Vercel environment variables dashboard only
```

**Database Migrations**:
```bash
# 1. Connect to Supabase project
supabase db push

# 2. Verify tables exist
psql $DATABASE_URL -c "\dt"

# 3. Run RLS policy checks
psql $DATABASE_URL -c "\dp stripe_operation_*"

# 4. Create indexes
psql $DATABASE_URL -f packages/stripe-app/migrations/*.sql
```

**Stripe Configuration**:
```
1. Create OAuth app in Stripe Dashboard
   - Get: client_id, client_secret
   - Set redirect URIs:
     * https://your-vercel-url/api/stripe/oauth/callback
     * https://your-vercel-url/stripe/oauth/callback

2. Generate API keys (live mode)
   - Get: sk_live_*, pk_live_*
   - Enable: Charge, Payout, Refund permissions

3. Configure webhook endpoint
   - URL: https://your-vercel-url/api/stripe/webhook/events
   - Events: charge.created, payout.created, refund.created
   - Signing secret: whsec_live_...
```

### Deployment Day (Day 3)

**Vercel Deploy**:
```bash
# 1. Push to main branch
git push origin main

# 2. Vercel auto-deploys (watch build logs)
# Expected: <2 minutes

# 3. Verify deployment
curl https://your-vercel-url/api/health

# Expected response:
{
  "status": "ok",
  "environment": "production",
  "database": "connected",
  "redis": "connected"
}
```

**Post-Deploy Verification**:
```bash
# 1. Check environment variables
curl -H "Authorization: Bearer $DSG_API_KEY" \
  https://your-vercel-url/api/stripe/policies/list

# 2. Send test webhook
stripe trigger charge.created \
  --stripe-account=acct_test_...

# 3. Verify audit trail
curl -H "Authorization: Bearer $DSG_API_KEY" \
  https://your-vercel-url/api/stripe/audit/operations
```

### Known Deployment Issues & Fixes

**Issue 1: Environment Variables Missing**
```
Error: SUPABASE_URL is undefined
Fix: Verify Vercel environment variables dashboard
     - Environment → Preview/Production
     - Add all 11 vars from .env.production.example
```

**Issue 2: Database Connection Timeout**
```
Error: Connection refused at 5432
Fix: Check Supabase project status
     - Ensure project is active (not paused)
     - Verify VPN/IP whitelist if applicable
     - Test connection: psql $DATABASE_URL -c "SELECT 1"
```

**Issue 3: Webhook Signature Verification Fails**
```
Error: Invalid Stripe signature
Fix: Verify webhook secret is correct
     - Get from Stripe Dashboard → Webhooks
     - Ensure raw body is used (not parsed JSON)
     - Check signature header name: "stripe-signature"
```

---

## Phase 9: Stripe Marketplace Review (Week 4-6)

### Pre-Submission Checklist (Use `DEPLOYMENT_CHECKLIST.md`)

**Privacy & Security** (Critical for approval):
- ✅ Privacy Policy published (link in app manifest)
- ✅ Data encryption documented (Supabase encryption at rest)
- ✅ Webhook signature validation enforced
- ✅ Audit trail immutable (append-only, no delete/update)
- ✅ No plaintext secrets in logs or error messages
- ✅ RLS policies enforce org isolation

**Documentation Requirements**:
- ✅ Setup guide (packages/stripe-app/docs/SETUP.md) — 454 lines
- ✅ API reference (packages/stripe-app/docs/API.md) — 750 lines
- ✅ Architecture guide (packages/stripe-app/docs/ARCHITECTURE.md) — 803 lines
- ✅ Support contact email verified (t.dealer01@dsg.pics)

**App Icon & Screenshots**:
- ✅ Icon: 300x300 PNG (square)
- ✅ Screenshots: 3x (charge view, payout view, audit log)
- ✅ All in English (locale: en_US)

**Permissions Justification**:
- ✅ charge_read/write: "Evaluate governance policies for charges"
- ✅ payment_intent_read: "Monitor payment intents for compliance"
- ✅ payout_read: "Track payouts for audit trail"
- ✅ refund_read: "Monitor refunds for compliance evidence"

### Submission Process

**1. Create Stripe App Account**
```
1. Go to https://dashboard.stripe.com/apps
2. Click "Create App"
3. Fill in:
   - App name: "DSG Governance Gate"
   - Category: "Compliance & Risk"
   - Description: (from stripe-app.json)
4. Upload icon (300x300 PNG)
5. Add 3 screenshots
```

**2. Configure OAuth**
```
Stripe Dashboard → Settings → OAuth
- Client ID: (auto-generated)
- Client secret: (save securely)
- Allowed redirect URIs:
  * https://your-vercel-url/api/stripe/oauth/callback
```

**3. Submit for Review**
```
1. Fill in all required fields
2. Accept terms & conditions
3. Click "Submit for Review"
4. Stripe will email within 2-4 weeks
```

### Common Rejection Reasons & Fixes

| Reason | Fix |
|--------|-----|
| Missing privacy policy | Add link to public privacy policy page |
| Insufficient documentation | Add SETUP.md and API.md to app marketplace page |
| Unclear permissions | Explain each permission in plain English (see above) |
| Security concerns | Add encryption documentation, RLS policies |
| Performance issues | Run performance tests, document <2s policy eval |
| UX unclear | Add 2-3 screenshots showing user flow |

---

## Immediate Action Items (Next 2 Weeks)

### Week 1
- [ ] Phase 5.1: Implement webhook handler with Stripe SDK
- [ ] Phase 5.2: Implement OAuth flow (state + token exchange)
- [ ] Phase 5.3: Implement route handlers (policies, audit, approvals)
- [ ] Phase 7.1: Create test fixtures (charges, payouts, scenarios)
- [ ] Phase 7.2: Implement unit tests (>80% coverage)

### Week 2
- [ ] Phase 7.3: Implement integration tests (stripe-mock)
- [ ] Phase 7.4: Implement E2E tests (Playwright)
- [ ] Phase 8.1: Gather Stripe OAuth credentials
- [ ] Phase 8.2: Configure Supabase project + run migrations
- [ ] Phase 8.3: Deploy to Vercel (test environment)

### Week 3 (If On Track)
- [ ] Phase 8.4: Verify production deployment
- [ ] Phase 9.1: Prepare Stripe marketplace submission
- [ ] Phase 9.2: Create privacy policy + documentation
- [ ] Phase 9.3: Submit app for Stripe review

---

## Testing Strategy

### Local Development
```bash
# Terminal 1: Start dev server
npm run dev  # Runs on http://localhost:3000

# Terminal 2: Start Stripe CLI
stripe listen --forward-to localhost:3001/api/stripe/webhook/events

# Terminal 3: Send test events
stripe trigger charge.created --stripe-account=acct_test_...
stripe trigger payout.created --stripe-account=acct_test_...

# Terminal 4: Run tests
npm run test:unit
npm run test:integration
npm run test:e2e
```

### Performance Targets
```
Policy evaluation: <2 seconds
Webhook response: <500ms (including DSG eval)
Audit recording: <500ms
Policy cache hit: <200ms
Database query: <100ms
```

### Error Scenarios to Test
```
1. Webhook signature invalid → 401 Unauthorized
2. Policy not found → 404 Not Found
3. Stripe API timeout → 500 Server Error (with retry)
4. Missing environment variables → 500 Server Error at startup
5. Supabase connection down → 503 Service Unavailable (graceful)
6. Redis cache down → Fall back to DB (slower but still works)
```

---

## Code Review Checklist

Before each commit:
```
[ ] Idempotency-Key used for all financial transactions
[ ] Webhook signature verified using raw body
[ ] All secrets passed via environment variables
[ ] No hardcoded Stripe keys in code or tests
[ ] Error messages don't leak sensitive data
[ ] Database queries use parameterized statements
[ ] RLS policies checked for org isolation
[ ] Tests cover happy path + error scenarios
[ ] Performance targets documented (if applicable)
[ ] TypeScript strict mode passes (npm run typecheck)
[ ] Next.js build passes (npm run build)
```

---

## Success Criteria

### Code Quality
- ✅ TypeScript typecheck passes
- ✅ npm run build succeeds
- ✅ No npm audit vulnerabilities (critical)
- ✅ >80% test coverage (Phase 7)
- ✅ All tests pass (npm run test)

### Performance
- ✅ Policy evaluation <2s average
- ✅ Webhook response <500ms
- ✅ Audit query <1s
- ✅ Build time <60s

### Security
- ✅ Webhook signature validation enforced
- ✅ OAuth PKCE enabled
- ✅ Supabase RLS policies enforced
- ✅ No plaintext secrets in logs/errors
- ✅ CORS restricted to trusted origins

### Deployment
- ✅ Vercel deployment successful
- ✅ Supabase migrations applied
- ✅ Environment variables all present
- ✅ Health check endpoint responding
- ✅ Stripe webhook endpoint receiving events

### Marketplace
- ✅ Privacy policy published
- ✅ Documentation complete
- ✅ App icon + screenshots uploaded
- ✅ Submitted for Stripe review
- ✅ Awaiting approval (2-4 weeks)

---

## Reference Documents

**In This Repository**:
- `DEPLOYMENT_CHECKLIST.md` — 169 item verification list
- `packages/stripe-app/docs/SETUP.md` — User installation guide
- `packages/stripe-app/docs/API.md` — Full API reference
- `packages/stripe-app/docs/DEPLOYMENT.md` — Step-by-step deployment
- `packages/stripe-app/docs/MONITORING.md` — Observability setup
- `CLAUDE.md` — Project conventions & truth boundaries

**External References**:
- Stripe Apps documentation: https://docs.stripe.com/stripe-apps
- Stripe Webhooks: https://docs.stripe.com/webhooks
- Supabase documentation: https://supabase.com/docs
- Vercel deployment: https://vercel.com/docs

---

## Questions?

For clarification on:
- **Architecture**: See `packages/stripe-app/docs/ARCHITECTURE.md`
- **API routes**: See `packages/stripe-app/docs/API.md`
- **Deployment**: See `packages/stripe-app/docs/DEPLOYMENT.md`
- **Testing**: See `packages/stripe-app/PHASE7_TEST_STRUCTURE.md`
- **Project conventions**: See `CLAUDE.md`

---

**Status**: Ready to merge PR #700 → Development team takes over Phases 5-9

**Estimated Timeline**: 4-6 weeks to Stripe Marketplace submission  
**Target Go-Live**: End of August 2026 (pending Stripe review approval)

https://claude.ai/code/session_01TSwfdBaYLgXoNfRy2W1Uhq
