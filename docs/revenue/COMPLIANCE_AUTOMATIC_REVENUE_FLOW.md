# Compliance Verification — Automatic Revenue Flow

Status: development branch implementation; not production-approved.

## Customer journey

1. The customer reviews `/pricing#dsg-gate`.
2. Pro and Enterprise actions open `/checkout/pro` or `/checkout/enterprise`.
3. The checkout handoff authenticates the user and requests a Stripe Checkout Session from `POST /api/billing/checkout`.
4. Stripe sends a signed event to `POST /api/billing/webhook`.
5. The webhook claims the event idempotently, persists the subscription, and calls `sync_dsg_paid_entitlement`.
6. The database transaction updates both `organizations.plan` and `dsg_gate_entitlements`.
7. Web, Android, or MCP clients read `GET /api/dsg/v1/entitlement` before execution.
8. The client submits a governed verification to `POST /api/dsg/v1/solver/hybrid/evaluate` with a unique `idempotencyKey`.
9. The server checks entitlement, executes the solver, and persists a unique usage row keyed by `(org_id, eval_id)` before returning the result.
10. Pro evaluations above the included quota enter the durable Stripe meter outbox. Stripe failures remain retryable instead of losing revenue evidence.

## Client contract

### Read entitlement

```http
GET /api/dsg/v1/entitlement
Authorization: Bearer <DSG credential>
```

Important response fields:

```json
{
  "ok": true,
  "entitlement": {
    "allowed": true,
    "tier": "pro",
    "evalsRemaining": 42,
    "accessMode": "included_quota",
    "requiresPayment": false,
    "upgradeUrl": "/pricing#dsg-gate"
  }
}
```

`accessMode` values:

- `included_quota`: execute without an overage event.
- `metered_overage`: execute and create one idempotent Stripe meter event.
- `quota_exceeded`: upgrade required.
- `subscription_inactive`: paid access revoked.
- `billing_unavailable`: fail closed because billing evidence cannot be trusted.

### Submit verification

```http
POST /api/dsg/v1/solver/hybrid/evaluate
Authorization: Bearer <DSG credential>
Content-Type: application/json

{
  "planId": "customer-policy-v1",
  "riskLevel": "medium",
  "context": {
    "approval_present": true,
    "audit_complete": true
  },
  "nonce": "client-generated-nonce",
  "idempotencyKey": "stable-id-for-this-logical-evaluation"
}
```

The same logical request must reuse the same `idempotencyKey`. A retry cannot create a second `dsg_gate_usage` row or a second Stripe meter event.

## Revenue invariants

- Evaluation 5,000 is included in Pro; evaluation 5,001 is the first possible overage.
- Paid access requires Stripe status `active` or `trialing`.
- Missing entitlement storage fails closed for authenticated organizations.
- Solver output is withheld when usage evidence cannot be persisted.
- Subscription fulfillment and revocation update organization and gate entitlement in one database transaction.
- SECURITY DEFINER revenue functions are executable only by `service_role` and the database owner.

## Verified development evidence

- Both revenue migrations were applied successfully to Supabase project `dsg-control-plane-dev`.
- The entitlement RPC was executed inside a transaction and returned Pro / 5,000 / overage enabled; rollback restored the original Free state.
- Routine privileges were queried after hardening: only `postgres` and `service_role` retained `EXECUTE`.

## Known production blockers

- Production Supabase project identity and readiness are not confirmed; the suspected project is inactive.
- Vercel native Git previews report `Resource provisioning failed`; repository release policy intentionally requires governed CI promotion.
- The repository contains conflicting legacy plan displays in `/dashboard/billing`; the public DSG Gate pricing flow now bypasses those cards, but the legacy billing UI still needs catalog consolidation.
- The connected Stripe account currently exposes monthly Pro and Enterprise prices; Business and yearly prices were not created because no verified commercial decision exists.
- Stripe meter configuration and production environment variables must be verified during governed promotion.
