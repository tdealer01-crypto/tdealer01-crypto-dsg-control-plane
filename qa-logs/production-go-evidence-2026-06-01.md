# Production GO Evidence — 2026-06-01

## Commit

- Requested patch commit to verify: `9b5b64a` — BLOCKED locally because `git show 9b5b64a` returned `fatal: bad revision '9b5b64a'` in this clone.
- Verification commit: this commit containing `qa-logs/production-go-evidence-2026-06-01.md`; resolve with `git rev-parse HEAD` after commit.

## Local verification

- `npm run typecheck`: PASS.
- `npm run test`: PASS — 149 files passed, 4 skipped; 1167 tests passed, 12 skipped.
- `npm run verify:deterministic`: PASS.
- `npm run build`: PASS.
- `npm run verify:production-manifest`: PASS — 187 paths present.

## Source-of-truth scan

- `localStorage` production source-of-truth: NOT FULLY CLEARED.
  - Remaining UI-only entry: `components/TryChatWidget.tsx` stores public try-chat history only.
  - Remaining blocker candidate: `lib/dsg/brain/ui/session-storage.ts` persists DSG Brain sessions/config in browser `localStorage`; this cannot be used as production evidence or org-scoped governance truth.
- `sessionStorage` production source-of-truth: NONE FOUND for durable truth.
  - Remaining UI-only entry: `components/AutoSetupTrigger.tsx` one-time API key/agent reveal bridge.
- Mock/demo production route risk: NOT FULLY CLEARED.
  - `/api/demo/bootstrap` returns `410` and is intentionally removed.
  - Gateway `mock.safe.echo` provider remains in registry/executor surfaces and must stay blocked/test-only for production evidence.
  - `/api/agent/commands` still documents an MVP in-memory queue; it is not acceptable as production command/approval/audit source of truth.
  - `/api/ccvs/compliance-status` has an in-memory fallback and cannot be treated as authoritative compliance evidence when Supabase is unavailable.
- `productionReadyClaim: false` hardcoded scan: ALLOWED boundary entries remain in `lib/dsg/memory/request-context.ts` and the initial false value in `lib/dsg/deterministic/proof-engine.ts` before evidence-derived assignment.
- `productionReadyClaim: true` hardcoded scan: NONE FOUND in `app`, `lib`, `tests`, `artifacts`, or `scripts`.

## DB/RBAC

- `org_onboarding_states` migration: PRESENT in migrations/schema, but production application is PENDING without Supabase migration evidence.
- `GET /api/onboarding/state` requires `org.view_reports`: PASS by code and unit test for anonymous denial.
- `PATCH /api/onboarding/state` requires `org.manage_agents`: PASS by code and unit test.
- Invalid normalized widget step id returns 400 before persistence: PASS by code and unit test.
- Valid widget payload persists to `org_onboarding_states`: PASS by code and unit test.
- Onboarding widget mutation writes `audit_logs`: PASS by code and unit test.
- Anonymous blocked: PASS locally for route contract test; live anonymous route verification is PENDING/BLOCKED by network proxy.
- Cross-org blocked: NOT VERIFIED in this patch; current update path scopes by row `id` and `org_id`, but live cross-org test evidence is still required.

## Deterministic readiness

- PASS proof => `productionReadyClaim` true: PASS by unit test.
- Failed/missing proof fields => `productionReadyClaim` false: PASS by unit tests for failed constraint, missing nonce, missing idempotency key, missing policy version, missing constraint-set hash, missing proof hash, missing solver version, and empty constraints.
- `productionReadyClaim` is derived from proof status, non-empty constraints, passing constraints, replay-protection fields, policy reference/version, constraint-set hash, proof hash, input hash, and solver name/version: PASS by implementation and unit test.
- External Z3 production solver claim remains false: PASS by implementation and unit test.
- Third-party certification claim remains false: PASS by implementation and unit test.
- Independent audit, WORM-certified storage, and cryptographic-signing completion claims remain false: PASS by implementation and unit test.

## Live production checks

- Vercel deployment Ready: PENDING — no Vercel credentials or current deployment API evidence in this environment.
- Supabase migrations applied to production: PENDING — no production Supabase credentials/migration evidence in this environment.
- `/api/health`: PENDING/BLOCKED — proxied curl returned `CONNECT tunnel failed, response 403`; direct curl returned DNS resolution failure.
- `/api/readiness`: PENDING/BLOCKED — proxied curl returned `CONNECT tunnel failed, response 403`; direct curl returned DNS resolution failure.
- `/api/agent/status`: PENDING/BLOCKED — proxied curl returned `CONNECT tunnel failed, response 403`; direct curl returned DNS resolution failure.
- Protected routes anonymous 401/403: PENDING/BLOCKED — same live network limitation prevented trusted endpoint results.
- Authenticated smoke flow: PENDING — no live auth credentials/session available in this environment.

## GO decision

- Production GO Plan: READY.
- Production GO Status: NO-GO / PENDING G1-G10 evidence.
- Immediate GO Rule: enabled only after every gate is PASS.
- Production GO: NOT APPROVED in this patch because G1, G2, G3, G7, G8, G9, and parts of G10 remain BLOCKED/PENDING/NOT_VERIFIED.

```json
{
  "productionGoDecision": {
    "status": "NO-GO",
    "reason": "Fail-closed because one or more required gates are BLOCKED, PENDING, or NOT_VERIFIED.",
    "allowedOnlyWhen": {
      "repoVerification": "BLOCKED",
      "localStorageSourceOfTruthRemoved": "BLOCKED",
      "mockProductionRoutesRemoved": "BLOCKED",
      "dbMigrationsApplied": "PENDING",
      "orgRbacEnforced": "PARTIAL_LOCAL_PASS_LIVE_PENDING",
      "deterministicProofReadiness": "PASS",
      "typecheck": "PASS",
      "tests": "PASS",
      "deterministicVerify": "PASS",
      "build": "PASS",
      "vercelDeploymentReady": "PENDING",
      "healthEndpoint": "BLOCKED",
      "readinessEndpoint": "BLOCKED",
      "protectedRoutes": "PENDING",
      "authenticatedSmokeFlow": "PENDING",
      "evidenceManifest": "PASS"
    },
    "failClosedRule": "If any gate is FAIL, BLOCKED, PENDING, UNKNOWN, or NOT_VERIFIED, final status must be NO-GO."
  }
}
```
