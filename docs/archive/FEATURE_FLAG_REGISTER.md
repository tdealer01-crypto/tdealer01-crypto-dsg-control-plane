# Feature Flag Register

Status: `verified fact` unless marked otherwise. Built by reading `lib/vercel-flags.ts`, `lib/hooks/useFeatureFlag.ts`, and every call site directly — not copied from prior planning docs, some of which named flags that do not exist in code (see "Not implemented" section).

## Vercel Flags SDK flags (`lib/vercel-flags.ts`)

These are the only flags the `FeatureFlagName` type in `lib/vercel-flags.ts` currently defines. Each reads from env var `FEATURE_FLAG_<NAME>` (`"true"`/`"1"` = on) and falls back to the hardcoded default below when the env var is unset.

| Flag | Default | Env var override | Known call sites | Owner | Retirement |
|---|---|---|---|---|---|
| `ENABLE_MONITOR_DASHBOARD` | `true` | `FEATURE_FLAG_ENABLE_MONITOR_DASHBOARD` | `lib/vercel-flags.ts`, `lib/hooks/useFeatureFlag.ts` | Agent 2 Lead (Monitor) | `pending` — not yet set |
| `ENABLE_AUDIT_LOG` | `false` | `FEATURE_FLAG_ENABLE_AUDIT_LOG` | `lib/vercel-flags.ts`, `lib/hooks/useFeatureFlag.ts` | Agent 3 Lead (Audit) | `pending` — not yet set |
| `ENABLE_BILLING_UI` | `true` | `FEATURE_FLAG_ENABLE_BILLING_UI` | `lib/vercel-flags.ts`, `lib/hooks/useFeatureFlag.ts`, `app/api/billing/usage/route.ts:38` | Agent 4 Lead (Optimize) | `pending` — not yet set |
| `ENABLE_DELIVERY_PROOF` | `true` | `FEATURE_FLAG_ENABLE_DELIVERY_PROOF` | `lib/vercel-flags.ts`, `lib/hooks/useFeatureFlag.ts` | Agent 4 Lead (Optimize) | `pending` — not yet set |

Owner and retirement-date columns are `pending` — this file only documents flags found in code; assigning owners/dates is a Week 1 action item (see `docs/WEEK1_WORKPLAN.md`), not something inferable from source.

## Operational (non-Vercel-Flags-SDK) toggles

These gate behavior via plain `process.env` checks, not the `FeatureFlagName` type above. Listed separately because they are real and load-bearing, but are a different mechanism.

| Env var | Effect | Source | Default |
|---|---|---|---|
| `DSG_DETERMINISTIC_EXTERNAL_SOLVER_ENABLED` | When `"true"` and `DSG_EXTERNAL_SOLVER_URL` is set, `/api/dsg/v1/proofs/prove` invokes the external Z3 solver instead of the deterministic TypeScript fallback | `lib/dsg/deterministic/external-solver.ts` | unset → disabled |
| `NVIDIA_ISING_MODE` | Set to `"live"` to let `optimizeWithIsing` call a real QUBO/Ising solver endpoint instead of the deterministic mock | `.env.example` (Ising live solver section) | unset → mock |
| `CRON_SECRET` | Required for cron routes to execute; missing secret = fail closed, not anonymous execution | Per `CLAUDE.md` §9 | must be set per environment |

## Not implemented (do not reference as real)

`ENABLE_COMPLIANCE_EXPORT` and `z3-real-solver` appeared in an earlier planning document (`PHASE_1_2_EXECUTION_SUMMARY.md`) as if they were existing flags. A repo-wide search confirms neither exists in code. Treat any future reference to them as `not verified` until someone actually adds the flag definition and a call site.

## Verification

```bash
grep -n "FeatureFlagName" lib/vercel-flags.ts
grep -rln "getFeatureFlagServer\|useFeatureFlag\|vercelFlagClient" app lib
```
Both commands run 2026-07-31 against branch `claude/new-session-uy82v0`, commit `6519e09` and later. Results match the table above.
