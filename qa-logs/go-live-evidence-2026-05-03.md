# DSG ONE Go-Live Evidence — 2026-05-03

## Target
- URL: https://tdealer01-crypto-dsg-control-plane.vercel.app
- Commit SHA: 075335599cfa8911498799d54d204559f5f115fa
- Vercel deployment: not resolved in this environment
- Environment: production / staging-review

## Gate Results

| Requirement | Status | Evidence |
|---|---|---|
| Vercel deployment Ready | NOT VERIFIED | qa-logs/vercel-ready-2026-05-03.md |
| Env validation | NOT VERIFIED | run in GitHub Actions with Vercel secrets |
| Supabase applied-state proof | NOT VERIFIED | qa-logs/supabase-applied-state-2026-05-03.log |
| /api/health smoke | FAIL (network/proxy) | qa-logs/live-health-2026-05-03.error.log |
| /api/readiness smoke | FAIL (network/proxy) | qa-logs/live-readiness-2026-05-03.error.log |
| Finance readiness smoke | FAIL (network/proxy) | qa-logs/finance-readiness-2026-05-03.error.log |
| Authenticated operator checks | NOT VERIFIED | run/log/url pending |
| Live staging/E2E validation | SKIPPED by test guard | qa-logs/e2e-live-2026-05-03.log |
| GO/NO-GO gate | NO-GO | qa-logs/go-no-go-2026-05-03.log |

## Final Decision

Production-readiness gate: NOT CLOSED for this execution run.
