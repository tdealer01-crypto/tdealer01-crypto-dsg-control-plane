# Phase 4 & 5 Roadmap - Quick Reference

**Phase 4**: Gateway Integration (2 weeks)  
**Phase 5**: API Routes (1 week)  

These phases can start once Phase 3 (database) is complete.

---

## Phase 4: Gateway Integration (2 weeks)

**Goal**: Wire handlers to DSG gateway executor + implement policy evaluation

### Key Tasks

1. **Register Stripe tools** in DSG gateway executor
   - Create `src/lib/stripe-gateway-tools.ts`
   - Export tools: `stripe.charge.create`, `stripe.payout.create`, `stripe.refund.create`
   - Define risk levels: charge=high, payout=critical, refund=medium

2. **Create gateway provider** for Stripe operations
   - Create `src/lib/stripe-gateway-provider.ts`
   - Implement `executeGatewayProvider()` to call actual Stripe API after approval
   - Handle approve/block/review decisions

3. **Extend policy evaluator**
   - Create `src/lib/stripe-policy-evaluator.ts`
   - Add Stripe-specific rules (amount thresholds, rate limits, time-based)
   - Integrate with Phase 3 StripeStateManager to fetch policies from DB

4. **Wire approval workflow**
   - Create `src/handlers/approval-handler.ts`
   - Reuse existing DSG approval flow from `/lib/gateway/approvals.ts`
   - Handle operator approval/rejection of review-gated operations

5. **Update webhook handler**
   - Modify `src/handlers/webhook-handler.ts` to use StripeStateManager
   - Call `recordAudit()` for all decisions
   - Auto-freeze/refund on BLOCK decisions

### Key Files to Create/Modify

```
src/lib/stripe-gateway-tools.ts      # NEW
src/lib/stripe-gateway-provider.ts   # NEW
src/lib/stripe-policy-evaluator.ts   # NEW
src/handlers/approval-handler.ts     # NEW
src/handlers/webhook-handler.ts      # MODIFY - add DB integration
src/lib/dsg-client.ts                # MODIFY - add approval handling
```

### Integration Points

- Reuse: `/lib/gateway/executor.ts` - Core gateway logic
- Reuse: `/lib/gateway/tool-registry.ts` - Tool registration
- Reuse: `/lib/gateway/approvals.ts` - Approval workflow
- New: Wire Stripe operations through existing gateway

### Success Criteria

- ✅ Tools registered in gateway executor
- ✅ Policy evaluation < 2 seconds
- ✅ Audit trail recorded for all operations
- ✅ Approval workflow routes review-gated ops to dashboard
- ✅ Auto-freeze/refund on block decisions
- ✅ All integration tests passing

---

## Phase 5: API Routes (1 week)

**Goal**: Create REST API endpoints to expose Stripe App to frontend + webhooks

### Key Tasks

1. **Create Hono server** (lightweight, Edge-friendly)
   - Create `src/server.ts` - Hono app initialization
   - Add middleware: logging, CORS, auth
   - Add error handling

2. **Implement API routes**

   **Webhook route** (Edge Function):
   ```
   POST /stripe/webhook/events
   - Validate Stripe signature
   - Route to webhook handler
   - Return 200 OK (async processing)
   - CRITICAL: Must be <500ms response
   ```

   **Custom UI route** (for Stripe Dashboard buttons):
   ```
   POST /stripe/custom-ui/execute
   - Pre-execution gate (charge approval)
   - Evaluate policy <2s
   - Return ALLOW/BLOCK/REVIEW decision
   ```

   **Policy management**:
   ```
   GET  /stripe/policies/list     - List policies
   POST /stripe/policies/create   - Create policy
   ```

   **Audit logs**:
   ```
   GET /stripe/audit/operations   - Paginated audit trail
   GET /stripe/audit/analytics    - Aggregated stats
   ```

   **OAuth**:
   ```
   GET  /stripe/oauth/authorize   - Redirect to Stripe OAuth
   POST /stripe/oauth/callback    - Handle OAuth callback
   ```

   **Approval workflow**:
   ```
   POST /stripe/approval/{decision_id}/approve  - Approve operation
   POST /stripe/approval/{decision_id}/reject   - Reject operation
   ```

3. **Policy cache optimization**
   - Use Redis/Upstash for cache (optional but recommended)
   - Preload policies on account install
   - Invalidate on policy update

4. **Integrate with Next.js Control Plane**
   - Create proxy routes: `/app/api/stripe-app/webhook/route.ts`
   - Reuse existing DSG auth from `/lib/auth/access-policy.ts`
   - Connect to Control Plane API for org/user lookups

### Key Files to Create

```
packages/stripe-app/src/server.ts                   # NEW
packages/stripe-app/src/routes/index.ts             # NEW - Main routes
app/api/stripe-app/webhook/route.ts                 # NEW - Next.js proxy
app/api/stripe-app/policies/route.ts                # NEW
app/api/stripe-app/audit/route.ts                   # NEW
app/api/stripe-app/approval/[id]/route.ts           # NEW
app/api/stripe-app/custom-ui/execute/route.ts       # NEW
```

### Performance Requirements

- Webhook endpoint: <500ms response (Stripe timeout 5s)
- Policy evaluation: <2s (Stripe UI timeout)
- Audit queries: <1s (dashboard UX)
- Cache hit rate: >95% (policies change rarely)

### Success Criteria

- ✅ All routes implemented and tested
- ✅ Webhook endpoint <500ms
- ✅ Policy evaluation <2s
- ✅ No CSP errors in browser
- ✅ OAuth flow completes
- ✅ Approval workflow functional
- ✅ All integration tests passing

---

## Phases 6-9 (Quick Overview)

### Phase 6: Frontend & Dashboard (2 weeks)
- React 17 views for Stripe Dashboard (charge, payment_intent, payout detail pages)
- DSG Control Plane dashboard pages (policies, audit, approvals)
- OAuth setup page

### Phase 7: Testing (1 week)
- Unit tests for all adapters, handlers, policies
- Integration tests for full workflows
- E2E tests with Stripe test account

### Phase 8: Deployment & Marketplace (2 weeks)
- Deploy to Vercel (backend)
- Create Stripe App account
- Submit for Stripe review (2-4 week wait)

### Phase 9: Marketing & Launch (1 week)
- Blog post, demo video, use-case guide
- Stripe partnership outreach

---

## Dependencies Between Phases

```
Phase 1 (Setup)
  ↓
Phase 2 (Handlers) 
  ↓
Phase 3 (Database)
  ↓
Phase 4 (Gateway) ← Can run parallel with Phase 5
Phase 5 (API)      ← Can run parallel with Phase 4
  ↓
Phase 6 (Frontend) → Can start once Phase 5 routes ready
  ↓
Phase 7 (Testing)  → Tests all layers
  ↓
Phase 8 (Deploy)
  ↓
Phase 9 (Launch)
```

---

## Quick Command Reference

### Phase 4 Setup
```bash
# Create gateway tools
cat > packages/stripe-app/src/lib/stripe-gateway-tools.ts << 'EOF'
// Register tools in DSG gateway executor
// stripe.charge.create (high risk)
// stripe.payout.create (critical risk)
// stripe.refund.create (medium risk)
EOF

# Create gateway provider
cat > packages/stripe-app/src/lib/stripe-gateway-provider.ts << 'EOF'
// Implement executeGatewayProvider()
// Call Stripe API after approval
EOF

# Create policy evaluator
cat > packages/stripe-app/src/lib/stripe-policy-evaluator.ts << 'EOF'
// Extend /lib/gateway/policy.ts
// Add Stripe-specific rules
EOF
```

### Phase 5 Setup
```bash
# Create Hono server
cat > packages/stripe-app/src/server.ts << 'EOF'
import { Hono } from 'hono';
const app = new Hono();
// Add routes...
EOF

# Create routes
mkdir -p packages/stripe-app/src/routes
cat > packages/stripe-app/src/routes/index.ts << 'EOF'
// Define all API endpoints
// webhook, policies, audit, oauth, approvals
EOF

# Create Next.js proxies
mkdir -p app/api/stripe-app/{webhook,policies,audit}
```

---

## Environment Variables Needed

```bash
# Phase 4+
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
DSG_API_BASE=

# Phase 5
STRIPE_WEBHOOK_SECRET=
STRIPE_CLIENT_ID=
STRIPE_CLIENT_SECRET=
UPSTASH_REDIS_REST_URL=    # Optional but recommended
UPSTASH_REDIS_REST_TOKEN=
```

---

## Testing Strategy

### Phase 4 Tests
- Unit: Policy evaluation with different rules
- Integration: Full gateway flow (request → decision → audit)

### Phase 5 Tests
- Unit: Route request/response handling
- Integration: Webhook signature validation
- E2E: Full end-to-end with Stripe test account

### Phase 7
- Full suite: All 9 phases integrated
- Mutation tests: Verify governance logic correctness

---

## Known Challenges & Solutions

**Challenge**: Policy evaluation timeout
- **Solution**: Cache policies (Phase 5), use Edge Functions, 2s timeout default to REVIEW

**Challenge**: Webhook ordering (async)
- **Solution**: Use stripe_event_id for idempotency, record all events

**Challenge**: OAuth state management
- **Solution**: Validate state within 10min, store in memory with TTL

**Challenge**: Stripe SDK + React 17
- **Solution**: Use @stripe/ui-extension-sdk v1.x only (compatible)

---

## Next Steps

1. **Complete Phase 3** (database schema) ✅
2. **Start Phase 4 & 5 in parallel** (non-blocking)
   - Phase 4 focuses on governance logic
   - Phase 5 focuses on API exposure
3. **Phase 4 + 5 together feed Phase 6** (frontend needs working API)
4. **Phase 6-9 follow linearly** or Phase 7 tests in parallel

---

## Reference Docs

- Phase 1 Setup: `STRIPE_APP_PHASE1_SETUP.md`
- Phase 2 Handlers: `STRIPE_APP_PHASE2_HANDLERS.md`
- Phase 3 Database: `STRIPE_APP_PHASE3_DATABASE.md`
- Implementation Plan: `/root/.claude/plans/https-docs-stripe-com-stripe-apps-create-breezy-crescent.md`
- Technical Requirements: `/root/.claude/plans/stripe-apps-technical-requirements.md`

---

## Checklist for Phase 4 Start

Before starting Phase 4:
- [ ] Phase 3 database applied to Supabase
- [ ] StripeStateManager working
- [ ] Phase 2 webhook handler complete
- [ ] Policy cache layer implemented
- [ ] All Phase 3 tests passing
- [ ] Supabase connection verified

## Checklist for Phase 5 Start

Before starting Phase 5:
- [ ] Phase 4 gateway tools registered
- [ ] Policy evaluator complete
- [ ] Approval workflow wired
- [ ] All Phase 4 tests passing
- [ ] Stripe SDK configured

---

**Both Phase 4 and Phase 5 can start immediately after Phase 3 is complete.**
