# Test Execution Summary (2026-04-03 UTC)

## Environment setup
- Installed dependencies with `npm install`.
- Created local environment file `.env.local` from `.env.example` with local/dummy values (for example `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321` and `DSG_CORE_MODE=internal`).

## Aggregated Vitest run (`npm test`)
- Test files: **41 passed, 0 failed, 0 skipped**
- Tests: **85 passed, 0 failed, 0 skipped**
- Raw log: `qa-logs/npm-test.log`

## Split test runs
- Unit (`npm run test:unit`):
  - Test files: **18 passed, 0 failed, 0 skipped**
  - Tests: **41 passed, 0 failed, 0 skipped**
  - Raw log: `qa-logs/test-unit.log`
- Integration (`npm run test:integration`):
  - Test files: **19 passed, 0 failed, 0 skipped**
  - Tests: **35 passed, 0 failed, 0 skipped**
  - Raw log: `qa-logs/test-integration.log`
- Failure (`npm run test:failure`):
  - Test files: **1 passed, 0 failed, 0 skipped**
  - Tests: **4 passed, 0 failed, 0 skipped**
  - Raw log: `qa-logs/test-failure.log`
- Migrations (`npm run test:migrations`):
  - Test files: **3 passed, 0 failed, 0 skipped**
  - Tests: **5 passed, 0 failed, 0 skipped**
  - Raw log: `qa-logs/test-migrations.log`

## Playwright browser install + E2E
- Browser install (`npx playwright install chromium`): **failed** due CDN 403 Domain forbidden.
  - Raw log: `qa-logs/playwright-install.log`
- Browser install fallback (`PLAYWRIGHT_DOWNLOAD_HOST=https://playwright.azureedge.net npx playwright install chromium`): **failed** due CDN 403 Domain forbidden.
  - Raw log: `qa-logs/playwright-install-azure.log`
- E2E (`npx playwright test`):
  - Specs: **0 passed, 1 failed, 0 skipped**
  - Tests: **0 passed, 1 failed, 0 skipped**
  - Failure cause: Playwright Chromium executable missing because browser download was blocked.
  - Raw log: `qa-logs/playwright-test.log`

## Typecheck
- `npm run typecheck`: **passed** (`tsc --noEmit -p tsconfig.typecheck.json`)
- Raw log: `qa-logs/typecheck.log`
