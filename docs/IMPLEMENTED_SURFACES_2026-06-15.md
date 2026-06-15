# DSG ONE — Implemented Surfaces Review

**Date:** 2026-06-15  
**Scope:** current codebase surfaces only.

This document lists the parts that are present in the repository and where to inspect them.

## Runtime execution

### Files

- `app/api/execute/route.ts`
- `app/api/spine/execute/route.ts`

### Implemented flow

`app/api/execute/route.ts` is a compatibility entry. It re-exports `OPTIONS` and `POST` from the spine execution route.

The spine route implements:

1. per-route rate limit setup;
2. Bearer token extraction;
3. request payload normalization;
4. `agent_id` requirement;
5. agent lookup through the provided key;
6. active-agent check;
7. quota check;
8. Safe DOM verification when a Safe DOM session is present;
9. in-memory execution state initialization;
10. execution break-condition handling;
11. spine intent execution;
12. fallback intent issue then execute when no pending intent exists;
13. task success/failure tracking;
14. quota increment on success;
15. webhook event on success;
16. metered billing event on success;
17. `stop_reason` included in the response.

## DSG deterministic API

### Files

- `app/api/dsg/v1/policies/manifest/route.ts`
- `app/api/dsg/v1/gates/evaluate/route.ts`
- `app/api/dsg/v1/proofs/prove/route.ts`
- `lib/dsg/deterministic/types.ts`

### Implemented routes

```text
GET  /api/dsg/v1/policies/manifest
POST /api/dsg/v1/gates/evaluate
POST /api/dsg/v1/proofs/prove
```

### Policy manifest route

The manifest route returns:

- policy manifest;
- solver metadata;
- policy reference;
- policy version;
- constraint-set hash;
- constraint inventory.

### Gate evaluation route

The gate route implements:

1. DSG route caller resolution;
2. org-scoped rate limiting;
3. JSON body size handling;
4. deterministic request validation;
5. deterministic gate evaluation;
6. structured response with gate status, proof status, risk level, reason, proof, and caller metadata;
7. asynchronous route usage logging.

### Proof route

The proof route implements:

1. DSG route caller resolution;
2. org-scoped rate limiting;
3. context requirement;
4. nonce resolution from body or `x-dsg-nonce` header;
5. idempotency key resolution from body or `idempotency-key` header;
6. deterministic proof generation;
7. structured proof response.

### Type surface

`lib/dsg/deterministic/types.ts` defines:

- proof statuses: `PASS`, `BLOCK`, `REVIEW`, `UNSUPPORTED`;
- gate statuses: `PASS`, `BLOCK`, `REVIEW`;
- risk levels: `low`, `medium`, `high`, `critical`;
- solver names: `z3`, `rule_engine`, `static_check`, `none`;
- replay-protection fields: `nonce`, `idempotencyKey`, `requestHash`;
- proof hash fields: `inputHash`, `constraintSetHash`, `proofHash`, `previousProofHash`;
- constraint result entries;
- failure reason entries;
- deterministic gate decision output.

## DSG route caller resolution and logging

### File

- `lib/dsg/auth/require-dsg-auth.ts`

### Implemented behavior

The route helper implements:

1. Bearer header parsing;
2. SHA-256 hashing of raw keys;
3. `api_keys` lookup by `key_hash`;
4. active key check;
5. scope check when scopes are present;
6. last-used/request-count touch through `touch_api_key_last_used`;
7. Supabase session fallback;
8. user profile lookup;
9. unified caller result shape;
10. route usage insert into `dsg_api_calls`.

## Claim-readiness API

### File

- `app/api/proof/claim-readiness/route.ts`

### Implemented route

```text
GET /api/proof/claim-readiness
```

### Query parameters

- `claims`
- `includeEvidence`
- `includeSecurityBreakdown`

### Default claim IDs

- `ISO-42001-A.6-PLANNING`
- `NIST-GOVERN-01`
- `SUPPLY-CHAIN-01`
- `SECURITY-HARDENING`
- `SBOM-GENERATED`
- `RUNTIME-INTEGRITY`

### Implemented behavior

The route implements:

1. claim query parsing;
2. invalid claim rejection;
3. deployment metadata extraction from environment variables;
4. security evidence lookup from `claim_readiness_artifacts`;
5. evidence matrix lookup from `delivery_proof_reports`;
6. status calculation as `PASS`, `PARTIAL`, or `BLOCK`;
7. optional evidence artifact output;
8. optional security breakdown output;
9. summary counts;
10. checkpoint metadata.

## Evidence artifact schema

### File

- `supabase/migrations/20260612041000_create_claim_readiness_artifacts.sql`

### Implemented table

`claim_readiness_artifacts` includes:

- `id`
- `claim_id`
- `evidence_type`
- `artifact_hash`
- `chain_hash`
- `artifact_path`
- `artifact_data`
- `signature_bundle`
- `immutable_at`
- `s3_version_id`
- `s3_retain_until`
- `created_at`
- `updated_at`
- `status`

### Implemented indexes

- `idx_claim_readiness_claim_id`
- `idx_claim_readiness_evidence_type_created`
- `idx_claim_readiness_artifact_hash`
- `idx_claim_readiness_chain_hash`
- `idx_claim_readiness_status_created`
- `idx_claim_readiness_immutable_at`

## DSG API usage schema

### File

- `supabase/migrations/20260613000002_dsg_auth_indexes_and_audit.sql`

### Implemented database objects

- unique index on `api_keys.key_hash`;
- index on `api_keys(org_id, created_at desc)`;
- index for expiring keys;
- service-role policy on `api_keys`;
- `touch_api_key_last_used(p_key_hash)`;
- `expire_api_keys()`;
- `dsg_api_calls` table;
- RLS policies for `dsg_api_calls`;
- route/caller indexes for `dsg_api_calls`;
- `api_key_usage_summary` view.

## Package scripts

### File

- `package.json`

### Useful commands

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run test:coverage`
- `npm run test:ci`
- `npm run verify:deterministic`
- `npm run verify:production-manifest`
- `npm run go:no-go`
- `npm run ccvs:verify`
- `npm run deploy:preview`
- `npm run deploy:prod`

## Suggested README structure

Use this order:

1. repository purpose;
2. main directories;
3. implemented surfaces table;
4. main routes;
5. local commands;
6. documentation links;
7. verification checklist.

Keep public-facing text focused on implemented code paths and inspection paths.
