# Step 16E: Governed Memory API Smoke

## Status

This step adds a repeatable smoke script for the governed memory API routes merged in Step 16D.

It does not claim production readiness. It proves only the dev-gated route path when the target app is configured with development headers enabled.

## Script

```bash
npm run smoke:memory-api
```

Underlying script:

```bash
scripts/dsg-memory-api-smoke.sh
```

## Required environment

Target app server must have:

```text
DSG_ALLOW_DEV_AUTH_HEADERS=true
NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

Smoke runner must provide:

```text
APP_URL=<deployed app or local app URL>
DSG_SMOKE_WORKSPACE_ID=<workspace id>
DSG_SMOKE_ACTOR_ID=<actor id>
DSG_SMOKE_ACTOR_ROLE=operator
```

## What the smoke verifies

```text
1. POST /api/dsg/memory/ingest returns ok=true and memory.id
2. GET /api/dsg/memory/search returns at least one matching memory
3. POST /api/dsg/memory/gate returns a valid gate status
4. POST /api/dsg/memory/context-pack returns contextHash
5. Every response contains productionReadyClaim=false
```

## What the smoke does not prove

```text
[ ] Production auth/RBAC
[ ] Workspace membership enforcement against dsg_workspace_memberships
[ ] Audit ledger hash-chain for every memory use
[ ] Evidence binding route
[ ] UI panels
[ ] Production traffic safety
```

## Correct claim after passing

```text
DEV_ROUTE_SMOKE_PASS = true
PRODUCTION = false
```

## Example

```bash
APP_URL="https://example.vercel.app" \
DSG_SMOKE_WORKSPACE_ID="00000000-0000-0000-0000-000000000001" \
DSG_SMOKE_ACTOR_ID="smoke-operator" \
npm run smoke:memory-api
```

Expected terminal result:

```text
PASS: Step 16E governed memory API smoke completed
NOTE: This proves dev-gated route path only. It is not a production auth/RBAC or production claim.
```
