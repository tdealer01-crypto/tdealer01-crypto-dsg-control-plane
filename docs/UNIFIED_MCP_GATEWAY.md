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

A normal MCP user should only need:

- MCP URL: `/api/mcp`
- one DSG API key (`DSG_API_KEY` / `DSG_MCP_API_KEY` on the server side)

Users do not configure AGI, Cinema, AWS, or service-to-service keys individually.

## Server-side one-time configuration

The infrastructure owner configures this once:

- `DSG_AIMO_ROOT_KEY` — one root secret shared by Control Plane and DSG ONE/AIMO services.
- `DSG_ONE_MCP_BACKEND_URL` — optional; defaults to `https://dsg-one-v1.vercel.app`.
- `DSG_GITHUB_AUTOMATION_TOKEN` or the existing `GITHUB_TOKEN` — required only for `dsg.aws.deploy` workflow dispatch.

DSG ONE already supports `DSG_AIMO_SERVICE_REGISTRY` so simulation URL, Cinema URL, and max parallelism are one JSON setting rather than separate client configuration.

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
- `dsg.aws.deploy` — deterministic gate plus explicit approval, then dispatch the governed CDK workflow.
- Existing DSG/Hermes/Android tools remain available through the same `/api/mcp` endpoint.

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
