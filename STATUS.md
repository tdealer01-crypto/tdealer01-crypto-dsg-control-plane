# DSG Revenue-Ready Cut Status

Updated: 2026-05-22

## Current gate

Gate 1 + Gate 2.5 started.

This status file is evidence tracking for the one-cycle revenue-ready cut. It must not be treated as production readiness by itself.

## End-user outcome contract

Canonical user-facing contract: `docs/END_USER_OUTCOME_CONTRACT.md`.

This cycle is complete only when a real user can:

1. Visit the website.
2. Click **Start Trial**.
3. Receive an API key.
4. Copy a working curl example.
5. Receive a deterministic decision: `allow`, `review`, or `block`.
6. See an `audit_id`.
7. Understand that upgrade is required when quota is exhausted.
8. Pay and continue using the product under the paid plan.

Any work that does not improve or prove one of these eight outcomes is out of scope for this cut.

## Added in this pass

- `docs/END_USER_OUTCOME_CONTRACT.md`
- `tools/proofs/requirements.txt`
- `tools/proofs/dsg_revenue_model.py`
- `tools/proofs/governed_agent_model.py`
- `tools/proofs/prove_revenue_ready.py`
- `tools/proofs/README.md`
- `package.json` scripts:
  - `proof:install`
  - `proof:revenue`
- `lib/dsg/deterministic/proof-engine.ts` now derives proof artifact identity from normalized input hash instead of random bytes/current wall-clock time.

## Source-of-truth files read

- `README.md`
- `PROJECT_TRUTH.md`
- `docs/REPO_TRUTH.md`
- `docs/RUNBOOK_DEPLOY.md`
- `package.json`
- `app/api/dsg/v1/gates/evaluate/route.ts`
- `app/api/dsg/v1/proofs/prove/route.ts`
- `lib/dsg/deterministic/gate-engine.ts`
- `lib/dsg/deterministic/proof-engine.ts`
- `lib/dsg/deterministic/types.ts`
- `lib/dsg/deterministic/proof-hash.ts`

## Claim boundary confirmed from repo truth

- `/api/execute` is the stable execution entry.
- `/api/dsg/v1/gates/evaluate` is a live deterministic gate scaffold.
- `/api/dsg/v1/proofs/prove` is a live deterministic proof scaffold.
- The deterministic proof/gate routes do not invoke an external Z3 solver at runtime.
- Repository docs do not support third-party certification, complete production governance, or full end-to-end formal verification claims.

## Formal proof gate scope

The initial Z3 proof gate checks these forbidden states:

- execution without user is impossible
- execution without organization is impossible
- execution without active credential is impossible
- over-quota execution is impossible
- allowed execution without audit evidence is impossible
- over-quota state without upgrade path is impossible
- verified paid checkout without entitlement is impossible
- paid entitlement on free plan is impossible
- high or critical governed-agent risk cannot be allowed
- unauthenticated or quota-failed agent side effects are impossible
- side effects require audit evidence
- blocked decisions cannot create side effects
- every governed-agent path must return a user-visible result

## Commands still required for real evidence

These commands have not been executed in this ChatGPT/GitHub connector session. They must be run in CI or a local checkout before claiming GO:

```bash
npm run proof:install
npm run proof:revenue
npm run typecheck
npm run lint
npm run test
npm run test:coverage
npm run test:e2e
npm run test:e2e:staging
npm run test:live:db:required
npm run go:no-go
```

## Revenue-readiness blockers still open

- Need CI/local proof output from `npm run proof:revenue`.
- Need runtime test output for typecheck, tests, coverage, and E2E.
- Need Stripe test checkout and webhook evidence.
- Need entitlement before/after evidence.
- Need `/api/execute` quota proof under free and paid plans.
- Need production deployment/go-no-go evidence.
- Need executable evidence for all eight end-user outcome steps.

## Current verdict

VERDICT: NO-GO

Reason: the end-user outcome contract, proof gate files, and deterministic proof artifact replay stability change have been added, but no runtime command output, Stripe webhook evidence, or production go/no-go evidence has been collected yet.
