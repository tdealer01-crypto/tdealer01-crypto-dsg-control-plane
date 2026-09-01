# Azure Key Vault Runtime Environment

DSG production runs on Azure App Service with images from ACR. Vercel, Render,
Railway, AWS, and Google Cloud deployment paths are retired and are not valid
production, health, readiness, or deployment evidence.

`.env.example` is a catalog of supported settings, not a production-required
checklist. `config/azure-runtime-env.contract.json` is the allowlist for the
active Control Plane surface:

- `core`: application, Supabase runtime, authentication, readiness, and Redis;
- `governed`: `core` plus promotion, monitoring feedback, rollback signing, and
  independent GitHub provenance verification;
- `rollback`: `governed` plus the current Azure rollback adapter credentials and
  repository-to-App-Service map.

## Authority model

Azure Key Vault is the canonical store for runtime secrets. App Service reads
them through versionless Key Vault references and its system-assigned Managed
Identity with the `Key Vault Secrets User` role. GitHub Actions never becomes
the long-lived runtime secret store: GitHub OIDC authenticates bootstrap and
rotation work, while GitHub Environment secrets are accepted only as one-time
seed inputs.

The `Sync Azure Runtime Environment` workflow has two modes:

- `reference`: create/reuse the vault, bind Managed Identity, apply versionless
  references, and require every reference status to be `Resolved`. Secret
  values are not needed, so this mode repairs a replaced App Service or slot
  without re-entering all secrets.
- `seed`: require the allowlisted secret values from the selected GitHub
  Environment, write new Key Vault versions without printing them, then perform
  the same binding and resolution checks.

Both modes default to `apply=false`. The workflow uploads names/status-only
evidence and destroys runner-local value files. Missing values in `seed`, an
unresolved reference, an App Setting mismatch, missing OIDC binding, or an RBAC
failure returns `BLOCK`.

## One-time Azure binding

Configure a federated GitHub OIDC identity and these GitHub Environment secrets:

- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`

Configure these non-secret Environment variables:

- `AZURE_OIDC_PRINCIPAL_OBJECT_ID` (required by `seed` for RBAC assignment);
- `AZURE_KEY_VAULT_NAME` (default `dsg-shared-secrets`);
- `AZURE_WEBAPP_NAME` (default `dsg-control-plane`);
- `AZURE_RESOURCE_GROUP` (default `rg-t.dealer01-0468`).

The OIDC identity needs only the Azure control-plane permissions required to
create/reuse the vault, enable the App Service identity, and manage the two
least-privilege role assignments. `seed` additionally gives that principal
`Key Vault Secrets Officer` at the vault scope. Runtime App Service receives
only `Key Vault Secrets User`.

## Local operator commands

The old local OpenSSL/AWS helper is retired. The replacement never exports or
prints values:

```bash
export AZURE_RESOURCE_GROUP=rg-t.dealer01-0468
export AZURE_WEBAPP_NAME=dsg-control-plane
export AZURE_KEY_VAULT_NAME=dsg-shared-secrets

npm run secrets:bootstrap
npm run secrets:put -- supabase-service-role-key /secure/path/value.txt
npm run secrets:list
npm run secrets:validate
```

`secrets:validate` reads only Key Vault reference names and resolution statuses.

## Supabase boundary

`SUPABASE_ACCESS_TOKEN` and `SUPABASE_PROJECT_REF` are CI-only. Hosted migrations
use the pinned Supabase CLI passwordless temporary login role; the retired
`SUPABASE_DB_PASSWORD` is explicitly denied from App Service runtime sync.

`SUPABASE_SERVICE_ROLE_KEY` is runtime-only, stored in Key Vault, and remains
server-side. Never expose it through a `NEXT_PUBLIC_` name or client bundle.

## Build-time boundary

Contract entries marked `buildAndRuntime` include `NEXT_PUBLIC_*` values. App
Settings make them available to a running container, but Next.js can inline them
during `next build`. The future governed ACR deployment must consume the same
non-secret contract values before building. Updating App Settings does not
rewrite an existing image.

## Evidence boundary

A successful sync proves only exact configuration readback and `Resolved` Key
Vault references. It does not prove health, readiness, database connectivity,
deployed SHA/image digest, candidate admission, Cinema verification, persisted
Control Plane `ALLOW`, or monitoring acceptance. Those remain separate positive
E2E evidence requirements.