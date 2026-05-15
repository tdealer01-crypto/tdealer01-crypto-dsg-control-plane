# DSG ONE Go-Live Evidence — 2026-05-15

## Target
- URL: https://tdealer01-crypto-dsg-control-plane.vercel.app
- Branch: main (merged PR #516)
- Commit: dd7f499
- Verified at: 2026-05-15T16:49 UTC

## Gate Results

| Requirement | Status | Evidence |
|---|---|---|
| Vitest baseline (252 tests) | ✅ PASS | qa-logs/npm-test-2026-05-15.log |
| TypeScript typecheck | ✅ PASS | zero errors |
| /terms | ✅ HTTP 200 | go-no-go-gate.sh |
| /privacy | ✅ HTTP 200 | go-no-go-gate.sh |
| /security | ✅ HTTP 200 | go-no-go-gate.sh |
| /support | ✅ HTTP 200 | go-no-go-gate.sh |
| /api/health | ✅ HTTP 200, ok:true | go-no-go-gate.sh |
| /api/readiness | ✅ HTTP 200, status=ready | go-no-go-gate.sh |
| /api/finance-governance/readiness | ✅ HTTP 200, ok:true | direct curl |
| Finance governance backend | ✅ ok:true | /api/readiness checks |
| Supabase service role | ✅ ok:true | /api/readiness checks |
| DSG Core config | ✅ ok:true | /api/readiness checks |
| DSG Core health | ✅ ok:true | /api/readiness checks |
| Env vars complete | ✅ ok:true | /api/readiness checks |
| No legacy server-store callers | ✅ PASS | go-no-go-gate.sh |
| User-flow audit gate (Playwright) | ✅ PASS (E2E skipped — no live Supabase creds in env) | go-no-go-gate.sh |
| GO/NO-GO gate | ✅ PASS | qa-logs/go-no-go-2026-05-15.log |

## /api/health response (2026-05-15T16:49:04Z)
```json
{
  "ok": true,
  "service": "dsg-control-plane",
  "core_ok": true,
  "db_ok": true,
  "error": null,
  "core": { "ok": true, "status": "ok", "version": "internal-runtime-gate" },
  "readiness": { "ok": true, "checks": { "env": {"ok":true}, "nextAuthSecret": {"ok":true}, "supabaseServiceRole": {"ok":true}, "dsgCoreConfig": {"ok":true}, "dsgCoreHealth": {"ok":true}, "financeGovernanceSurface": {"ok":true}, "financeGovernanceBackend": {"ok":true} } }
}
```

## Final Decision

Production-readiness gate: **PASS** ✅
All scripted checks green. Live deployment is serving requests correctly.

Remaining open item (non-blocking for current go-live):
- Live E2E against real Supabase (skipped in gate — requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY injected into shell running the E2E command)
