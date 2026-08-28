# Supabase passwordless migrations

Hosted Supabase migrations use the CLI's temporary login role. GitHub Actions no longer depends on `SUPABASE_DB_PASSWORD`, so rotating or moving a database does not require updating a copied password in every workflow.

## Canonical inputs

- `SUPABASE_ACCESS_TOKEN`: the only secret required by migration workflows. Use a fine-grained token with the minimum database migration permissions.
- `SUPABASE_PROJECT_REF` or `SUPABASE_PROJECT_ID`: optional project selector. The canonical control-plane project ref is the checked-in fallback.
- Supabase CLI `2.116.0`: pinned because this release restores the `postgres` role correctly in passwordless migration sessions.

The workflows intentionally never pass `--include-all`. Normal `db push` therefore applies migrations newer than the remote migration head and does not replay older local-only history.

## Workflows

- `supabase-migrations.yml`: runs automatically when migrations or the workflow change.
- `supabase-migrate.yml`: manual recovery entry point.
- `supabase-history-reconcile.yml`: fetches canonical remote history into a review branch.
- `dsg-platform-deploy.yml`: governed manual Supabase deployment surface.
- `production-readiness.yml`: fail-closed dry-run; connection errors, unknown output, and pending migrations cannot be reported as PASS.

## Verification

After a migration run:

1. Confirm the workflow used the pinned CLI and initialized a temporary login role.
2. Confirm the exact migration version appears in remote migration history.
3. Verify the expected tables, functions, RLS, and grants from the live database.
4. Do not treat a workflow success alone as application E2E proof.

For a self-hosted database or a direct PostgreSQL connection, use a separate credentialed workflow. Do not add a hosted database password back to these workflows.

## Shared migration ledger recovery

The linked project is also used by governed DSG services outside this
repository. A successful passwordless connection can therefore still stop with
`Remote migration versions not found in local migrations directory` when an
external service applied DDL but its exact ledger files were never committed
here.

Do not run `migration repair --status reverted` for migrations that are visibly
present in the live schema. That rewrites history rather than restoring source.
Instead, recover `version`, `name`, and `statements` from
`supabase_migrations.schema_migrations`, review the DDL, and commit the exact
timestamped files. The seven files from `20260817081058` through
`20260823124642` were restored this way on 2026-08-28. This lets `db push`
compare the ledger honestly and preserves full replay for a fresh database.
