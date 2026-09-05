# AWS Marketplace MCP live blocker evidence — 2026-09-05

## Scope

Candidate Marketplace delivery origin:

`https://dsg-control-plane.azurewebsites.net`

Candidate MCP endpoint:

`/api/mcp/governance`

Candidate OpenAPI endpoint:

`/api/dsg/governance/openapi`

## GitHub Actions evidence

Workflow: **AWS Marketplace MCP Readiness**  
Run: **33954260838**  
Observed UTC: **2026-09-05T08:04:30Z**

The GitHub-hosted runner executed public HTTPS probes against the exact Azure production origin recorded in `config/production-deployment-target.json` and `config/aws-marketplace-mcp-server.json`.

Observed responses:

| Path | HTTP | Interpretation |
|---|---:|---|
| `/api/health` | 200 | Azure App Service is up and core/readiness checks returned healthy JSON |
| `/api/dsg/v1/runtime` | 404 | currently deployed image does not expose current runtime provenance route |
| `/api/mcp/governance` | 404 | currently deployed image does not expose dedicated governance MCP route |
| `/api/dsg/governance/openapi` | 404 | currently deployed image does not expose governance OpenAPI route |

The 404 responses were Next.js HTML responses from the same live Azure application, not DNS or transport failures.

## Repository chronology

`app/api/mcp/governance/route.ts` entered `main` in commit:

`57b5b2ac99a5bdee4525fbb95c0754ca2f7d1500`

Commit message:

`feat: Microsoft Foundry DSG governance plugin (#1199)`

Merge timestamp: **2026-09-01T06:24:06Z**.

The latest checked-in Azure production deployment proof found during this work is:

`qa-logs/azure-production/20260828T015648Z/DEPLOYMENT_PROOF.md`

That evidence predates the governance MCP merge and records an older production SHA.

## Determination

**BLOCKED_STALE_PRODUCTION_IMAGE_HTTP_404**

This is a deployment-state blocker, not evidence that the MCP implementation is absent from `main`.

Static repository verification passes for:

- dedicated `dsg.governance.preflight` MCP tool
- MCP initialize / tools/list / tools/call handlers
- stored DSG API-key validation
- approved-plan lookup and plan-alignment logic
- explicit PASS / BLOCKED / WAITING_PERMISSION decisions
- hash-linked audit persistence
- OpenAPI 3.1 surface with `x-dsg-api-key`

## Required remediation

Use the repository's governed production path only:

1. ensure the exact target commit is current `main`;
2. create an audited pending production promotion through `POST /api/agent-workspaces/promotions` as an authenticated `org_admin`;
3. dispatch `.github/workflows/promoted-production-deploy.yml` with the resulting promotion UUID, exact current-main SHA, and workspace key;
4. allow the workflow to perform staging provenance, health, proof E2E, slot swap, production provenance and rollback controls;
5. rerun `AWS Marketplace MCP Readiness`;
6. change `endpointLiveStatus` only after the MCP/OpenAPI discovery probes return the expected live responses;
7. run authenticated real-plan ALLOW/BLOCK evidence separately. No fixture is to be invented.

## Truth boundary

`BLOCKED_AS_DECLARED` means the CI verified that production is still blocked in the exact way recorded here. It does **not** mean the Marketplace endpoint is live, seller eligibility is satisfied, AWS commercial fulfillment is implemented, or a private offer is ready.
