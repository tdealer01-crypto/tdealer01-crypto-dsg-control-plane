# Test Execution Summary

## Purpose
This document tracks test coverage additions per session so future sessions can avoid re-testing the same areas.

---

## 2026-05-25 — Test Coverage Session (`claude/test-coverage-analysis-471Xf`)

**Result:** 731 passed / 743 total across 114 files (+181 tests, +7 files vs main)

### Files added this session

| Test file | Tests | Source file | What's covered |
|---|:---:|---|---|
| `tests/unit/runtime/reconcile-effect-callback.test.ts` | 7 | `lib/runtime/reconcile.ts` | found/not-found, idempotency (succeeded/failed final), pending→update, DB error, org_id scoping |
| `tests/integration/api/effect-callback.test.ts` | 11 | `app/api/effect-callback/route.ts` | 401/403 auth, 400 missing effect_id, 400 bad JSON, 404 unknown, 200 idempotent flag, status default, orgId isolation, 500 on throw |
| `tests/unit/gateway/smt2-invariants.test.ts` | 63 | `lib/gateway/invariants/smt2.ts` | buildSmt2InvariantInput (all field mappings, allowlists, risk int), evaluateSmt2InvariantInput (all 10 violations, approval gate, multi-violation, hash determinism), renderGatewayInvariantSmt2 (SMT2 structure, all 12 declare-const) |
| `tests/unit/gateway/audit.test.ts` | 19 | `lib/gateway/audit.ts` | hashGatewayValue (stable key sort, nested, arrays, primitives, null), buildGatewayAuditProof (hash determinism, committed flag logic for allow/block/review) |
| `tests/unit/gateway/evidence-bundle.test.ts` | 26 | `lib/gateway/evidence-bundle.ts` | bundle structure, count/eventHashes, auditToken, exportedAt, evidenceBoundary disclaimers, bundleHash determinism, hash-only vs HMAC signing, keyId fallback |
| `tests/unit/runtime/checkpoint.test.ts` | 7 | `lib/runtime/checkpoint.ts` | SHA-256 output format, determinism, sensitivity to all 4 input fields |
| `tests/unit/security/secure-token.test.ts` | 31 | `lib/security/secure-token.ts` | sha256Hex, timingSafeStringEqual (empty/match/mismatch/case), extractBearerToken (null/empty/valid/non-Bearer/case-insensitive/trim), verifySecretValue (empty/whitespace/exact/sha256/absent/precedence), verifyBearerSecret |
| `tests/unit/security/cron-auth.test.ts` | 11 | `lib/security/cron-auth.ts` | 503 production/401 dev when no secret; shared CRON_SECRET match/mismatch/sha256; job-specific CRON_\<JOB\>_SECRET with name normalization; Cache-Control: no-store always set |

### Source files NOT yet unit-tested (candidates for next session)

| Source file | Priority | Notes |
|---|:---:|---|
| `lib/gateway/approvals.ts` | High | Approval token lifecycle |
| `lib/gateway/approvals-hardened.ts` | High | Hardened approval with extra validation |
| `lib/gateway/control-templates.ts` | Medium | Policy template rendering |
| `lib/gateway/monitor.ts` | Medium | Gateway monitoring |
| `lib/gateway/providers.ts` | Medium | Provider dispatch |
| `lib/gateway/managed-connectors.ts` | Medium | Connector management |
| `lib/runtime/commit-rpc.ts` | Medium | RPC commit layer |
| `lib/security/safe-log.ts` | Low | toSafeErrorInfo, logSecurityEvent |
| `lib/security/audit-export.ts` | Low | Audit export helpers |
| `lib/security/request-json.ts` | Low | Safe JSON body parsing |
| `lib/agent-governance/policy.ts` | Medium | Agent governance policy |
| `lib/agent-governance/planner.ts` | Medium | Governance planning |

---

## 2026-04-10 — Runtime/API contract coverage

### Runtime contract test files

- `tests/integration/api/spine-execute.test.ts`
- `tests/integration/api/intent.test.ts`
- `tests/integration/api/execute-compat.test.ts`
- `tests/unit/security/cors.test.ts`

### CI behavior
GitHub Actions CI validates runtime behavior in this order:

1. Verifies runtime contract test files exist.
2. Runs the runtime contract subset.
3. Runs the full test suite.
4. Runs lint, typecheck, and build checks.

---

## Source of truth for exact totals
Use GitHub Actions CI results for exact test counts and pass/fail totals for any given commit. Static totals here are approximate and may drift.
