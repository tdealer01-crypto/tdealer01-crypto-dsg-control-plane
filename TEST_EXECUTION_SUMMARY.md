# Test Execution Summary (2026-04-03)

## Environment setup
- Installed dependencies with `npm install`.
- Created `.env.local` based on `.env.example` using local dummy values for required keys (file is gitignored).

## Vitest (`npm test`)
- Command: `npm test`
- Result: ✅ PASS
- Aggregate result from run:
  - Test files: 41 passed, 0 failed, 0 skipped
  - Tests: 85 passed, 0 failed, 0 skipped

### Vitest breakdown by category
- unit: pass 41, fail 0, skip 0
- integration: pass 35, fail 0, skip 0
- failure: pass 4, fail 0, skip 0
- migrations: pass 5, fail 0, skip 0

## Playwright browser install
- Command: `npx playwright install chromium`
- Result: ❌ FAIL
- Failure output excerpt:
  - `Error: Download failed: server returned code 403 body 'Domain forbidden'`
  - URL: `https://cdn.playwright.dev/builds/cft/145.0.7632.6/linux64/chrome-linux64.zip`

## Playwright E2E (`npx playwright test`)
- Command: `npx playwright test`
- Result: ❌ FAIL
- Aggregate result:
  - e2e: pass 0, fail 1, skip 0

### Failed E2E details
- Test: `tests/e2e/enterprise-proof.spec.ts > enterprise walkthrough shows all checkpoints`
- Failure output excerpt:
  - `Error: browserType.launch: Executable doesn't exist at /root/.cache/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-linux64/chrome-headless-shell`
  - Playwright suggested: `npx playwright install`

## Final consolidated totals
- unit: pass 41, fail 0, skip 0
- integration: pass 35, fail 0, skip 0
- failure: pass 4, fail 0, skip 0
- migrations: pass 5, fail 0, skip 0
- e2e (playwright): pass 0, fail 1, skip 0
