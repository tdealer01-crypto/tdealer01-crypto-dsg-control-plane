# Test Execution Summary (2026-05-15 UTC)

## Aggregated Vitest run (`npm test`)
- Test files: **77 passed, 2 skipped, 0 failed**
- Tests: **252 passed, 4 skipped, 0 failed**
- Raw logs:
  - `qa-logs/npm-test-2026-05-15.log`
  - `qa-logs/npm-test.log` (rolling latest)

## Historical baselines
| Date | Files | Tests |
|---|---|---|
| 2026-04-11 | 41 passed, 0 failed | 85 passed |
| 2026-04-17 | 62 passed, 1 skipped | 185 passed, 3 skipped |
| 2026-05-15 | 77 passed, 2 skipped | 252 passed, 4 skipped |

## Notes
- The May 15, 2026 run is the current authoritative baseline.
- Skipped tests are expected in the local environment (live-db tests require production Supabase credentials).
- E2E Playwright coverage still depends on browser binary availability and live environment variables.
- TypeScript typecheck passes with zero errors.
