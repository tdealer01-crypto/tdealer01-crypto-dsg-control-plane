# DSG Unified Product Architecture RFC v1.0

**Status:** Draft (working baseline)  
**Date:** 2026-03-31 (UTC)  
**Scope:** `tdealer01-crypto-dsg-control-plane` runtime alignment with unified DSG product boundary

## 1. Purpose
This RFC translates the unified DSG product architecture into normative implementation language (`MUST` / `SHOULD` / `MAY`) so runtime and control-plane work can be audited against one contract.

## 2. Product Boundary
The DSG Unified Runtime MUST contain these planes inside one product boundary:
1. Ingress Plane
2. Decision Plane (Gate + Arbiter)
3. Ordering Plane
4. Execution Plane
5. State Plane
6. Operator Plane

All operator-facing truth MUST read from the runtime spine (ordered log + approval + effect + checkpoint/state lineage).

## 3. Canonical Runtime State
The state model MUST remain deterministic and explicit:

\[
S_t = \{V_t, T_t, G_t, I_t\}
\]

Decision output MUST be restricted to:
- `ALLOW`
- `STABILIZE`
- `BLOCK`

## 4. Decision Contract
The runtime decision envelope MUST include at minimum:
- epoch
- sequence
- agent_id
- action
- input_hash
- prev_state_hash
- invariant_set_hash (or pinned runtime equivalent)
- decision
- reason_code
- logical_timestamp

`decision_hash` MUST be computed from canonical serialization.

`decision_proof_hash` SHOULD be emitted whenever a proof artifact exists.

## 5. Hard Constraints
The gate MUST enforce hard constraints before any effect:
1. Temporal monotonicity
2. Spatiotemporal velocity bound
3. Network identity boundary
4. Invariant validity

If hard constraints fail, decision MUST be `BLOCK`.

If hard constraints pass but stability bound is exceeded, decision MUST be `STABILIZE`.

## 6. Approval and Anti-Replay
Approval model MUST enforce one-time-use semantics across:
- `request_id`
- `approval_id`
- `input_hash`
- `action`
- `epoch`
- time window (`approved_at`, `expires_at`)

Verifier MUST reject replay in all of these cases:
- consumed approval/request
- payload hash mismatch
- action mismatch
- expired approval
- stale or invalid executor identity/fencing condition

## 7. Exactly-Once Effect Execution
`effect_id` MUST be deterministic:

\[
effect\_id = H(epoch, sequence, action, payload\_hash)
\]

Runtime MUST journal effect lifecycle (`started` -> `committed|failed|reconciled`) and prevent duplicate commits for same `(org_id, effect_id)`.

## 8. Truth Spine Stores
The unified runtime MUST provide and treat as truth:
1. Global ordered log / ledger
2. Approval store
3. Effect journal
4. Checkpoint + canonical state store

Local cache/state MAY exist for performance, but MUST NOT be final truth.

## 9. Drift Detection and Recovery
When cross-region state hash diverges, runtime MUST:
1. Mark drift event
2. Resolve as `STABILIZE`
3. Freeze forward commit
4. Replay from trusted checkpoint + ordered log
5. Resume only after hash match

## 10. Observability and Control Plane
Control plane MUST expose at least:
- request timeline
- decision timeline
- approval usage
- executor/lease status
- effect journal
- state hash by region
- drift events
- replay reports
- checkpoint health
- epoch rollout state

Golden signals SHOULD include:
- decision latency
- approval issue-to-use latency
- effect commit latency
- replay recovery latency
- state hash mismatch count
- expired approvals count
- replay blocks count
- fencing rejects count

## 11. Formal-Core Boundary (Verified vs Pending)
Verified from uploaded artifact and accepted baseline:
- determinism theorem
- safety invariance theorem
- constant-time bound
- SMT-LIB v2 + Z3 re-checkability

This RFC MUST NOT claim full runtime formal verification unless runtime proof linkage is explicitly enforced in code and storage.

## 12. 30 / 60 / 90 Delivery Plan
### 0-30 days (MUST)
- Normalize decision envelope fields across `/api/intent`, `/api/execute`, MCP call path.
- Add explicit `decision_hash` persistence and query surface in runtime APIs.
- Ensure schema bootstrap docs include runtime spine tables.

### 31-60 days (SHOULD)
- Add arbiter result envelope and conflict policy (`BLOCK` vs `STABILIZE`) into persisted decision metadata.
- Add drift replay report API with deterministic hash comparison output.

### 61-90 days (SHOULD)
- Add cross-region designated-executor lease/fencing evidence to effect journal schema.
- Add control-plane integrity panel for hash attestation lineage (core spec hash + arbiter hash + runtime build hash).

## 13. Non-Goals
This RFC does not redefine business pricing/billing semantics or UI branding. It focuses on deterministic runtime, truth spine integrity, and operator-auditable evidence.
