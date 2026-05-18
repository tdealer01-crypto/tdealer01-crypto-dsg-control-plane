# Step 16D: Governed Memory Repository + API Routes

## Status

This step wires the Step 16C schema into server-side repository functions and development-gated API routes.

This is not a production auth claim. The route boundary still uses `x-dsg-*` headers only when `DSG_ALLOW_DEV_AUTH_HEADERS=true`.

## Added routes

| Route | Method | Permission | Purpose |
|---|---:|---|---|
| `/api/dsg/memory/ingest` | POST | `memory:write` | Insert a governed memory event into `dsg_memory_events`. |
| `/api/dsg/memory/search` | GET | `memory:read` | Search scoped memory for a workspace/job. |
| `/api/dsg/memory/gate` | POST | `memory:gate` + `memory:read` | Evaluate supplied memory items and record retrieval audit. |
| `/api/dsg/memory/context-pack` | POST | `memory:context_pack` + `memory:read` | Build a deterministic context pack and persist it. |

## Server files

- `lib/dsg/memory/request-context.ts`
- `lib/dsg/memory/memory-repository.ts`
- `lib/dsg/memory/route-utils.ts`

## Boundary

Routes fail closed unless all are true:

```text
DSG_ALLOW_DEV_AUTH_HEADERS=true
x-dsg-workspace-id is present
x-dsg-actor-id is present
x-dsg-permissions contains the route permission
SUPABASE_SERVICE_ROLE_KEY is configured server-side
```

The response includes a boundary object:

```json
{
  "trustBoundary": "development-header-context",
  "productionReadyClaim": false
}
```

This is intentional. Production auth/RBAC must replace the dev header boundary before any production claim.

## Example dev request

```bash
curl -X POST "$APP_URL/api/dsg/memory/ingest" \
  -H "content-type: application/json" \
  -H "x-dsg-workspace-id: <workspace-id>" \
  -H "x-dsg-actor-id: <actor-id>" \
  -H "x-dsg-actor-role: operator" \
  -H "x-dsg-permissions: memory:write" \
  -d '{
    "sourceType": "manual_note",
    "memoryKind": "policy",
    "rawText": "Memory must not override evidence.",
    "contentHash": "sha256-demo-hash"
  }'
```

## What this step does not complete

```text
[ ] Production auth provider binding
[ ] Workspace membership enforcement against dsg_workspace_memberships
[ ] Audit ledger hash-chain entry for every memory use
[ ] Evidence binding route
[ ] UI panels
[ ] End-to-end smoke proof
```

## Current truthful claim

```text
Step 16D = repository + dev-gated API foundation
Not production-ready
Not end-to-end verified
```
