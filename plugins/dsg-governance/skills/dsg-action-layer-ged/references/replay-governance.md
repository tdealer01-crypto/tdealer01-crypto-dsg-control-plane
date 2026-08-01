# Replayable Governance — Reference

## Why replayability matters

Most AI systems:
```
AI decides → done
```

DSG system:
```
AI decides
  → store proof (proofHash)
  → store evidence (evidenceBundle)
  → store policy version (policyVersion)
  → store input hash (inputHash)
  → Replay possible at any future date
```

This answers the enterprise audit question:
> "Why did the AI decide X six months ago?"

Analogous to: financial transaction ledger, aviation black box, clinical trial audit trail.

---

## What is stored per evaluation

| Field | What it enables |
|---|---|
| `proofHash` | Prove the exact proof output was produced |
| `inputHash` | Prove the exact inputs that led to the decision |
| `constraintSetHash` | Prove which policy constraints were active |
| `policyVersion` | Pin the exact policy that was in effect |
| `timestamp` | Temporal ordering for audit |
| `gateStatus` | The actual decision: PASS / BLOCK / REVIEW |
| `orgId` + `agentId` | Scoping for multi-tenant replay |

---

## Replay proof endpoint

```
POST /api/dsg/v1/proofs/prove
Authorization: Bearer <DSG_API_KEY>
Content-Type: application/json
```

```json
{
  "proofHash": "sha256:abc123...",
  "policyVersion": "v2.1.0",
  "constraintSetHash": "sha256:def456...",
  "inputHash": "sha256:ghi789...",
  "agentId": "agent_abc123",
  "context": { "orgId": "org_111" }
}
```

Returns whether the original proof is reproducible and whether the decision
matches the stored gate status.

---

## Replay requirements

For a decision to be fully replayable:

1. **proofHash** must be stored (from the original gate evaluation response).
2. **policyVersion** must be known (from `GET /api/dsg/v1/policies/manifest` at time of evaluation).
3. **inputHash** must match the original inputs.
4. **constraintSetHash** must match the policy that was active.

If any of these four are missing, replay is degraded:
- Missing policyVersion → `REVIEW` posture (cannot guarantee same constraints)
- Missing proofHash → `BLOCK` posture (cannot verify original decision)

---

## Policy version consistency

When calling the gate:
- Always read `GET /api/dsg/v1/policies/manifest` first to get the current `policyVersion`.
- Store `policyVersion` alongside every gate result.
- If the policy version changes mid-session, re-evaluate all pending actions.

A stale `policyVersion` means the replay will compare against a different constraint set — flag this as `REVIEW` in audit output.

---

## Evidence chain for audit

The runtime spine commit RPC stores:
- `runtime_intent_id` — the unique governed intent
- `proof` — the full proof object
- `pipeline_trace` — step-by-step execution trace
- `ledger_sequence` — sequential truth ordering

Query the Supabase `runtime_evidence` table for audit export.
Include `runtime_intent_id` in every API response to your users so they can reference it in support/compliance tickets.

---

## Compliance use cases

| Regulation | How replayability helps |
|---|---|
| EU AI Act Art. 9 | Show documented risk assessment decisions with cryptographic proof |
| SOC 2 Type II | Continuous evidence of access control decisions over the audit period |
| ISO 27001 | Traceable policy decisions for incident investigation |
| NIST AI RMF | Decision rationale documentation with audit trail |
| Financial regulators | Same-input / same-output deterministic record |
