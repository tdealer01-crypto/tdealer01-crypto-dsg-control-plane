---
description: Verify a changed API route with targeted tests per the verification ladder
argument-hint: "[route path, e.g. app/api/health/route.ts]"
allowed-tools: Bash(npm run test:*), Bash(npm run typecheck), Bash(bash scripts/check-request-body-safety.sh), Bash(npm audit:*)
---

# /verify-route — Targeted API route verification

Verify a change to an API route (`$ARGUMENTS`) using the API route / security
tier of the verification ladder (CLAUDE.md section 6).

Run the narrowest checks that prove the change:

1. Typecheck:

   ```bash
   npm run typecheck
   ```

2. Targeted tests — pick the suite that covers the route:

   ```bash
   npm run test:unit
   npm run test:integration
   ```

   If a specific test file exists for the route, prefer running just that file:

   ```bash
   npm run test -- <path/to/route.test.ts>
   ```

3. Request body safety (for POST/PUT/PATCH routes):

   ```bash
   bash scripts/check-request-body-safety.sh
   ```

4. Dependency audit when the change touches dependencies:

   ```bash
   npm audit --audit-level=high
   ```

Reporting rules:

- Report each command and its real pass/fail/warning result.
- For public endpoints, only run live/local `curl` when the environment is
  configured and authorized; otherwise say `Not run`.
- Confirm the route follows conventions: `dynamic = 'force-dynamic'` where
  needed, async `params` shape for dynamic routes, `readJsonBody(...)` with an
  explicit max size on critical POST/PUT/PATCH routes, and auth implemented in
  the route rather than assumed from middleware.
- A passing Vitest suite does not prove `next build` passes — run `/pre-pr-check`
  before opening a PR.
