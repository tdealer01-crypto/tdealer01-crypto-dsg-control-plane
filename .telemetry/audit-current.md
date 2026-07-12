# Current Tracking Audit — DSG ONE / ProofGate

**Date:** July 12, 2026  
**Method:** Codebase scan + live inspection  
**Status:** Evidence-ready (partial coverage)

---

## Executive Summary

DSG ONE has **minimal telemetry coverage**. Tracking is limited to billing/revenue pipeline (Stripe → PostHog). **Core product features (policies, executions, approvals, audit trail usage) have no telemetry.**

**Coverage by area:**
- ✅ **Billing/Revenue** — 4 PostHog events + database tables
- ❌ **Policy Adoption** — Not tracked
- ❌ **Decision Gate/Execution** — Not tracked
- ❌ **Approval Workflows** — Not tracked
- ❌ **Compliance/Audit Usage** — Not tracked
- ❌ **Conversion Funnel** — Partial (checkout only)
- ❌ **Feature Usage** — Not tracked
- ❌ **Organization/Workspace Activity** — Not tracked

---

## Billing & Revenue Tracking

### PostHog Events (4 total)

| Event | Location | Trigger | Properties |
|-------|----------|---------|-----------|
| `customer_created` | `/api/revenue/[action]` | New customer record created | `customer_id`, `initial_plan` |
| `checkout_started` | `/api/revenue/[action]` | Stripe checkout session created | `plan`, `session_id`, `customer_id` |
| `subscription_created` | `/api/revenue/[action]` (webhook simulation only) | Subscription activated | `customer_id`, `plan`, `amount` |
| `invoice_paid` | `/api/revenue/[action]` (webhook simulation only) | Invoice marked paid | `customer_id`, `amount` |

**Assessment:**
- Only 2 events (`customer_created`, `checkout_started`) are in production flow
- 2 events (`subscription_created`, `invoice_paid`) exist only in webhook simulation/testing
- **Missing:** subscription canceled, plan upgrade/downgrade, invoice failed, payment method changed

### Stripe Webhooks

| Webhook | Location | Status | Coverage |
|---------|----------|--------|----------|
| `/api/billing/webhook` | `app/api/billing/webhook/route.ts` | **Canonical** | Signature-verified, idempotent via `billing_events` table |
| `/api/stripe/webhook` | `app/api/stripe/webhook/route.ts` | **Deprecated** | Legacy "release gate" only; do NOT use |
| `/api/stripe-app/webhook` | `app/api/stripe-app/webhook/route.ts` | Active | Stripe Connect app webhook |
| `/api/webhooks/stripe` | `app/api/webhooks/stripe/route.ts` | Active | Generic Stripe webhook handler |
| `/api/webhooks/stripe/checkout-complete` | `app/api/webhooks/stripe/checkout-complete/route.ts` | Active | Checkout completion handler |

**Assessment:**
- Multiple webhook endpoints (fragmented)
- Canonical endpoint: `/api/billing/webhook` (handles subscriptions, fulfillment, entitlements)
- No explicit PostHog capture calls in webhook handlers (events logged to database only)

### Database Tables (Billing)

| Table | Purpose | Records | Last Updated |
|-------|---------|---------|--------------|
| `billing_subscriptions` | Normalized subscription state | Live | At webhook time |
| `billing_events` | Idempotent webhook event log | All events | At webhook time |
| `customers` | Customer records (demo/internal) | Internal only | Demo route |
| `checkout_events` | Checkout session tracking | Demo only | Demo route |
| `subscriptions` | Subscription records | Demo only | Demo route |
| `invoices` | Invoice records | Demo only | Demo route |
| `release_gate_entitlements` | Legacy entitlements (do not use) | Legacy | Deprecated |

**Assessment:**
- Production state: `billing_subscriptions` + `billing_events`
- Demo/test state: `customers`, `checkout_events`, `subscriptions`, `invoices`
- No org/workspace/agent-level billing tracking

---

## Core Product Tracking (MISSING)

### Policies

**Currently tracked:** ❌ None  
**Should track:**
- Policy created (org_id, user_id, policy_name, policy_version)
- Policy updated (policy_id, change_type, user_id)
- Policy activated (policy_id, org_id)
- Policy archived (policy_id, reason)

**Database tables exist:** `policies` (in schema, not instrumented)

### Executions / Decisions

**Currently tracked:** ❌ None  
**Should track:**
- Execution submitted (org_id, agent_id, policy_id, request_type)
- Gate decision made (execution_id, decision: ALLOW/BLOCK/REVIEW/ESCALATE, latency_ms, policy_version)
- Execution approved (execution_id, approver_id, approval_time_ms)
- Execution rejected (execution_id, rejector_id, reason)

**Database tables exist:** `executions`, `runtime_intents` (in schema, not instrumented)

### Audit Trail / Evidence

**Currently tracked:** ❌ None  
**Should track:**
- Evidence exported (org_id, user_id, export_format, evidence_count)
- Audit trail accessed (org_id, user_id, query_type, records_returned)
- Compliance report generated (org_id, report_type: CCVS/EU-AI-Act, user_id)

**Database tables exist:** `audit_trails`, `evidence` (in schema, not instrumented)

### Organization / Workspace

**Currently tracked:** ❌ None  
**Should track:**
- Organization created (org_id, user_id, plan_tier)
- Workspace created (workspace_id, org_id, user_id)
- User invited (invited_user_email, org_id, role, inviter_id)
- Team member removed (removed_user_id, org_id, removed_by_id)
- Plan upgraded (org_id, from_plan, to_plan, user_id)

**Database tables exist:** `organizations`, `users`, `workspaces` (in schema, not instrumented)

---

## PostHog Configuration

| Setting | Value | Notes |
|---------|-------|-------|
| API Key | `process.env.NEXT_PUBLIC_POSTHOG_API_KEY` | Public key in env |
| Host | `process.env.NEXT_PUBLIC_POSTHOG_HOST` | Defaults to `https://us.posthog.com` |
| Client Type | `posthog-node` | Server-side Node.js client |
| Implementation | Direct captures in `/api/revenue/[action]` | Limited to billing flow |

**Assessment:**
- PostHog integration exists but severely underutilized
- Only 4 events captured; no feature flags, no group tracking
- No organization/workspace-level grouping (required for multi-tenant analytics)

---

## Identified Gaps

### Critical Gaps (blocks conversion funnel visibility)

1. **No conversion funnel tracking** — No visibility into:
   - Signup → Policy created → First execution → Approval → Upgrade path
   - Free tier usage (who's using, at what rate)
   - Pro/Enterprise tier adoption

2. **No core feature instrumentation** — Missing:
   - Policy adoption rate (how many orgs have >0 active policies)
   - Execution volume (requests/day by org, agent, policy)
   - Decision distribution (% ALLOW/BLOCK/REVIEW/ESCALATE)
   - Approval workflow metrics (queue depth, approval time)

3. **No compliance/audit metrics** — Missing:
   - Evidence export frequency (compliance maturity signal)
   - Audit trail queries (who's auditing, how often)
   - Compliance report generation (CCVS/EU-AI-Act adoption)

### Medium Gaps (reduces operational visibility)

4. **No approval workflow tracking** — Missing:
   - Pending approval queue depth
   - Approval turnaround time (P50/P95)
   - Escalation rate
   - Auto-approval vs. manual approval ratio

5. **No organization health metrics** — Missing:
   - Active policies per org
   - Active agents per org
   - Team member count and roles
   - Workspace utilization

6. **No billing events in PostHog** — Stripe webhooks log to database only:
   - Subscription status changes not sent to PostHog
   - Plan upgrades/downgrades not visible in analytics
   - Churn not tracked in PostHog (only in database queries)

### Low Priority Gaps

7. **No feature flag integration** — PostHog supports feature flags; not implemented
8. **No group tracking** — Multi-tenant analytics requires `group()` calls; none implemented
9. **No custom insights** — No funnels, retention, or cohort analysis configured

---

## Recommendations (Priority Order)

### Phase 1 — Conversion Funnel (Week 1)

1. **Signup event** — Track when user first lands on signup (posthog.capture in auth flow)
2. **Organization created** — Track new org provisioning
3. **Policy created** — Track first policy write (deterministic gate function)
4. **Execution submitted** — Track first request through gate
5. **Plan upgrade** — Track checkout → subscription pipeline (requires webhook instrumentation)

**Result:** Clear funnel from Signup → Upgrade

### Phase 2 — Core Product Metrics (Week 2)

1. **Instrument execution gate** — Capture decision latency, type, policy version
2. **Instrument approval workflow** — Queue depth, approval time, escalation rate
3. **Add organization grouping** — Use PostHog `group()` to tag events with org_id
4. **Billing events to PostHog** — Send subscription webhooks to PostHog (not just database)

**Result:** Operational dashboard for product health

### Phase 3 — Compliance / Advanced (Week 3)

1. **Evidence export tracking** — Compliance readiness signal
2. **Audit trail query logging** — Feature adoption by auditors/risk teams
3. **Policy effectiveness metrics** — ALLOW/BLOCK ratio by policy, policy, by org
4. **Feature flag integration** — A/B test new features

**Result:** Compliance team visibility + experimentation framework

---

## Action Items for Next Phase

- [ ] Create `.telemetry/tracking-plan.md` with event schema definitions
- [ ] Design org/workspace/agent grouping structure for PostHog
- [ ] Identify critical user journeys (signup → upgrade, audit workflow, etc.)
- [ ] Build tracking implementation guide (`.telemetry/tracking-guide.md`)

---

**Audit conducted by:** Claude Code  
**Evidence:** Codebase scan, live API inspection, database schema analysis  
**Confidence level:** High (verified source code)
