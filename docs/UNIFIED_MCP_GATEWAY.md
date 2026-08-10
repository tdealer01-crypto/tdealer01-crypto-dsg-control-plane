# DSG Unified Control Plane MCP

## Goal

Expose one MCP front door for DSG Control Plane governance, AIMO search/proof, AWS governed deployment, runtime routing, and evidence tools.

```text
Agent / ChatGPT / Claude / Codex
            |
            v
      DSG Control Plane MCP
            |
     Plan -> Gate -> Route
      /              \
     v                v
 AWS workflow      DSG ONE AIMO
 OIDC/CDK               |
     |                  v
 Evidence         AGI Simulation
 Verification           |
                        v
                   Cinema / Z3
```

## User configuration

A normal MCP client needs only:

- MCP URL: `/api/mcp`
- one issued DSG API key from `/api/dsg/mcp/keys`

The raw key is shown once at issuance. On every unified tool call the Control Plane hashes it, validates it through the existing `validate_mcp_api_key` RPC, enforces ACTIVE/period/quota state, resolves the actor/org/runtime roles, and records usage. Revoked, expired, over-quota, inactive-actor, or unverifiable keys fail closed.

Users do not configure AGI, Cinema, AWS, or service-to-service keys individually.

## Server-side one-time configuration

The infrastructure owner configures this once:

- `DSG_AIMO_ROOT_KEY` — one root secret shared by Control Plane and DSG ONE/AIMO services.
- `DSG_ONE_MCP_BACKEND_URL` — optional; defaults to `https://dsg-one-v1.vercel.app`.
- `DSG_GITHUB_AUTOMATION_TOKEN` — server-side GitHub credential used by governed AWS workflow inspection/dispatch. It must be able to read the workflow, repository secret **names**, target environments, and workflow runs, and to dispatch the CDK workflow.

DSG ONE supports `DSG_AIMO_SERVICE_REGISTRY` so simulation URL, Cinema URL, and max parallelism are one JSON setting rather than client configuration.

## Root-key design

The raw `DSG_AIMO_ROOT_KEY` is never sent between services. Deterministic HMAC tokens are derived by purpose:

```text
HMAC(root, "dsg-aimo-v1:control-plane")
HMAC(root, "dsg-aimo-v1:simulation")
HMAC(root, "dsg-aimo-v1:cinema")
```

A compromise of one derived token does not reveal the root key or make the other purpose-specific token equal.

## Unified tools

- `dsg.system.status` — gateway/adapter readiness without secret values.
- `dsg.aimo.status` — inspect the DSG ONE AIMO surface.
- `dsg.aimo.solve` — run DSG ONE -> AGI deterministic shards -> Cinema proof gate.
- `dsg.aws.contract` — return the Plan -> Gate -> AWS execution -> Evidence -> Verification contract.
- `dsg.aws.deploy` — inspect AWS deployment evidence, run the deterministic gate, require explicit approval, suppress duplicate retries, then dispatch the governed CDK workflow.
- `dsg.classifyRisk` — deterministic EU AI Act-aligned risk-tier classification from caller-supplied capability flags, sourced from `docs/consult-toolkit/risk-classification-checklist.md`.
- Existing DSG/Hermes/Android tools remain available through the same `/api/mcp` endpoint.

## Auth on the DSG tool set

`dsg.evaluate`, `dsg.verifyClaim`, `dsg.recordEvidence`, `dsg.exportComplianceBundle`, `dsg.getReadiness`, and `dsg.classifyRisk` require the same auth as the unified/platform-deploy tools (issued DSG API key or an operator/org_admin session). `dsg.recordEvidence` is documented to persist an evidence envelope into the CCVS chain, so it must not be callable anonymously.

## AWS authorization and evidence

`dsg.aws.deploy` requires an authenticated actor with `operator` or `org_admin` entitlement. A valid billing key alone does not grant mutation authority.

Before calling the deterministic gate, the gateway verifies the repository contract and supplies the policy evidence keys from real GitHub state:

- `secret_bound` — required repository secret names are configured (`AWS_ROLE_TO_ASSUME`, `AWS_REGION`, `AWS_ACCOUNT_ID`). Secret **values** are never read.
- `dependency_resolved` — the current workflow contains GitHub OIDC and the corrected `DSGOneStack-$ENVIRONMENT` contract.
- `testable` — the current workflow contains post-deploy CloudFormation verification.
- `deploy_target_ready` — the target protected environment exists and required bindings are present.
- `audit_hook_available` — the workflow emits the verification manifest/evidence artifact.

If the gateway cannot verify any required evidence, the gate remains BLOCKED.

## AWS idempotency

Every `dsg.aws.deploy` call requires a stable `idempotencyKey`. Reuse the same key when retrying the same intended deployment.

The gateway checks existing `cdk-deploy.yml` runs before dispatch. The workflow also records the key in its run name and verification manifest and serializes deployments per environment with GitHub Actions concurrency. Duplicate retries return the existing run instead of silently launching another deployment.

## AWS truth boundary

`dsg.aws.deploy` returning `dispatched: true` is **not** deployment PASS. It returns `REVIEW` until the protected GitHub Environment and post-deploy verification evidence complete.

The AWS Agent Toolkit adapter remains responsible for AWS interaction. The current repository infrastructure proves an ECS cluster exists when verification passes; it does not prove a Fargate application service exists until the CDK source actually defines and verifies one.

## AIMO truth boundary

The Control Plane does not weaken the existing AIMO proof contract. A finite QUBO/Ising candidate becomes final only after the Cinema proof verifier returns the required complete certificate. Encoding fidelity from a natural-language olympiad problem remains a separate obligation.

## Verification

Repository contract verifier:

```bash
node scripts/verify-unified-mcp-gateway.mjs
```

CI workflow:

```text
.github/workflows/unified-mcp-gateway-verify.yml
```
