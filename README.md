# DSG ONE — ProofGate Runtime Control Plane

> **Govern AI, agent, workflow, finance, and deployment actions before they touch production.**

DSG ONE is a runtime control plane for governed actions. It routes high-risk requests through policy, entitlement, approval, deterministic gate checks, replay-protection inputs, proof metadata, and audit/evidence controls before execution or production-readiness claims are treated as safe.

This repository is a public product, implementation, and benchmark-evidence workspace. It is **not** by itself proof of completed production go-live, independent audit, certification, or guaranteed compliance.

---

## What customers see first

| Surface | Path | User value |
|---|---:|---|
| ProofGate product story | `/proofgate` | Understand what DSG does, what it blocks/reviews/allows, and why the proof layer matters. |
| Enterprise setup | `/enterprise-ready` | Start from the customer’s existing stack without a migration-first rollout. |
| Integration quickstart | `/dashboard/integrations` | Copy commands to register one integration, attach one webhook, execute one governed action, and review evidence. |
| Customer monitor | `/gateway/monitor` | See latest action status, decision, risk, evidence state, hashes, export path, and next command. |
| Public command assistant | Floating chat widget | Ask before login; jump to ProofGate, setup, connect, monitor, demo, and access paths. |
| Evidence / approvals | `/evidence-pack`, `/approvals` | Export proof and approve/reject review-required actions. |

### Customer questions the UI must answer

```text
1. What does DSG do?
2. What can it connect to?
3. Was this action allowed, sent to review, or blocked?
4. Why did DSG make that decision?
5. What evidence can I export?
6. What exact command or page should I use next?
```

---

## Product flow

```text
Customer system
  -> REST / Webhook / Zapier / Make / n8n / Workato / GitHub / Vercel / CSV / SFTP
  -> DSG ProofGate
  -> policy + entitlement + risk + replay checks
  -> PASS / REVIEW / BLOCK / UNSUPPORTED
  -> approval route if needed
  -> audit token + request hash + decision hash + record hash
  -> evidence export
  -> rollout decision
```

The first customer outcome is deliberately small and measurable:

```text
one existing system -> one governed action -> one evidence trail -> one expansion decision
```

---

## Visual system

DSG ONE now uses one product language across public pages, monitor, integration setup, docs, and command chat.

| Color | Meaning |
|---|---|
| **Red** | risk, block, exception, urgent control |
| **Gold** | proof, evidence, buyer trust, primary call to action |
| **Blue Sapphire** | enterprise infrastructure, runtime gateway, technical confidence |
| **Black** | command-center surface |

Brand layer:

```text
app/dsg-brand.css
app/layout.tsx
components/GlobalNav.tsx
```

---

## Repository stack

```text
Next.js App Router
Supabase data/auth/runtime state
Stripe billing hooks
Vercel deployment workflow
DSG deterministic proof/gate scaffold
Governance, approval, monitor, evidence, marketplace, trust, and compliance surfaces
Public command assistant and operator dashboard
```

Package identity:

```text
name: dsg-platform
framework: Next.js 15
runtime: React 18
```

---

## Deterministic proof/gate scaffold

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

This means the repository contains a DSG-native deterministic TypeScript static-check scaffold mapped from the Z3/formal-logic work. Do not claim that an external Z3 solver is invoked in production unless newer code and evidence prove that path.

---

## Policy constraints in the deterministic manifest

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

---

## Agent command gate

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

Do not claim a fully completed agent execution lifecycle unless callback/result routes and deployed persistence evidence are verified for the target environment.

---

## Quick start

```bash
npm install --ignore-scripts
npm run typecheck
npm run ux:routes
npm run verify:deterministic
npm run build
npm run dev
```

Open locally:

```text
http://localhost:3000/proofgate
http://localhost:3000/enterprise-ready
http://localhost:3000/dashboard/integrations
http://localhost:3000/gateway/monitor
```

### Local environment template

Create `.env.local` locally. Do **not** commit it.

```bash
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="your-publishable-key-if-used"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
SUPABASE_PROJECT_ID="your-project-id"
STRIPE_SECRET_KEY="sk_test_or_live_xxx"
STRIPE_WEBHOOK_SECRET="whsec_xxx"
```

Vercel users can pull local env without deploying:

```bash
vercel env pull .env.local
```

---

## Verification commands

Local repository checks:

```bash
npm install --ignore-scripts
npm test
npm run typecheck
npm run ux:routes
npm run verify:deterministic
npm run build
```

Benchmark/evidence commands:

```bash
npm run benchmark
npm run benchmark:gateway
npm run benchmark:kaggle:community
npm run benchmark:evidence
```

Deployment/runbook command:

```bash
npm run go:no-go
```

Runbook evidence is documented in:

```text
docs/RUNBOOK_DEPLOY.md
```

Do not use local test success alone as proof of production readiness.

---

## Live API check example

```bash
curl -s -X POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/dsg/v1/gates/evaluate \
  -H "content-type: application/json" \
  -H "x-dsg-nonce: test-nonce-001" \
  -H "idempotency-key: idem-001" \
  -d '{"planId":"PLAN-Z3-001","riskLevel":"high","context":{"requirement_clear":true,"tool_available":true,"permission_granted":true,"secret_bound":true,"dependency_resolved":true,"testable":true,"deploy_target_ready":true,"audit_hook_available":true}}'
```

Expected successful shape includes deterministic gate decision fields such as `gateStatus`, `proofStatus`, `riskLevel`, `proof`, replay-protection fields, and a boundary stating that this route does not invoke an external Z3 solver.

---

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

---

## Formal verification artifact

```text
DOI: https://doi.org/10.5281/zenodo.18225586
Title: Deterministic State Gate (DSG): Formally Verified Control Primitive for Safety-Critical AI Systems
```

Boundary:

```text
The DOI artifact is the formal verification reference. Repository runtime SMT2 scripts and TypeScript static-check routes provide runtime invariant evidence/scaffold behavior, but they are not the same thing as an end-to-end formally verified SaaS deployment.
```

---

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
These are author-provided benchmark preparation assets. They are not independent third-party audit certification and are not an official Kaggle leaderboard result until saved as Kaggle tasks, collected into a Kaggle benchmark, and evaluated against supported Kaggle models.
```

---

## Source-of-truth documents

Use these files as the canonical truth boundary for the repository:

```text
docs/REPO_TRUTH.md
docs/RUNBOOK_DEPLOY.md
PROJECT_TRUTH.md
qa-logs/test-summary.md
qa-logs/go-live-evidence-2026-05-03.md
docs/ENTERPRISE_READY_AUTOPILOT.md
```

When README text conflicts with those files, prefer the newer verified evidence in the source-of-truth files and update this README.

---

## Current claim boundary

Allowed wording when supported by current repository evidence:

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
setup-ready enterprise pilot flow
ProofGate product surface
customer-readable monitor
```

---

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

Current committed go-live evidence does not close those requirements unless newer recorded evidence proves otherwise.

---

## Practical product boundary

DSG ONE is a production-oriented governance product stack with ProofGate product pages, enterprise onboarding, integration quickstart, customer monitor, command assistant, marketplace action, compliance pages, control templates, approval workflow, evidence export, consult toolkit, trust scaffold, benchmark assets, and live deterministic proof/gate scaffold.

It is not externally validated at enterprise-trust level until real customer deployments, case studies, partner references, independent reviews, or formal certifications are completed and recorded.
