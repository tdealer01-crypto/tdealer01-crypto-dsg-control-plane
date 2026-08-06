# Archived documentation

This folder holds historical/status-snapshot markdown that used to sit at repo
root or directly under `docs/`. It was moved here on 2026-08-06 to reduce
navigation noise — 516 files with no code, script, or CI reference were
relocated as-is (content unchanged, `git mv` only).

**These files are historical context, not current truth.** Many contain
stale "production-ready" / "complete" / "final" status claims from past
sessions that predate the evidence-first policy in `CLAUDE.md`. Do not cite
anything under `docs/archive/` as current status without re-verifying
against live evidence.

For current project state, use the canonical sources in this order (see
`CLAUDE.md` section 3):

1. Live command/API/deployment/database evidence from the current task.
2. Current branch files inspected directly.
3. `AGENTS.md`
4. `docs/agents/CLAUDE_TOOL_API_CONTRACT.md`
5. `PROJECT_TRUTH.md`
6. `docs/REPO_TRUTH.md` and `docs/RUNBOOK_DEPLOY.md`

## What's still outside this archive

Files still live at repo root or in `docs/` (not archived) fall into two
groups:

- The canonical set above.
- Files actively referenced by application code, scripts, or CI workflows
  (e.g. `DSG.md` and `DESIGN.md`, read at runtime by `app/api/dashboard/trinity/*`
  and `app/design/page.tsx`; several `docs/*.md` files checked by
  `scripts/validate-stripe-submission.sh`, `scripts/verify-ux-route-map.mjs`,
  and similar). These were intentionally left in place — archiving them
  would have broken the script or route that reads them. They still need a
  human decision (keep as living docs vs. update the reference vs. archive
  properly) but that's a follow-up, not part of this move.

## Restoring a file

`git mv docs/archive/<path> <original location>` — full history is preserved,
nothing was deleted.
