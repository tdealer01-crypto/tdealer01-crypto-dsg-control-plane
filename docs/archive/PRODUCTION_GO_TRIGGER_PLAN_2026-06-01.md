# Production GO Trigger Plan

Date: 2026-06-01
Status: READY as a plan; PENDING G1-G10 evidence for any Production GO decision.

## Purpose

This plan makes the production decision deterministic: if every required gate is `PASS`, the cutover decision becomes `GO` immediately. If any gate is `FAIL`, `BLOCKED`, `PENDING`, `UNKNOWN`, or `NOT_VERIFIED`, the decision remains `NO-GO`.

This plan does not itself approve production. It defines the only safe trigger for approving production after current evidence is collected.

## Invariants

- Default production posture is `NO-GO` unless all required evidence is current and green.
- Browser storage, mock data, demo-only routes, or server-memory state cannot be used as launch-readiness truth.
- Onboarding, dashboard/read-model, finance workflow, audit, entitlement, and smoke evidence must be DB-backed and org-scoped.
- Org/RBAC enforcement must happen server-side at route boundaries.
- Deterministic readiness must be derived from proof evidence; it must not be a hardcoded `true` claim.
- External Z3 production solver, third-party certification, WORM-certified evidence storage, JWT/JWKS completion, independent audit, marketplace/platform approval, and enterprise certification remain out of scope unless separately verified.

## G1-G10 immediate decision gates

| Gate                              | Required PASS evidence                                                                                                                                    | Fail-closed result |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| G1 Repo verification              | Branch, commit, diff, and working tree are verified.                                                                                                      | `NO-GO`            |
| G2 No fake source-of-truth        | No production onboarding/dashboard/finance truth depends on `localStorage`, `sessionStorage`, mock APIs, demo-only paths, or hardcoded production claims. | `NO-GO`            |
| G3 DB migration + Supabase state  | Required migrations are present and applied to target Supabase; `org_onboarding_states` exists with RLS/index evidence.                                   | `NO-GO`            |
| G4 Org/RBAC route protection      | Anonymous and wrong-permission requests are blocked; valid org permissions work.                                                                          | `NO-GO`            |
| G5 Deterministic proof readiness  | `productionReadyClaim` derives from PASS proof, passing constraints, replay fields, policy metadata, hashes, and solver metadata.                         | `NO-GO`            |
| G6 Typecheck/test/build           | `npm run typecheck`, `npm run test`, `npm run verify:deterministic`, and `npm run build` pass.                                                            | `NO-GO`            |
| G7 Vercel production deploy Ready | Production deployment is Ready for the expected commit.                                                                                                   | `NO-GO`            |
| G8 Live health/readiness          | `/api/health`, `/api/readiness`, and `/api/agent/status` return expected live PASS responses.                                                             | `NO-GO`            |
| G9 Authenticated smoke flow       | Real user/org flow proves DB-backed onboarding, finance actions, audit events, deterministic gate/proof, and evidence artifact generation.                | `NO-GO`            |
| G10 Evidence manifest             | Evidence logs/manifests are committed or attached and identify remaining limitations honestly.                                                            | `NO-GO`            |

## Deterministic decision object

```json
{
  "productionGoDecision": {
    "status": "GO",
    "allowedOnlyWhen": {
      "repoVerification": "PASS",
      "localStorageSourceOfTruthRemoved": "PASS",
      "mockProductionRoutesRemoved": "PASS",
      "dbMigrationsApplied": "PASS",
      "orgRbacEnforced": "PASS",
      "deterministicProofReadiness": "PASS",
      "typecheck": "PASS",
      "tests": "PASS",
      "deterministicVerify": "PASS",
      "build": "PASS",
      "vercelDeploymentReady": "PASS",
      "healthEndpoint": "PASS",
      "readinessEndpoint": "PASS",
      "protectedRoutes": "PASS",
      "authenticatedSmokeFlow": "PASS",
      "evidenceManifest": "PASS"
    },
    "failClosedRule": "If any gate is FAIL, BLOCKED, PENDING, UNKNOWN, or NOT_VERIFIED, final status must be NO-GO."
  }
}
```

## Production GO announcement text

Use this text only after every gate above is verified as `PASS`:

> Production GO for DSG Control Plane cutover is approved based on verified evidence:
>
> - DB-backed onboarding/dashboard/read-model state
> - server-side org/RBAC enforcement
> - deterministic proof readiness derived from evidence
> - local verification passed
> - production deployment Ready
> - live health/readiness passed
> - protected routes block anonymous access
> - authenticated smoke flow passed
> - evidence manifest recorded
>
> Scope boundary:
> This GO does not claim external Z3 production solver, third-party certification, WORM-certified evidence storage, JWT/JWKS complete, or independent audit complete.

## Current status

- Production GO Plan: READY.
- Production GO Status: PENDING G1-G10 evidence.
- Immediate GO Rule: enabled after all gates PASS.
- Current fail-closed posture: `NO-GO` until the evidence manifest shows every gate as `PASS`.
