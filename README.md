# DSG AI Action Governance Gateway

DSG is a deterministic governance gateway for high-risk AI, agent, workflow, finance, and deployment actions.

It routes risky actions through policy, invariant, entitlement, approval, connector, and audit-proof controls before those actions affect production systems.

## Current status — 2026-05-01

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

Important current boundary:

```text
The latest main branch contains Phase 5 trust routes, but the latest production redeploy was blocked by the Vercel free-plan deployment limit:

Resource is limited - try again in 24 hours
more than 100 api-deployments-free-per-day
```

Correct status:

```text
main branch: updated
local UX route verifier: passed
production redeploy of latest Phase 5 routes: blocked by Vercel quota until reset
```

Do not claim the latest Phase 5 routes are live until `npx vercel --prod` succeeds after quota reset.

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
The current ux:routes verifier confirms core governance UX flows. Phase 5 trust routes must be added to the verifier before claiming full Phase 5 UX coverage.
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
```

Phase 5 trust routes now in main branch:

```text
/trust
/reproducibility
/security-review
```

These Phase 5 routes require a successful production redeploy before they can be treated as live on Vercel.

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

Main route in main branch:

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

Routes added to main:

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
Trust infrastructure exists in main. Real external validation still requires customer pilots, case studies, partner deployments, outside reviews, or formal certification if pursued.
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

After Vercel quota resets:

```bash
git pull origin main
npm run ux:routes
npx vercel --prod
```

If Vercel returns the free-plan limit error again, do not retry repeatedly. Wait for quota reset or use a paid/approved deployment path.

## Current product boundary

DSG is now a production-oriented governance product stack with marketplace action, compliance pages, control templates, approval workflow, evidence export, consult toolkit, and trust scaffold.

It is not yet externally validated at enterprise-trust level until real customer deployments, case studies, partner references, independent reviews, or formal certifications are completed.
