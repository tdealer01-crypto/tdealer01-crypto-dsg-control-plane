# DSG ONE — ProofGate Control Plane

Runtime control-plane scaffold for governed AI, agent, workflow, finance, and deployment actions.

This README is a codebase map for developers and reviewers.

## Repository surfaces

- `app/` — Next.js application and API routes.
- `lib/` — shared application logic.
- `supabase/migrations/` — database migrations.
- `packages/stripe-app/` — Stripe App package.
- `scripts/` — project scripts.
- `docs/` — documentation.

## Implemented surfaces

| Area | Files |
|---|---|
| Runtime execution | `app/api/execute/route.ts`, `app/api/spine/execute/route.ts` |
| Deterministic policy manifest | `app/api/dsg/v1/policies/manifest/route.ts` |
| Deterministic gate decision | `app/api/dsg/v1/gates/evaluate/route.ts` |
| Deterministic proof response | `app/api/dsg/v1/proofs/prove/route.ts` |
| Deterministic types | `lib/dsg/deterministic/types.ts` |
| DSG route helper | `lib/dsg/auth/require-dsg-auth.ts` |
| Claim-readiness report | `app/api/proof/claim-readiness/route.ts` |
| Evidence artifact table | `supabase/migrations/20260612041000_create_claim_readiness_artifacts.sql` |
| DSG route usage schema | `supabase/migrations/20260613000002_dsg_auth_indexes_and_audit.sql` |

## Main routes

| Route | Purpose |
|---|---|
| `POST /api/execute` | Runtime execution compatibility route. |
| `POST /api/spine/execute` | Spine execution route. |
| `GET /api/dsg/v1/policies/manifest` | Deterministic policy manifest. |
| `POST /api/dsg/v1/gates/evaluate` | Deterministic gate decision. |
| `POST /api/dsg/v1/proofs/prove` | Deterministic proof response. |
| `GET /api/proof/claim-readiness` | Claim-readiness report. |

## Runtime execution flow

The spine execution route includes:

1. request normalization;
2. agent ID requirement;
3. agent lookup;
4. active-agent check;
5. quota check;
6. Safe DOM verification when applicable;
7. execution-state setup;
8. spine intent issue/execute flow;
9. task outcome tracking;
10. quota, webhook, and metering side effects on success;
11. `stop_reason` in the response.

## Deterministic gate/proof flow

The DSG v1 deterministic routes include:

1. policy manifest output;
2. gate request validation;
3. gate status output: `PASS`, `BLOCK`, `REVIEW`;
4. proof generation;
5. nonce and idempotency-key handling;
6. proof hash and replay-protection fields in the type surface;
7. route usage logging for gate evaluation.

## Claim-readiness flow

The claim-readiness route supports:

- `claims`
- `includeEvidence`
- `includeSecurityBreakdown`

Default claim IDs:

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

Useful scripts:

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

## Documentation

- [`docs/README.md`](docs/README.md)
- [`docs/CODEBASE_REVIEW_2026-06-15.md`](docs/CODEBASE_REVIEW_2026-06-15.md)
- [`docs/IMPLEMENTED_SURFACES_2026-06-15.md`](docs/IMPLEMENTED_SURFACES_2026-06-15.md)
