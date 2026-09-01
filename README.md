# DSG Control Plane

Governance and evidence layer for AI agents, MCP servers, and automated workflows.

Connect an existing agent or automation to DSG. DSG checks what the agent is trying to do against the approved plan, permissions, constraints, and available evidence, then records what actually happened.

You do not need to replace your existing agent framework.

```text
Your Agent / MCP / Automation
            │
            ▼
     DSG Control Plane
            │
     ┌──────┴──────┐
     │             │
  OBSERVE        ENFORCE
     │             │
 Record only    Gate action
     │             │
     └──────┬──────┘
            ▼
       External API
```

## What problem does DSG solve?

AI agents can call APIs, modify infrastructure, deploy software, operate browsers, and execute automated workflows.

The question is not only whether an agent can perform an action. The operational question is whether that action was approved, permitted, verified, and recorded.

DSG adds that governance layer between an agent and execution.

```text
Approved Plan
     ↓
Preflight
     ↓
Plan Alignment
     ↓
Permission / Constraints
     ↓
Execution
     ↓
Evidence
     ↓
Verification
     ↓
Audit
```

DSG must not block an action merely because governance exists. An action covered by the user-approved plan should be allowed to proceed when its required permissions and constraints are satisfied. Unsupported claims or out-of-plan actions must not silently become successful results.

## Operating modes

### OBSERVE

Use DSG as an evidence and audit layer without making DSG the execution blocker.

```text
Agent Action
     ↓
DSG observes
     ↓
Record plan alignment
Record permissions
Record evidence
Record execution result
     ↓
Existing API / Tool
```

This is useful when introducing governance into an existing workflow without immediately changing execution behavior.

### ENFORCE

Use DSG as the pre-execution governance gate.

```text
Agent Action
     ↓
DSG Preflight
     ↓
PASS ─────────────────→ Execute
BLOCKED ──────────────→ Stop
WAITING_PERMISSION ───→ Request required permission
UNVERIFIED ───────────→ Require evidence / verification
```

Core rule:

```text
Inside approved plan + required permission + supported evidence
                         ↓
                       PASS

Outside approved plan
                         ↓
                      BLOCKED
```

## What the operator should see

DSG should expose governance information as operational results rather than forcing users to reconstruct state from raw logs.

A useful runtime view consists of five surfaces:

1. **ACTION** — what the agent is attempting to do.
2. **PLAN ALIGNMENT** — whether the requested action belongs to the approved plan.
3. **PERMISSION** — whether the execution context has the required authority.
4. **EVIDENCE** — what proves the result.
5. **EXECUTION / AUDIT** — what actually happened and what was recorded.

This separates:

```text
what was requested
what was approved
what was permitted
what was executed
what was proven
```

## Result states

| State | Meaning |
|---|---|
| `PASS` | Required gate conditions passed |
| `BLOCKED` | Action cannot proceed under the applicable policy or approved plan |
| `WAITING_PERMISSION` | Required authority is missing |
| `UNVERIFIED` | Required supporting evidence is unavailable |
| `REVIEW` | Human or additional verification is required |
| `FAILED` | Execution or verification failed |

The exact state used depends on the applicable runtime contract and policy.

## Designed for existing systems

DSG is intended to sit between existing automation and the systems it already uses.

```text
Microsoft Foundry Agent ─┐
Claude / Agent SDK ──────┤
Custom AI Agent ─────────┤
MCP Client ──────────────┤
CI/CD Workflow ──────────┤
Automation ──────────────┤
                         ▼
                  DSG Control Plane
                         │
                         ▼
                  Existing Systems
```

The objective is:

```text
existing agent
+
DSG governance
+
evidence
+
auditability
```

not to force users to rebuild their agent stack.

## MCP

The repository contains MCP-related implementation for connecting compatible agents and tooling to DSG governance capabilities.

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

Before relying on an MCP capability in production, verify the current server configuration, exposed tools, authentication requirements, and deployed runtime.

## Production

**Authoritative production platform: Azure App Service**

- Production URL: `https://dsg-control-plane.azurewebsites.net`
- Deployment target: [`config/production-deployment-target.json`](config/production-deployment-target.json)
- Azure deployment evidence: [`qa-logs/azure-production/`](qa-logs/azure-production/)
- Runtime environment guidance: [`docs/ops/azure-runtime-env-sync.md`](docs/ops/azure-runtime-env-sync.md)

The configured production target explicitly binds DSG to Azure App Service. Vercel and Render are not active DSG production targets.

A configured deployment target does not by itself prove that the latest production deployment passed. Production success must be established from current deployment, runtime, database, and evidence checks.

## Production deployment model

The configured deployment path is designed around governed promotion and exact artifact identity.

```text
approved/promoted change
        ↓
exact commit identity
        ↓
container build
        ↓
Azure Container Registry
        ↓
staging deployment
        ↓
runtime verification
        ↓
health verification
        ↓
proof/evidence checks
        ↓
production promotion
```

The repository also defines Azure rollback behavior. Verification mismatches are expected to fail closed rather than being represented as successful deployment.

## Health

The configured production health probe is:

```text
GET /api/health
```

Do not treat an HTTP health response alone as proof that every DSG capability is production-ready. Full verification may additionally require authenticated runtime checks, database state, evidence persistence, deployment identity, and workflow verification.

## Repository structure

- `app/` — Next.js application and API surfaces.
- `lib/` — governance, runtime, security, billing, evidence, and supporting implementation.
- `mcp/` — MCP implementation.
- `tests/` — automated verification.
- `.github/workflows/` — CI/CD and governed deployment workflows.
- `qa-logs/` — captured QA and deployment evidence.
- `supabase/` — database migrations and schema-related resources.
- `config/production-deployment-target.json` — canonical production deployment binding.
- `docs/` — architecture, operating procedures, deployment guidance, and supporting documentation.

## Local development

Requirements:

- Node.js `>=24`
- npm
- Runtime services and secrets required by the capability being tested

```bash
git clone https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane.git
cd tdealer01-crypto-dsg-control-plane
npm ci
npm run typecheck
npm test
npm run build
```

A successful local build proves the local build passed. It does not prove that production deployment, production database connectivity, external integrations, or full live E2E execution passed.

## Evidence-first verification

For any important DSG capability, verify against executable evidence.

Useful evidence sources include:

- `tests/`
- `qa-logs/`
- GitHub Actions
- runtime API responses
- deployment status
- database records
- commit SHA
- container/image digest
- audit records
- verification output

The evidence chain should make it possible to answer:

1. What did the user approve?
2. What action did the agent request?
3. Was the action inside the approved plan?
4. Did the executor have the required permission?
5. What actually executed?
6. What evidence was produced?
7. What passed or failed?
8. What must happen next?

## Truth boundary

Do not claim `production-ready`, `FULL LIVE E2E PASS`, certified compliance, successful deployment, verified proof, or external solver execution unless current evidence supports that specific claim.

Configuration is not execution evidence. Source code is not production evidence. A successful command is not necessarily proof of the resulting external state.

Missing evidence remains `UNVERIFIED`, `REVIEW`, or `BLOCKED` according to the applicable policy.

## Secrets

Never commit live credentials to this repository.

Production credentials should use the approved Azure secret/environment-management path. Example environment files document required configuration names; they are not evidence that the corresponding production secret currently exists.

## Core principle

DSG exists to make agent execution answerable.

```text
Agent wants to act
        ↓
Was it approved?
        ↓
Is it inside the plan?
        ↓
Does it have permission?
        ↓
Can it execute?
        ↓
What actually happened?
        ↓
Where is the evidence?
```

The goal is not to add more steps for the operator. The goal is to expose governed execution as clear operational outcomes such as `PASS`, `BLOCKED`, `WAITING_PERMISSION`, `UNVERIFIED`, or `FAILED`, together with the reason, evidence, and next action.

---

**DSG Control Plane — govern the action, preserve the evidence, verify the result.**
