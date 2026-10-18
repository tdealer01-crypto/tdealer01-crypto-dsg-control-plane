# DSG ONE

> **Current deployment status (owner confirmation, 18 October 2026):** The DSG Control Plane is **NOT DEPLOYED** on any provider. This repository publishes source code, documentation, and Claude Code plugins; it does not prove an active hosted control-plane service. Past deployment logs and URLs must not be presented as current production evidence.

[![Listed on ClaudePluginHub](https://www.claudepluginhub.com/badge/tdealer01-crypto-dsg-governance)](https://www.claudepluginhub.com/plugins/tdealer01-crypto-dsg-governance?ref=badge)

**Govern AI actions. Prove the result.**

DSG ONE is a governance and evidence layer for AI agents, MCP tools, APIs, browsers, CI/CD and automated workflows. It is designed to sit between an existing agent and execution so operators can answer four questions clearly:

1. What is the agent trying to do?
2. Was that action approved and permitted?
3. What actually executed?
4. Where is the evidence?

**Project website (current reachability not verified):** https://www.dsg.pics  
**Claude Code plugin distribution:** [GitHub marketplace](.claude-plugin/marketplace.json)  
**DSG Control Plane hosted URL:** NONE VERIFIED / NOT DEPLOYED

---

## DSG OS and Spacetime boundary

The architecture contract is documented in [docs/architecture/dsg-os-spacetime-boundary.md](docs/architecture/dsg-os-spacetime-boundary.md). DSG OS owns the user-facing browser/workspace, Adapter Builder, and local verification surface. Spacetime owns execution and governance decisions.

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

The documented Market-Ready design describes three entry paths intended to converge on a provisioner and verification model. This is a design description, not evidence of a currently deployed customer surface:

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

## Usage examples (Claude Code plugin)

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

Expected result: a plan and evidence review from the information actually available. Without a live authorized gate result, report `UNVERIFIED`; this skill does not execute or block provider actions.

### Add a governance check to CI/CD

```text
Use dsg-github-marketplace-action-controller. Add a DSG governance check before the production deploy job.
Fail closed on BLOCK, missing proof, or unsupported medium-or-higher risk.
Show the files changed and the verification needed before merge.
```

Expected result: a packaging proposal and review checklist. A live governance integration is `UNVERIFIED` unless its configured service and result are independently evidenced.

### Run a production readiness decision

```text
Use dsg-multi-governance-orchestrator. Check M1 production cutover using current evidence only.
Mark every requirement PASS, FAIL, or UNVERIFIED and return GO or NO-GO.
Do not infer missing deployment, database, authentication, billing, or proof evidence.
```

Expected result: a checklist-backed assessment. Missing live deployment, database, authentication, billing, or proof evidence stays `UNVERIFIED`; the skill does not query those systems.

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

## Deployment and historical evidence boundary

**Current: DSG Control Plane NOT DEPLOYED (owner confirmation, 18 October 2026).**

A previous revision of this README referred to Azure App Service as the production host and included historical Azure deployment references. Those bindings and URLs **are not current Control Plane deployments**. Archived configuration files, logs, and deployment workflows may still exist in the repository, but they cannot prove an active endpoint today.

Historical reference material can be inspected at:

- [Legacy deployment target configuration](config/production-deployment-target.json)
- [Legacy Azure runtime notes](docs/ops/azure-runtime-env-sync.md)
- [Archived Azure QA logs](qa-logs/azure-production/)

The related Cinema/Market-Ready project previously recorded merge, UI-attestation, and Z3-verification activity, including historical commit references `e16e4f2d964f44b4934a99a9297ab3fecfac7208` and `b076a0db98009d1a5c479ebbee48655d5b1e711b`. These are **historical evidence pointers**, not verification of current availability or Control Plane production activation.

A new production claim requires a named active provider, deployment revision, reachable authenticated service, independent execution result, and current audit evidence. Plugin installation requires none of those production services.

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

Any future deployment must use the active provider's approved secret manager and an authorized, audited binding. The current repository does not prove that production credentials or a hosted Control Plane are configured.

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
