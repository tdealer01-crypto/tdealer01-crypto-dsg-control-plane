# DSG Agent Development Workspace

Status: development implementation

## Purpose

This workspace lets an authenticated DSG agent complete an approved development plan without asking for approval before every file edit, development migration, preview deployment, test, browser action, or development-tool creation.

Development and preview are open within the recorded plan. Production is never globally unlocked. Each final production action requires a separate, short-lived promotion tied to complete evidence, an exact scope, and an exact commit SHA.

## Active development resources

| Resource | Verified development target |
|---|---|
| Workspace key | `dsg-agent-dev` |
| Owner organization | `472a1980-f79b-4b09-9e79-e0a670da73f6` |
| Repository | `tdealer01-crypto/tdealer01-crypto-dsg-control-plane` |
| Branch pattern | `agent-workspace/*` |
| Supabase | `zeyguilldygozufpgxms` (`dsg-control-plane-dev`) |
| Vercel project | `prj_k02PTNzCJRBN5CcRtg6hFdd0HjuW` |
| Vercel environment | Preview only |
| Stripe account | `acct_1Tft0OAZNzhgTUPV` |
| Stripe mode | Test only |
| Production flags | Permanently locked |

## Membership

The workspace is organization-scoped. An agent must:

- exist in `agents`
- be active
- belong to the workspace owner organization
- hold an explicit active lease for its exact agent ID

Wildcard leases are not accepted. The historical wildcard lease remains only as a revoked record because audit references are append-only.

When an organization administrator bootstraps the workspace without `agentIds`, the API grants leases to all currently active agents in that administrator's organization. Agents from other organizations are excluded.

## No repeated setup

Agents load their current plan hash, lease, resource references, and tool registry directly from the workspace context endpoint. A plan update changes the database-owned plan hash; the next context load returns the new value automatically.

```http
POST /api/agent-workspaces/context
Authorization: Bearer <DSG_AGENT_API_KEY>
Content-Type: application/json

{
  "agentId": "<agent-id>",
  "workspaceKey": "dsg-agent-dev"
}
```

The bootstrap script requires only:

- `DSG_AGENT_ID`
- `DSG_AGENT_API_KEY`
- application URL when it is not `http://localhost:3000`

It no longer requires a copied service-role key, Supabase URL, or manually maintained plan hash.

## Authorization model

The authorization decision checks:

1. active, explicitly organization-scoped workspace
2. authenticated agent organization equals workspace organization
3. submitted plan hash equals the database-authoritative hash
4. exact active agent lease contains the requested scope and environment
5. repository mutations identify a branch matching `agent-workspace/*`
6. production scope is used only with the production environment
7. production action supplies an approved, unexpired promotion and the exact promoted commit SHA

Every allow and denial is appended to `agent_workspace_audit_events`. Workspace, lease, and promotion records referenced by audit events use restrictive foreign keys and cannot be deleted from under the evidence.

## Autonomous development scopes

These scopes require no repeated human approval inside development or preview:

- `repo.read`
- `repo.branch.*`
- `repo.write`
- `repo.commit`
- `repo.pr.*`
- `database.dev.*`
- `database.preview.*`
- `deploy.preview.*`
- `stripe.test.*`
- `tool.*`
- `test.*`
- `build.*`
- `browser.local.*`
- `browser.preview.*`
- `logs.read`
- `evidence.*`
- `workspace.*`

`repo.write`, `repo.commit`, `repo.branch.*`, and `repo.pr.*` require `evidence.branch` or `evidence.head_branch` to match `agent-workspace/*`. Direct development writes to `main` are denied.

## Promotion-only scopes

Only these scopes may appear in a production promotion:

- `repo.merge.main`
- `deploy.production`
- `database.production.*`
- `stripe.live.*`

Development scopes do not overlap these namespaces. For example, `database.dev.write` cannot match `database.production.write`.

## Authorize a development action

```http
POST /api/agent-workspaces/authorize
Authorization: Bearer <DSG_AGENT_API_KEY>
Content-Type: application/json

{
  "agentId": "<agent-id>",
  "workspaceKey": "dsg-agent-dev",
  "scope": "repo.write",
  "environment": "development",
  "planHash": "<plan-hash-from-context>",
  "action": "edit_file",
  "target": "lib/example.ts",
  "evidence": {
    "branch": "agent-workspace/example",
    "reason": "implement approved plan task"
  }
}
```

An allowed response contains `plan_authorized_development_action`, workspace ID, lease ID, input hash, and `productionLocked: true`.

## Register a development tool

```http
POST /api/agent-workspaces/tools
Authorization: Bearer <DSG_AGENT_API_KEY>
Content-Type: application/json

{
  "agentId": "<agent-id>",
  "workspaceKey": "dsg-agent-dev",
  "environment": "development",
  "planHash": "<plan-hash-from-context>",
  "name": "verify-billing-outbox",
  "kind": "repo_script",
  "scope": "database.dev.read",
  "risk": "medium",
  "sourcePath": "scripts/verify-billing-outbox.mjs",
  "secretRefs": ["SUPABASE_SERVICE_ROLE_KEY"],
  "configuration": {
    "projectRef": "zeyguilldygozufpgxms"
  }
}
```

Only secret names or vault references may be stored. Raw secret values, private keys, bearer tokens, and Stripe keys are rejected. New tools always start with `production_enabled=false`.

## Production promotion

Required check keys, each set to `true`, `pass`, `passed`, `success`, or `green`:

- `typecheck`
- `unit_tests`
- `build`
- `preview_smoke`
- `migration_check`
- `security_check`
- `rollback_ready`

A promotion also requires:

- exact commit SHA
- exact promotion-only scopes
- 64-character evidence hash
- future expiry
- approver identity and approval timestamp

The database trigger blocks approval when any item is missing. The production authorization request must send both `promotionId` and the same `commitSha`:

```json
{
  "agentId": "<agent-id>",
  "workspaceKey": "dsg-agent-dev",
  "scope": "deploy.production",
  "environment": "production",
  "planHash": "<plan-hash-from-context>",
  "promotionId": "<approved-promotion-id>",
  "commitSha": "<exact-promoted-commit>",
  "action": "deploy"
}
```

A commit mismatch is denied even when the promotion is otherwise valid. The production flags remain locked before, during, and after the action; approval applies only to the recorded scope and commit until expiry.

## Emergency freeze

```sql
update public.agent_workspaces
set status = 'suspended', updated_at = now()
where workspace_key = 'dsg-agent-dev';

update public.agent_workspace_leases
set status = 'revoked', auto_renew = false, updated_at = now()
where workspace_id = (
  select id from public.agent_workspaces where workspace_key = 'dsg-agent-dev'
);
```

Resume only after inspecting append-only audit events and issuing new explicit leases.

## Truth boundary

This implementation proves that the development authorization model and database enforcement exist in the verified development project. It does not by itself prove that every external connector is configured, every preview deployment succeeds, or production is ready. Those claims require current CI, preview, integration, security, rollback, and promotion evidence for the exact release commit.
