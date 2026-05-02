# DSG AI Action Governance Gateway

DSG is a deterministic governance gateway for AI, agent, workflow, finance, and deployment actions.

It routes governed actions through policy, entitlement, approval, deterministic proof, and audit controls before production execution.

## Current status — 2026-05-02

### Repository status

```text
Phase 1 — Compliance Mapping Pack: complete
Phase 2 — Compliance Landing / Evidence Pages: complete
Phase 3 — Consult / Audit Toolkit: operational
Phase 4 — Product Hardening Foundation: operational
Phase 5 — Trust / External Validation Scaffold: added to main
Phase 6 — Market Segment Packaging: documented
Z3 / deterministic proof backend scaffold: merged to main
Deterministic hardening follow-up: merged to main
```

Merged deterministic PRs:

```text
#458 — Map Z3 deterministic proof module into DSG backend
#459 — Complete deterministic module hardening follow-up
```

### Production deployment status

Production URL:

```text
https://tdealer01-crypto-dsg-control-plane.vercel.app
```

Latest observed deployment after #459:

```text
Production: https://tdealer01-crypto-dsg-control-plane-elul4vwfh.vercel.app
Aliased: https://tdealer01-crypto-dsg-control-plane.vercel.app
```

Observed production API evidence:

```text
GET  /api/dsg/v1/policies/manifest  HTTP/2 200
POST /api/dsg/v1/gates/evaluate     ok=true, gateStatus=PASS, proofStatus=PASS
```

Observed deterministic gate proof fields:

```text
proofHash: present
inputHash: present
constraintSetHash: present
policyVersion: 1.0
solver.name: static_check
replayProtection.nonce: present
replayProtection.idempotencyKey: present
replayProtection.requestHash: present
constraintsChecked: 8
all tested constraints passed: true
```

Current live claim:

```text
DSG production exposes a live deterministic proof/gate scaffold with policyVersion, constraintSetHash, proofHash, structured constraints, and replay-protection evidence.
```

## Deterministic proof / Z3 mapping

The uploaded `z3-logic-deterministic.zip` was mapped into the existing DSG backend as a DSG-native deterministic proof and gate scaffold. The standalone FastAPI app was not imported directly.

Backend routes in main and production:

```text
POST /api/dsg/v1/proofs/prove
POST /api/dsg/v1/gates/evaluate
GET  /api/dsg/v1/policies/manifest
```

Verifier command in main:

```bash
npm run verify:deterministic
```

Verifier output:

```text
artifacts/deterministic-module/verification-result.json
```

Deterministic proof output includes:

```text
proofHash
inputHash
constraintSetHash
policyVersion
solver metadata
structured failureReasons
replayProtection.nonce
replayProtection.idempotencyKey
replayProtection.requestHash
```

Critical invariant:

```text
UNSUPPORTED is never PASS.
```

Proof/gate APIs reject missing replay-protection inputs:

```text
missing_nonce
missing_idempotency_key
```

Allowed claim:

```text
DSG has a live deterministic proof/gate backend scaffold mapped from the Z3 module, with proofHash, inputHash, constraintSetHash, policyVersion, structured failures, replay-protection fields, and a verification script.
```

Do not claim yet:

```text
external Z3 solver invoked in production
enterprise-ready proof system
third-party certified evidence system
JWT/JWKS auth complete
WORM evidence storage complete
real Ed25519/ECDSA signing complete
```

## Product routes

Core routes:

```text
/ai-compliance
/iso-42001
/nist-ai-rmf
/evidence-pack
/controls
/approvals?orgId=org-smoke
/gateway/monitor?orgId=org-smoke
/marketplace
/marketplace/production-evidence
/consult
```

Trust routes:

```text
/trust
/reproducibility
/security-review
```

Deterministic backend routes:

```text
/api/dsg/v1/policies/manifest
/api/dsg/v1/proofs/prove
/api/dsg/v1/gates/evaluate
```

## Marketplace Action

```text
https://github.com/marketplace/actions/dsg-secure-deploy-gate
https://github.com/tdealer01-crypto/dsg-secure-deploy-gate-action/releases/tag/v1.0.2
```

Usage:

```yaml
- name: DSG Secure Deploy Gate
  uses: tdealer01-crypto/dsg-secure-deploy-gate-action@v1.0.2
```

## Formal verification artifact

```text
DOI: https://doi.org/10.5281/zenodo.18225586
Title: Deterministic State Gate (DSG): Formally Verified Control Primitive for Safety-Critical AI Systems
```

Boundary:

```text
The DOI artifact is the formal verification reference. Repository runtime SMT2 scripts provide deterministic SMT-LIB-compatible runtime invariant evidence, but they are not the same artifact as the DOI publication.
```

## Verification commands

```bash
git pull origin main
npm install --ignore-scripts
npm run verify:deterministic
npm run ux:routes
npm run build
npx vercel --prod
```

Live API checks:

```bash
curl -I https://tdealer01-crypto-dsg-control-plane.vercel.app/api/dsg/v1/policies/manifest

curl -s -X POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/dsg/v1/gates/evaluate \
  -H "content-type: application/json" \
  -H "x-dsg-nonce: test-nonce-001" \
  -H "idempotency-key: idem-001" \
  -d '{"planId":"PLAN-Z3-001","riskLevel":"high","context":{"requirement_clear":true,"tool_available":true,"permission_granted":true,"secret_bound":true,"dependency_resolved":true,"testable":true,"deploy_target_ready":true,"audit_hook_available":true}}'
```

## Safe claim rules

Allowed wording:

```text
evidence-ready
audit-ready
governance-enabling
compliance-enabling
aligned workflow
benchmarked
deterministic proof/gate scaffold
live deterministic proof/gate scaffold
```

Do not claim unless independently verified:

```text
certified
guaranteed compliant
third-party audited
NIST certified
ISO certified
external Z3 solver invoked in production
better than every listed vendor
```

## Current product boundary

DSG is a production-oriented governance product stack with marketplace action, compliance pages, control templates, approval workflow, evidence export, consult toolkit, trust scaffold, and live deterministic proof/gate backend scaffold.

It is not externally validated at enterprise-trust level until real customer deployments, case studies, partner references, independent reviews, or formal certifications are completed.
