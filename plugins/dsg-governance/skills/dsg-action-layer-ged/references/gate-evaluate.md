# Deterministic Safety Gate — Reference

## Endpoint

```
POST /api/dsg/v1/gates/evaluate
Authorization: Bearer <DSG_API_KEY>
Content-Type: application/json
```

## What it does

Evaluates a proposed agent action against the current policy set using a
deterministic TypeScript gate engine (Z3-style constraint satisfaction).

Same input + same policy version = same decision, always.
Every evaluation produces a **proofHash** and **constraintSetHash** for future replay.

## Request shape

```json
{
  "agentId": "agent_abc123",
  "actionId": "act_xyz789",
  "idempotencyKey": "ik_<uuid>",
  "nonce": "<random-string>",
  "riskLevel": "medium",
  "actionType": "database_write",
  "actionDescription": "Write customer PII to orders table",
  "context": {
    "orgId": "org_111",
    "workspaceId": "ws_222",
    "policyVersion": "v2.1.0"
  }
}
```

### Required fields

| Field | Type | Notes |
|---|---|---|
| `agentId` | string | Active agent identifier |
| `actionId` | string | Unique action identifier |
| `idempotencyKey` | string | Prevents duplicate evaluations |
| `nonce` | string | Anti-replay nonce |
| `riskLevel` | `low` \| `medium` \| `high` \| `critical` | Determines UNSUPPORTED mapping |
| `actionType` | string | Category of the proposed action |

## Response shape

```json
{
  "ok": true,
  "gateStatus": "PASS",
  "proofStatus": "PASS",
  "riskLevel": "medium",
  "proof": {
    "proofHash": "sha256:abc123...",
    "constraintSetHash": "sha256:def456...",
    "policyVersion": "v2.1.0",
    "inputHash": "sha256:ghi789...",
    "timestamp": "2026-07-01T09:00:00.000Z",
    "status": "PASS",
    "failureReasons": []
  }
}
```

### gateStatus values

| Value | Meaning | Action |
|---|---|---|
| `PASS` | All constraints satisfied | Proceed with execution |
| `BLOCK` | One or more constraints violated | Halt — never proceed |
| `REVIEW` | Requires human confirmation | Show plan, wait for approval |
| `UNSUPPORTED` | Constraint cannot be evaluated | Map: low→REVIEW, med/high→BLOCK |

## Quota / Pricing

| Tier | Evals/month | Price |
|---|---|---|
| Free | 50 | $0 |
| Pro | 5 000 | $99/month |
| Enterprise | Unlimited | $499/month |

Quota exceeded → HTTP 402 `{ requiresUpgrade: true, upgradeUrl: "/pricing#dsg-gate" }`

## Policy manifest (read before calling)

```
GET /api/dsg/v1/policies/manifest
```

Returns current `policyVersion`, `constraintSetHash`, and solver metadata.
Always read the manifest before the first gate call in a session to pin the policy version.

## Z3 / Formal proof boundary

The gate engine is a deterministic TypeScript constraint solver.
External Z3 solver is **not invoked** by this route.
Design-time formal proofs are run via `npm run verify:policy` and `npm run proof:revenue`.
Do not claim "external production Z3 invocation" unless separately verified.
