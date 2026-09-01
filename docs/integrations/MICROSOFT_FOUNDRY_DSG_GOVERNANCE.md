# Microsoft Foundry -> DSG Governance Plugin

## Product contract

Connect an existing agent to DSG before its target action executes.

```text
Existing Foundry agent / function dispatcher
  -> DSG governance preflight
  -> PASS | BLOCKED | WAITING_PERMISSION | UNVERIFIED
  -> target executor honors shouldBlock
  -> target API / MCP / workflow
```

DSG does not create a replacement agent. The customer keeps the existing agent and execution system.

## Connect surfaces

- MCP endpoint: `/api/mcp/governance`
- OpenAPI schema: `/api/dsg/governance/openapi`
- REST preflight: `/api/dsg/governance/preflight`
- Live dashboard: `/dashboard/governance-live`

The MCP endpoint exposes one narrow tool: `dsg.governance.preflight`.
The OpenAPI schema exposes one operation: `dsgGovernancePreflight`.

Authentication uses the existing DSG MCP API-key/OAuth validation. For Microsoft Foundry, store the DSG key in a Foundry project connection and inject it as the `x-dsg-api-key` header. Do not put the key in prompts, tool arguments, source code, or the OpenAPI document.

## Observe / Enforce ownership

Observe/Enforce is an organization-owned DSG setting. It is not accepted from agent tool arguments.

- `OBSERVE`: evaluate + persist audit, but `shouldBlock=false` even if the action is outside the plan.
- `ENFORCE`: set `shouldBlock=true` for `BLOCKED` or `WAITING_PERMISSION`.
- `UNVERIFIED`: a plan-authorized action can continue, but the unsupported claim remains unverified.

Only `org_admin` can change mode. The default for an organization without a settings row is `OBSERVE`.

This prevents an agent from downgrading `ENFORCE` to `OBSERVE` in its own tool call.

## Decision meanings

| Status | Meaning | Downstream action |
| --- | --- | --- |
| `PASS` | Action matches approved plan, execution role passes, evidence/claim boundary passes | Continue |
| `BLOCKED` | Action is outside the approved plan or no valid locked plan exists | Block only in Enforce mode |
| `WAITING_PERMISSION` | Authenticated actor lacks DSG execution role | Block only in Enforce mode |
| `UNVERIFIED` | Action is plan-authorized but the claim/evidence boundary is not satisfied | Continue action; do not assert the unsupported claim |

## Five-panel live output

Every persisted `governance_preflight` audit row records explicit status fields used by `/dashboard/governance-live`:

1. ACTION
2. PLAN ALIGNMENT
3. PERMISSION
4. EVIDENCE
5. EXECUTION / AUDIT

The live feed polls persisted audit rows every two seconds. It does not fabricate events when the feed is empty.

## Microsoft Foundry MCP setup

Use the deployed DSG base URL plus `/api/mcp/governance` as the remote MCP `server_url`.

Recommended first connection:

- project connection auth: custom key header `x-dsg-api-key`
- `allowed_tools`: only `dsg.governance.preflight`
- `require_approval`: `always` for first-success validation, then change deliberately for the customer's workflow

Microsoft Foundry can send custom headers to remote MCP servers. The DSG endpoint uses HTTP GET/POST and stateless JSON-RPC handling.

## Microsoft Foundry OpenAPI setup

Fetch the deployed `/api/dsg/governance/openapi` document and add it as an OpenAPI tool using a Foundry project connection for the `x-dsg-api-key` security scheme.

The caller sends action facts only. It does **not** send Observe/Enforce mode; DSG resolves mode server-side from the organization setting.

## Critical enforcement boundary

The current integration is a governance preflight, not a generic network proxy for every customer API.

`ENFORCE` is effective only when the customer's execution adapter treats `shouldBlock=true` as a hard deny **and does not retain a bypass path that can invoke the target directly**.

If an agent still has an independent direct target tool, DSG can record and return the correct decision but cannot physically prevent that separate tool from being called. Such an installation must not be described as interception-complete or network-enforced.

A transparent target proxy / MCP tool mirroring layer would be a separate execution-adapter capability.

## Verified source/runtime facts for this change

- The production source already contains a deterministic plan-alignment gate and server-side plan-contract repository.
- The live `dsg-control-plane-dev` database was missing `public.dsg_plan_contracts`; the idempotent restore migration was applied before this integration was opened for merge.
- `public.dsg_governance_settings` was added with RLS enabled so mode is owned server-side.
- Existing mock/scaffold `lib/spine/tool-handlers.ts` is not used by this integration.

## Production activation

Production remains bound to the repository's governed Azure App Service promotion path. The deployment trigger must build and verify the exact current `main` SHA; a green source CI run alone is not production evidence. This integration is eligible for production activation only after the governed deployment workflow verifies the Azure staging slot, image digest, runtime probes, proof persistence, and post-swap SHA/digest identity.

## Merge / production truth rule

Do not claim Microsoft Foundry E2E PASS from source code or database migration alone.

PASS requires, in order:

1. CI typecheck/tests/build pass on the integration branch/PR.
2. Merge/deploy completes to the intended Azure runtime.
3. Deployed MCP initialize + `tools/list` succeeds.
4. Deployed OpenAPI document loads.
5. A real approved-plan action produces a persisted live audit event.
6. Negative proof: an out-of-plan action returns `BLOCKED` and, with organization mode set to `ENFORCE`, returns `shouldBlock=true`.
7. Claim-boundary proof: a plan-authorized action with insufficient claim evidence returns `UNVERIFIED`, `claimAllowed=false`, and `shouldBlock=false`.
