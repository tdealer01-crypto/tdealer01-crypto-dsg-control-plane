# DSG Agent Development Workspace

Status: development implementation

## Purpose

This workspace lets an authenticated DSG agent complete an approved development plan without asking for approval before every file edit, database migration, preview deployment, test, or development-tool creation.

The workspace does not grant unrestricted production access. Production mutation remains a separate, evidence-bound promotion step after development is complete.

## Active development resources

| Resource | Verified development target |
|---|---|
| Workspace key | `dsg-agent-dev` |
| Repository | `tdealer01-crypto/tdealer01-crypto-dsg-control-plane` |
| Branch pattern | `agent-workspace/*` |
| Supabase | `zeyguilldygozufpgxms` (`dsg-control-plane-dev`) |
| Vercel project | `prj_k02PTNzCJRBN5CcRtg6hFdd0HjuW` |
| Vercel environment | Preview only |
| Stripe account | `acct_1Tft0OAZNzhgTUPV` |
| Stripe mode | Test only |
| Production access | Locked |

Read the current `plan_hash` from `GET /api/agent-workspaces`. Do not hardcode a historical hash in an agent because updating the approved plan intentionally changes the hash.

## Authorization model

The authorization decision has four layers:

1. The workspace must be active.
2. The submitted `planHash` must equal the database-authoritative workspace plan hash.
3. An active lease must include the requested scope and environment.
4. A production action additionally requires an approved, unexpired promotion bound to an exact commit, evidence hash, and requested scope.

Every decision, including a denial, is inserted into the append-only `agent_workspace_audit_events` table.

## Default autonomous scopes

The following scopes run without repeated human approval in development or preview:

- `repo.*`
- `database.*`
- `deploy.preview.*`
- `stripe.test.*`
- `tool.*`
- `test.*`
- `build.*`
- `browser.*`
- `logs.read`
- `evidence.*`
- `workspace.*`

The following lease scopes exist only so an approved promotion can authorize a final production action:

- `deploy.production`
- `database.production.*`
- `stripe.live.*`

Possessing the lease does not unlock those scopes. The authorization RPC still denies them unless the environment is `production` and a valid promotion ID is supplied.

## Authorize an action

An agent uses its existing DSG agent ID and API key.

```http
POST /api/agent-workspaces/authorize
Authorization: Bearer <DSG_AGENT_API_KEY>
Content-Type: application/json

{
  "agentId": "<agent-id>",
  "workspaceKey": "dsg-agent-dev",
  "scope": "repo.write",
  "environment": "development",
  "planHash": "<current-plan-hash>",
  "action": "edit_file",
  "target": "lib/example.ts",
  "evidence": {
    "branch": "agent-workspace/example",
    "reason": "implement approved plan task"
  }
}
```

An allowed development response contains:

```json
{
  "ok": true,
  "allowed": true,
  "reason": "plan_authorized_development_action",
  "workspaceId": "...",
  "leaseId": "...",
  "productionLocked": true,
  "inputHash": "..."
}
```

## Create a development tool

Agents may register tools required to finish the approved plan:

```http
POST /api/agent-workspaces/tools
Authorization: Bearer <DSG_AGENT_API_KEY>
Content-Type: application/json

{
  "agentId": "<agent-id>",
  "workspaceKey": "dsg-agent-dev",
  "environment": "development",
  "planHash": "<current-plan-hash>",
  "name": "verify-billing-outbox",
  "kind": "repo_script",
  "scope": "database.read",
  "risk": "medium",
  "sourcePath": "scripts/verify-billing-outbox.mjs",
  "secretRefs": ["SUPABASE_SERVICE_ROLE_KEY"],
  "configuration": {
    "projectRef": "zeyguilldygozufpgxms"
  }
}
```

Only secret names or vault references may be stored. Raw secret values, private keys, bearer tokens, and Stripe keys are rejected.

New tools are always created with `production_enabled=false`.

## Production promotion

An organization administrator requests a promotion after the development branch has produced verifiable evidence.

Required fields:

- exact commit SHA
- exact requested production scopes
- structured checks, such as typecheck, tests, build, migration verification, preview smoke test, security checks, and rollback evidence
- evidence hash
- expiry

The promotion starts as `pending`. An organization administrator must approve it. The agent then supplies that promotion ID to the normal authorization endpoint for the exact production scope.

A promotion does not globally unlock production and does not disable `production_locked`. It authorizes only the recorded commit and scopes until expiry.

## Emergency freeze

To stop all autonomous workspace work immediately:

```sql
update public.agent_workspaces
set status = 'suspended', updated_at = now()
where workspace_key = 'dsg-agent-dev';

update public.agent_workspace_leases
set status = 'revoked', updated_at = now()
where workspace_id = (
  select id from public.agent_workspaces where workspace_key = 'dsg-agent-dev'
);
```

Resume only after inspecting the append-only audit events and issuing a new lease.

## Truth boundary

This implementation proves that the development authorization model and database enforcement exist. It does not by itself prove that every external connector is configured, every preview deployment succeeds, or production is ready. Those claims require current CI, preview, integration, and promotion evidence for the exact commit being released.
