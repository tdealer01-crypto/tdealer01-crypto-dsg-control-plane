# Week 1 Workplan — Phase 1-2 Execution

Companion to `PHASE_1_2_EXECUTION_SUMMARY.md`. Every claim below is classified `verified fact`, `inference`, `pending`, or `blocked` per `CLAUDE.md` §0 — nothing here is guessed.

## 1. Team owner assignments — `blocked`

This is an organizational decision, not something derivable from source code. No names can be filled in without the team providing them. Template:

| Role | Owner (name/handle) | Status |
|---|---|---|
| PostgreSQL/DB Lead | _unassigned_ | `blocked` |
| Agent 2 Lead (Monitor) | _unassigned_ | `blocked` |
| Agent 3 Lead (Audit) | _unassigned_ | `blocked` |
| Agent 4 Lead (Optimize) | _unassigned_ | `blocked` |
| Agent 5 Lead (A11y) | _unassigned_ | `blocked` |
| Agent 6 Lead (Infra) | _unassigned_ | `blocked` |

**Next step**: the team fills this table in; it is not an engineering task.

## 2. PostgreSQL Phase 2 blocker resolution — `in_progress` as of this doc

The 3 CRITICAL blockers (governance model misalignment, Z3 output format validation, immutability policy performance) are being worked on directly in the DRAFT migration under `supabase/migrations/` in a parallel workstream. See that migration file's own comments for current per-blocker status once that work lands — do not treat this doc as the source of truth for blocker status; the migration file and its commit history are.

The remaining 7 blockers (archive/retention, RLS service_role permissiveness, `created_by` for service_role, UNSUPPORTED→REVIEW/BLOCK mapping, proof chain validation, timeout index, determinism ledger integration) are `pending` — not started.

**Cannot be marked "ready for production apply" until**: a DBA/reviewer with live Supabase access confirms all 10 blockers against the actual project, per `CLAUDE.md` §6 (Supabase migration change process) — a migration file existing is not "live DB ready."

## 3. Feature Flag Register — done

See `docs/FEATURE_FLAG_REGISTER.md`, built directly from `lib/vercel-flags.ts` and its call sites. Correction from earlier planning docs: `ENABLE_COMPLIANCE_EXPORT` and `z3-real-solver`, referenced in `PHASE_1_2_EXECUTION_SUMMARY.md`, do not exist in code. Do not carry them forward as real flags.

## 4. Phase 1 verification baseline

Static/code-level checks only — this environment has no live Stripe account, no live Supabase project, and no browser-based WCAG scanner installed, so several items are `blocked` rather than verified. Do not mark them done based on code existing.

| Item | Status | Evidence |
|---|---|---|
| Stripe checkout endpoint exists | `verified fact` | `app/api/stripe/webhook/route.ts` and `app/api/webhooks/stripe/route.ts` both present |
| Stripe checkout tested end-to-end with a real account | `blocked` | No live Stripe credentials in this environment. Requires a human with Stripe test-mode access to run a real checkout and confirm the webhook fires. |
| Metered billing webhook code exists | `verified fact` | `ENABLE_BILLING_UI` flag gates `app/api/billing/usage/route.ts:38`; billing outbox pattern documented in `CLAUDE.md` §14 |
| Metered billing verified live | `blocked` | Same reason — no live Stripe/Supabase in this environment |
| Cron routes exist and fail closed | `verified fact` | 9 routes under `app/api/cron/**` (`week3-campaign-pulse`, `flush-meter-outbox`, `yield-optimizer`, `inventory-sync`, `agent-health-check`, `agent-orchestrator`, `billing-sync`, `usage-alerts`) all gate on `CRON_SECRET` |
| Cron routes actually scheduled to run automatically | `not verified` — likely gap | Repo-wide search found **no `"crons"` key in `vercel.json` or any other committed JSON config**. `CLAUDE.md` §4 states `vercel.json` "currently uses installCommand and cron schedules" — that claim does not match the current file content (checked directly: only `buildCommand`, `outputDirectory`, `github` keys present, no `crons` array). Either scheduling is configured out-of-repo in the Vercel dashboard (unverifiable from here) or it genuinely isn't scheduled. Needs a human with Vercel dashboard access to confirm. |
| Test coverage baseline | `pending` | `npm run test:coverage` (`vitest run --coverage`) exists as a script but was not run as part of this doc — running it and recording the number is a straightforward next step, just not done here to keep this a docs-only pass |
| WCAG audit baseline | `blocked` | No `axe`, `wcag`, or `a11y` tooling found anywhere in `package.json` (checked directly). There is currently no automated way in this repo to measure the 89%→91%→95%→100% WCAG progression referenced in the execution plan. Someone needs to either add an automated scanner (e.g. `@axe-core/playwright`) or confirm the 89% baseline figure's original source, because it isn't reproducible from this repo alone. |

## 5. Honest gaps this doc surfaces

- The CLAUDE.md claim about `vercel.json` cron schedules does not match the file's current content — flagging per the "safe default" rule in `CLAUDE.md` §24 (stop and report the conflict rather than guess).
- WCAG percentage figures used throughout planning docs (89%, 91%, 95%, 100%) have no reproducible measurement tool in this repo as of this check. Treat all such percentages in prior docs as `not verified` until a scanner is added and run.
- Stripe/billing "verification" can only be code-level in this environment; live-account testing is a human task, not something this session can complete.
