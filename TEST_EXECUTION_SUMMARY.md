# Test Execution Summary (2026-04-10)

## Environment setup
- Installed dependencies with `npm ci`.
- No additional environment file changes were required for this run.

## Vitest (`npm test`)
- Command: `npm test`
- Result: ❌ FAIL
- Aggregate result from run:
  - Test files: 44 passed, 1 failed, 0 skipped
  - Tests: 99 passed, 1 failed, 0 skipped

### Vitest breakdown by category (from current run)
- unit: pass 45, fail 0, skip 0
- integration: pass 49, fail 1, skip 0
- failure: pass 4, fail 0, skip 0
- migrations: pass 5, fail 0, skip 0

### Failed test details
- Test file: `tests/integration/api/request-access.test.ts`
- Test case: `/api/access/request > creates pending access request row`
- Failure output excerpt:
  - `Error: Test timed out in 5000ms.`

## Playwright status
- Not re-run in this execution round.
- Last known state in this repo context remains: browser install/E2E blocked by Playwright browser download/availability issue.

## Final consolidated totals (current run)
- unit: pass 45, fail 0, skip 0
- integration: pass 49, fail 1, skip 0
- failure: pass 4, fail 0, skip 0
- migrations: pass 5, fail 0, skip 0
- e2e (playwright): not executed in this round
