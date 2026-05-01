# DSG AI Action Governance Gateway

DSG is a deterministic governance gateway for high-risk AI, agent, workflow, finance, and deployment actions.

It routes risky actions through policy, invariant, entitlement, approval, connector, and audit-proof controls before those actions affect production systems.

## Current status — 2026-05-02

### Repository status

The `main` branch currently includes the Phase 1–5 product foundation:

```text
Phase 1 — Compliance Mapping Pack: complete
Phase 2 — Compliance Landing / Evidence Pages: complete
Phase 3 — Consult / Audit Toolkit: operational
Phase 4 — Product Hardening Foundation: operational
Phase 5 — Trust / External Validation Scaffold: added to main
Phase 6 — Market Segment Packaging: documented
```

### Production deployment status

Current production URL:

```text
https://tdealer01-crypto-dsg-control-plane.vercel.app
```

Current status:

```text
main branch: updated
local UX route verifier: passed
production redeploy: completed after prior Vercel quota block
```

User-provided live route checks after redeploy:

```text
/consult       HTTP/2 200
/evidence-pack HTTP/2 200
```

Phase 5 trust routes are now in `main` and should be verified after deploy with:

```bash
curl -I https://tdealer01-crypto-dsg-control-plane.vercel.app/trust
curl -I https://tdealer01-crypto-dsg-control-plane.vercel.app/reproducibility
curl -I https://tdealer01-crypto-dsg-control-plane.vercel.app/security-review
```

Do not claim independent external validation or certification. Phase 5 currently provides trust infrastructure, reproducibility structure, and review boundaries; real external validation still requires customer pilots, case studies, partner deployments, outside reviews, or formal certification if pursued.

## Latest verified local UX result

Command:

```bash
npm run ux:routes
```

Observed:

```text
ok: true
failures: []
routeChecks: 12
flowOutcomeChecks: 3
userOutcome: All audited DSG flows expose user benefit, real action, evidence, and tangible output.
```

Verified flow outcomes:

```text
controls → evidence
approval decision
signed evidence bundle
```

Verifier boundary:

```text
The current ux:routes verifier confirms core governance UX flows. Phase 5 trust routes should be added to the verifier before claiming full Phase 5 UX coverage.
```

## Live / expected product routes

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

Phase 5 trust routes in main:

```text
/trust
/reproducibility
/security-review
```

## Published GitHub Marketplace Action

Marketplace listing:

```text
https://github.com/marketplace/actions/dsg-secure-deploy-gate
```

Release:

```text
https://github.com/tdealer01-crypto/dsg-secure-deploy-gate-action/releases/tag/v1.0.2
```

Usage:

```yaml
- name: DSG Secure Deploy Gate
  uses: tdealer01-crypto/dsg-secure-deploy-gate-action@v1.0.2
```

Boundary:

```text
This Action provides a deterministic deployment gate. It does not claim independent third-party certification.
```

## Published formal verification artifact

```text
DOI: https://doi.org/10.5281/zenodo.18225586
Title: Deterministic State Gate (DSG): Formally Verified Control Primitive for Safety-Critical AI Systems
```

Boundary:

```text
The DOI artifact is the formal verification reference. Repository runtime SMT2 scripts provide deterministic SMT-LIB-compatible runtime invariant evidence, but they are not the same artifact as the DOI publication.
```

## Z3 deterministic module status

The uploaded `z3-logic-deterministic.zip` contains a standalone FastAPI + UI proof-of-concept with:

```text
backend/z3_engine.py
backend/policy_engine.py
backend/audit_ledger.py
backend/main.py
backend/test_deterministic.py
ui/Z3Dashboard.tsx
ui/PlanGate.tsx
ui/AuditLedgerViewer.tsx
ui/RuntimeMonitor.tsx
ui/types.ts
```

Recommended DSG integration role:

```text
Deterministic Gate + Proof + Audit Module
```

Correct integration position:

```text
Agent / Operator Action
→ DSG Intake & Validation
→ DSG Policy Engine
→ Z3 Deterministic Proof Engine
→ DSG Gate Decision
→ DSG Execution Orchestrator
→ DSG Audit Ledger / Evidence Export
```

Integration boundary:

```text
Can map into DSG now: yes
Can run as production evidence system immediately: not yet
Best current role: deterministic proof module candidate
```

Required production fixes before calling the Z3 module enterprise-ready:

```text
real Ed25519/ECDSA signing instead of placeholder signing
Postgres append-only or WORM-backed evidence storage
structured failureReasons
proofHash naming instead of z3ProofHash/hashChain
actual solver version detection
policy version and constraintSetHash in every proof
JWT/JWKS auth
replay protection with nonce/requestHash/idempotency key
CI gates for lint/typecheck/unit/API/chain verification
```

## Core capabilities

DSG currently provides:

```text
Deterministic AI/tool action governance
Gateway Mode connector execution
Monitor Mode customer-runtime audit flow
Approval queue and approve/reject workflow
requestHash and recordHash audit proof
Signed/hash evidence bundle export
Control template library
Compliance positioning pages
Consult and audit-readiness toolkit
Production evidence pages
GitHub Marketplace deployment gate
Public vendor baseline comparison
UX route and flow outcome verifier
Trust scaffold for Phase 5 external validation
Market segment packaging docs
```

## Evidence and benchmark status

Latest production gateway benchmark previously observed:

```text
pass: true
total: 6
passed: 6
failed: 0
passRate: 100%
avgLatencyMs: 2047
minLatencyMs: 1029
maxLatencyMs: 4254
```

Latest evidence summary:

```text
DSG Full Evidence Benchmark: PASS
Production Gateway Benchmark: 6/6 passed, 100%
SMT2 Runtime Invariants: 6/6 passed, 100%
Comparison Rubric: 190/200, 95%
Public Vendor Baseline: pass=true, publicDocVendors=5, vendorRuntimeTested=0
```

Evidence boundary:

```text
These are internal production and repository evidence results for product validation. They are not independent third-party certification. Vendor runtime benchmark results are not claimed unless vendor endpoints are configured and tested with the same suite.
```

## Core modes

### Gateway Mode

DSG executes a configured connector after policy, risk, approval, entitlement, and invariant checks pass.

```text
Agent / workflow
→ POST /api/gateway/tools/execute
→ DSG checks policy / risk / entitlement / approval / invariants
→ DSG executes configured connector
→ DSG returns provider result + audit proof
```

Core routes:

```text
POST /api/gateway/connectors
POST /api/gateway/tools/execute
GET  /api/gateway/webhook/inbox
POST /api/gateway/webhook/inbox
```

Expected successful result:

```text
HTTP 200
ok: true
decision: allow
requestHash: present
recordHash: present
```

### Monitor Mode

Customer keeps execution inside their own runtime while DSG supplies governance decision and audit evidence.

```text
Customer agent/tool runtime
→ POST /api/gateway/plan-check
→ DSG returns allow/block/review + auditToken + requestHash
→ customer executes own tool
→ POST /api/gateway/audit/commit
→ DSG writes recordHash
→ export evidence
```

Core routes:

```text
POST /api/gateway/plan-check
POST /api/gateway/audit/commit
GET  /api/gateway/audit/events
GET  /api/gateway/audit/export
GET  /api/gateway/evidence/bundle?orgId=org-smoke
GET  /gateway/monitor?orgId=org-smoke
```

## Approval workflow

Approval route:

```text
/approvals?orgId=org-smoke
```

API:

```text
GET  /api/gateway/approvals?orgId=org-smoke
POST /api/gateway/approvals
```

User outcome:

```text
Reviewer can approve or reject a review-required action.
Approval API records approvalHash and redirects with lastDecision.
```

Boundary:

```text
Approval queue decisions are DSG-generated workflow evidence. They are not independent certification or guaranteed compliance.
```

## Signed/hash evidence bundle

Endpoint:

```text
GET /api/gateway/evidence/bundle?orgId=org-smoke
```

Bundle contents:

```text
bundleHash
eventHashes
signature metadata
orgId
auditToken
events
evidenceBoundary
```

Signing behavior:

```text
If DSG_EVIDENCE_SIGNING_SECRET is configured: hmac-sha256 signature
If no signing secret is configured: hash-only signature metadata
```

## Consult / audit toolkit

Main route:

```text
/consult
```

Consult artifacts:

```text
docs/consult-toolkit/README.md
docs/consult-toolkit/client-intake-questionnaire.md
docs/consult-toolkit/ai-workflow-inventory-template.md
docs/consult-toolkit/risk-classification-checklist.md
docs/consult-toolkit/client-report-template.md
docs/consult-toolkit/implementation-playbook.md
docs/consult-toolkit/consult-sales-one-pager.md
docs/consult-toolkit/audit-readiness-checklist.md
```

User outcome:

```text
Consultants and buyers can run a repeatable AI governance readiness review, map controls, export evidence, and produce a client-facing readiness report.
```

Boundary:

```text
The toolkit supports readiness and implementation workflows. It is not a legal opinion, independent audit, or certification report.
```

## Phase 5 trust scaffold

Routes:

```text
/trust
/reproducibility
/security-review
```

Purpose:

```text
Organize buyer trust assets, reproducibility steps, and review boundaries for external validation growth.
```

Current Phase 5 boundary:

```text
Trust infrastructure exists. Real external validation still requires customer pilots, case studies, partner deployments, outside reviews, or formal certification if pursued.
```

## Market segment packaging

Documentation:

```text
docs/market-segments/segment-packaging.md
docs/trust/roadmap.md
```

Primary segments:

```text
Enterprise AI Governance
Compliance Consulting
DevSecOps / CI-CD Governance
SaaS Governance Platform
```

## UX working rules

Documentation:

```text
docs/UX_WORKING_RULES.md
```

Definition of done:

```text
Every user-facing flow must answer:
1. What benefit does the user get?
2. Where does the user click or what command/API does the user run?
3. What evidence proves the flow worked?
4. Where is the tangible output?
```

Verification:

```bash
npm run ux:routes
```

Output:

```text
artifacts/ux-route-map/ux-route-map-result.json
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
```

Do not claim unless independently verified:

```text
certified
guaranteed compliant
third-party audited
NIST certified
ISO certified
better than every listed vendor
```

## Deployment commands

```bash
git pull origin main
npm run ux:routes
npx vercel --prod
```

If Vercel returns a free-plan limit error, do not retry repeatedly. Wait for quota reset or use a paid/approved deployment path.

## Current product boundary

DSG is now a production-oriented governance product stack with marketplace action, compliance pages, control templates, approval workflow, evidence export, consult toolkit, and trust scaffold.

It is not yet externally validated at enterprise-trust level until real customer deployments, case studies, partner references, independent reviews, or formal certifications are completed.
