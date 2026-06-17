# DSG ONE — ProofGate Control Plane

Runtime control-plane scaffold for governed AI, agent, workflow, finance, Stripe, and deployment actions.

This README is a codebase map for developers and reviewers. It intentionally avoids certification-style language unless the repo contains direct evidence for the claim.

**Production:** `https://tdealer01-crypto-dsg-control-plane.vercel.app`

## Repository surfaces

| Area | Files / directories |
|---|---|
| Next.js app and API routes | `app/` |
| Shared application logic | `lib/` |
| Supabase migrations | `supabase/migrations/` |
| Stripe App package | `packages/stripe-app/` |
| Scripts and verification | `scripts/`, `package.json` |
| Documentation | `docs/` |

## Implemented surfaces

| Area | Files |
|---|---|
| Runtime execution compatibility route | `app/api/execute/route.ts` |
| Spine execution route | `app/api/spine/execute/route.ts` |
| Deterministic policy manifest | `app/api/dsg/v1/policies/manifest/route.ts` |
| Deterministic gate decision | `app/api/dsg/v1/gates/evaluate/route.ts` |
| Deterministic proof response | `app/api/dsg/v1/proofs/prove/route.ts` |
| Deterministic types and non-claim boundary | `lib/dsg/deterministic/types.ts` |
| DSG route caller resolution | `lib/dsg/auth/require-dsg-auth.ts` |
| Claim-readiness report | `app/api/proof/claim-readiness/route.ts` |
| Evidence artifact table | `supabase/migrations/20260612041000_create_claim_readiness_artifacts.sql` |
| DSG API usage schema | `supabase/migrations/20260613000002_dsg_auth_indexes_and_audit.sql` |

## Main routes

| Route | Purpose |
|---|---|
| `POST /api/execute` | Compatibility entry that re-exports the spine execution handler. |
| `POST /api/spine/execute` | Runtime/spine execution route with auth, quota, Safe DOM verification, execution-state tracking, side effects, and `stop_reason`. |
| `GET /api/dsg/v1/policies/manifest` | Deterministic policy manifest and solver metadata. |
| `POST /api/dsg/v1/gates/evaluate` | Deterministic gate decision. |
| `POST /api/dsg/v1/proofs/prove` | Deterministic proof generation. |
| `GET /api/proof/claim-readiness` | Claim-readiness report derived from evidence backends. |

## Runtime execution flow

The spine execution route currently includes:

1. per-route rate limiting;
2. Bearer token extraction;
3. request payload normalization;
4. `agent_id` requirement;
5. agent lookup through the provided key;
6. active-agent check;
7. quota check;
8. Safe DOM verification when a Safe DOM session is present;
9. in-memory execution state and break-condition setup;
10. spine intent execute / issue-and-execute flow;
11. task success/failure tracking;
12. quota, webhook, and metering side effects on success;
13. `stop_reason` in the response.

Boundary: queue depth is currently represented by a placeholder in this route, so this README does not claim fully verified queue orchestration from this code path alone.

## Deterministic gate/proof flow

The DSG v1 deterministic routes include:

1. policy manifest output;
2. gate request validation;
3. gate status output: `PASS`, `BLOCK`, `REVIEW`;
4. proof generation;
5. nonce and idempotency-key handling;
6. proof hash and replay-protection fields;
7. route usage logging for gate evaluation.

Boundary: `UNSUPPORTED` can exist in proof status/types, but canonical gate output excludes `UNSUPPORTED` and must convert unsupported work to `REVIEW` or `BLOCK`.

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

Important boundary: the claim-readiness route queries security evidence types such as `npm_audit`, `gitleaks`, and `codeql`, while the current `claim_readiness_artifacts` migration constrains `evidence_type` to a narrower enum that does not include those values. Treat security-hardening evidence as a known code/schema alignment item until the migration or route is updated.

## Claim boundary

The repository models explicit non-claims in the deterministic proof type surface:

- no external Z3 per-request production invocation claim;
- no third-party certification claim;
- no independent audit claim;
- no WORM-certified external storage claim;
- no complete cryptographic signing claim.

Safe public wording: deterministic gate, proof hash, replay protection fields, evidence boundary, audit/event logging, and human-review control surfaces.

Avoid public wording that implies external certification, independent audit, or certified WORM storage unless those controls are separately implemented and evidenced.

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
- [`docs/CODEBASE_REVIEW_2026-06-17.md`](docs/CODEBASE_REVIEW_2026-06-17.md)
- [`docs/IMPLEMENTED_SURFACES_2026-06-17.md`](docs/IMPLEMENTED_SURFACES_2026-06-17.md)
