# DSG ONE

> **Production connector notice (2026-10-19):** This repository includes historical DSG Control Plane application code and archived deployment material. The installable Claude Code plugin `dsg-governance@dsg-plugins` is a **client** whose only scoped runtime MCP server is the live AWS DSG Spacetime endpoint `https://aws.dsg.pics/mcp` (`plugins/dsg-governance/.mcp.json`). The prior Vercel/Azure Control Plane addresses elsewhere in this repository are not this plugin's production backend. Plugin package validation is separate from OAuth-authorized production execution; see [the plugin-specific installation and verification notes](plugins/dsg-governance/README.md). Do not use older README links as production activation proof.


[![Listed on ClaudePluginHub](https://www.claudepluginhub.com/badge/tdealer01-crypto-dsg-governance)](https://www.claudepluginhub.com/plugins/tdealer01-crypto-dsg-governance?ref=badge)

**Govern AI actions. Prove the result.**

DSG ONE is a governance and evidence layer for AI agents, MCP tools, APIs, browsers, CI/CD and automated workflows. It is designed to sit between an existing agent and execution so operators can answer four questions clearly:

1. What is the agent trying to do?
2. Was that action approved and permitted?
3. What actually executed?
4. Where is the evidence?

**Website:** https://www.dsg.pics  
**Current production execution backend (AWS):** https://aws.dsg.pics/mcp  
**Claude Code plugin:** `dsg-governance@dsg-plugins` — [3 skills + 1 remote MCP server](plugins/dsg-governance/README.md)

> Historical product guides below describe earlier Control Plane phases. References to prior Azure/Vercel services are archival, not the runtime endpoint for this plugin. The package's effective components come from `plugins/dsg-governance`, not the monorepo's root `skills/` or `.mcp.json`.

---

## Historical Control Plane product experience (archived)

The following describes the **older Control Plane application's intended customer flow**. It is retained for architecture and migration reference. It is **not a declaration that these installation paths are currently deployed or verified on AWS Spacetime**. For the current supported public plugin path, use [DSG Governance plugin instructions](plugins/dsg-governance/README.md).

The earlier experience was designed around getting a **first verified result**, rather than merely showing a connected badge.

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

The archived Market-Ready design described three entry paths intended to converge on a common provisioner and verification model (not revalidated as current live AWS plugin paths):

- **Web Install** — guided integration, account, scope, permission and verification flow.
- **AI Install Wizard** — detects the project stack, proposes setup and keeps approval/permission boundaries explicit.
- **CLI Install** — automation-oriented install, status, Doctor and first-result operations through `dsgctl`.

Framework detection documented in the archived implementation includes:

- Next.js
- React
- Node.js
- Python
- FastAPI
- Docker
- Monorepo
- Static Web

### Installation reliability

Features documented by the archived application include (current operational availability requires fresh verification):

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

The documented lifecycle was:

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

## Current supported entry point: Claude Code governance plugin

This is a client plugin that connects to the existing AWS Spacetime MCP endpoint. Installation and manifest validation alone do not prove OAuth authorization, live route availability or provider execution.

Install the DSG Governance plugin from this repository:

```bash
claude plugin marketplace add tdealer01-crypto/tdealer01-crypto-dsg-control-plane
claude plugin install dsg-governance@dsg-plugins
```

Then ask Claude Code in natural language. The examples below map to the three skills currently shipped in `plugins/dsg-governance/skills/`.

### Gate an action before execution

```text
Use dsg-action-layer-ged. Gate this action before running it: deploy the current commit to production.
Return the gate status, reason, required permission, and evidence.
Do not execute if the result is BLOCK, UNSUPPORTED, or REVIEW without approval.
```

Expected result: an evidence-dependent governance verdict such as `PASS`, `BLOCK`, `REVIEW`, or `UNSUPPORTED`; missing evidence must not be reported as success.

### Add a governance check to CI/CD

```text
Use dsg-github-marketplace-action-controller. Add a DSG governance check before the production deploy job.
Fail closed on BLOCK, missing proof, or unsupported medium-or-higher risk.
Show the files changed and the verification needed before merge.
```

Expected result: a proposed GitHub Actions integration with deterministic GO/NO-GO conditions and explicit secret-handling boundaries.

### Run a production readiness decision

```text
Use dsg-multi-governance-orchestrator. Check M1 production cutover using current evidence only.
Mark every requirement PASS, FAIL, or UNVERIFIED and return GO or NO-GO.
Do not infer missing deployment, database, authentication, billing, or proof evidence.
```

Expected result: a checklist-backed readiness decision whose claims are limited to the evidence actually inspected.

---

## What the first proof means

In the archived installation workflow, successful verification was designed to produce:

```text
INSTALLATION_INTEGRITY_PROOF
```

This output must be confirmed by an actual run and receipt; the documentation is not evidence that a new installation succeeded. A valid installation proof is intentionally scoped and may cover:

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

### Archived Azure Control Plane deployment (historical)

The repository retains an **Azure App Service deployment binding** in [`config/production-deployment-target.json`](config/production-deployment-target.json). The recorded binding status is `BOUND_FAIL_CLOSED_LIVE_VERIFICATION_REQUIRED`. This describes the prior Control Plane deployment configuration; it is **not the current production MCP backend for the public Claude Code plugin** and **does not establish that an Azure app is presently deployed or healthy**.

- Legacy configured Azure URL: `https://dsg-control-plane.azurewebsites.net`
- Historical runtime environment guidance: [`docs/ops/azure-runtime-env-sync.md`](docs/ops/azure-runtime-env-sync.md)
- Archived Azure deployment artifacts: [`qa-logs/azure-production/`](qa-logs/azure-production/)
- Current public plugin MCP configuration: [`plugins/dsg-governance/.mcp.json`](plugins/dsg-governance/.mcp.json) — points to `https://aws.dsg.pics/mcp`

A deployment binding, source code, or an old successful workflow is not proof of the latest live deployment.

### Historical Market-Ready / Cinema verification records

The repository documents the following earlier Azure-era acceptance results. These records should be checked against their original workflows, commit SHA and timestamps; they **do not reverify current AWS production**, and the statuses below are historical reports:

- Market-Ready product merge commit: `e16e4f2d964f44b4934a99a9297ab3fecfac7208`
- production Azure deploy: passed;
- direct Z3 production proof: passed;
- Cinema → Z3 production E2E and replay: passed;
- marketplace/CORS checks: passed;
- revenue truth checks: passed;
- exact live UI attestation: passed;
- UI-attestation workflow commit: `b076a0db98009d1a5c479ebbee48655d5b1e711b`.

The live UI attestation fetches production `/dashboard`, `/styles.css`, `/app.js` and `/config.js` and requires exact SHA-256 equality with the sandbox-tested Market-Ready source.

These are historical scoped verification reports, **not evidence of current AWS or external-customer end-to-end execution**. They are also **not** a certification, legal-compliance or universal-correctness claim.

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

For historical Azure deployment workflows, credentials belong in the approved Azure secret/environment-management system. The **current public AWS Spacetime client** uses its supported OAuth and runtime authorization flow; do not paste tokens into chat, commit secrets, or infer that a configured environment variable is a working credential. Example environment files are configuration references, not proof that any live secret exists.

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
