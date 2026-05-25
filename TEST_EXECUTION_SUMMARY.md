# Test Execution Summary

## Purpose
This document tracks test coverage additions per session so future sessions can avoid re-testing the same areas.

---

## 2026-05-25 — Session 2: P1 coverage (`claude/test-coverage-analysis-471Xf`)

**Result:** 874 passed / 886 total across 129 files (+117 tests, +11 files vs session 1)

### Files added this session

| Test file | Tests | Source file | What's covered |
|---|:---:|---|---|
| `tests/unit/gateway/control-templates.test.ts` | 17 | `lib/gateway/control-templates.ts` | data integrity (unique IDs, valid categories/modes/risks/statuses), at-least-one requiredEvidence, `listGatewayControlTemplates` reference equality |
| `tests/unit/gateway/providers.test.ts` | 14 | `lib/gateway/providers.ts` | mock provider echo/deterministic, unknown→not_supported, zapier no-config/specific-env-key/fallback-URL/503-error/non-JSON, custom_http no-config/registryEntry-endpointUrl/custom_http. prefix |
| `tests/unit/gateway/monitor.test.ts` | 16 | `lib/gateway/monitor.ts` | createMonitorPlanCheck (DB insert error, no event id, allow/block decision, auditToken format, requestHash/decisionHash, constraints); commitMonitorAudit (missing orgId/token, DB read error/not-found/non-allow, update error, success) |
| `tests/unit/gateway/managed-connectors.test.ts` | 11 | `lib/gateway/managed-connectors.ts` | empty orgId/toolName guard, null data, relation error swallowed, non-relation error thrown, connector not connected, null connector, object connector, array connector, requiresApproval cast, description fallback |
| `tests/unit/runtime/commit-rpc.test.ts` | 8 | `lib/runtime/commit-rpc.ts` | success→mode:latest, single call on success, non-signature error→latest, schema-cache mismatch→legacy call, legacy strips limit fields, full args on first call, rpc function name, optional limits absent |
| `tests/unit/security/safe-log.test.ts` | 17 | `lib/security/safe-log.ts` | toSafeErrorInfo (null/undefined/string/number→UnknownError, name/code extraction, empty/whitespace fallbacks, non-string fields); logSecurityEvent (info/warn/error routing, details spread, no-details payload) |
| `tests/unit/security/audit-export.test.ts` | 7 | `lib/security/audit-export.ts` | success with rows, null data→empty, relation error, "does not exist" error, PGRST205 code, generic error→query-error, orgId filter passed |
| `tests/unit/security/request-json.test.ts` | 21 | `lib/security/request-json.ts` | readJsonBody (valid JSON, empty body, invalid JSON, content-length 413, custom maxBytes, arrays, primitives, generic type); jsonSizeBytes (object/empty/{}/null/unicode); maxObjectDepth (flat/null/primitive/array, within-8/over-8, custom limit, nested array) |
| `tests/unit/agent-governance/policy.test.ts` | 4 | `lib/agent-governance/policy.ts` | allow/review_required/block pass-through |
| `tests/unit/agent-governance/planner.test.ts` | 8 | `lib/agent-governance/planner.ts` | empty string, whitespace-only, single step, step_index/tool/params/policy_mode/status |

---

## 2026-05-25 — Session 1: P0 coverage (`claude/test-coverage-analysis-471Xf`)

**Result:** 757 passed / 769 total across 115 files (+207 tests, +8 files vs main)

### Files added this session

| Test file | Tests | Source file | What's covered |
|---|:---:|---|---|
| `tests/unit/runtime/reconcile-effect-callback.test.ts` | 7 | `lib/runtime/reconcile.ts` | found/not-found, idempotency (succeeded/failed final), pending→update, DB error, org_id scoping |
| `tests/integration/api/effect-callback.test.ts` | 11 | `app/api/effect-callback/route.ts` | 401/403 auth, 400 missing effect_id, 400 bad JSON, 404 unknown, 200 idempotent flag, status default, orgId isolation, 500 on throw |
| `tests/unit/gateway/smt2-invariants.test.ts` | 63 | `lib/gateway/invariants/smt2.ts` | buildSmt2InvariantInput (all field mappings, allowlists, risk int), evaluateSmt2InvariantInput (all 10 violations, approval gate, multi-violation, hash determinism), renderGatewayInvariantSmt2 (SMT2 structure, all 12 declare-const) |
| `tests/unit/gateway/audit.test.ts` | 19 | `lib/gateway/audit.ts` | hashGatewayValue (stable key sort, nested, arrays, primitives, null), buildGatewayAuditProof (hash determinism, committed flag logic for all decision types) |
| `tests/unit/gateway/evidence-bundle.test.ts` | 26 | `lib/gateway/evidence-bundle.ts` | bundle structure, count/eventHashes, auditToken, exportedAt, evidenceBoundary disclaimers, bundleHash determinism, hash-only vs HMAC signing, keyId fallback |
| `tests/unit/runtime/checkpoint.test.ts` | 7 | `lib/runtime/checkpoint.ts` | SHA-256 output format, determinism, sensitivity to all 4 input fields |
| `tests/unit/security/secure-token.test.ts` | 31 | `lib/security/secure-token.ts` | sha256Hex, timingSafeStringEqual (empty/match/mismatch/case), extractBearerToken (null/empty/valid/non-Bearer/case-insensitive/trim), verifySecretValue (empty/whitespace/exact/sha256/absent/precedence), verifyBearerSecret |
| `tests/unit/security/cron-auth.test.ts` | 11 | `lib/security/cron-auth.ts` | 503 production/401 dev when no secret; shared CRON_SECRET match/mismatch/sha256; job-specific CRON_\<JOB\>_SECRET with name normalization; Cache-Control: no-store always set |
| `tests/unit/gateway/approvals.test.ts` | 26 | `lib/gateway/approvals.ts` | buildApprovalToken (prefix/format/randomness), buildApprovalHash (determinism/sensitivity), listPendingGatewayApprovals (missing orgId/DB error/success/null data), decideGatewayApproval (all 4 validation errors, DB read error/not-found/not-review, approved+rejected paths with PASS/BLOCK governance events, governance failure) |

### Source files covered in Session 2 (do not re-test)

`lib/gateway/control-templates.ts`, `lib/gateway/providers.ts`, `lib/gateway/monitor.ts`, `lib/gateway/managed-connectors.ts`, `lib/runtime/commit-rpc.ts`, `lib/security/safe-log.ts`, `lib/security/audit-export.ts`, `lib/security/request-json.ts`, `lib/agent-governance/policy.ts`, `lib/agent-governance/planner.ts`

### Source files NOT yet unit-tested

| Source file | Priority | Notes |
|---|:---:|---|
| `lib/gateway/approvals-hardened.ts` | Low | Re-export only — covered via approvals.ts |
| `lib/gateway/tool-registry.ts` | Low | Thin DB wrapper — integration tested via monitor/gateway routes |

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
