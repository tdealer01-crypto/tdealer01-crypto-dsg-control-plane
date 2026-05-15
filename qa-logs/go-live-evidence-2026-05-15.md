# DSG ONE Go-Live Evidence — 2026-05-15

## Target
- URL: https://tdealer01-crypto-dsg-control-plane.vercel.app
- Branch: claude/analyze-files-tbmNa
- Environment: production / staging-review

## Repository-level checks (runnable without external credentials)

| Requirement | Status | Evidence |
|---|---|---|
| Vitest baseline (252 tests) | ✅ PASS | qa-logs/npm-test-2026-05-15.log |
| TypeScript typecheck | ✅ PASS | zero errors, verified 2026-05-15 |
| No legacy server-store callers | ✅ PASS | rg found zero callers in app/lib/components/scripts |
| Migration inventory complete | ✅ PASS | 34 migrations in supabase/migrations/, all listed in RUNBOOK_DEPLOY.md |
| RUNBOOK_DEPLOY.md migration list | ✅ UPDATED | includes all 34 migrations through 20260512090000_create_agent_gate_settings.sql |

## External environment checks (require Vercel access + direct outbound network)

| Requirement | Status | Evidence |
|---|---|---|
| Vercel deployment Ready | NOT VERIFIED | requires GitHub Actions with VERCEL_TOKEN / VERCEL_ORG_ID / VERCEL_PROJECT_ID |
| Env validation | NOT VERIFIED | run `vercel env ls production` from authenticated shell |
| Supabase applied-state proof | NOT VERIFIED | run `supabase db push --linked` with production credentials |
| /api/health smoke | NOT VERIFIED | sandbox proxy blocks outbound (CONNECT 403) — re-run from GitHub Actions |
| /api/readiness smoke | NOT VERIFIED | same proxy restriction |
| Finance readiness smoke | NOT VERIFIED | same proxy restriction |
| Authenticated operator checks | NOT VERIFIED | requires live deployment + org credentials |
| Live staging/E2E validation | SKIPPED | requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in shell |

## Root cause of NOT VERIFIED items

All external checks fail with `curl: (56) CONNECT tunnel failed, response 403` — this is an outbound proxy restriction of the sandbox execution environment. The application code has no defects causing these failures.

**Resolution path:** Run the Vercel Production CLI Bypass GitHub Actions workflow (`vercel-prod-cli-bypass.yml`) from a direct-network shell with the required secrets set. That workflow:
1. Deploys via `vercel deploy --prebuilt --prod`
2. Runs `/api/health` check automatically
3. Publishes deployment URL and health result in workflow summary

## Final Decision

Production-readiness gate: **NOT CLOSED** — external deployment evidence not yet captured.
Repository code state: **CLEAN** — tests pass, typecheck clean, no legacy callers, migration list complete.
