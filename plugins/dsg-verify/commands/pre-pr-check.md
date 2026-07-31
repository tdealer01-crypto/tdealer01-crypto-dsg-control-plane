---
description: Run the full pre-PR verification gate (typecheck, tests, build) for the DSG Control Plane
allowed-tools: Bash(npm run typecheck), Bash(npm run test), Bash(npm run test:*), Bash(npm run build), Bash(npm run lint)
---

# /pre-pr-check — Pre-PR verification gate

Run the fuller set of checks before opening a PR, matching the
TypeScript/app-code tier of the verification ladder (CLAUDE.md section 6).
Run them in order and stop to report at the first hard failure.

1. Typecheck:

   ```bash
   npm run typecheck
   ```

2. Lint (fast, catches obvious issues):

   ```bash
   npm run lint
   ```

3. Test suite (or the targeted suites relevant to the change):

   ```bash
   npm run test
   ```

4. Build — this is the only check that proves Next.js pages/routes compile:

   ```bash
   npm run build
   ```

Key rules (CLAUDE.md sections 6, 23):

- A passing `npm run test` does **not** prove `npm run build` passes. Do not
  skip the build for page/component/route changes.
- Report each command with its exact pass/fail result. If a command was not
  run because the environment is not configured, write `Not run` and the
  reason — never claim a pass without real output.
- These checks are for the app. Live DB, live browser, and production
  go/no-go checks require real credentials and are out of scope here; use
  `npm run go:no-go <url>` separately when a production gate is in scope.

When done, produce the `Verification:` block for the PR body (see the
`pr-body-helper` plugin) using the real results.
