# Hermes Controlled Executor — Reference

## What makes it different

Standard agent execution:
```
Plan → Execute
```

Hermes controlled execution:
```
Plan
  → planHash (immutable plan snapshot)
  → Conformance Check (plan hash must match)
  → Credential Grant (scoped lease, no raw secrets)
  → Controlled Execution (command whitelist + path isolation)
  → Evidence Capture (every step recorded)
```

This is **Zero Trust for AI Agents** — the execution environment trusts nothing,
verifies everything, and records proof at every step.

---

## Key source files

| File | Role |
|---|---|
| `lib/dsg/brain/plan-attempt.ts` | Immutable plan snapshot + deterministic `planHash` |
| `lib/dsg/brain/controlled-executor.ts` | Execution grants, credential leases, controlled context |
| `lib/dsg/brain/conformance-gate.ts` | Validates commands, file paths, plan hash, evidence |
| `lib/dsg/brain/credential-broker.ts` | Supabase-backed secret lookup + lease/fingerprint creation |
| `lib/dsg/brain/hermes-plugin.ts` | Orchestration: plan → credentials → execute → validate → evidence |

---

## Execution flow

### 1. Propose plan

```typescript
const plan = await hermes.proposePlan({
  goal: "Migrate customer records to new schema",
  steps: [...],
  agentId: "agent_abc123",
  orgId: "org_111"
});
// plan.planHash = sha256(JSON.stringify(plan)) — immutable
```

### 2. Gate the plan

```
POST /api/dsg/v1/gates/evaluate
{
  "agentId": "agent_abc123",
  "actionId": plan.planHash,
  "riskLevel": "high",
  "actionType": "schema_migration",
  "idempotencyKey": "ik_<uuid>",
  "nonce": "<nonce>"
}
```

Only proceed if `gateStatus: PASS` or operator-approved `REVIEW`.

### 3. Broker credentials

```typescript
const lease = await credentialBroker.getLease({
  secretName: "DATABASE_MIGRATION_KEY",
  planHash: plan.planHash,
  ttlSeconds: 300
});
// lease.fingerprint = redacted token reference — never the raw secret
```

The broker reads from `dsg_secrets` in Supabase.
Raw secrets are never exposed to the agent execution context.

### 4. Execute with conformance

```typescript
const result = await controlledExecutor.execute({
  plan,
  lease,
  allowedCommands: ["pg_dump", "psql", "node migrate.js"],
  allowedPaths: ["./migrations/", "./scripts/"],
  evidenceRequired: true
});
```

Every command is checked against `allowedCommands`.
Every file path is checked against `allowedPaths`.
If either check fails → `CONFORMANCE_BLOCK` — execution halts.

### 5. Capture evidence

After execution, Hermes captures:
- Executed commands + outputs
- Files written (within allowed paths only)
- Plan hash comparison (executed plan must match approved plan)
- Conformance result: `PASS` | `BLOCK` | `EVIDENCE_MISSING`

Evidence is committed via the runtime commit RPC and stored in Supabase.

---

## Conformance rules (hard)

| Rule | Consequence of violation |
|---|---|
| `planHash` must match approved plan | `CONFORMANCE_BLOCK` — halt |
| Every command must be whitelisted | `CONFORMANCE_BLOCK` — halt |
| Every changed path must be under allowed canonical path | `CONFORMANCE_BLOCK` — halt |
| Evidence is required | `EVIDENCE_MISSING` → `CONFORMANCE_BLOCK` |
| No raw secret exposure | `CREDENTIAL_LEAK` → emergency halt + alert |

**`proposePlan()` is currently a deterministic scaffold/placeholder** unless a current implementation proves live LLM integration. Do not claim live LLM planning without current evidence.

---

## Credential broker boundary

- Broker queries `dsg_secrets` in Supabase and returns scoped leases.
- Leases have TTL (default 300 seconds for execution window).
- `fingerprint` field is a redacted reference — never the raw secret value.
- Encryption metadata is stored with each secret; do not claim complete app-layer encryption or external vaulting without verified implementation.

---

## When to use Hermes vs direct execution

| Scenario | Use Hermes | Use direct |
|---|---|---|
| `riskLevel: high` or `critical` action | ✅ Required | ❌ |
| Action needs scoped database/API credentials | ✅ Required | ❌ |
| Multi-step plan with branching | ✅ Recommended | ❌ |
| Simple read-only query, `riskLevel: low` | Optional | ✅ |
| UI action with no external credential | Optional | ✅ |

Enterprise tier required for full Hermes executor access.
Pro tier: gate evaluate + proof only.
