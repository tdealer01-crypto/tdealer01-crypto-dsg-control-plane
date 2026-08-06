# DB function/table alignment check (app vs Supabase)

Date: 2026-04-13

## Scope
- Checked application DB calls in `app/` and `lib/` for `.from('...')` and `.rpc('...')` usage.
- Cross-checked names against SQL definitions in `supabase/schema.sql` and all files in `supabase/migrations/*.sql`.

## Result summary
- Total referenced tables/views in app code: **37**
- Total referenced RPC functions in app code: **1**
- Missing in Supabase SQL (table/view): **4**
- Missing in Supabase SQL (RPC): **0**

## Missing DB objects
1. `agent_execution_requests`
   - Referenced in:
     - `app/api/agent-executions/route.ts`
     - `lib/agent-governance/service.ts`
2. `agent_execution_steps`
   - Referenced in:
     - `lib/agent-governance/service.ts`
3. `agent_execution_approvals`
   - Referenced in:
     - `lib/agent-governance/service.ts`
4. `user_org_roles`
   - Referenced in:
     - `app/api/access/review/route.ts`

## Confirmed aligned RPC
- `runtime_commit_execution`
  - Referenced in app code and present in migrations.

## Impact
- Calls to missing objects will fail at runtime with relation-not-found errors unless those objects already exist in a separate, unmanaged database migration path.

## Recommended next action
- Add a new migration under `supabase/migrations/` to define the 4 missing relations (or remove code paths that reference them).
- Optional: add CI guard script that diffs `.from/.rpc` references against migration SQL to prevent future drift.
