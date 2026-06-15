# DSG ONE — Codebase Review

**Date:** 2026-06-15  
**Scope:** current repository code and schema only. Historical status docs and prior marketing copy are not used as source-of-truth for this review.

## Files inspected

| Area | Files |
|---|---|
| Package/scripts | `package.json` |
| Runtime execution | `app/api/execute/route.ts`, `app/api/spine/execute/route.ts` |
| Deterministic API | `app/api/dsg/v1/policies/manifest/route.ts`, `app/api/dsg/v1/gates/evaluate/route.ts`, `app/api/dsg/v1/proofs/prove/route.ts` |
| Deterministic types | `lib/dsg/deterministic/types.ts` |
| DSG route auth | `lib/dsg/auth/require-dsg-auth.ts` |
| Compliance claim readiness | `app/api/proof/claim-readiness/route.ts` |
| Evidence schema | `supabase/migrations/20260612041000_create_claim_readiness_artifacts.sql` |
| DSG API auth/audit schema | `supabase/migrations/20260613000002_dsg_auth_indexes_and_audit.sql` |

## 1. Runtime execution surface

`app/api/execute/route.ts` is a compatibility entry point. It exports `OPTIONS` and `POST` directly from `app/api/spine/execute/route.ts`.

The spine execution route currently performs these checks/actions:

1. applies per-route rate limiting;
2. extracts a Bearer token;
3. normalizes the request body;
4. requires `agent_id`;
5. resolves the agent from API key;
6. blocks inactive agents;
7. checks execution quota;
8. verifies Safe DOM intent when a Safe DOM session is present;
9. initializes in-memory execution state and break-condition tracking;
10. executes an existing spine intent or issues one and then executes it;
11. tracks success/failure for break conditions;
12. on success, runs quota increment, webhook delivery, and metering as fire-and-forget side effects;
13. returns `stop_reason` in the response.

### Boundary

The route includes a placeholder `queueSize = 1`. Therefore, the README should not claim fully verified queue-depth orchestration from this code path alone.

## 2. DSG deterministic gate/proof API

The codebase contains these DSG v1 route handlers:

```text
GET  /api/dsg/v1/policies/manifest
POST /api/dsg/v1/gates/evaluate
POST /api/dsg/v1/proofs/prove
```

### `policies/manifest`

The manifest route returns:

- deterministic policy manifest;
- solver metadata;
- a boundary object containing `externalSolverInvoked` and `productionReadyClaim`.

### `gates/evaluate`

The gate route:

- requires DSG auth;
- rate-limits by org;
- reads JSON with a max body size;
- validates deterministic proof request shape;
- runs `evaluateDeterministicGate`;
- returns gate status, proof status, risk level, proof, caller metadata, and explicit boundary data;
- writes a DSG API call audit log asynchronously.

### `proofs/prove`

The proof route:

- requires DSG auth;
- rate-limits by org;
- requires `context`;
- requires `nonce` and `idempotencyKey` either in JSON body or headers;
- calls `proveDeterministicPlan`;
- returns proof and explicit boundary data.

## 3. Deterministic proof type boundary

`lib/dsg/deterministic/types.ts` defines:

- `DeterministicProofStatus`: `PASS`, `BLOCK`, `REVIEW`, `UNSUPPORTED`;
- `DeterministicGateStatus`: `PASS`, `BLOCK`, `REVIEW`;
- `DeterministicSolverName`: `z3`, `rule_engine`, `static_check`, `none`;
- replay protection fields: `nonce`, `idempotencyKey`, `requestHash`;
- hash fields: `inputHash`, `constraintSetHash`, `proofHash`, optional `previousProofHash`;
- evidence boundary fields:
  - `externalSolverInvoked`
  - `productionReadyClaim`
  - `externalZ3ProductionSolverClaim: false`
  - `certificationClaim: false`
  - `independentAuditClaim: false`
  - `wormStorageCertifiedClaim: false`
  - `cryptographicSigningCompleteClaim: false`

### Boundary

The type system explicitly models non-claims. README copy must preserve those boundaries and should not turn static proof metadata into external certification language.

## 4. DSG route authentication

`lib/dsg/auth/require-dsg-auth.ts` supports two caller types:

1. Supabase session user;
2. Bearer API key.

For Bearer API keys, the helper:

- SHA-256 hashes the raw key;
- queries `public.api_keys` by `key_hash`;
- requires `status = ACTIVE`;
- checks DSG-compatible scopes when scopes are present;
- calls `touch_api_key_last_used` after successful resolution;
- returns unified `DsgCaller` with `orgId`, `actorType`, and user/API-key identity.

The same file also contains `logDsgApiCall`, which inserts call metadata into `dsg_api_calls` and intentionally never throws to the client path.

### Boundary

The inspected auth path is API-key plus Supabase-session based. Do not describe it as a complete standalone JWT/JWKS gateway unless that code path is added and reviewed.

## 5. Compliance claim-readiness API

`app/api/proof/claim-readiness/route.ts` defines an in-memory claim evidence standard and evaluates claim readiness from backend evidence.

Default claim IDs:

```text
ISO-42001-A.6-PLANNING
NIST-GOVERN-01
SUPPLY-CHAIN-01
SECURITY-HARDENING
SBOM-GENERATED
RUNTIME-INTEGRITY
```

The route:

- supports `claims`, `includeEvidence`, and `includeSecurityBreakdown` query params;
- rejects invalid claim IDs with HTTP 400;
- reads deployment metadata from env variables;
- queries `claim_readiness_artifacts` for security evidence types;
- queries `delivery_proof_reports` for matrix evidence;
- returns `PASS`, `PARTIAL`, or `BLOCK` per claim;
- warns when the evidence backend is empty or unavailable.

### Boundary

This route is useful because missing evidence remains visible as `BLOCK` or warnings. It should not be summarized as automatic compliance certification.

## 6. Evidence artifact schema

`20260612041000_create_claim_readiness_artifacts.sql` creates `claim_readiness_artifacts` with:

- `claim_id`;
- `evidence_type`;
- unique `artifact_hash`;
- optional `chain_hash`;
- `artifact_path`;
- `artifact_data` JSONB;
- `signature_bundle` JSONB;
- `immutable_at`;
- `s3_version_id`;
- `s3_retain_until`;
- lifecycle `status` constrained to `PENDING`, `VERIFIED`, `ARCHIVED`, `FAILED`;
- indexes for claim ID, evidence type, artifact hash, chain hash, status, and immutability timestamp.

Important boundary from the migration itself:

- RLS is explicitly disabled for now.
- No delete grant is issued.
- S3 Object Lock fields exist, but field presence is not proof that an Object Lock bucket is configured or that artifacts are archived in external WORM storage.

## 7. DSG API-key indexes and audit schema

`20260613000002_dsg_auth_indexes_and_audit.sql` adds:

- unique index on `api_keys.key_hash`;
- org/expiry indexes for API keys;
- service-role policy for server-side key lookup;
- `touch_api_key_last_used(p_key_hash)`;
- `expire_api_keys()`;
- `dsg_api_calls` audit table;
- RLS policies for service-role full access and org-member read access;
- `api_key_usage_summary` view.

### Boundary

These schema features only apply where the migration has been applied to the target Supabase project.

## 8. Package and script surface

`package.json` defines the root package as private `dsg-platform`. Important scripts include:

- `dev`, `build`, `start`, `lint`, `typecheck`;
- `test`, `test:unit`, `test:integration`, `test:coverage`, `test:ci`;
- live DB and E2E scripts;
- deployment scripts for Vercel preview/prod;
- deterministic verification and production manifest scripts;
- CCVS/evidence scripts;
- proof scripts.

Dependencies include Next.js, React, Supabase, Stripe, Upstash Redis, Octokit, Sentry, and a `z3-solver` dev dependency. The presence of a dependency alone does not prove per-request production invocation.

## 9. README rewrite rationale

The previous root README contained broad status blocks and production-ready language. This review replaces that with a codebase-derived map and explicit non-claims.

New README claims should be limited to:

- route handlers that exist;
- type boundaries that exist;
- migrations that exist;
- scripts present in `package.json`;
- explicit schema/route behavior visible in inspected files.

## 10. Recommended next checks

Before making a stronger public claim, run and record fresh evidence for:

1. `npm run typecheck`;
2. `npm test` or `npm run test:ci`;
3. `npm run verify:deterministic`;
4. `npm run verify:production-manifest`;
5. `npm run go:no-go`;
6. target deployment smoke checks;
7. Supabase applied-migration verification on the target project;
8. populated evidence backend checks for `/api/proof/claim-readiness`.
