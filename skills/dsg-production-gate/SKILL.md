---
name: dsg-production-gate
compatibility: >
  Requires Node.js 18+, a scoped DSG API key, an explicitly configured active
  HTTPS DSG gate URL and a separately pinned trusted origin. Never uses a retired host.
description: >-
  Call DSG ONE's real /api/dsg/v1/gates/evaluate or /api/dsg/v1/proofs/prove
  production API before an agent action. Return PASS, REVIEW, BLOCK, or
  UNSUPPORTED with proof identifiers and fail closed when production evidence
  cannot be obtained.
---

# DSG Production Gate

Use this skill when an agent must obtain a real DSG ONE governance decision or deterministic proof from the deployed control plane before acting.

## User outcome

The user should see five things immediately:

1. **Use** — set one API key and run one command.
2. **Result** — `PASS`, `REVIEW`, `BLOCK`, or `UNSUPPORTED` is printed as JSON.
3. **Evidence** — when supplied by the API, include `proofId`, `proofHash`, and `productionReadyClaim`.
4. **Fix** — authentication, entitlement, quota, rate-limit, malformed-response, and network failures return a concrete next action.
5. **Truth boundary** — no successful production claim is allowed unless the remote API actually returns the evidence for that request.

## Production endpoint

There is **no default base URL**. The old Render/Vercel control-plane domains are retired and explicitly denied. Use only an independently verified active gate origin; a configured URL alone is not evidence that an authenticated gate is deployed.

Routes used by this skill:

```text
POST /api/dsg/v1/gates/evaluate
POST /api/dsg/v1/proofs/prove
```

The current repository implementation for these routes requires authenticated DSG callers, applies org-scoped rate limiting, checks entitlement, and records governed usage. Do not replace these calls with a local mock when the task asks for a production decision.

## Authentication

Create a DSG API key with only the scopes needed by the caller:

- `gates:evaluate` for gate evaluation
- `proofs:prove` for proof generation

Set it in the environment:

```bash
export DSG_API_KEY='...'
```

Never print, persist, commit, or place the raw key in logs, issue bodies, evidence bundles, or agent responses.

Before setting a real API key, verify an active authorized gate endpoint and separately pin its exact HTTPS origin:

```bash
export DSG_CONTROL_PLANE_URL='https://your-reviewed-active-gate.example'
export DSG_TRUSTED_GATE_ORIGIN='https://your-reviewed-active-gate.example'
```

In GitHub Actions, configure `secrets.DSG_CONTROL_PLANE_URL` and `vars.DSG_TRUSTED_GATE_ORIGIN` with the **same independently approved, currently active** origin. The workflow checks this before loading the secret `DSG_API_KEY`. Missing/mismatched values, embedded credentials, query or fragment, non-HTTPS URLs, retired hosts and HTTP redirects all fail closed. Do not point this skill to the retired service or use it to infer DSG Spacetime approval.

## Evaluate an action

```bash
node skills/dsg-production-gate/scripts/dsg-production-gate.mjs evaluate \
  --risk high \
  --action deploy_production \
  --context '{"target":"production","change":"release-2026-08"}'
```

For larger context, pass a JSON file:

```bash
node skills/dsg-production-gate/scripts/dsg-production-gate.mjs evaluate \
  --risk medium \
  --context-file ./context.json
```

Optional fields:

```text
--plan-id <id>
--policy-ref <ref>
--policy-version <version>
--previous-proof-hash <hex>
--timeout <milliseconds>
--raw
```

The client generates a fresh replay-protection `nonce` and `idempotencyKey` for each call.

## Generate a proof

```bash
node skills/dsg-production-gate/scripts/dsg-production-gate.mjs prove \
  --risk medium \
  --plan-id plan_123 \
  --context-file ./context.json
```

## Decision contract

| Remote result | Agent behavior |
|---|---|
| `PASS` | May continue only when the API response itself is successful; preserve returned proof evidence. |
| `REVIEW` | Stop automated execution and surface the required review. |
| `BLOCK` | Stop. Do not execute the action. |
| `UNSUPPORTED` | Stop. Never convert to PASS. |
| Network/API/malformed response | Stop. Production decision is unverified. |

CLI exit codes:

```text
0   PASS / successful proof
2   local configuration or input error
3   remote/API/auth/quota/rate-limit/network error
10  REVIEW
11  BLOCK
12  UNSUPPORTED or non-passing proof
```

## Required agent response

After a production call, report only evidence actually returned by the API:

```text
Result: PASS | REVIEW | BLOCK | UNSUPPORTED
Can proceed: yes | no
Reason: <remote reason or explicit unavailable>
Proof ID: <remote proofId or unavailable>
Proof hash: <remote proofHash or unavailable>
Production-ready claim: true | false
Next action: <execute / obtain review / fix blocker / verify API>
```

Do not invent a proof hash, solver result, latency, entitlement tier, or production status.

## Failure handling

- `401/403`: check API key status and scopes.
- `402`: entitlement or quota blocked the request; fix entitlement before retrying.
- `429`: rate limit exceeded; retry only after the limit window.
- non-JSON or unexpected gate status: treat the response as malformed and do not execute.
- timeout/DNS/network error: production is unverified; do not fall back to a mock.

## Verification boundary

This skill is wired to the repository's current production API contract and defaults to Render. A successful live production invocation still depends on deployment reachability, a valid API key, active backing services, and current entitlements. If those are not directly verified in the current run, state that limitation rather than claiming the production call succeeded.
