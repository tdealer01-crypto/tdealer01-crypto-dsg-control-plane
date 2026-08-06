# Makk-8 Formal Verification Arbiter (DSG V159)

## Placement in DSG Control Plane

Put the arbiter logic in `lib/runtime/makk8-arbiter.ts` so it can be used by runtime gate flows and API routes.

## Suggested call path

1. `app/api/execute/route.ts` (or the route that receives execution commands) validates request input.
2. Build `Makk8ActionData` from normalized request fields.
3. Call `new Makk8Arbiter().verifyPathIntegrity(actionData)` before final gate decision.
4. If `ok === true`, compute `buildDhammaProofHash(...)` and `signDhammaProof(...)` and include both in the audit payload.
5. If `ok === false`, return `PATH_CONFLICT` and store invariant artifact for audit analysis.

## Rationale

`lib/runtime` is the right layer because this arbiter enforces deterministic runtime invariants and produces audit-grade artifacts (proof hash + signature).
