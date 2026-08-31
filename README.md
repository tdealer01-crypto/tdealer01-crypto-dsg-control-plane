# DSG Control Plane

[![Listed on ClaudePluginHub](https://www.claudepluginhub.com/badge/tdealer01-crypto-dsg-governance-plugins-dsg-governance)](https://www.claudepluginhub.com/plugins/tdealer01-crypto-dsg-governance-plugins-dsg-governance?ref=badge)

**Deterministic governance, verified execution, and replayable proof for AI agents.**

DSG Control Plane is the governance layer between an approved human plan and an AI agent's external actions. It evaluates whether an action is inside the approved scope, applies deterministic constraints, records evidence, verifies the resulting state, and preserves an audit/replay trail.

DSG is not intended to block authorized work merely because governance exists. The contract is:

> **Allow plan-authorized execution when its constraints and permissions are satisfied. Block unsupported claims and actions outside the approved plan.**

---

## Current status — 2026-08-31

| Surface | Current repository truth |
| --- | --- |
| Production authority | **Azure App Service** |
| Production URL | `https://dsg-control-plane.azurewebsites.net` |
| Production binding | `BOUND_FAIL_CLOSED_LIVE_VERIFICATION_REQUIRED` |
| Deployment model | Azure App Service Linux custom container + Azure Container Registry + staging slot |
| Latest committed Azure deployment proof | **PASS** on 2026-08-28 for Git SHA `011cf0b60f85adf273908aa71b929549a18d9c07`; `/api/health` = 200 and `/api/readiness` = 200 |
| Current `main` live deployment claim | **UNVERIFIED by committed deployment proof** until a newer governed production workflow proves the current source SHA/image digest live |
| Vercel | **Retired as a DSG production target** |
| Render | **Retired as a DSG production target** |
| Claude plugin marketplace | Present in `.claude-plugin/marketplace.json`; currently contains 7 plugin entries |

The latest historical Azure proof is real evidence for the deployment it captured. It is **not** proof that a later `main` commit is already running in production.

Repository authority for production targeting is:

- [`config/production-deployment-target.json`](config/production-deployment-target.json)
- [`.github/workflows/promoted-production-deploy.yml`](.github/workflows/promoted-production-deploy.yml)
- [`qa-logs/azure-production/`](qa-logs/azure-production/)

Retired provider checks can still appear in GitHub commit statuses if an external integration continues posting them. They are not the DSG production authority.

---

## Why DSG exists

An AI agent reporting "done" is not sufficient for a governed production system.

The useful questions are:

- What plan did the user approve?
- Was this exact action inside that plan?
- Did the required permission and policy gates pass?
- What was actually executed?
- What evidence was produced?
- Did the resulting system state match the claim?
- Can the decision and execution be audited or replayed later?

DSG is designed around those questions.

---

## Governed execution flow

```text
user-approved goal
        ↓
approved plan / plan hash
        ↓
preflight + alignment + constraints + permission
        ↓
ALLOW / REVIEW / BLOCK
        ↓
controlled execution
        ↓
evidence capture
        ↓
result verification
        ↓
audit + replay
        ↓
governed deployment / promotion when applicable
```

A command exit code, generated text, configuration file, or deployment request is not enough by itself to establish success. DSG verifies the resulting state and keeps the claim inside the available evidence boundary.

---

## Core capabilities in this repository

### 1. Plan-bound authorization

Agent actions are expected to remain bound to a user-approved goal and plan. Pre-execution logic verifies alignment rather than allowing an agent to widen its own scope.

The current agentic-organization path also contains a separate candidate-realization authorization boundary before Builder intake. That authorization does not replace Builder approval, execution evidence, Cinema verification, or production promotion gates.

### 2. Deterministic gates and constraints

The repository contains deterministic verification paths, policy gates, exact-result checks, and solver-backed components including `z3-solver`.

A solver dependency or static code path is not treated as proof that a particular solver-backed production path passed. Solver claims require execution evidence for that path.

### 3. Evidence-first execution

The repository keeps automated tests, deployment evidence, runtime evidence, database migrations, and audit artifacts as first-class project surfaces.

Useful locations:

- `tests/` — unit, integration, failure, migration, load, and E2E verification
- `qa-logs/` — captured QA and deployment evidence
- `supabase/migrations/` — source-controlled database history
- `lib/` and `app/` — runtime and API implementation
- `.github/workflows/` — CI/CD and governed promotion workflows
- `docs/` — architecture, runbooks, status, and operating guidance

### 4. Governed Azure production deployment

The production deployment contract is bound to Azure App Service.

The configured promotion path is designed to:

1. require the governed promotion context,
2. bind deployment to the exact source commit,
3. build and resolve the container image digest,
4. deploy through a staging slot,
5. verify runtime and health surfaces,
6. verify proof persistence and lookup behavior,
7. check replay/idempotency and nonce-conflict behavior,
8. verify anonymous database isolation,
9. swap staging to production only after the required gates pass,
10. recheck the exact SHA/digest and health after swap,
11. attempt a reverse slot swap when post-swap verification fails.

The production target is intentionally fail-closed: configuration alone never means "deployment passed."

### 5. MCP and agent tooling

The repository includes MCP servers/workspaces and agent-facing governance tooling for controlled execution, verification, context discovery, RCA, and related workflows.

### 6. Claude Code plugin marketplace

The root marketplace manifest currently declares these entries:

- `proofgate-review`
- `dsg-verify`
- `evidence-guard`
- `pr-body-helper`
- `dsg-governance`
- `compliance-ising-z3`
- `dsg-verified-execution`

Add the marketplace from Claude Code:

```text
/plugin marketplace add tdealer01-crypto/tdealer01-crypto-dsg-control-plane
```

Then install a plugin, for example:

```text
/plugin install dsg-governance@dsg-plugins
```

See [`plugins/`](plugins/) and [`.claude-plugin/marketplace.json`](.claude-plugin/marketplace.json) for the current source of truth.

---

## Operator path

For a governed task, the intended operator experience is:

1. **Lock the goal** — identify the user-approved outcome.
2. **Bind the plan** — use the approved plan/hash and exact action scope.
3. **Run preflight** — evaluate alignment, constraints, permissions, and policy before mutation.
4. **Execute only authorized actions** — no silent widening of scope.
5. **Capture evidence** — test output, API result, DB state, deployment state, screenshots, or other applicable proof.
6. **Verify the actual result** — do not infer success from the attempted action alone.
7. **Return a work-state verdict** — for example `PASS`, `REVIEW`, `BLOCK`, or `FAILED`.
8. **Tell the operator what to fix next** when the result is not `PASS`.

The user should not need to inspect raw logs merely to learn whether the requested job succeeded.

---

## Production verification

### Latest committed Azure proof

The repository currently contains a committed deployment proof captured at `20260828T015648Z`:

- result: `PASS`
- health HTTP: `200`
- readiness HTTP: `200`
- deployed Git SHA: `011cf0b60f85adf273908aa71b929549a18d9c07`
- service: `dsg-control-plane`
- database check: passed in the captured health response
- distributed rate limiter configuration check: passed in the captured health response

Evidence:

- [`qa-logs/azure-production/20260828T015648Z/DEPLOYMENT_PROOF.md`](qa-logs/azure-production/20260828T015648Z/DEPLOYMENT_PROOF.md)
- [`qa-logs/azure-production/20260828T015648Z/SHA256SUMS.txt`](qa-logs/azure-production/20260828T015648Z/SHA256SUMS.txt)

### What this does not prove

It does **not** prove that every later commit on `main` is already deployed.

A current production claim must match the running service's exact source SHA/container digest and current health/evidence. If those do not match, the correct state remains `UNVERIFIED`, `REVIEW`, `BLOCK`, or `FAILED` according to the applicable gate.

---

## Local development

### Requirements

- Node.js `>=24`
- npm
- runtime services/secrets required by the feature being exercised

```bash
git clone https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane.git
cd tdealer01-crypto-dsg-control-plane
npm ci
npm run typecheck
npm test
npm run build
```

Additional verification commands available in `package.json` include live-DB tests, Playwright E2E tests, deterministic verification, policy verification, security-header verification, production-manifest verification, load tests, and evidence-chain tooling.

A successful local build is useful development evidence. It is **not** production deployment evidence.

---

## Secrets and runtime configuration

Do not commit live secrets.

Runtime configuration must use the current production secret-management path for Azure and the applicable external services. Example environment files document required names only; they do not prove that a secret exists or is correct in production.

Relevant repository guidance includes:

- [`docs/ops/azure-runtime-env-sync.md`](docs/ops/azure-runtime-env-sync.md)
- `.env.example`
- `scripts/secrets-manager.sh`

---

## Truth boundary

The repository must not claim any of the following without current supporting evidence:

- production deployment success,
- current runtime health,
- full live E2E completion,
- solver proof,
- compliance or certification,
- database migration completion,
- external mutation success,
- replay correctness.

When code, configuration, GitHub status checks, runtime state, and documentation disagree, verify the running authoritative Azure target and update the evidence so the surfaces converge.

**No evidence = no PASS claim.**

---

## Decision discipline

Every material execution should leave enough evidence to answer:

```text
What did the user approve?
What action was attempted?
Which constraint or policy was evaluated?
What permission was used?
What evidence was produced?
What state actually changed?
What passed or failed?
What should happen next?
```

That is the operating boundary of DSG Control Plane: **approved intent -> governed execution -> verifiable result -> replayable proof**.
