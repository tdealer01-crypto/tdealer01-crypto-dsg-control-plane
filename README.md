# DSG ONE

**Govern AI actions. Prove the result.**

DSG ONE is a governance and evidence layer for AI agents, MCP tools, APIs, browsers, CI/CD and automated workflows. It is designed to sit between an existing agent and execution so operators can answer four questions clearly:

1. What is the agent trying to do?
2. Was that action approved and permitted?
3. What actually executed?
4. Where is the evidence?

**Website:** https://www.dsg.pics  
**Control Plane:** https://dsg-control-plane.azurewebsites.net  
**Market-Ready product surface:** https://dsg-cinema-production.nicetree-a005fe99.westus3.azurecontainerapps.io/dashboard

---

## Current product experience

The current DSG ONE customer flow is organized around getting to a **first verified result**, not merely showing a connected badge.

```text
Choose installation path
        ↓
Account / target
        ↓
Repository / environment scope
        ↓
Minimum permission review
        ↓
Authorization / admin approval
        ↓
Provision
        ↓
Verify hashes + installation state
        ↓
INSTALLATION_INTEGRITY_PROOF
        ↓
HEALTHY
```

### Install with Web, AI or CLI

The Market-Ready customer surface supports three entry paths that converge on the same provisioner and verification model:

- **Web Install** — guided integration, account, scope, permission and verification flow.
- **AI Install Wizard** — detects the project stack, proposes setup and keeps approval/permission boundaries explicit.
- **CLI Install** — automation-oriented install, status, Doctor and first-result operations through `dsgctl`.

Supported framework detection currently includes:

- Next.js
- React
- Node.js
- Python
- FastAPI
- Docker
- Monorepo
- Static Web

### Installation reliability

The product includes:

- account / target selection;
- repository and environment scope;
- minimum-permission review;
- request-admin-approval state;
- signed callback binding;
- automatic provisioning;
- framework detection;
- Installation Doctor;
- Repair;
- tamper/hash detection;
- installation lifecycle tracking;
- automatic first installation proof.

The primary lifecycle is:

```text
PENDING
  ↓
AUTHORIZED
  ↓
PROVISIONED
  ↓
VERIFIED
  ↓
HEALTHY
```

---

## What the first proof means

After installation verification, DSG can create:

```text
INSTALLATION_INTEGRITY_PROOF
```

That proof is intentionally scoped. It can cover:

- callback binding;
- selected scope;
- provisioned artifacts;
- source lineage;
- artifact hashes;
- installation verification state.

It **does not** claim that every future AI response or workload is correct. Installation integrity and workload correctness are separate claims and require separate evidence.

---

## Runtime governance

DSG can operate as an observation layer or as a pre-execution governance gate.

```text
Your Agent / MCP / Automation
            │
            ▼
        DSG ONE
            │
     ┌──────┴──────┐
     │             │
  OBSERVE        ENFORCE
     │             │
 Record only    Gate action
     │             │
     └──────┬──────┘
            ▼
       External Tool
```

A governed action is evaluated across operational surfaces such as:

1. **ACTION** — what the agent is attempting.
2. **PLAN ALIGNMENT** — whether the action belongs to the approved plan.
3. **PERMISSION** — whether the execution context has the required authority.
4. **EVIDENCE** — what supports the decision and result.
5. **EXECUTION / AUDIT** — what actually happened and what was recorded.

Core behavior:

```text
Inside approved plan
+ required permission
+ satisfied constraints
+ supported evidence
        ↓
      PASS

Outside approved plan
        ↓
     BLOCKED
```

DSG must not block actions merely because governance exists. Approved actions should proceed when their required conditions are satisfied. Unsupported claims and out-of-plan actions must not silently become successful results.

### Result states

| State | Meaning |
|---|---|
| `PASS` | Required gate conditions passed |
| `BLOCKED` | Action cannot proceed under the applicable policy or approved plan |
| `WAITING_PERMISSION` | Required authority is missing |
| `UNVERIFIED` | Required supporting evidence is unavailable |
| `REVIEW` | Human or additional verification is required |
| `FAILED` | Execution or verification failed |

---

## Designed for existing systems

DSG is not intended to force teams to rebuild their agents.

```text
Microsoft Foundry Agent ─┐
Claude / Agent SDK ──────┤
Custom AI Agent ─────────┤
MCP Client ──────────────┤
CI/CD Workflow ──────────┤
Automation ──────────────┤
                         ▼
                       DSG
                         │
                         ▼
                  Existing Systems
```

The target architecture is:

```text
existing agent
+
governed execution
+
evidence
+
auditability
```

---

## Production evidence

### Control Plane repository

This repository is bound to **Azure App Service** as its authoritative production platform.

- Production URL: `https://dsg-control-plane.azurewebsites.net`
- Deployment binding: [`config/production-deployment-target.json`](config/production-deployment-target.json)
- Runtime environment guidance: [`docs/ops/azure-runtime-env-sync.md`](docs/ops/azure-runtime-env-sync.md)
- Azure deployment evidence: [`qa-logs/azure-production/`](qa-logs/azure-production/)

The deployment binding is fail-closed: configuration alone is not treated as proof that the latest deployment passed.

### Market-Ready / Cinema production surface

The related DSG Cinema production path has current executable evidence for the Market-Ready customer surface:

- Market-Ready product merge commit: `e16e4f2d964f44b4934a99a9297ab3fecfac7208`
- production Azure deploy: passed;
- direct Z3 production proof: passed;
- Cinema → Z3 production E2E and replay: passed;
- marketplace/CORS checks: passed;
- revenue truth checks: passed;
- exact live UI attestation: passed;
- UI-attestation workflow commit: `b076a0db98009d1a5c479ebbee48655d5b1e711b`.

The live UI attestation fetches production `/dashboard`, `/styles.css`, `/app.js` and `/config.js` and requires exact SHA-256 equality with the sandbox-tested Market-Ready source.

This is production runtime evidence. It is **not** a certification, legal-compliance or universal-correctness claim.

---

## MCP

The repository contains MCP implementation for connecting compatible agents and tools to DSG governance capabilities.

```text
MCP Client
    │
    ▼
DSG MCP
    │
    ▼
Preflight / Governance
    │
    ▼
Controlled execution
```

Before relying on an MCP capability in production, verify the current exposed tools, authentication requirements, runtime configuration and live deployment state.

---

## Repository structure

- `app/` — Next.js application and API surfaces.
- `lib/` — governance, runtime, security, billing, evidence and supporting implementation.
- `mcp/` — MCP implementation.
- `tests/` — automated verification.
- `.github/workflows/` — CI/CD and governed deployment workflows.
- `qa-logs/` — captured QA and deployment evidence.
- `supabase/` — database migrations and schema-related resources.
- `config/production-deployment-target.json` — canonical production deployment binding for this repository.
- `docs/` — architecture, operations, deployment and supporting documentation.

---

## Local development

Requirements:

- Node.js `>=24`
- npm
- runtime services and secrets required by the capability being tested

```bash
git clone https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane.git
cd tdealer01-crypto-dsg-control-plane
npm ci
npm run typecheck
npm test
npm run build
```

A successful local build proves the local build passed. It does not by itself prove production deployment, external integrations, production database connectivity or live E2E behavior.

---

## Evidence-first verification

For important DSG capabilities, verify against executable evidence such as:

- automated tests;
- GitHub Actions;
- runtime API responses;
- deployment status;
- commit SHA;
- container/image digest;
- database records;
- audit records;
- proof and replay output.

The evidence chain should make it possible to answer:

1. What did the user approve?
2. What action did the agent request?
3. Was the action inside the approved plan?
4. Did the executor have the required permission?
5. What actually executed?
6. What evidence was produced?
7. What passed or failed?
8. What must happen next?

---

## Truth boundary

Do not claim `production-ready`, `FULL LIVE E2E PASS`, certified compliance, successful deployment, verified proof or external solver execution unless current evidence supports that specific claim.

Configuration is not execution evidence. Source code is not production evidence. A successful command is not necessarily proof of the resulting external state.

Missing evidence remains `UNVERIFIED`, `REVIEW` or `BLOCKED` according to the applicable policy.

---

## Secrets

Never commit live credentials to this repository.

Production credentials should use the approved Azure secret/environment-management path. Example environment files document configuration names; they are not evidence that the corresponding production secret currently exists.

---

## Core principle

```text
Agent wants to act
        ↓
Was it approved?
        ↓
Is it inside the plan?
        ↓
Does it have permission?
        ↓
What executed?
        ↓
What proves the result?
```

**DSG ONE — govern the action, preserve the evidence, verify the result.**
