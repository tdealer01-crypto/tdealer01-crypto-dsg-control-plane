# Checkpoint — 2026-06-12: CI stabilized

Anchor commit: `e88bcc6c8cfac7c9b0b065db9e2f38504a4a73d5` (main, PR #725 squash merge; #722 merged earlier the same day as `d7a7fa4`).

This file records the best verified state of the system to date, with evidence. Claims follow the repo truth policy: every line below is backed by a CI run, command output, or live endpoint response captured on 2026-06-12.

## Verified green at this checkpoint

- ccvs-evidence chain fully green end-to-end for the first time: L1–L5 evidence, compliance matrix (claim_pass_eligible: ELIGIBLE, 9/9 requirements PASS), evidence bundle manifest, Check claim readiness (runs 27437408402 / 27438328461).
- security-evidence fully green: npm audit 0 vulnerabilities (was 2 critical), Gitleaks 0 secrets, CodeQL, SBOM, summary PASS (run 27438328498).
- CI Security Checks `security` job green: 0 error-message-leakage routes (was 10) (run 27438328436).
- CI `stripe-app-typecheck` green (was failing on 4 TS errors) (run 27438328487).
- DSG Proof Gate, e2e, E2E Pipeline `verify`, dsg-gate, `test`: green on the anchor commit.
- Local verification on the anchor commit: vitest 2003 passed / 0 failed, `tsc --noEmit` clean, `next build` compiled (166 pages), `scripts/check-error-handlers.sh` 0 findings.
- Production healthy: `/api/health` ok/core_ok/db_ok all true, `/api/readiness` ok, `/api/agent/status` db check true; `npm run go:no-go` PASS (run against the earlier `d7a7fa4` deploy the same day).

## Known limits (open, tracked — not code bugs)

1. CI `verify` (live-DB gate tests) still red **solely from live Supabase schema drift**: the live database is missing columns that checked-in migrations define — `executions.metadata`, `usage_counters.amount_usd`, `audit_logs.metadata`; the finance approve flow 500s for the same root cause. Fix = apply the checked-in migrations to the live DB via Supabase dashboard/CLI (requires credentials; cannot be fixed from repo code). Status: `blocked` on DB access.
2. Delegation live-DB suites are gated behind `RUN_DELEGATION_LIVE_DB=1` because two checked-in migrations define conflicting `delegated_agi_jobs` shapes (`20260610_add_delegated_agi_jobs.sql` vs `20260610120000_add_user_confirmation.sql`). Reconcile into one canonical shape, apply to live DB, then remove the gate. Status: `pending` schema reconciliation.
3. 23 routes carry pre-existing `ERROR_HANDLER_EXEMPT` markers and still return `error.message`; the gate skips them by design. Migration to `handleApiError` is tracked as gradual cleanup (208 routes on legacy error paths, warning-only).

## How to reproduce this checkpoint's verification

```bash
npm ci && npm run typecheck && npm run test && npm run build
bash scripts/check-error-handlers.sh
cd packages/stripe-app && npm install && npm run type-check
npm run go:no-go https://tdealer01-crypto-dsg-control-plane.vercel.app
```
