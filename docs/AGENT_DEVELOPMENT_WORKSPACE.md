# DSG Agent Development Workspace

Status: development implementation on Draft PR #1054

## Purpose

This workspace lets authenticated DSG agents finish an approved development plan without asking for approval before every repository edit, development migration, preview deployment, test, browser action, or development-tool registration.

Development and preview actions are authorized from the recorded plan and renewable agent lease. Production remains globally locked. A production deployment is possible only through the manual `Promoted Production Deployment` workflow after current evidence passes for the exact current `main` commit.

## Verified development resources

| Resource | Development target |
|---|---|
| Workspace key | `dsg-agent-dev` |
| Owner organization | `472a1980-f79b-4b09-9e79-e0a670da73f6` |
| Repository | `tdealer01-crypto/tdealer01-crypto-dsg-control-plane` |
| Branch pattern | `agent-workspace/*` |
| Supabase | `zeyguilldygozufpgxms` (`dsg-control-plane-dev`) |
| Vercel project | `prj_k02PTNzCJRBN5CcRtg6hFdd0HjuW` |
| Vercel development target | Preview |
| Stripe account | `acct_1Tft0OAZNzhgTUPV` |
| Stripe development mode | Test |
| Production flags | Permanently locked |

The IDs above were verified against the connected services. Repository deployments still require the corresponding GitHub secrets and Vercel project access.

## Membership

An agent must:

- exist in `agents`
- have `status=active`
- belong to the workspace owner organization
- hold an explicit active lease for its exact agent ID

Wildcard leases are rejected by the authorization RPC. A historical wildcard lease remains only as a revoked record because audit references are append-only.

When an organization administrator bootstraps the workspace without supplying `agentIds`, the API grants leases to all currently active agents in that administrator's organization. Agents from other organizations are excluded.

## One-time bootstrap, no repeated setup

Agents load the current plan hash, lease, resource references, and tool registry from the context endpoint:

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
- `APP_URL` or `NEXT_PUBLIC_APP_URL` when the service is not at `http://localhost:3000`

```bash
node scripts/bootstrap-agent-workspace.mjs
```

It does not require the service-role key, a copied Supabase URL, or a manually maintained plan hash. Updating the approved plan intentionally changes the database-owned hash, and the next context load returns the new value.

## Authorization model

Each action checks:

1. workspace is active and explicitly scoped to an organization
2. authenticated agent organization equals workspace organization
3. submitted plan hash equals the database-authoritative hash
4. exact active agent lease contains the requested scope and environment
5. repository mutation identifies a branch matching `agent-workspace/*`
6. development and production scope namespaces do not overlap
7. production authorization supplies an approved, unexpired promotion and the exact promoted commit SHA

Every allow and denial is appended to `agent_workspace_audit_events`. Referenced workspace, lease, and promotion records cannot be deleted from under the audit evidence.

## Autonomous development scopes

No repeated human approval is required for these scopes inside development or preview:

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

`repo.write`, `repo.commit`, `repo.branch.*`, and `repo.pr.*` require `evidence.branch` or `evidence.head_branch` matching `agent-workspace/*`. A direct development write targeting `main` is denied.

GitHub merge enforcement is not claimed by this subsystem. Merging uses the repository's PR checks and branch rules. Production is safe from an accidental merge because the normal deployment workflow no longer contains a production deployment job.

## Production scopes

The database recognizes these external production mutation namespaces:

- `deploy.production`
- `database.production.*`
- `stripe.live.*`

Only `deploy.production` currently has a complete trusted release workflow. Production database and Stripe live mutation scopes remain blocked until dedicated workflows with equivalent evidence, rollback, and finalization controls are implemented.

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

Tool registration is development/preview only. Tool scopes must match the development scope set. Raw secrets, credentials embedded in URLs, URL query strings/fragments, private keys, bearer tokens, and Stripe keys are rejected. New tools always start with `production_enabled=false`.

## Request a production deployment

An organization administrator creates a pending request after the candidate commit is the current `main` head:

```http
POST /api/agent-workspaces/promotions
Content-Type: application/json

{
  "action": "request",
  "workspaceId": "<workspace-id>",
  "commitSha": "<exact-current-main-sha>",
  "requestedScopes": ["deploy.production"],
  "reason": "release candidate passed PR checks"
}
```

The API cannot approve a promotion. It creates `status=pending` only. An organization administrator may reject a pending or approved request.

## Trusted production workflow

Run `.github/workflows/promoted-production-deploy.yml` manually with:

- `promotion_id`
- `commit_sha`
- `workspace_key=dsg-agent-dev`

The workflow runs in the GitHub `production` environment and performs, in order:

1. validate inputs
2. verify checked-out commit equals the exact current `main` head
3. install under Node 24
4. check release-script syntax
5. run TypeScript typecheck
6. run the full unit suite
7. run migration tests
8. run `npm audit --audit-level=high`
9. run the application production build
10. deploy the exact commit to Vercel Preview
11. verify Preview `/api/health`
12. locate and health-check the current READY production deployment as the rollback target
13. write trusted CI evidence and approve the exact pending promotion
14. request `deploy.production` authorization for the exact commit
15. build and deploy the prebuilt exact commit to Vercel Production
16. verify Production `/api/health`
17. mark the promotion `executed`, making it terminal and single-use

If production health fails, the workflow invokes Vercel rollback to the previously verified deployment, rejects the promotion, and fails the run. If an earlier step fails, the pending or approved promotion is rejected.

The Vercel CLI is pinned in workflow code instead of using `@latest`.

## Required GitHub configuration

Existing deployment secrets:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Agent workspace release secrets:

- `AGENT_WORKSPACE_SUPABASE_URL` — URL of `zeyguilldygozufpgxms`
- `AGENT_WORKSPACE_SUPABASE_SERVICE_ROLE_KEY` — service-role key for the workspace control database
- `AGENT_WORKSPACE_RELEASE_AGENT_ID` — exact active agent ID in the owner organization with `deploy.production` lease scope

Secret values must be stored in GitHub Secrets or the protected `production` environment, never in repository files or audit payloads.

The `production` GitHub environment should require final reviewer approval. This is one release-level approval, not repeated permission for development actions.

## Promotion evidence boundary

A database trigger rejects approval unless all checks are `pass` and the row includes:

- trusted approval mode
- matching promotion ID
- matching commit SHA
- GitHub Actions run URL
- Preview URL
- rollback URL
- 64-character evidence hash
- future expiry
- CI-formatted approver identity and timestamp

The production authorization RPC independently compares the supplied commit with the promoted commit. A mismatch is denied even when every other field is valid.

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

Verified in the development project:

- owner-organization and exact-agent lease enforcement
- plan hash enforcement
- development allow and production deny paths
- branch-pattern enforcement
- development/production scope separation
- incomplete evidence rejection
- manual approver rejection
- trusted-CI provenance acceptance
- exact commit binding
- promotion state transitions
- permanent production-lock flags

Not yet claimed:

- current PR CI is green
- GitHub production secrets are configured
- Vercel Preview for this exact PR is healthy
- production deployment workflow has been executed successfully
- production database or Stripe live mutation workflow exists

Those statuses require current external evidence for the exact commit.
