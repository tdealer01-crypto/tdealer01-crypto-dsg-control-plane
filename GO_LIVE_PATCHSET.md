# Go-live blocker patchset

This branch records the exact production blockers identified from current files on `main` and the intended patch set.

## Confirmed blockers from current code

1. `app/api/quickstart/agent/route.ts`
   - hardcodes `policy_id: 'policy_default'`
   - returns `api_key: null` when starter agent already exists

2. `app/api/quickstart/execute/route.ts`
   - calls `/api/execute` through a second internal fetch hop instead of executing directly
   - depends on one-time API key from quickstart agent path

3. `lib/authz.ts`
   - requires `runtime_roles`
   - production schema currently uses `user_org_roles` and does not have `runtime_roles`

4. `app/api/agents/route.ts`
   - requires `policy_id` from request body
   - current dashboard agent page hardcodes `policy_default`

5. `app/dashboard/agents/page.tsx`
   - current UI is demo-only and lacks production form/error/edit/delete states

## Intended patch areas

- `lib/authz.ts`
  - fallback from `runtime_roles` to `user_org_roles`
  - normalize role names so `owner`/`admin` map to `org_admin`

- `app/api/quickstart/agent/route.ts`
  - resolve policy from DB
  - rotate and reissue one-time API key when starter agent already exists

- `app/api/quickstart/execute/route.ts`
  - remove internal HTTP hop
  - call `issueSpineIntent()` + `executeSpineIntent()` directly

- `app/api/agents/route.ts`
  - add rate limit, validation, pagination, batch usage lookup
  - align policy handling with real DB instead of hardcoded `policy_default`

- `app/api/agents/[id]/route.ts`
  - add GET/PATCH/DELETE management route

- `app/dashboard/agents/page.tsx`
  - add create form, loading/error state, refresh, inline edit, delete, pagination

- `app/api/policies/route.ts`
  - add safe read-only fallback for legacy `policies` table when `runtime_policies` is unavailable

## Status

Write access to create new files on this branch is confirmed.
Updating existing tracked files from this environment is blocked by the current GitHub tool path, which requires extra git-object metadata not exposed through the higher-level file update call here.

Use this branch and this patchset note as the handoff anchor for final file edits.
