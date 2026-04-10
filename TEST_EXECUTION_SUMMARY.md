# Test Execution Summary (2026-04-10)

## Purpose
This document summarizes runtime contract coverage and CI behavior without pinning hard-coded pass/fail totals that can become stale over time.

## Runtime/API contract coverage
The runtime contract is covered by these test files:

- `tests/integration/api/spine-execute.test.ts`
- `tests/integration/api/intent.test.ts`
- `tests/integration/api/execute-compat.test.ts`
- `tests/unit/security/cors.test.ts`

## CI behavior
GitHub Actions CI now validates runtime behavior in this order:

1. Verifies runtime contract test files exist.
2. Runs the runtime contract subset.
3. Runs the full test suite.
4. Runs lint, typecheck, and build checks.

## Source of truth for exact totals
Use the GitHub Actions CI results for exact test counts and pass/fail totals for any given commit.

This file intentionally avoids presenting static totals as the primary source of truth.
