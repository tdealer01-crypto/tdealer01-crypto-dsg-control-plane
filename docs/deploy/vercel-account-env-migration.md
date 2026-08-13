# Vercel account and ENV migration

This runbook moves decryptable application environment variables from the legacy DSG ONE Vercel project to a project in the new account. It verifies exact values in memory, verifies reconnected integration metadata, deploys a preview, and then hands the verified destination to the protected `Promoted Production Deployment` workflow to create a healthy first rollback target.

The migration does not switch existing user traffic. Account routing changes only through the reviewed `.github/vercel-routing.json` file after preview and bootstrap-production evidence is green. Every production command—including the account bootstrap—remains isolated inside the `Promoted Production Deployment` workflow and its protected production environment.

## Safety contract

- No environment value is written to GitHub outputs, artifacts, summaries, or repository files.
- `VERCEL_*`, `NOW_*`, GitHub CI credentials, and Vercel system variables are never copied.
- Marketplace/integration-managed values are excluded from copying by default. Every excluded key, target, preview branch, type, and managed-integration marker must exist in the destination before the run can pass.
- Custom Environment IDs are not portable between projects and are excluded.
- `plain` and `encrypted` values are copied only when Vercel returns a decryptable value.
- `sensitive` and legacy `secret` values cannot be read back from Vercel. They must be rotated directly into the destination project and verified there as `sensitive` metadata.
- If the source token cannot enumerate protected production metadata, the run blocks and requires a source owner/team token with complete ENV visibility. Destination-only rotation cannot clear that condition.
- Any hidden production metadata, unreadable value, scope collision, type conflict, missing integration, or parity mismatch blocks activation.
- GitHub deployment routing changes only after both destination preview health and the READY production rollback target are verified.

## One-time configuration

1. Ensure the Vercel GitHub App for the new account can access `tdealer01-crypto/tdealer01-crypto-dsg-control-plane`.
2. If the existing `VERCEL_TOKEN` already has access to exactly one non-legacy Vercel team, the workflow proves that scope through the Vercel Teams API and safely reuses the token with the distinct destination team ID.
3. Otherwise, create a Vercel access token in the new account and add it as the GitHub Actions secret `VERCEL_TOKEN_NEW`. Prefer a repository secret so both the `preview` and `Production – dsg-qubo-api` environments can use it. If environment-scoped secrets are required, add the same secret name to both environments.
4. Keep the existing `VERCEL_TOKEN` secret during migration; it remains the source credential and is reused for the destination only after the distinct-team authorization probe passes.
5. Never paste either token into a PR, issue, workflow input, log, or chat.

## Run the migration without clicking Actions

The agent-controlled path is `.github/vercel-env-migration-request.json`. A reviewed change to that file on `main` automatically starts **Sync Vercel ENV to New Account** and binds the request to that exact merge commit. Manual `workflow_dispatch` remains available as a fallback.

First run:

- set a new `requestId`
- `dryRun`: `true`
- `includeIntegrationManaged`: `false`
- `acknowledgeRotatedProtected`: `false`
- `deployPreview`: `true`

If the dry-run reports protected keys:

1. Create or open the destination project using the same project name.
2. Rotate each reported key directly into the destination as a `sensitive` value with the same Production/Preview/Development and branch scope.
3. Reconnect Supabase, Stripe, storage, Redis, or other Vercel Marketplace integrations for every integration-managed entry. The next dry-run verifies destination coverage; a detached key with the same name does not count as reconnected.
4. Re-run the dry-run with `acknowledgeRotatedProtected: true`. The workflow verifies the destination key, target, branch, and `sensitive` type; it does not claim the old and new secret values match because the new value is intentionally rotated.

If the run reports that the source token cannot enumerate protected production metadata, replace or reauthorize the existing `VERCEL_TOKEN` with a source account owner/team token that can list all source ENV metadata. Rotating only the destination values will not satisfy this gate.

After the dry-run passes, run again with:

- set another unique `requestId`
- `dryRun`: `false`
- `acknowledgeRotatedProtected`: `true` only when the previous step required it
- `deployPreview`: `true`

The live run performs this sequence:

1. Verify the dispatched SHA is the exact current `main` head.
2. Read and classify legacy project environment metadata.
3. Stop before mutation if any value cannot be migrated or acknowledged safely.
4. Resolve or create the destination Next.js project.
5. Upsert decryptable values while preserving type, target, and preview branch.
6. Read the destination back and compare exact values in memory.
7. Deploy and health-check a destination preview.
8. Pass the exact commit and verified destination IDs to the reusable, protected `Promoted Production Deployment` workflow. That workflow re-runs the migration tests and production dependency audit, builds and deploys the destination production bootstrap, verifies `/api/health`, and verifies that Vercel lists it as READY.
9. Record the destination team/project IDs in the workflow summary. Existing traffic and deployment routing remain on the legacy project.
10. After inspecting that evidence, update `.github/vercel-routing.json`: fill the `new` IDs and change `activeAccount` from `legacy` to `new` in a reviewed PR. No GitHub PAT or repository-variable mutation is required.

## Recovery

The legacy IDs remain immutable in `.github/vercel-routing.json`. If destination activation must be reversed, change `activeAccount` back to `legacy` in a reviewed PR. The workflows will select the legacy token and IDs. The legacy values are:

| Variable | Legacy value |
| --- | --- |
| `VERCEL_ORG_ID` | `team_n189mlAdVHR6cGGiaAwsKzQ0` |
| `VERCEL_PROJECT_ID` | `prj_k02PTNzCJRBN5CcRtg6hFdd0HjuW` |

Do not remove the legacy project or `VERCEL_TOKEN` until a promoted production deployment on the new project is healthy and its rollback evidence has been retained.
