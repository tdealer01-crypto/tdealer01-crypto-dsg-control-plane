# DSG Spacetime — AWS Marketplace MCP Server Package

**Assessment date:** 2026-09-05  
**Repository:** `tdealer01-crypto/tdealer01-crypto-dsg-control-plane`  
**Product candidate:** **DSG Spacetime — Governed MCP Execution Gateway**  
**Marketplace path:** **API-Based Agents & Tools → MCP → MCP server**  
**Decision:** **GO for packaging; NO-GO for paid launch until live runtime, seller, commercial binding and real E2E gates pass.**

This document supersedes the packaging decision in `docs/AWS_MARKETPLACE_PRIVATE_OFFER_READINESS_2026-08-12.md`. The older file remains historical evidence for the commercial integration gaps it identified.

## 1. Why this is the shortest AWS route

AWS Marketplace now has a dedicated SaaS API-based AI agents and tools flow that supports:

- tool type: MCP Server;
- integration protocol: MCP;
- static or dynamic endpoints;
- API key or OAuth authentication;
- Redirect to Website or Quick Launch fulfillment;
- optional Amazon Bedrock AgentCore integration.

A vendor-hosted API endpoint can be used. DSG therefore does not need to move the Azure runtime to AWS merely to package this product. The separate **Deployed on AWS** designation is not claimed.

Official references:

- https://docs.aws.amazon.com/marketplace/latest/userguide/listing-saas-ai-agents.html
- https://docs.aws.amazon.com/marketplace/latest/userguide/integrating-api-ai-agents-tools.html
- https://docs.aws.amazon.com/marketplace/latest/userguide/integrating-mcp.html
- https://docs.aws.amazon.com/marketplace/latest/userguide/bedrock-agentcore-gateway.html
- https://docs.aws.amazon.com/marketplace/latest/userguide/seller-eligibility.html

## 2. Existing DSG product surface

The Marketplace surface should be the narrow governance server, not the broad `/api/mcp` gateway:

```text
/api/mcp/governance
```

It exposes:

```text
dsg.governance.preflight
```

Verified repository capabilities:

1. MCP JSON-RPC over HTTP.
2. `initialize`, `tools/list`, `tools/call`.
3. API-key authentication through `validateStoredUnifiedMcpKey`.
4. approved-plan lookup.
5. deterministic plan-alignment evaluation.
6. execution-role checks.
7. `PASS | BLOCKED | WAITING_PERMISSION | UNVERIFIED`.
8. `DO_NOT_EXECUTE | CONTINUE_TO_TARGET`.
9. hash-linked audit persistence in `dsg_audit_events`.
10. OpenAPI 3.1 governance surface with `x-dsg-api-key`.

Relevant code:

- `app/api/mcp/governance/route.ts`
- `lib/dsg/governance-plugin.ts`
- `app/api/dsg/governance/openapi/route.ts`

This is the correct product positioning: **governed execution gateway**, not a generic agent platform.

## 3. MCP protocol compatibility boundary

The current dedicated MCP route returns:

```text
protocolVersion = 2024-11-05
```

AWS Marketplace's published MCP integration requirements require JSON-RPC 2.0, capability discovery, authentication/session handling, and error handling. The listing documentation does not identify one single MCP protocol version as the only accepted version.

For DSG's current **API key** authentication path, AWS documents AgentCore integration through the existing OpenAPI specification. Direct MCP endpoint integration into AgentCore without OpenAPI is the separate two-legged OAuth path.

Therefore this package does **not** change the protocol version merely to advertise a newer number. A real AWS Marketplace-compatible client validation remains a launch gate. Compatibility must be demonstrated rather than inferred.

## 4. Production hosting and verified live blocker

Production authority:

```text
config/production-deployment-target.json
provider = AZURE_APP_SERVICE
```

Candidate origin:

```text
https://dsg-control-plane.azurewebsites.net
```

Candidate Marketplace MCP endpoint:

```text
https://dsg-control-plane.azurewebsites.net/api/mcp/governance
```

GitHub Actions run `33954260838` observed on 2026-09-05T08:04:30Z:

| Path | HTTP |
|---|---:|
| `/api/health` | 200 |
| `/api/dsg/v1/runtime` | 404 |
| `/api/mcp/governance` | 404 |
| `/api/dsg/governance/openapi` | 404 |

The Azure application is alive, but the deployed bundle does not contain the current governance/runtime routes. The governance MCP route entered `main` on 2026-09-01, while the latest checked-in Azure production proof found during this work predates that merge.

Current machine-readable state:

```text
BLOCKED_STALE_PRODUCTION_IMAGE_HTTP_404
```

See `docs/evidence/AWS_MARKETPLACE_MCP_LIVE_BLOCK_2026-09-05.md`.

## 5. First-product fulfillment decision

Recommended first product:

```text
Fulfillment = Redirect to Website
Authentication = API Key
Endpoint = static /api/mcp/governance
AgentCore = OpenAPI integration path
```

Reason: DSG already owns customer onboarding and API-key lifecycle, so Redirect to Website minimizes new delivery work for the first enterprise pilot.

### Important irreversible choice

AWS states that **the fulfillment method cannot be changed after the product is published**.

Therefore:

- `Redirect to Website` is not described as a temporary phase that can later be switched to Quick Launch on the same published product;
- if Quick Launch is required, choose it before publication or use a separate listing/product strategy;
- Quick Launch would additionally require the AWS Marketplace Deployment API path and key delivery workflow.

The current package deliberately selects Redirect to Website **before publication**, subject to final seller validation.

## 6. Recommended listing configuration

| AWS field | DSG candidate | Status |
|---|---|---|
| Product title | DSG Spacetime — Governed MCP Execution Gateway | PACKAGE LOCKED |
| Delivery method | API-Based Agents & Tools | PASS |
| Type | MCP server | PASS |
| Integration protocol | MCP | PASS |
| Endpoint | `/api/mcp/governance` on Azure production origin | BLOCKED: LIVE 404 |
| Endpoint type | Static | SELECTED |
| Authentication | API Key | CODE EXISTS |
| Fulfillment | Redirect to Website | SELECTED, NOT PUBLISHED |
| Quick Launch | Not selected for this product | N/A |
| AgentCore | OpenAPI path for API-key product | CODE SURFACE EXISTS; AWS VALIDATION PENDING |
| Pricing | Decide only with commercial adapter design | BLOCKED |
| Private offer | After public-listing prerequisite | BLOCKED |

## 7. Commercial integration gaps

The direct MCP product type reduces packaging work. It does not turn the Stripe billing path into AWS Marketplace fulfillment.

Repository inspection does not prove implementation of:

- `ResolveCustomer`;
- contract entitlement/subscription processing for the selected pricing model;
- AWS account/license/agreement identity suitable for concurrent agreements;
- Marketplace usage metering when usage pricing is selected;
- subscription/entitlement change processing;
- provider isolation proving an AWS Marketplace buyer cannot also enter the Stripe charge path.

The current `billing_subscriptions` model is Stripe-specific (`stripe_subscription_id`, `stripe_customer_id`). The entitlement decision layer can be reused, but AWS Marketplace identity/agreement state should not be forced into Stripe identifiers.

Paid launch status:

```text
MCP PACKAGE:              READY
AZURE LIVE MCP:           BLOCKED — stale deployed bundle
AWS CLIENT COMPATIBILITY: PENDING REAL VALIDATION
SELLER ELIGIBILITY:       UNVERIFIED OUTSIDE REPO
AWS COMMERCIAL BINDING:   NOT IMPLEMENTED
PAID PUBLIC LAUNCH:       NO-GO
PRIVATE OFFER:            NO-GO
```

## 8. Seller eligibility boundary

Seller eligibility, tax, banking/KYC and AWS Marketplace account approval are external account facts. The repository cannot prove them.

Do not mark a paid listing eligible until AWS Partner Central / Marketplace seller state is checked directly for the actual selling entity.

## 9. Required E2E evidence

### A. Live discovery

```text
AWS-compatible client
  → POST initialize
  → POST tools/list
  → discovers dsg.governance.preflight
```

Required evidence:

- exact production URL;
- HTTP status;
- server identity;
- protocol version;
- tool/schema;
- authentication/error behavior;
- timestamp and deployed commit where available.

### B. Approved-plan ALLOW

```text
real API key
  → real stored approved planHash
  → dsg.governance.preflight
  → policyAllowsAction = true
  → shouldBlock = false
  → audit persisted = true
  → CONTINUE_TO_TARGET
```

### C. Outside-plan BLOCK

```text
same authenticated org in ENFORCE mode
  → operation outside approved plan
  → status = BLOCKED
  → shouldBlock = true
  → audit persisted = true
  → DO_NOT_EXECUTE
```

No fake plan fixture or API key is permitted. Missing real inputs means the authenticated E2E remains pending.

## 10. Verification added in PR #1218

Static verifier:

```text
scripts/verify-aws-marketplace-mcp-package.mjs
```

CI:

```text
.github/workflows/aws-marketplace-mcp-readiness.yml
```

The workflow has two distinct meanings:

- static package checks verify repository contracts;
- live-state checks verify that the declared production state matches observed HTTPS behavior.

When the contract says `BLOCKED_STALE_PRODUCTION_IMAGE_HTTP_404`, CI expects health=200 and the current runtime/MCP/OpenAPI routes=404 and reports:

```text
AWS_MARKETPLACE_MCP_LIVE_STATE=BLOCKED_AS_DECLARED
```

That is **not** a live MCP pass. After a governed Azure deployment changes those responses, CI must fail until the contract is updated and full live discovery succeeds.

Authenticated ALLOW/BLOCK verification remains optional only because it requires real secret/plan inputs. Absence of those inputs produces SKIP, never fabricated evidence.

## 11. Execution order

```text
1. Merge the packaging PR after relevant CI passes.
2. Resolve the exact new current-main SHA.
3. Create the audited pending production promotion through the existing authenticated promotion API.
4. Run the protected Azure production promotion workflow.
5. Re-run AWS Marketplace MCP live discovery.
6. Validate MCP discovery/auth/error handling with a real AWS-compatible client.
7. Run real approved-plan ALLOW + audit proof.
8. Run real outside-plan BLOCK + audit proof.
9. Verify the actual AWS Marketplace seller account/entity eligibility.
10. Create the API-Based Agents & Tools product with MCP Server + MCP + static endpoint.
11. Keep Redirect to Website as the chosen fulfillment method for this product.
12. Choose the pricing model.
13. Implement the corresponding AWS Marketplace registration/entitlement/metering adapter.
14. Prove AWS/Stripe provider isolation and no double billing.
15. Validate the limited-visibility listing with test buyer account(s).
16. Request public visibility only after all gates pass.
17. Create private offers only when the AWS prerequisite is actually satisfied.
```

## 12. What is not valid proof

Do not use these as paid AWS fulfillment proof:

- old AWS Marketplace readiness documents with superseded hosting assumptions;
- lead-capture webhook docs;
- Stripe checkout/webhook success;
- static route existence without live deployment;
- `BLOCKED_AS_DECLARED` CI success;
- a generic HTTP client test in place of an AWS-compatible client compatibility test.

## Current verdict

**GO:** package DSG Spacetime as an AWS Marketplace MCP Server using the existing governed MCP surface and Azure runtime.  
**BLOCKED:** current Azure deployment does not yet expose the route.  
**NO-GO:** paid launch/private offer until live MCP, real ALLOW/BLOCK evidence, seller validation and AWS commercial binding all pass.
