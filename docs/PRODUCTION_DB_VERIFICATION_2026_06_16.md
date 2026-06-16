# Production DB Verification — 2026-06-16

Scope: verify whether PR #743 database-side fixes are present in Supabase production.

Project checked: `zeyguilldygozufpgxms`

## Result

The production database objects required by PR #743 are present and active.

Important boundary: `supabase_migrations.schema_migrations` does **not** currently show rows for versions `20260616000001` or `20260616000002`. Therefore the verified statement is:

> Production DB state matches the required objects from migrations `20260616000001` and `20260616000002`; the migration version rows themselves were not found in `supabase_migrations.schema_migrations` at verification time.

Do not claim that the migration history contains those versions unless the migration table later records them.

## Evidence checked

### 1. Migration history

Query:

```sql
select version, statements, name
from supabase_migrations.schema_migrations
where version in ('20260616000001','20260616000002')
order by version;
```

Observed result: `[]`

Interpretation: the migration version rows were not present in `supabase_migrations.schema_migrations`.

### 2. `increment_quota_atomic` RPC exists

Verified object:

- schema: `public`
- function: `increment_quota_atomic`
- args: `p_org_id text, p_agent_id text, p_billing_period text`
- returns: `void`
- `SECURITY DEFINER`: `true`

This confirms the production DB has the RPC required by `lib/usage/quota.ts`.

### 3. `usage_counters` unique constraint exists

Verified constraints:

- `usage_counters_pkey`: `PRIMARY KEY (id)`
- `usage_counters_agent_period_unique`: `UNIQUE (agent_id, billing_period)`
- `usage_counters_unique_key`: `UNIQUE (org_id, agent_id, billing_period)`

The PR #743 atomic quota RPC requires a unique conflict target on `(org_id, agent_id, billing_period)`. That constraint exists as `usage_counters_unique_key`.

### 4. RLS is enabled on `claim_readiness_artifacts`

Verified table state:

- schema: `public`
- table: `claim_readiness_artifacts`
- `relrowsecurity`: `true`
- `relforcerowsecurity`: `false`

This confirms RLS is enabled on the production table.

### 5. Authenticated SELECT policy exists

Verified policy:

- policy: `artifacts_select_authenticated`
- command: `SELECT`
- role: `authenticated`
- using expression: `true`

No authenticated INSERT/UPDATE/DELETE policy was observed in the checked policy list.

### 6. DELETE trigger exists and is enabled

Verified trigger:

- trigger: `no_delete_artifacts`
- table: `public.claim_readiness_artifacts`
- timing: `BEFORE DELETE`
- function: `prevent_artifact_delete()`
- enabled: `O`

Verified trigger function body raises:

```sql
RAISE EXCEPTION 'Deletion of claim_readiness_artifacts is not permitted (append-only WORM table)';
```

This confirms the append-only delete guard exists in production.

## Safe README wording

Use this wording in README:

```md
### Production DB verification — 2026-06-16

Production Supabase project `zeyguilldygozufpgxms` was checked directly for the DB objects introduced by PR #743.

Verified present:

- `public.increment_quota_atomic(p_org_id text, p_agent_id text, p_billing_period text)` exists, returns `void`, and is `SECURITY DEFINER`.
- `usage_counters_unique_key` exists as `UNIQUE (org_id, agent_id, billing_period)`.
- `claim_readiness_artifacts` has RLS enabled.
- `artifacts_select_authenticated` exists for authenticated SELECT access.
- `no_delete_artifacts` trigger exists and calls `prevent_artifact_delete()` before DELETE.

Boundary: `supabase_migrations.schema_migrations` did not show rows for versions `20260616000001` or `20260616000002` at verification time. The production DB objects are verified present, but the migration history rows are not verified present.
```

## Remaining truth boundary

- Atomic increment is now backed by a production RPC object.
- Full quota enforcement is still not the same as atomic check-and-consume unless the calling flow guarantees one successful execution maps to one increment and handles concurrent check-before-increment races.
- WORM-certified external storage is still not claimed. The current verified state is RLS enabled plus DELETE blocked by trigger, not S3 Object Lock or third-party WORM certification.
