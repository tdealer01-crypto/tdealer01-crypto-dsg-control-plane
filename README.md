# DSG ONE — AI Runtime Control Plane

DSG ONE is a governance control-plane project for AI, agent, workflow, finance, and deployment actions.

It routes governed actions through policy, entitlement, approval, deterministic gate checks, replay-protection inputs, proof metadata, and audit/evidence controls before execution claims are treated as safe.

This repository is public product and benchmark evidence. It is not, by itself, proof of completed production go-live, independent audit, certification, or guaranteed compliance.

## Source-of-truth documents

Use these files as the canonical truth boundary for this repository:

```text
docs/REPO_TRUTH.md
docs/RUNBOOK_DEPLOY.md
PROJECT_TRUTH.md
qa-logs/test-summary.md
qa-logs/go-live-evidence-2026-05-03.md
```

When README text conflicts with those files, prefer the newer verified evidence in the source-of-truth files and update this README.

## Current verified status

```text
Product identity: DSG ONE
Package name: dsg-platform
Repository mode: active
Default branch: main
Latest committed Vitest baseline: 185 passed, 3 skipped, 0 failed
Test files baseline: 62 passed, 1 skipped, 0 failed
Production-readiness gate: NOT CLOSED from committed evidence
Latest go-live evidence run: qa-logs/go-live-evidence-2026-05-03.md
Latest go-live decision: NO-GO / not closed
```

Interpretation:

- The repository has a real Next.js/Supabase/Vercel product stack, deterministic gate scaffold, governance routes, benchmark assets, tests, migrations, docs, and deployment runbooks.
- The committed unit/integration test baseline is green for the recorded run.
- Production go-live is a separate claim and is not closed until deployment Ready state, environment validation, Supabase applied-state proof, live smoke checks, authenticated operator checks, and live staging/E2E evidence are recorded.

## What this repository currently contains

### Product stack

```text
Next.js app router product surface
Supabase-backed runtime/control-plane data layer
Stripe billing integration hooks
Vercel deployment workflow and runbook
Governance, approval, audit, evidence, marketplace, and trust pages
Operator-facing dashboard and runtime routes
```

### Deterministic proof/gate scaffold

Backend routes present in the repository:

```text
GET  /api/dsg/v1/policies/manifest
POST /api/dsg/v1/proofs/prove
POST /api/dsg/v1/gates/evaluate
```

Current deterministic gate behavior includes:

```text
policyVersion
constraintSetHash
inputHash
proofHash
solver metadata
structured constraint results
structured failure reasons
replayProtection.nonce
replayProtection.idempotencyKey
replayProtection.requestHash
```

Important invariant:

```text
UNSUPPORTED is never PASS.
```

The gate API rejects missing replay-protection inputs:

```text
missing_nonce
missing_idempotency_key
```

Current solver boundary:

```text
solver.name: static_check
solver.version: dsg-deterministic-ts-0.0.0
externalSolverInvoked: false
```

This means the repository contains a DSG-native deterministic TypeScript static-check scaffold mapped from the Z3/formal logic work. Do not claim that an external Z3 solver is invoked in production unless newer code and evidence prove that path.

### Policy constraints used by the deterministic manifest

The current deterministic policy manifest checks these evidence keys:

```text
requirement_clear
tool_available
permission_granted
secret_bound
dependency_resolved
testable
deploy_target_ready
audit_hook_available
```

### Agent command gate

The repository includes an agent command gate library and API route for pre-action gating:

```text
lib/dsg/agent-command-gate.ts
app/api/dsg/agent-command-gate/route.ts
```

The gate evaluates command lock, agent identity binding, RBAC permission, approval proof, idempotency, rollback plan, audit hook binding, and evidence hook binding before allowing an agent action envelope.

Safe claim:

```text
DSG includes an in-repository agent command gate scaffold that can block, review, or allow agent actions based on locked command, RBAC, approval, idempotency, rollback, audit, and evidence invariants.
```

Do not claim a fully completed agent execution lifecycle unless the callback/result route and deployed persistence evidence are verified for the target environment.

## Kaggle/community benchmark materials

The repository includes community benchmark preparation assets under:

```text
benchmarks/kaggle-community/dsg_finance_governance_tasks.py
```

Current benchmark task areas:

```text
DSG-TASK-001 Payment Decision Control
DSG-TASK-002 Policy Compliance Detection
DSG-TASK-003 Audit Evidence Generation
```

Evidence boundary:

```text
These are author-provided benchmark preparation assets. They are not an independent third-party audit certification and are not an official Kaggle leaderboard result until saved as Kaggle tasks, collected into a Kaggle benchmark, and evaluated against supported Kaggle models.
```

## Marketplace action

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
The DOI artifact is the formal verification reference. Repository runtime SMT2 scripts and TypeScript static-check routes provide runtime invariant evidence/scaffold behavior, but they are not the same thing as an end-to-end formally verified SaaS deployment.
```

## Verification commands

Local repository checks:

```bash
npm install --ignore-scripts
npm test
npm run verify:deterministic
npm run ux:routes
npm run build
```

Benchmark/evidence commands:

```bash
npm run benchmark
npm run benchmark:gateway
npm run benchmark:kaggle:community
npm run benchmark:evidence
```

Deployment/runbook commands are documented in:

```text
docs/RUNBOOK_DEPLOY.md
```

Do not use local test success alone as proof of production readiness.

## Live API check example

```bash
curl -s -X POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/dsg/v1/gates/evaluate \
  -H "content-type: application/json" \
  -H "x-dsg-nonce: test-nonce-001" \
  -H "idempotency-key: idem-001" \
  -d '{"planId":"PLAN-Z3-001","riskLevel":"high","context":{"requirement_clear":true,"tool_available":true,"permission_granted":true,"secret_bound":true,"dependency_resolved":true,"testable":true,"deploy_target_ready":true,"audit_hook_available":true}}'
```

Expected successful shape includes a deterministic gate decision payload with `gateStatus`, `proofStatus`, `riskLevel`, `proof`, replay-protection fields, and a boundary stating that this route does not invoke an external Z3 solver.

## Safe claim rules

Allowed wording when supported by current repo evidence:

```text
evidence-ready
audit-ready
governance-enabling
compliance-enabling
aligned workflow
benchmarked
deterministic proof/gate scaffold
live deterministic proof/gate scaffold
DSG-native TypeScript static-check gate scaffold
```

Do not claim unless newer independent evidence proves it:

```text
certified
guaranteed compliant
third-party audited
NIST certified
ISO certified
enterprise-ready proof system
external Z3 solver invoked in production
WORM evidence storage complete
real Ed25519/ECDSA signing complete
JWT/JWKS auth complete
full production go-live complete
better than every listed vendor
```

## Deployment truth boundary

Runbook evidence is still required for:

```text
Vercel production deployment Ready state
production environment variable validation
Supabase migrations applied on the target environment
/api/health production smoke check
authenticated operator checks
live staging/E2E validation
```

Current committed go-live evidence does not close those requirements.

## Practical product boundary

DSG ONE is a production-oriented governance product stack with a marketplace action, compliance pages, control templates, approval workflow, evidence export, consult toolkit, trust scaffold, benchmark assets, and live deterministic proof/gate scaffold.

It is not externally validated at enterprise-trust level until real customer deployments, case studies, partner references, independent reviews, or formal certifications are completed and recorded.
