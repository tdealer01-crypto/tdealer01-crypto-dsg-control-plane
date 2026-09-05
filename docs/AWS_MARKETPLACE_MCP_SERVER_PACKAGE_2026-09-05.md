# DSG Spacetime — AWS Marketplace MCP Server Package

**Assessment date:** 2026-09-05  
**Repository:** `tdealer01-crypto/tdealer01-crypto-dsg-control-plane`  
**Product candidate:** **DSG Spacetime — Governed MCP Execution Gateway**  
**Marketplace product path:** **API-Based Agents & Tools → MCP → MCP server**  
**Decision:** **ACT NOW on packaging; NO-GO for paid public launch until seller + Marketplace commercial integration + live E2E evidence pass.**

This document supersedes the *packaging decision* in `docs/AWS_MARKETPLACE_PRIVATE_OFFER_READINESS_2026-08-12.md`. That earlier document remains valid historical evidence for the commercial integration gaps it found. It does not need to be deleted.

## 1. Why this path is now the shortest valid AWS route

AWS Marketplace now has a dedicated SaaS API-based AI agents and tools listing flow. The listing wizard explicitly supports:

- Delivery method: API-Based Agents & Tools
- AI tool type: MCP Server
- Integration protocol: MCP
- static or dynamic MCP endpoint URL
- Redirect to Website or Quick Launch fulfillment
- API key or OAuth authentication
- optional Amazon Bedrock AgentCore integration

Official AWS references:

- https://docs.aws.amazon.com/marketplace/latest/userguide/listing-saas-ai-agents.html
- https://docs.aws.amazon.com/marketplace/latest/userguide/integrating-api-ai-agents-tools.html
- https://docs.aws.amazon.com/marketplace/latest/userguide/bedrock-agentcore-gateway.html
- https://docs.aws.amazon.com/marketplace/latest/userguide/seller-eligibility.html
- https://docs.aws.amazon.com/marketplace/latest/userguide/creating-private-offer.html

AWS also allows the API deployment option to use vendor-hosted endpoints. A product does not need to move its runtime to AWS merely to be an API-based Marketplace product. The separate **Deployed on AWS** designation has stricter hosting requirements and is not claimed here.

## 2. Repo evidence: the MCP product surface already exists

The correct Marketplace surface is **not** the broad `/api/mcp` gateway. The narrow product surface already exists:

```text
/api/mcp/governance
```

It exposes one focused MCP tool:

```text
dsg.governance.preflight
```

The current code provides:

1. MCP JSON-RPC over HTTP
2. `initialize`
3. `tools/list`
4. `tools/call`
5. API-key authentication through `validateStoredUnifiedMcpKey`
6. approved-plan lookup
7. deterministic plan-alignment evaluation
8. execution-role check
9. `PASS | BLOCKED | WAITING_PERMISSION | UNVERIFIED`
10. `DO_NOT_EXECUTE | CONTINUE_TO_TARGET`
11. persisted hash-linked audit evidence in `dsg_audit_events`

Relevant code:

- `app/api/mcp/governance/route.ts`
- `lib/dsg/governance-plugin.ts`
- `app/api/dsg/governance/openapi/route.ts`

The OpenAPI route already declares `x-dsg-api-key` authentication and the corresponding REST governance preflight operation. This gives DSG a code surface compatible with the AWS-documented AgentCore option for API-key-authenticated MCP/API products, subject to AWS-side validation.

## 3. Production hosting boundary

Current production authority is:

```text
config/production-deployment-target.json
provider = AZURE_APP_SERVICE
```

The repository explicitly states that Vercel and Render are not active DSG production targets.

Marketplace package candidate:

```text
Static MCP endpoint path:
/api/mcp/governance

Candidate Azure origin from current production authority:
https://dsg-control-plane.azurewebsites.net

Candidate listing endpoint:
https://dsg-control-plane.azurewebsites.net/api/mcp/governance
```

**Important:** the candidate URL is not marked LIVE merely because the route and Azure origin exist in the repository. Run the live verifier against the exact production origin before entering the URL in AWS Marketplace.

## 4. Recommended first listing configuration

Use the minimum product surface needed to sell the existing capability:

| AWS field | DSG candidate | Current status |
|---|---|---|
| Product title | DSG Spacetime — Governed MCP Execution Gateway | LOCKED FOR PACKAGE |
| Delivery method | API-Based Agents & Tools | PACKAGE PASS |
| Type | MCP server | PACKAGE PASS |
| Integration protocol | MCP | PACKAGE PASS |
| Endpoint | `/api/mcp/governance` on exact production origin | LIVE VERIFY REQUIRED |
| Endpoint type | Static | RECOMMENDED |
| Authentication | API Key | CODE EXISTS |
| Fulfillment | Redirect to Website | RECOMMENDED INITIAL PATH |
| Quick Launch | Later | NOT IMPLEMENTED |
| AgentCore integration | OpenAPI path for API-key-authenticated product | CODE SURFACE EXISTS; AWS VALIDATION REQUIRED |
| Paid pricing | Select only after seller + billing integration design | BLOCKED |
| Private offer | After active public listing | BLOCKED |

### Why Redirect to Website first

DSG already has its own account and API-key lifecycle. Redirect to Website therefore avoids building Quick Launch delivery before the first Marketplace validation.

This does **not** remove AWS Marketplace billing/customer identity requirements. Once a customer subscribes through Marketplace, DSG still has to perform the AWS-required registration and pricing-model integration instead of treating the customer as an ordinary Stripe buyer.

## 5. Commercial integration gaps that still block paid launch

The direct MCP product type reduces packaging work. It does not make the existing Stripe path an AWS Marketplace fulfillment implementation.

Current repository code search still does **not** prove the following Marketplace integration:

- `ResolveCustomer`
- contract entitlement verification / subscription state appropriate to the chosen pricing model
- Concurrent Agreements-safe AWS buyer/agreement identity
- Marketplace usage metering when usage pricing is selected
- subscription/entitlement change processing
- provider isolation proving AWS Marketplace buyers cannot be double-billed through Stripe
- Quick Launch `PutDeploymentParameter` integration

Therefore the paid product status remains:

```text
MCP PRODUCT SURFACE:      READY FOR PACKAGE VALIDATION
LIVE MCP DISCOVERY:       NOT YET PROVED BY THIS PR
SELLER ELIGIBILITY:       UNVERIFIED OUTSIDE REPO
AWS COMMERCIAL BINDING:   NOT IMPLEMENTED
PAID PUBLIC LAUNCH:       NO-GO
PRIVATE OFFER:            NO-GO
```

## 6. Seller eligibility is an external hard gate

AWS currently requires paid-product sellers to be a permanent resident/citizen of an eligible jurisdiction or a business entity organized/incorporated in an eligible jurisdiction, plus required tax, bank and verification steps.

The current AWS eligible-jurisdiction list does **not** include Thailand.

This repository does not prove the seller's legal entity, residency, bank jurisdiction, tax status, KYC state or AWS Marketplace seller approval. Therefore:

- do **not** mark the paid listing eligible from repo evidence alone;
- if the intended seller is Thailand-only, AWS's current paid-seller jurisdiction rule is a blocker;
- if an eligible-jurisdiction business entity/residency exists, verify it directly in AWS Partner Central / Marketplace seller settings before paid listing work proceeds.

A free listing has different eligibility requirements, but it does not satisfy a revenue objective by itself.

## 7. Required E2E proof before Marketplace submission

### A. Discovery proof

```text
AWS test client
  → GET /api/mcp/governance
  → POST initialize
  → POST tools/list
  → dsg.governance.preflight discovered
```

Evidence required:

- exact production URL
- HTTP status
- MCP server identity
- protocol version
- tool name/schema
- timestamp / commit SHA where available

### B. Approved-plan ALLOW proof

```text
real authenticated Marketplace-style client
  → dsg.governance.preflight
  → real approved planHash already persisted for the org
  → plan alignment PASS
  → execution permission PASS
  → policyAllowsAction = true
  → shouldBlock = false
  → audit persisted = true
  → CONTINUE_TO_TARGET
```

Do not invent an approved plan fixture. Use a real stored plan and a real issued DSG API key.

### C. Outside-plan BLOCK proof

```text
same authenticated client/org in ENFORCE mode
  → action outside the stored approved plan
  → status = BLOCKED
  → shouldBlock = true
  → audit persisted = true
  → DO_NOT_EXECUTE
```

Observe mode is not sufficient evidence for this case because Observe intentionally does not block downstream execution.

## 8. Verifier added by this package

Static verification:

```bash
node scripts/verify-aws-marketplace-mcp-package.mjs
```

Expected final line when repository contracts pass:

```text
AWS_MARKETPLACE_MCP_PACKAGE=STATIC_PASS_LIVE_AND_COMMERCIAL_VALIDATION_PENDING
```

Live discovery verification:

```bash
AWS_MARKETPLACE_MCP_BASE_URL=https://<exact-production-origin> \
  node scripts/verify-aws-marketplace-mcp-package.mjs
```

Authenticated ALLOW/BLOCK verification additionally requires:

```text
DSG_MARKETPLACE_MCP_API_KEY
DSG_MARKETPLACE_ALLOW_CASE_JSON
DSG_MARKETPLACE_BLOCK_CASE_JSON
```

The two JSON fixtures must describe real plan-bound cases. The verifier intentionally skips authenticated E2E rather than fabricating data when they are absent.

CI workflow:

```text
.github/workflows/aws-marketplace-mcp-readiness.yml
```

PR/push runs the static package contract. `workflow_dispatch` can run live discovery against an operator-supplied exact production origin.

## 9. AWS seller/listing execution order

```text
1. Verify AWS Marketplace seller profile/account
2. Verify paid-seller jurisdiction + tax + banking/KYC state
3. Run live MCP discovery against exact Azure production endpoint
4. Create API-Based Agents & Tools product
5. Select MCP Server + MCP + static endpoint
6. Choose Redirect to Website for the initial package
7. Enter usage/auth documentation and existing OpenAPI surface
8. Choose pricing model
9. Implement the corresponding AWS Marketplace registration/billing adapter
10. Prove no Stripe/AWS double billing
11. Run approved-plan ALLOW E2E with audit evidence
12. Run outside-plan BLOCK E2E with audit evidence
13. Submit limited-visibility/test listing and validate AWS review feedback
14. Publish public listing only after all launch gates pass
15. Create private offer only after at least one active public listing exists
```

## 10. What not to reuse as proof

Do not use these historical artifacts as current paid-fulfillment proof:

- `docs/analysis/dsg_aws_marketplace_readiness.md` — contains older hosting/packaging assumptions and should not override current Azure production authority.
- `docs/AWS-MARKETPLACE-WEBHOOK-SETUP.md` — lead-capture webhook documentation is not Marketplace subscription/entitlement fulfillment evidence.
- Stripe billing implementation — valid for direct Stripe customers, not proof of AWS Marketplace customer entitlement or metering.

## 11. Go / No-Go matrix

| Gate | Status |
|---|---|
| Focused MCP governance route exists | PASS (code) |
| Plan alignment + execution decision exists | PASS (code) |
| Audit persistence path exists | PASS (code) |
| OpenAPI for API-key surface exists | PASS (code) |
| Azure production authority exists | PASS (repo authority) |
| Exact live MCP endpoint discovery | PENDING LIVE TEST |
| Real ALLOW case + audit | PENDING LIVE TEST |
| Real BLOCK case + audit | PENDING LIVE TEST |
| AWS paid-seller eligibility | UNVERIFIED EXTERNAL |
| AWS Marketplace customer registration/billing adapter | BLOCKER |
| Provider isolation / no double billing | BLOCKER |
| Public AWS listing | NOT YET |
| Private offer | BLOCKED UNTIL PUBLIC LISTING |

### Current verdict

**GO for AWS Marketplace MCP packaging and validation.**  
**NO-GO for paid launch/private offer until the external seller gate, AWS commercial binding and live ALLOW/BLOCK evidence pass.**
