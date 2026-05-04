# DSG Governed Memory Layer

## Status

Step 16C is a buildable governance foundation. It is not a production claim.

Do not mark this layer as implemented, verified, deployable, or production until the repository contains the routes, repository persistence, UI panels, migrations have been applied, and CI plus smoke evidence pass.

## Principle

Memory is not source of truth.

Memory is an evidence candidate that can help planning and review only after it is scoped, permissioned, gated, and bound to evidence/audit when used for claims.

```text
Memory found
  -> workspace scope valid?
  -> actor valid?
  -> permission valid?
  -> contains secret or PII?
  -> stale or conflicted?
  -> production/legal claim?
  -> verified by current evidence where required?
```

If a memory item fails those checks, the safe result is `BLOCK` or `REVIEW`, not silent use.

## Runtime insertion point

```text
Goal Lock
  -> Memory Wake-Up
  -> Memory Gate
  -> Context Pack
  -> Evidence Inspection
  -> Requirement/Risk Extraction
  -> Dependency DAG
  -> Plan Gate
  -> Approval
  -> Controlled Execution
  -> Evidence/Audit/Replay
  -> Completion Claim Gate
```

Evidence inspection must still inspect current repo, database, API, CI, deployment, and runtime state. Memory never overrides current evidence.

## Tables

- `dsg_memory_events`: verbatim memory events with trust/status/claim flags.
- `dsg_memory_edges`: knowledge graph edges between memory items.
- `dsg_memory_retrievals`: audit trail for scoped retrieval and gate result.
- `dsg_memory_context_packs`: exact context payloads produced from gated memory.

RLS is enabled with no broad client policies. Server-side DSG RBAC must mediate access.

## Permissions

Recommended permission names:

| Permission | Meaning |
|---|---|
| `memory:read` | Search/read scoped memory. |
| `memory:write` | Ingest memory events. |
| `memory:gate` | Evaluate memory gate. |
| `memory:context_pack` | Build context packs for planner/runtime. |
| `memory:read_secret` | Read secret-bearing memory. |
| `memory:read_pii` | Read PII-bearing memory. |
| `evidence:write` | Bind memory to evidence. |
| `audit:write` | Record memory use in the audit ledger. |

## Required API routes

Planned routes, not implemented by this PR:

| Route | Permission | Purpose |
|---|---|---|
| `POST /api/dsg/memory/ingest` | `memory:write` | Capture memory event. |
| `GET /api/dsg/memory/search` | `memory:read` | Search memory within workspace/job scope. |
| `POST /api/dsg/memory/gate` | `memory:gate` | Evaluate memory before use. |
| `POST /api/dsg/memory/context-pack` | `memory:context_pack` | Build context pack from gated memory. |
| `POST /api/dsg/memory/bind-evidence` | `memory:write` + `evidence:write` | Bind memory to evidence/audit. |
| `GET /api/dsg/jobs/:jobId/memory` | `job:read` + `memory:read` | Show memory used or available for a job. |

## UI panels

Planned panels, not implemented by this PR:

1. Memory Wake-Up Panel
2. Memory Gate Panel
3. Used Context Panel
4. Memory Conflict Panel

## Claim gate rules

Memory alone cannot satisfy these claim levels:

| Claim | Required proof |
|---|---|
| `IMPLEMENTED` | Code exists in repo and route/file evidence is present. |
| `VERIFIED` | Tests/build/smoke evidence passes. |
| `DEPLOYABLE` | Deployment proof passes. |
| `PRODUCTION` | Production flow proof passes with auth/RBAC/audit/evidence/replay verification. |

Examples that must block:

```text
Memory says CI passed, but no current CI evidence exists -> BLOCK
Memory says deployed, but no deployment proof exists -> BLOCK
Memory says production-ready, but no production flow proof exists -> BLOCK
```

## Acceptance checklist

```text
[ ] DB migration applied
[ ] Server-side RBAC repository added
[ ] Memory ingest API added
[ ] Memory search API added
[ ] Memory gate API added
[ ] Context pack API added
[ ] Evidence binding API added
[ ] Audit ledger writes on memory use
[ ] Memory Wake-Up UI panel added
[ ] Used Context UI panel added
[ ] Memory Conflict UI panel added
[ ] Tests prove memory cannot override evidence
[ ] Tests prove production claim from memory alone is BLOCK
[ ] Tests prove secret/PII memory requires permission/review
[ ] Tests prove stale/conflicted memory cannot auto-pass
```
