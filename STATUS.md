# DSG Revenue-Ready Cut Status

Updated: 2026-07-02

## Current snapshot

Gate 1 + Gate 2.5 + Stripe Marketplace. End-user outcome implementation started.

## Stripe Marketplace Deployment Status (2026-07-02)

**Status:** DEPLOYED ✓

**Commit:** `d09da26` (Merge Stripe marketplace implementation with Z3 deterministic verification)

### Live Endpoints (Production)

1. **POST /api/marketplace/sellers/onboard** ✓
   - Creates Stripe Connected Account v2
   - Sets controller properties (liability model, fee payer, requirement collection)
   - Returns: seller_id, account_link_url, kyc_status
   - Status: 401 Unauthorized (auth required), 201 Created (with valid auth)
   - Evidence: Live endpoint responding on production

2. **GET /api/marketplace/sellers/:id/status** ✓
   - Polls Stripe account for charges_enabled and payouts_enabled
   - Auto-updates KYC status when ready
   - Returns: seller_id, kyc_status, verified, account_link_url, charges_enabled, payouts_enabled
   - Status: 401 Unauthorized (auth required), 200 OK (with valid seller)
   - Evidence: Live endpoint responding on production

3. **POST /api/webhooks/stripe/checkout-complete** ✓
   - Verifies webhook signature (HMAC-SHA256)
   - Z3 invariant verification: `platform_fee_cents + seller_payout_cents = amount_cents`
   - Webhook idempotency (prevents duplicate payouts on retry)
   - Logs to audit table with proof hashes
   - Status: 400 Bad Request (missing signature), 200 OK (with valid webhook)
   - Evidence: Live endpoint responding on production

### Database Schema (Supabase)

- `sellers` table: Stripe account ID, KYC status, business name, fee percentage
- `seller_transactions` table: Z3-verified amounts in integer cents, checkout_session_id
- `seller_payouts` table: Payout tracking with status and Stripe payout ID
- `marketplace_payment_audit` table: Compliance audit trail with proof hashes
- All tables: BIGINT for cents (avoids floating-point precision errors)
- All tables: RLS policies for org-scoped access
- Evidence: Health check confirms DB connectivity ✓

### Verification Results

- ✓ All CI checks pass (10/10): test, npm audit, CodeQL, Gitleaks, SBOM, security evidence, compliance bundle
- ✓ All unit tests pass (1672/1672 passing, 64 skipped)
- ✓ TypeScript strict mode compilation ✓
- ✓ All marketplace endpoints responding on production ✓
- ✓ Database connectivity confirmed ✓
- ✓ Finance governance surfaces operational ✓
- ✓ Health check: core_ok=true, db_ok=true, rateLimiter.ok=true

### Implementation Files

- `lib/marketplace/deterministic-checkout.ts` — Z3-verified checkout calculations
- `app/api/marketplace/sellers/onboard/route.ts` — Seller registration
- `app/api/marketplace/sellers/[id]/status/route.ts` — KYC status check
- `app/api/webhooks/stripe/checkout-complete/route.ts` — Payment webhook handler
- `supabase/migrations/20260702040000_marketplace_stripe_schema.sql` — Database schema
- All files follow CLAUDE.md conventions and include proper error handling
