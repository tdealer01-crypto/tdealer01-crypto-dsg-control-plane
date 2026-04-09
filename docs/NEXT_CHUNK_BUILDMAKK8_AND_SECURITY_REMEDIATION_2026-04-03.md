# Next Chunk Plan — isolate `buildMakk8ActionData is not a function` + Security Follow-ups

Date: 2026-04-03
Scope: follow-up work **separate from** spine hardening PR

## A) Separate PR for `buildMakk8ActionData is not a function`

Objective: fix the failing baseline test without mixing with spine runtime changes.

### Guardrails
- Do **not** modify `lib/spine/pipeline.ts` or `lib/spine/engine.ts` in this chunk.
- Do **not** touch migrations.
- Keep PR strictly focused to MAKK8 action data builder wiring/export mismatch.

### Suggested branch
- `fix/makk8-action-data-export`

### Triage checklist
1. Reproduce baseline failure:
   - `npm run test:unit -- tests/unit/api/execute-makk8-integration.test.ts`
2. Locate symbol definition and export:
   - `buildMakk8ActionData` declaration file
   - barrel export (if any)
   - import site in execute route / integration path
3. Confirm module format mismatch possibilities:
   - default export vs named export
   - CJS interop (`module.exports`) vs ESM import
   - test mock overriding function with object
4. Add/adjust unit coverage for the resolved import/export shape.
5. Re-run:
   - `npm run typecheck`
   - `npm run test:unit -- tests/unit/api/execute-makk8-integration.test.ts`

### Definition of done
- `execute-makk8-integration.test.ts` passes.
- No regressions on spine-targeted runtime tests.
- Diff excludes spine hardening files.

---

## B) Security remediation chunking (from Enterprise Security Checklist)

Objective: close medium-risk items in small auditable PRs.

### PR-SEC-1 (Medium): Rate limit `app/auth/continue/route.ts`
- Add route-level `applyRateLimit()` policy for magic-link continuation endpoint.
- Include identifier strategy (IP + optional email hash) and safe fallback.
- Return consistent `429` response body.

Validation:
- unit test for allowed + throttled paths
- verify no impact to normal auth flow

### PR-SEC-2 (Medium): Error-message leakage reduction
- Replace direct `error.message` exposure in 500 paths with generic client-safe text.
- Keep detailed diagnostics server-side only.
- Introduce helper (e.g., `toClientSafeError`) if repeated across routes.

Validation:
- tests assert generic message contract for failure cases
- logs still preserve debuggability without sensitive payload leakage

### PR-SEC-3 (Medium): lockfile policy
- Add and commit one lockfile (prefer current package manager in repo conventions).
- Ensure CI uses frozen lockfile mode.

Validation:
- clean install from lockfile
- typecheck + critical unit tests pass

---

## C) Codex prompt for the MAKK8-only fix PR

```text
You are in repo: tdealer01-crypto/tdealer01-crypto-dsg-control-plane

Task: fix only the failing baseline issue:
- buildMakk8ActionData is not a function
- failing test: tests/unit/api/execute-makk8-integration.test.ts

Rules:
- Do not modify spine hardening files:
  - lib/spine/pipeline.ts
  - lib/spine/engine.ts
- Do not touch migrations or billing config.
- Keep diff minimal and focused on import/export/wiring for buildMakk8ActionData.

Steps:
1) Reproduce only the targeted failing test.
2) Fix the symbol wiring/export mismatch.
3) Add or update tests only where needed.
4) Run:
   - npm run typecheck
   - npm run test:unit -- tests/unit/api/execute-makk8-integration.test.ts
   - npx vitest run tests/unit/runtime/gate.test.ts tests/unit/runtime/recovery.test.ts
5) Output:
   - changed files
   - commands run
   - pass/fail per command
   - short risk note confirming no spine behavior changes
```

---

## D) Merge strategy

1. Merge spine hardening PR first (already isolated).
2. Open MAKK8 fix PR as a separate change set.
3. Follow with security PR-SEC-1 and PR-SEC-2.
4. Land lockfile policy PR-SEC-3 with CI enforcement.

This order preserves review clarity and rollback safety.
