# DSG ONE — ProofGate Control Plane

> Runtime control-plane scaffold for governed AI, agent, workflow, finance, and deployment actions.

This README is intentionally written from the current codebase surface, not from historical marketing copy. Treat it as a repository map and claim boundary, not as a production certification.

## What is in this repository

DSG ONE combines a Next.js application, API routes, deterministic gate/proof types, Supabase-backed auth/evidence schema, and Stripe App package code.

At code level, the main surfaces are:

- Next.js App Router application under `app/`.
- Runtime execution API under `app/api/execute/` and `app/api/spine/execute/`.
- DSG deterministic proof/gate API under `app/api/dsg/v1/`.
- Compliance claim-readiness API under `app/api/proof/claim-readiness/`.
- Deterministic gate/proof types and engines under `lib/dsg/deterministic/`.
- DSG route auth helper under `lib/dsg/auth/require-dsg-auth.ts`.
- Supabase migrations under `supabase/migrations/`.
- Stripe App package under `packages/stripe-app/`.
- Verification, deployment, smoke, evidence, and operations scripts under `scripts/`.

## Current codebase-derived status

| Area | What the code supports | Boundary |
|---|---|---|
| Deterministic gate API | `POST /api/dsg/v1/gates/evaluate` authenticates the caller, rate-limits by org, validates request body, runs `evaluateDeterministicGate`, returns `PASS` / `BLOCK` / `REVIEW`, and writes an audit record asynchronously. | This is a deterministic gate adapter. It is not evidence of external SMT/Z3 invocation in production. |
| Deterministic proof API | `POST /api/dsg/v1/proofs/prove` requires DSG auth, nonce, idempotency key, and context, then returns a deterministic proof object from `proveDeterministicPlan`. | Proof output includes explicit boundary fields; do not upgrade those fields into certification claims. |
| Policy manifest API | `GET /api/dsg/v1/policies/manifest` returns the deterministic policy manifest and solver metadata. | Manifest readiness is not a full launch/go-live claim. |
| Runtime execution | `POST /api/execute` re-exports `POST` and `OPTIONS` from `app/api/spine/execute/route.ts`. The spine route resolves agent API keys, applies rate limits, checks quota, verifies Safe DOM intent when applicable, issues/executes spine intents, and emits fire-and-forget quota, webhook, and metering side effects on success. | Queue size is currently represented by a placeholder in the route. Treat execution orchestration as code present, not as externally certified production capacity. |
| DSG route auth | `/api/dsg/v1/*` route auth supports Bearer API key lookup by `key_hash` and Supabase session fallback. Successful API key resolution calls `touch_api_key_last_used`; DSG route calls can be logged to `dsg_api_calls`. | This is not a standalone JWT/JWKS gateway claim. |
| Compliance claim readiness | `GET /api/proof/claim-readiness` maps known claim IDs to required evidence types, queries Supabase-backed evidence tables, reports `PASS` / `PARTIAL` / `BLOCK`, and returns warnings when evidence backend data is empty or unavailable. | Claim readiness is evidence-dependent. Empty or missing evidence must remain `BLOCK`/warning, not marketing pass. |
| Evidence artifact schema | `claim_readiness_artifacts` migration defines artifact hashes, chain hashes, S3 Object Lock metadata fields, lifecycle status, indexes, and no delete grant. | The migration also explicitly disables RLS for now and contains schema fields for S3 Object Lock; this is not proof that an external WORM-certified bucket is configured. |
| API key hardening schema | DSG auth migration adds `api_keys.key_hash` indexes, `touch_api_key_last_used`, `expire_api_keys`, `dsg_api_calls`, RLS on the audit table, and an API key usage summary view. | Requires migrations to be applied in the target Supabase project before relying on this behavior in deployment. |

## Explicit non-claims

The current codebase should not be described as any of the following unless new code and deployment evidence are added:

- external Z3/SMT solver invoked on every production request;
- third-party certified platform;
- independently audited platform;
- WORM-certified external storage already configured end-to-end;
- completed standalone JWT/JWKS gateway;
- complete production/go-live evidence solely from repository contents.

The deterministic proof type itself carries boundary fields such as `externalSolverInvoked`, `certificationClaim`, `independentAuditClaim`, `wormStorageCertifiedClaim`, and `cryptographicSigningCompleteClaim`. Keep public claims aligned to those fields.

## Important API surfaces

### Runtime execution

```text
POST /api/execute
POST /api/spine/execute
```

`/api/execute` is a compatibility entry that re-exports the spine execution handler. The spine handler requires a Bearer token, `agent_id`, quota availability, and successful agent API key resolution before execution.

### DSG deterministic gate/proof

```text
GET  /api/dsg/v1/policies/manifest
POST /api/dsg/v1/gates/evaluate
POST /api/dsg/v1/proofs/prove
```

The `gates/evaluate` route requires DSG auth, rate-limits per org, validates body size and structure, runs the deterministic gate, returns the proof payload, and logs route usage. The `proofs/prove` route requires nonce and idempotency key.

### Compliance claim readiness

```text
GET /api/proof/claim-readiness
GET /api/proof/claim-readiness?claims=SECURITY-HARDENING&includeSecurityBreakdown=true
GET /api/proof/claim-readiness?claims=ISO-42001-A.6-PLANNING,NIST-GOVERN-01&includeEvidence=true
```

Supported default claim IDs in the route include:

- `ISO-42001-A.6-PLANNING`
- `NIST-GOVERN-01`
- `SUPPLY-CHAIN-01`
- `SECURITY-HARDENING`
- `SBOM-GENERATED`
- `RUNTIME-INTEGRITY`

## Local development

```bash
npm install
npm run typecheck
npm test
npm run build
```

Useful scripts exposed by `package.json` include:

```bash
npm run dev
npm run lint
npm run typecheck
npm test
npm run test:coverage
npm run test:ci
npm run verify:deterministic
npm run verify:production-manifest
npm run go:no-go
npm run ccvs:verify
npm run deploy:preview
npm run deploy:prod
```

## Environment and deployment notes

This repository uses Supabase, Vercel, Stripe, Upstash Redis, and related service credentials depending on which surface is being deployed.

Do not treat local tests alone as production readiness. Before a production claim, verify at minimum:

1. required environment variables are present in the target environment;
2. Supabase migrations are applied to the target database;
3. public smoke endpoints respond on the deployed URL;
4. authenticated/operator flows are checked with real target credentials;
5. evidence APIs return populated evidence rather than empty-backend warnings;
6. Stripe App/package behavior is tested in the intended Stripe environment when relevant.

## Documentation index

Start here:

- [`docs/README.md`](docs/README.md) — documentation index.
- [`docs/CODEBASE_REVIEW_2026-06-15.md`](docs/CODEBASE_REVIEW_2026-06-15.md) — codebase-only review used for this README refresh.

## Maintainer rule

When updating this README, use code and directly inspected repository files first. Avoid copying old status claims forward unless the current codebase and target deployment evidence still support them.
