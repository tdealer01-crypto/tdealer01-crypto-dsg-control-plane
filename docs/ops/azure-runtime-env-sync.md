# Azure Runtime Environment Sync

The production application must not be configured by copying every entry from
`.env.example`. That file documents all optional product surfaces and currently
contains more than one hundred names. It is not a production-required checklist.

The canonical source is the GitHub Actions Environment (`prod` or `staging`).
`config/azure-runtime-env.contract.json` selects only the settings required by
the active Azure control-plane surface:

- `core`: application, Supabase runtime, authentication, readiness, and Redis.
- `governed`: `core` plus promotion, post-deploy feedback, rollback signing,
  and independent GitHub provenance verification.
- `rollback`: `governed` plus the current Azure rollback adapter credentials
  and repository-to-App-Service mapping.

The `Sync Azure Runtime Environment` workflow performs a fail-closed render
before any Azure mutation. A dry run is the default. When `apply=true`, it logs
in through GitHub OIDC, writes a mode-0600 temporary JSON file, applies the
allowlisted settings, reads the values back into a second mode-0600 temporary
file, compares exact value parity without printing values, uploads names-only
evidence, and deletes both temporary values files.

## One-time Azure binding

Configure a federated GitHub OIDC identity with the least Azure RBAC scope that
can update the target App Service, then configure these GitHub Environment
secrets:

- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`

The workflow defaults to the verified target `dsg-control-plane` in resource
group `rg-t.dealer01-0468`. Override those non-secret identifiers with GitHub
Environment variables `AZURE_WEBAPP_NAME` and `AZURE_RESOURCE_GROUP` only when
the governed target changes.

The application rollback adapter still uses client-credentials authentication,
so the `rollback` profile additionally requires `AZURE_CLIENT_SECRET` until that
adapter is migrated to Managed Identity.

## Supabase boundary

`SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, and `SUPABASE_PROJECT_REF` are
migration-only credentials and are explicitly denied from Azure runtime sync.
The database password must be valid in GitHub for `supabase db push`; resetting
that one stale value is separate from App Service configuration.

`SUPABASE_SERVICE_ROLE_KEY` is runtime-only and remains server-side. Never expose
it through a `NEXT_PUBLIC_` variable or a client bundle.

## Build-time boundary

Contract entries marked `buildAndRuntime` include `NEXT_PUBLIC_*` values. Azure
App Settings make them available to the running container, but Next.js also
inlines them during `next build`. A forward ACR deployment workflow must consume
the same GitHub values before `az acr build`; changing App Settings alone does
not rewrite an already-built JavaScript bundle.

## Operating sequence

1. Run `Sync Azure Runtime Environment` with `apply=false` and the smallest
   required profile.
2. Resolve any named missing settings in the selected GitHub Environment.
3. Run again with `apply=true`.
4. Treat names-only evidence of value parity as configuration evidence, not E2E evidence.
   Readiness, exact image/SHA, promotion receipt, and monitoring acceptance are
   verified separately.
