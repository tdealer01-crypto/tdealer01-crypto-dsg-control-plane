# UI Memory Refresh Persistence

## Problem

Several dashboard pages keep user-visible state only in React component state. A browser refresh recreates the component and clears that state, which makes command output, chat traces, drafts, filters, and selected panels look like they disappeared.

## Rule

Production dashboard state that matters to an operator must be backed by an authenticated server source of truth. `localStorage` may only be used as an optional offline/draft cache, never as the production source-of-truth.

## New server-backed memory layer

- Migration: `supabase/migrations/20260605_dsg_ui_memory.sql`
- API: `/api/ui-memory`
- Client hook: `hooks/usePageMemory.ts`

The API is org-scoped through `requireOrgRole` and writes `org_id`, `user_id`, `page_key`, `memory_key`, and JSON object `payload`.

## Rollout order

1. Command Center
   - command draft
   - chat output
   - visible error state
   - selected panel/tab if added later

2. Hermes dashboard
   - chat history
   - active runtime tab
   - last non-terminal stream status

3. Other dashboard pages
   - executions filters
   - approvals filters
   - gateway monitor search state
   - onboarding dismissed preference if not already server-derived

## Acceptance criteria

- Refreshing `/dashboard/command-center` restores the latest command console state.
- Refreshing `/dashboard/hermes` restores chat history from `/api/ui-memory`, not only from `localStorage`.
- If the migration is missing, the UI must degrade visibly and must not pretend persistence is active.
- No production claim can be made until CI passes and the Supabase migration is applied in the target environment.
