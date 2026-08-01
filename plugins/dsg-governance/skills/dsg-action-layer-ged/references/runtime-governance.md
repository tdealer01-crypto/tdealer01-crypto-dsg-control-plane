# Runtime Governance — Before / During / After — Reference

## The governance lifecycle

Most governance systems check only **before** execution.
DSG governs at **three points**:

```
BEFORE execution
  → Gate evaluate (PASS / BLOCK / REVIEW)
  → Quota check (rate limit + monthly quota)
  → Approval workflow (if REVIEW or HIGH risk)
  → Isolation context setup

DURING execution
  → Hermes conformance gate (plan hash must match)
  → Credential lease (scoped, expiring)
  → Command whitelist enforcement
  → Path isolation enforcement

AFTER execution
  → Runtime commit RPC (evidence stored)
  → Audit trail written to Supabase
  → Quota decrement recorded
  → Pipeline trace stored
  → Proof hash stored for replay
```

---

## Spine execution entry

All governed execution must go through:

```
POST /api/spine/execute    (current spine layer)
POST /api/execute          (stable compatibility alias)
```

Do not bypass this path for governed actions.

### Expected spine flow

1. Extract the Bearer token from the `Authorization` header.
2. Normalize payload — require `agent_id`.
3. Resolve agent from API key (check active status).
4. Apply rate limits + CORS.
5. Enforce quota (block before execution if exceeded).
6. Issue or reuse pending runtime intent.
7. Execute through spine pipeline.
8. Commit runtime evidence via runtime commit RPC.
9. Return `decision`, `reason`, `proof`, `pipeline_trace`, `ledger_sequence`, `usage`.

### Request shape

```json
{
  "agent_id": "agent_abc123",
  "action": {
    "type": "database_query",
    "payload": { "query": "SELECT * FROM customers LIMIT 10" }
  },
  "context": {
    "orgId": "org_111",
    "workspaceId": "ws_222"
  }
}
```

---

## Approval workflow

When `gateStatus: REVIEW`:

1. Present the plan to the operator (show goal, risk, proof hash).
2. Wait for explicit `APPROVE` or `REJECT` from an authorized user.
3. Only proceed if `APPROVE` is received — store approval evidence.
4. Any `REJECT` halts execution permanently for that `actionId`.

Approval evidence is stored alongside the gate proof for full audit trail.

---

## Quota enforcement

| Exceeded | HTTP | Response |
|---|---|---|
| Monthly eval quota | 402 | `{ requiresUpgrade: true, tier: "free", upgradeUrl: "/pricing#dsg-gate" }` |
| Rate limit (per minute) | 429 | `{ error: "rate_limit_exceeded" }` |

Quota is checked **before** execution begins — the agent action is never attempted if quota is exceeded.

---

## Risk level → governance posture

| riskLevel | Gate behavior | Approval required | Hermes required |
|---|---|---|---|
| `low` | PASS auto-allowed with evidence | No | No |
| `medium` | PASS with audit; UNSUPPORTED → REVIEW | No (auto-allow with evidence per delegation gate) | No |
| `high` | Requires explicit user confirmation | Yes | Recommended |
| `critical` | Always blocked unless evidence + approval | Yes (mandatory) | Yes |

Source: `lib/spine/permission-gate.ts` — medium risk auto-allows with audit evidence; high/critical require user confirmation review.

---

## Health probes

```
GET /api/health           → public health check
GET /api/readiness        → readiness with DB check
GET /api/agent/status     → lightweight identity + DB connectivity
```

Use `/api/agent/status` to confirm deployed commit and environment before governed execution.
