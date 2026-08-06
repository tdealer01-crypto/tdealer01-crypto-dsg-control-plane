# PR #169 rework plan (2026-04-05)

## Purpose

Document why PR #169 should not be merged as-is and capture the safest rework path on top of `main`.

## Current blockers

- PR #169 is currently `mergeable: false`.
- The head commit has a failing `Vercel` status.
- Review bots flagged a client-side open redirect risk in the new session-polling flow.
- Review bots also flagged that preflight error messages expose internal configuration details to unauthenticated users.
- The PR was opened against an older base and overlaps auth files that already changed on `main`.

## What to keep from PR #169

- `lib/auth/preflight.ts`
- `app/api/auth/session/route.ts`
- unit tests for auth preflight
- integration tests for the session probe and updated auth flow setup

## What not to carry forward as-is

- direct `window.location.href = next` using query-derived values
- user-facing error text that reveals infrastructure details like missing Supabase/service-role configuration
- any duplicated `getSafeNext` implementation that bypasses the shared utility already merged on `main`

## Recommended rework path

1. Create a fresh branch from `main`.
2. Port `preflight` and `session probe` only.
3. Reuse `lib/auth/safe-next.ts` from `main` for all redirect handling.
4. Use a generic user-facing error such as `server-config-error` while logging detailed preflight failures server-side.
5. Update the login form polling flow to redirect only with a sanitized safe path.
6. Re-run auth unit/integration tests.
7. Open a replacement PR and close or supersede PR #169.

## Suggested replacement scope

- safe session polling on login success
- preflight validation before auth side effects
- generic user-facing config failure handling
- no rollback of the `safe-next` hardening already merged in PR #170

## Notes

This file is intentionally operational and narrow in scope so reviewers can reference a single repo-grounded plan before opening a replacement PR.
