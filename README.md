# DSG ONE — ProofGate Control Plane

> **Block before the AI agent acts — not after the damage is done.**

DSG ONE is a runtime governance layer for AI agents. Connect it in one line, gate every action before execution, and keep a cryptographic audit trail for regulated AI-agent operations.

**Production URL:** `https://tdealer01-crypto-dsg-control-plane.vercel.app`

---

## 🟢 GO / NO-GO — 2026-05-24

```
GO/NO-GO RESULT: PASS  ✅  (all scripted checks green)
```

| Gate | Result | Command / Evidence |
|---|:---:|---|
| TypeScript typecheck | ✅ 0 errors | `npm run typecheck` |
| Unit + integration tests | ✅ **550 passed** / 566 total | `npm run test` — 15.89s |
| Policy Z3 proofs | ✅ 8 theorems UNSAT | `npm run verify:policy` |
| Revenue Z3 proofs | ✅ 16 theorems FORMAL PROOF PASS | `npm run proof:revenue` |
| Production homepage | ✅ HTTP 200 | `GET /` |
| Runtime readiness | ✅ HTTP 200 `status=ready` | `GET /api/readiness` |
| Health + rate limiter | ✅ HTTP 200 `rateLimiter.ok: true` | `GET /api/health` |
| Trust surface pages | ✅ HTTP 200 × 4 | `/terms` `/privacy` `/security` `/support` |
| User-flow E2E | ✅ PASS | finance-governance submit → approve → Supabase persisted |
| **go:no-go gate** | ✅ **PASS** | `npm run go:no-go https://tdealer01-crypto-dsg-control-plane.vercel.app` |

### Full test output — 2026-05-25

```
 Test Files  107 passed | 4 skipped (111)
      Tests  550 passed | 12 skipped (566)
   Start at  2026-05-25
   Duration  ~16s
```

```
npm run typecheck     ✅  0 errors
npm run verify:policy ✅  8 theorems proved, 0 failed
npm run proof:revenue ✅  16 theorems — VERDICT: FORMAL PROOF PASS
npm run go:no-go      ✅  GO/NO-GO RESULT: PASS
```

---

## 🧪 Test Coverage Additions — 2026-05-25 (branch: `claude/test-coverage-analysis-471Xf`)

### Current count on branch

```
 Test Files  115 passed | 4 skipped (119)
      Tests  757 passed | 12 skipped (769)
   Duration  ~17s
```

**+207 tests (+8 files)** added this session. See `TEST_EXECUTION_SUMMARY.md` for full file-level detail.

### New test files (do not re-test these)

| Test file | Tests | Source file covered |
|---|:---:|---|
| `tests/unit/runtime/reconcile-effect-callback.test.ts` | 7 | `lib/runtime/reconcile.ts` |
| `tests/integration/api/effect-callback.test.ts` | 11 | `app/api/effect-callback/route.ts` |
| `tests/unit/gateway/smt2-invariants.test.ts` | 63 | `lib/gateway/invariants/smt2.ts` |
| `tests/unit/gateway/audit.test.ts` | 19 | `lib/gateway/audit.ts` |
| `tests/unit/gateway/evidence-bundle.test.ts` | 26 | `lib/gateway/evidence-bundle.ts` |
| `tests/unit/runtime/checkpoint.test.ts` | 7 | `lib/runtime/checkpoint.ts` |
| `tests/unit/security/secure-token.test.ts` | 31 | `lib/security/secure-token.ts` |
| `tests/unit/security/cron-auth.test.ts` | 11 | `lib/security/cron-auth.ts` |
| `tests/unit/gateway/approvals.test.ts` | 26 | `lib/gateway/approvals.ts` |

