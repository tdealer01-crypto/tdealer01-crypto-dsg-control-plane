# DSG Z3 Deterministic Backend Mapping

Purpose: map the uploaded `z3-logic-deterministic.zip` into the existing DSG backend as a controlled deterministic proof and gate module.

## Integration position

```text
Agent / Operator Action
→ DSG Intake & Validation
→ DSG Policy Engine
→ DSG Deterministic Proof Engine
→ DSG Gate Decision
→ DSG Execution Orchestrator
→ DSG Audit Ledger / Evidence Export
```

## What was added

```text
lib/dsg/deterministic/types.ts
lib/dsg/deterministic/proof-hash.ts
lib/dsg/deterministic/proof-engine.ts
lib/dsg/deterministic/gate-engine.ts
app/api/dsg/v1/proofs/prove/route.ts
app/api/dsg/v1/gates/evaluate/route.ts
```

## API routes

Create a deterministic proof:

```text
POST /api/dsg/v1/proofs/prove
```

Evaluate a deterministic gate:

```text
POST /api/dsg/v1/gates/evaluate
```

## Example request

```bash
curl -X POST https://your-domain.example.com/api/dsg/v1/gates/evaluate \
  -H "content-type: application/json" \
  -d '{
    "planId": "PLAN-Z3-001",
    "riskLevel": "high",
    "context": {
      "requirement_clear": true,
      "tool_available": true,
      "permission_granted": true,
      "secret_bound": true,
      "dependency_resolved": true,
      "testable": true,
      "deploy_target_ready": true,
      "audit_hook_available": true
    }
  }'
```

Expected pass result:

```text
gateStatus: PASS
proofStatus: PASS
proofHash: present
inputHash: present
constraintSetHash: present
```

## Critical invariant

```text
UNSUPPORTED is never PASS.
```

## Boundary

This is a DSG-native TypeScript static-check adapter mapped from the uploaded Z3 module. It does not invoke an external Z3 solver yet.

Do not claim:

```text
external Z3 solver invoked
enterprise-ready proof system
third-party certified evidence system
```

Allowed wording:

```text
DSG has a deterministic proof/gate backend scaffold mapped from the Z3 module, with proofHash, inputHash, constraintSetHash, structured failures, and gate decision API.
```

## Production hardening still required

```text
real Ed25519/ECDSA signing
Postgres append-only or WORM evidence storage
policy manifest storage
actual solver adapter and solver version detection
JWT/JWKS auth
replay protection with nonce/requestHash/idempotency key
CI gates for lint/typecheck/unit/API/chain verification
```
