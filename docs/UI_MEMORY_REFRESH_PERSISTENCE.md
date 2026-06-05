# UI Memory Refresh Persistence

## Problem

Some dashboard pages keep user-visible state only in React component state. A browser refresh recreates the component and clears that state, which makes command output, chat traces, drafts, filters, and selected panels look like they disappeared.

## Rule

Production dashboard state that matters to an operator must be backed by an authenticated server source of truth. `localStorage` may only be used as an optional offline/draft cache, never as the production source-of-truth.

## New server-backed memory layer

- Migration: `supabase/migrations/20260605_dsg_ui_memory.sql`
- API: `/api/ui-memory`
- Client hook: `hooks/usePageMemory.ts`

The API is org-scoped through `requireOrgRole` and writes `org_id`, `user_id`, `page_key`, `memory_key`, and JSON object `payload`.

## Rollout plan

This replacement PR is intentionally smaller than #679. It adds the shared memory layer first, from the current production main after #681. Page wiring should be done in follow-up commits/PRs with tight diffs and tests.

Priority pages:

1. `/dashboard/command-center`
   - command draft
   - chat output
   - visible error state

2. `/dashboard/hermes`
   - chat history
   - input draft
   - stream terminal state

3. Other dashboard pages
   - execution filters
   - approval filters
   - gateway monitor search state

## Acceptance criteria

- Missing migration degrades visibly and does not pretend persistence is active.
- Authenticated operator/admin can save and reload JSON object page memory.
- Anonymous callers do not get memory access.
- No production claim can be made until CI passes and the Supabase migration is applied in the target environment.

## Verification note

This document update is intentionally small so PR checks can run again on the clean `fix/server-backed-ui-memory-v2` branch without changing runtime behavior.
