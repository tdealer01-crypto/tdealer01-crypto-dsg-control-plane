# Supabase migration recovery — 2026-09-06

Provider evidence established multiple legacy migration-history collisions during main replay. The recovery rule is: preserve every provider-applied migration identity, restore local source/evidence around that history, and never use `migration repair --status reverted` to hide applied rows.

## Applied history that must not be rewritten

- `20260331_runtime_spine.sql` is provider-applied as migration version `20260331` / name `runtime_spine`; keep it unchanged.
- `20260401_runtime_rbac.sql` is provider-applied as migration version `20260401` / name `runtime_rbac`; keep it unchanged.
- The provider also contains applied 14-digit migrations sharing the `20260401` prefix, including `20260401093000`, `20260401120000`, and `20260401123000`.

The mixed 8-digit/14-digit prefix history is legitimate provider state. Do not rename applied files merely to normalize timestamps.

## Unapplied migrations corrected locally

The former duplicate/unapplied runtime RPC migration was removed from replay history. The forward RPC definition/hardening path is:

- `20260402_billing_quota_in_rpc.sql`
- `20260404_runtime_spine_rpc_hardening.sql`

The second local file that originally shared version `20260401`, `schema_policies_table`, was never recorded as applied. An intermediate backdated rename to `20260403000000_schema_policies_table.sql` was also unsuitable because the canonical runner intentionally excludes old local-only migrations behind the remote head. The same SQL body is therefore carried forward as:

- `20260906090000_schema_policies_table.sql`

This is a new pending migration after the verified remote head observed on 2026-09-06. Its SQL body was moved without semantic changes.

## Canonical history recovery

The original `supabase/canonical-migration-ledger.json` is retained as the 2026-08-28 snapshot. Provider-applied rows discovered later but at or before that snapshot's `remoteHead` are recorded separately in:

- `supabase/canonical-legacy-migration-ledger.json`

`scripts/prepare-supabase-canonical-migrations.mjs` merges that verified supplement with the original snapshot before staging migrations. It supports the legacy 8-, 10-, and 14-digit versions present in the provider history and still fails closed on missing source, duplicate versions, name mismatches, or invalid supplement data.

## Hosted Supabase GitHub App boundary

The Hosted Supabase GitHub App has reported `Remote migration versions not found in local migrations directory` even for exact local files that exist. The observed provider history contains the known problematic shape where an 8-digit version and 14-digit versions share the same prefix. This repository must not rewrite applied database history to work around a hosted migration comparator.

Repository CI pins a newer Supabase CLI and stages a canonical migration set before dry-run checks. The Hosted GitHub Integration should not remain the production migration executor if its `Deploy to production` path continues using the incompatible comparison behavior. Disabling that setting is a provider-console action; it is not changed by this repository recovery and must not be claimed as completed until provider evidence confirms it.

## Truth boundary

No migration-history repair/revert was performed by this recovery. No provider-applied `20260331` or `20260401` entry was renamed or deleted. Repository changes alone do not prove a database migration applied; the exact provider migration ledger and live schema remain the authoritative execution evidence.
