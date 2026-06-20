# DSG ONE — ProofGate Control Plane

Runtime control-plane for governed AI agents: policy gate, audit trail, Hermes dashboard, marketplace, and Stripe billing.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Ftdealer01-crypto%2Ftdealer01-crypto-dsg-control-plane&project-name=dsg-control-plane&repository-name=dsg-control-plane&demo-title=DSG%20ONE%20Control%20Plane&demo-description=Governed%20AI%20runtime%20with%20policy%20gate%2C%20audit%20chain%2C%20Hermes%20agent%20dashboard%2C%20and%20Stripe%20billing&demo-url=https%3A%2F%2Ftdealer01-crypto-dsg-control-plane.vercel.app&demo-image=https%3A%2F%2Ftdealer01-crypto-dsg-control-plane.vercel.app%2Fog%2Fdefault.png&envs=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,SUPABASE_SERVICE_ROLE_KEY,ANTHROPIC_API_KEY,NEXTAUTH_SECRET&env-description=Required%20environment%20variables%20for%20DSG%20ONE)
[![Install GitHub App](https://img.shields.io/badge/GitHub%20App-Install%20DSG%20Gate-black?logo=github)](https://tdealer01-crypto-dsg-control-plane.vercel.app/github-app)
[![Production](https://img.shields.io/badge/production-live-brightgreen)](https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health)

**Production:** `https://tdealer01-crypto-dsg-control-plane.vercel.app`
**Marketplace:** `https://tdealer01-crypto-dsg-control-plane.vercel.app/marketplace`
**GitHub App:** `https://tdealer01-crypto-dsg-control-plane.vercel.app/github-app`

## Current verified snapshot

The current evidence source of truth is [`docs/PRODUCTION_EVIDENCE_2026-06-20.md`](docs/PRODUCTION_EVIDENCE_2026-06-20.md).

Use that document before requesting new proof or repeating deployment/revenue checks. New proof should be appended there with exact source IDs and claim boundaries.

| Area | Status | Evidence pointer |
|---|---:|---|
| PR #754 | Merged | Merge commit `2b768d8b81bfaeff2a07991b9ed3db9c225cd7e7`. |
| Latest main production deploy | Ready | Vercel deployment `dpl_7H5X3Sb48KfXASERy9PSziSQYV3n`, target `production`, source `main`, commit `2b768d8b81bfaeff2a07991b9ed3db9c225cd7e7`. |
| Merge-conflict incident | Resolved | `app/dashboard/agents/page.tsx` conflict markers were removed through PR #754. |
| Supabase billing schema | Present | `billing_customers`, `billing_events`, `billing_meter_outbox`, and `billing_subscriptions` observed. |
| Stripe product surfaces | Present | DSG Pro, Business, Enterprise, Execution Overage, MCP, and related product surfaces observed. |
| Live paid revenue | Not claimed | Live keys, successful real charge, webhook persistence, and meter event processing must be evidenced before claiming live revenue. |

## Repository surfaces

| Area | Files / directories |
|---|---|
| Next.js app and API routes | `app/` |
| Shared application logic | `lib/` |
| Supabase migrations | `supabase/migrations/` |
| Stripe App package | `packages/stripe-app/` |
| Browserbase service package | `browserbase-service/` |
| Scripts and verification | `scripts/`, `package.json` |
| Documentation | `docs/` |

## Implemented surfaces

| Area | Files |
|---|---|
| Runtime execution compatibility route | `app/api/execute/route.ts` |
| Spine execution route | `app/api/spine/execute/route.ts` |
| Parallel multi-agent execution route | `app/api/multi-agent/execute/route.ts` |
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
| `POST /api/multi-agent/execute` | Parallel multi-agent execution route with scoped auth, quota, Safe DOM verification, execution state tracking, side effects, and `stop_reason`. |
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
- no complete cryptographic signing claim;
- no live paid revenue claim until Stripe live checkout, real charge/invoice, webhook persistence, and Supabase billing rows are recorded in the evidence snapshot.

Safe public wording: deterministic gate, proof hash, replay protection fields, evidence boundary, audit/event logging, human-review control surfaces, and Vercel production deployment readiness for the recorded merge commit.

Avoid public wording that implies external certification, independent audit, certified WORM storage, all compliance gates complete, or active paid revenue unless those controls are separately implemented and evidenced.

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

- [`docs/PRODUCTION_EVIDENCE_2026-06-20.md`](docs/PRODUCTION_EVIDENCE_2026-06-20.md)
- [`docs/README.md`](docs/README.md)
- [`docs/CODEBASE_REVIEW_2026-06-17.md`](docs/CODEBASE_REVIEW_2026-06-17.md)
- [`docs/IMPLEMENTED_SURFACES_2026-06-17.md`](docs/IMPLEMENTED_SURFACES_2026-06-17.md)
