# DSG Control Plane → NIST AI RMF Mapping (Evidence-Oriented)

> **Status:** Mapping document for enterprise review and audit readiness.
> **Important:** This is not a certification. It is verifiable implementation evidence.

## Scope

This document maps implemented control-plane capabilities to NIST AI RMF core functions:

- **GOVERN**
- **MAP**
- **MEASURE**
- **MANAGE**

Primary technical evidence in this repository:

- Formal solver artifact: `artifacts/formal/dsg_gate_proof.smt2`
- Reproducible verifier: `artifacts/formal/verify.sh`
- Runtime authorization and route roles: `lib/authz.ts`, `lib/runtime/permissions.ts`
- Runtime commit path: `supabase/migrations/20260331_runtime_spine_rpc.sql`, `app/api/execute/route.ts`
- Callback org scoping and reconciliation: `app/api/effect-callback/route.ts`, `lib/runtime/reconcile.ts`

---

## Mapping Matrix

| NIST AI RMF Function | Control Objective | DSG Control-Plane Evidence | Verifiable Method |
|---|---|---|---|
| **GOVERN** | Role/accountability boundaries for AI operations | Runtime RBAC enforcement via `requireOrgRole` + `RuntimeRouteRoles` | Review route handlers and role map; execute role-based route tests |
| **GOVERN** | Traceability of runtime decisions | `runtime_commit_execution` writes execution + ledger + audit + usage evidence | Inspect RPC SQL and replay execution logs |
| **MAP** | Context capture for decisions | Canonicalized payload/context and approval-key linkage before execution | Inspect `canonical.ts`, approval flow, and request metadata |
| **MEASURE** | Reproducible safety logic evidence | SMT-LIB proof artifact + one-click Z3 script | Run `./artifacts/formal/verify.sh` and confirm `sat` |
| **MEASURE** | Operational observability | `/api/core/monitor` aggregates core, determinism, and billing posture | Call monitor endpoint with authorized roles |
| **MANAGE** | Policy-governed execution and anti-replay | Approval request must be pending; consumed/expired state transitions enforced | Exercise `/api/intent` → `/api/execute` and replay behavior |
| **MANAGE** | Cross-tenant isolation in callbacks | `effect_id` reconciliation is scoped by `org_id` | Attempt cross-org callback and verify denial/not-found |

---

## Buyer/Auditor Notes

1. **Not a certification:** This mapping provides implementation evidence aligned to RMF concepts.
2. **Independent reproducibility:** The formal artifact is solver-checkable by third parties with Z3.
3. **Transaction integrity intent:** Execution/audit/usage writes are designed to be committed through the runtime RPC path.
4. **Multi-repo system caveat:** Formal gate proof verifies gate logic scope, not every full product integration path.

