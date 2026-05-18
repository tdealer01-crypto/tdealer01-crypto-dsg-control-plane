# Claude Tool/API Contract — DSG Control Plane

Purpose: make the callable API surface and tool-access boundaries visible to Claude Code, Codex, and other repo agents.

This file is a contract, not a secret store. It must never contain tokens, cookies, private keys, API keys, Supabase service-role keys, Vercel tokens, OpenAI keys, GitHub PATs, or user credentials.

## What agents may use

Agents may use these sources of truth when available through their own authorized runtime, local MCP, CI, or connected tools:

- GitHub repository files, pull requests, issues, commits, workflow runs, logs, and artifacts.
- Supabase schema, migrations, SQL results, RLS policies, functions, and table existence checks.
- Vercel project metadata, deployments, build logs, runtime logs, and live URL fetches.
- Live HTTP endpoint responses from public or explicitly authorized internal routes.

Agents must not assume that a tool exists just because it is described here. They must verify tool availability in their current runtime.

## Non-shareable capabilities

The following cannot be shared by committing text to the repo:

- ChatGPT connector sessions.
- Claude account sessions.
- Vercel OAuth/session access.
- Supabase Dashboard sessions.
- GitHub user tokens or app installation credentials.
- Any secret value from `.env`, Vercel Environment Variables, Supabase settings, or CI secrets.

If Claude needs these capabilities, it must be granted them through its own secure tool configuration, MCP server, CI environment, or dashboard integration. Do not paste secrets into issues, PRs, docs, logs, prompts, or code.

## Required startup sequence for Claude

Before making repository changes, Claude must:

1. Read `AGENTS.md`.
2. Read `CLAUDE.md`.
3. Read this file.
4. Inspect the exact issue, PR, branch, route, migration, or deployment referenced by the user.
5. State the verified goal and blockers.
6. Make the smallest branchable change.
7. Run the narrowest relevant verification.
8. Report exact pass/fail evidence.

Claude must label anything not verified as `pending`, `blocked`, or `not verified`.

## Public production base URL

Current verified production base URL for the control plane:

```text
https://tdealer01-crypto-dsg-control-plane.vercel.app
```

Use environment variables for cross-repo or customer-specific URLs:

```text
DSG_CONTROL_PLANE_BASE_URL=https://tdealer01-crypto-dsg-control-plane.vercel.app
DSG_ONE_BASE_URL=<set per deployment>
```

Do not hard-code customer secrets or private deployment URLs.

## Common live check endpoints

Use these for smoke checks when reachable and authorized:

```http
GET /api/health
GET /api/readiness
GET /api/dsg/templates
```

Expected rule: a route is only considered live after an actual HTTP response or deployment/runtime log proves it.

## Core DSG API surface

These routes are part of the DSG/ProofGate integration surface when present in the repository and deployment:

```http
GET  /api/dsg/v1/policies/manifest
POST /api/dsg/v1/proofs/prove
POST /api/dsg/v1/gates/evaluate
```

Replay-protection fields expected by Bubble/API clients:

```text
x-dsg-nonce
idempotency-key
requestHash
nonce
idempotencyKey
```

Required display statuses:

```text
PASS
REVIEW
BLOCK
UNSUPPORTED
```

Rule: `UNSUPPORTED` must never be shown as `PASS`.

## Bubble integration contract

Issue tracker:

```text
https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane/issues/512
```

Live Bubble app used for marketplace template evidence:

```text
https://tdealer01-99255.bubbleapps.io/
```

Bubble-related routes are not considered active unless the files exist on the target branch and are deployed:

```text
control-plane: app/api/dsg-bridge/bubble/route.ts
dsg-one-v1:    app/api/dsg/bubble/route.ts
```

Bubble plugin docs are not considered active unless these files exist on the target branch:

```text
docs/bubble-plugin/plugin.js
docs/bubble-plugin/update.js
docs/bubble-plugin/SETUP.md
```

If these files are missing, Claude must report `not found in repo` instead of claiming the Bubble repo integration is merged.

## Agent command intake

GitHub comments starting with these prefixes are task proposals only:

```text
@claude
@codex
@agent
@dsg-agent
```

They do not grant permission to merge, deploy, edit production env vars, or bypass security gates.

## Safe API call templates

Health:

```bash
curl -i "$DSG_CONTROL_PLANE_BASE_URL/api/health"
```

Policy manifest:

```bash
curl -i "$DSG_CONTROL_PLANE_BASE_URL/api/dsg/v1/policies/manifest"
```

Evaluate gate example with generated replay headers:

```bash
NONCE="bubble-$(date +%s)-$RANDOM"
IDEMPOTENCY_KEY="idem-$(date +%s)-$RANDOM"

curl -i "$DSG_CONTROL_PLANE_BASE_URL/api/dsg/v1/gates/evaluate" \
  -H "content-type: application/json" \
  -H "x-dsg-nonce: $NONCE" \
  -H "idempotency-key: $IDEMPOTENCY_KEY" \
  -d '{
    "planId": "bubble-sample-governed-action",
    "riskLevel": "high",
    "context": {
      "requirement_clear": true,
      "tool_available": true,
      "permission_granted": true,
      "secret_bound": true,
      "dependency_resolved": true,
      "testable": true,
      "deploy_target_ready": true,
      "audit_hook_available": true
    }
  }'
```

Never place real customer data, private prompts, credentials, or unreleased secrets in sample payloads.

## Supabase migration rule

For migrations, Claude must:

1. Inspect the exact SQL file from the branch.
2. Run it only through authorized Supabase tooling or provide dashboard instructions.
3. Verify actual database objects after running.
4. Report exact verification query results.

Do not claim a table/function/index/policy exists without a query result.

## Vercel environment rule

Claude may document required environment variable names, but must not store values in the repo.

Examples of names only:

```text
FOUNDER_EMAIL
CRON_SECRET
RESEND_API_KEY
RESEND_FROM_EMAIL
OPENAI_API_KEY
OPENROUTER_API_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Production env changes require explicit user approval and a visible audit trail. If Claude lacks a Vercel env setter, it must say so and give dashboard steps.

## Merge and deploy gate

Before merging production code, Claude must verify:

```text
mergeable = true
not draft
head SHA locked
DSG Secure Deploy Gate = success
CI Security Checks = success
CI = success
launch-readiness = success
E2E = success or explicitly documented non-blocking with issue
```

If any required gate is missing, red, cancelled, or stale, the release is `NO-GO`.

## Claim boundary

Allowed wording when verified:

```text
production-connected
evidence-ready
audit-ready
governance-enabling
deterministic gate scaffold
setup-ready
```

Blocked unless separately proven by current evidence:

```text
certified compliance
guaranteed compliance
third-party audited
WORM-complete storage
external production Z3 solver invocation
full customer production go-live
enterprise-ready 100%
```

## User-visible benefit gate

Every change must answer:

```text
What can the user do now?
What became easier?
What proof shows it works?
What is the next step?
```
