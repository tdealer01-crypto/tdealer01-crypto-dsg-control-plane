# Supabase migration recovery — 2026-09-06

Provider evidence established two separate legacy migration collisions during main replay.

- `20260331_runtime_spine.sql` is provider-applied as migration version `20260331` / name `runtime_spine`; keep it unchanged.
- The former duplicate/unapplied runtime RPC migration was removed from replay history; the forward RPC definition/hardening path is `20260402_billing_quota_in_rpc.sql` then `20260404_runtime_spine_rpc_hardening.sql`.
- `20260401_runtime_rbac.sql` was partially applied and recorded by Supabase as version `20260401` / name `runtime_rbac`; keep it unchanged.
- `20260401_schema_policies_table.sql` was the second local file sharing version `20260401` and was not recorded as applied. It is renamed byte-for-byte to `20260403000000_schema_policies_table.sql` so replay can continue without rewriting applied provider history.

Do not repair, revert, or rename the provider-applied `20260331` or `20260401/runtime_rbac` entries merely to normalize local filenames. Provider migration history is the authoritative applied-state evidence.

Historical snapshot documents may retain the old filename intentionally. Operational automation must use `scripts/verify-production-manifest.mjs` and the current migration directory.
