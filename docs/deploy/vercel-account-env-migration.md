# Vercel account and ENV migration

This runbook moves decryptable application environment variables from the legacy DSG ONE Vercel project to a project in the new account. It verifies exact values in memory, deploys a preview, checks `/api/health`, and only then updates the GitHub repository variables used by deployment workflows.

Production is not deployed by this migration. Production remains behind the `Promoted Production Deployment` evidence, approval, health, and rollback workflow.

## Safety contract

- No environment value is written to GitHub outputs, artifacts, summaries, or repository files.
- `VERCEL_*`, `NOW_*`, GitHub CI credentials, and Vercel system variables are never copied.
- Marketplace/integration-managed values are excluded by default and must be reconnected in the destination account.
- Custom Environment IDs are not portable between projects and are excluded.
- `plain` and `encrypted` values are copied only when Vercel returns a decryptable value.
- `sensitive` and legacy `secret` values cannot be read back from Vercel. They must be rotated directly into the destination project and verified there as `sensitive` metadata.
- Any hidden production value, unreadable value, scope collision, type conflict, or parity mismatch blocks activation.
- GitHub deployment routing changes only after the destination preview passes its health check.

## One-time configuration

1. Ensure the Vercel GitHub App for the new account can access `tdealer01-crypto/tdealer01-crypto-dsg-control-plane`.
2. Create a Vercel access token in the new account with access to the destination scope.
3. Add that token as the GitHub Actions secret `VERCEL_TOKEN_NEW`. Prefer a repository secret so both the `preview` and `Production – dsg-qubo-api` environments can use it. If environment-scoped secrets are required, add the same secret name to both environments.
4. Keep the existing `VERCEL_TOKEN` secret during migration; it is used only to read the legacy project.
5. Never paste either token into a PR, issue, workflow input, log, or chat.

## Run the migration

Open **Actions → Sync Vercel ENV to New Account → Run workflow** and use the full current `main` commit SHA.

First run:

- `dry_run`: `true`
- `include_integration_managed`: `false`
- `acknowledge_rotated_protected`: `false`
- `deploy_preview`: `true`

If the dry-run reports protected keys:

1. Create or open the destination project using the same project name.
2. Rotate each reported key directly into the destination as a `sensitive` value with the same Production/Preview/Development and branch scope.
3. Reconnect Supabase, storage, Redis, or other Vercel Marketplace integrations for every integration-managed entry.
4. Re-run the dry-run with `acknowledge_rotated_protected: true`. The workflow verifies the destination key, target, branch, and `sensitive` type; it does not claim the old and new secret values match because the new value is intentionally rotated.

After the dry-run passes, run again with:

- `dry_run`: `false`
- `acknowledge_rotated_protected`: `true` only when the previous step required it
- `deploy_preview`: `true`

The live run performs this sequence:

1. Verify the dispatched SHA is the exact current `main` head.
2. Read and classify legacy project environment metadata.
3. Stop before mutation if any value cannot be migrated or acknowledged safely.
4. Resolve or create the destination Next.js project.
5. Upsert decryptable values while preserving type, target, and preview branch.
6. Read the destination back and compare exact values in memory.
7. Deploy and health-check a destination preview.
8. Set repository variables `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, and `VERCEL_PROJECT_NAME`, then set `VERCEL_USE_NEW_ACCOUNT=true` to activate the new destination for later workflows. Merely adding `VERCEL_TOKEN_NEW` does not switch deployment traffic.

## Recovery

The legacy IDs remain as workflow fallbacks. If destination activation must be reversed, set `VERCEL_USE_NEW_ACCOUNT=false`. The workflows will use the legacy token and IDs. The legacy values are:

| Variable | Legacy value |
| --- | --- |
| `VERCEL_ORG_ID` | `team_n189mlAdVHR6cGGiaAwsKzQ0` |
| `VERCEL_PROJECT_ID` | `prj_k02PTNzCJRBN5CcRtg6hFdd0HjuW` |

Do not remove the legacy project or `VERCEL_TOKEN` until a promoted production deployment on the new project is healthy and its rollback evidence has been retained.
