# DECISION_LOG

## 2026-04-17

### Decision 001
Status: accepted
Type: source-of-truth structure

`PROJECT_TRUTH.md` should act as a control document, not the deepest canonical source.
Canonical project docs remain:

- `docs/REPO_TRUTH.md`
- `docs/RUNBOOK_DEPLOY.md`

Reason:
These files already contain the verified topology, route truth, deployment steps, migration order, and smoke-check guidance.

### Decision 002
Status: superseded
Type: conflict handling (historical)

Test-status disagreement between `README.md` and `docs/REPO_TRUTH.md` was treated as an unresolved mismatch before fresh evidence was committed.

Observed values at that time:
- README: `185 tests passed, 3 skipped`
- REPO_TRUTH snapshot: `85 tests`, `41 test files`, `0 failures`

Historical rule:
Do not normalize or rewrite this into one number until revalidated.

### Decision 003
Status: accepted
Type: operational interpretation

For repo-wide analysis and release checks, use this route interpretation:

- `/api/health` = public baseline probe
- `/api/execute` = stable execution compatibility entry
- `/api/intent` and `/api/spine/execute` = current spine execution layer
- `/api/usage`, `/api/executions`, `/api/audit`, `/api/policies`, `/api/capacity`, `/api/agent-chat` = authenticated operator surfaces

### Decision 004
Status: accepted
Type: release risk framing

Current practical deployment risk should be treated primarily as configuration drift and deployment/runtime alignment risk until disproven, not as missing runtime-spine inventory.

### Decision 005
Status: accepted
Type: workflow guard

Before any repo modification:
1. read the real target file
2. classify fact / inference / next step
3. stop on conflict
4. patch only after source review

### Decision 006
Status: accepted
Type: test-baseline reconciliation

The April 17, 2026 committed artifact set resolves the earlier 85-vs-185 conflict in favor of **185** as the current authoritative Vitest baseline.

Current baseline:
- `62 test files passed, 1 skipped, 0 failed`
- `185 tests passed, 3 skipped, 0 failed`

Authoritative evidence:
- `qa-logs/npm-test-2026-04-17.log`
- `qa-logs/npm-test.log`
- `qa-logs/test-summary.md`
- `docs/STATUS_SNAPSHOT_2026-04-17.md`

Interpretation rule:
- Keep April 11 documents for historical traceability.
- Treat April 17 committed evidence as current truth until superseded by a newer committed run.


### Decision 007
Status: accepted
Type: production-readiness gating

The April 17, 2026 Vitest baseline (**185 passed, 3 skipped, 0 failed**) is necessary but not sufficient to declare production go-live complete.

Go-live remains blocked until RUNBOOK evidence is closed for:
- Vercel production deployment status = `Ready`
- production environment variables complete and validated
- Supabase migrations applied in-order on target environment
- `/api/health` smoke check passes on deployed target
- `/api/core/monitor` and authenticated operator checks pass
- staging/live E2E validation is recorded

Documentation rule:
- keep test-baseline truth and production-readiness truth as separate sections so test success is not misread as full cutover completion.

### Decision 008
Status: accepted
Type: test-baseline update (May 15, 2026)

The May 15, 2026 Vitest run supersedes the April 17, 2026 baseline.

Current baseline:
- `77 test files passed, 2 skipped, 0 failed`
- `252 tests passed, 4 skipped, 0 failed`
- TypeScript typecheck: zero errors

Authoritative evidence:
- `qa-logs/npm-test-2026-05-15.log`
- `qa-logs/test-summary.md`

Also confirmed in this session:
- No legacy `/api/finance-governance/server-store/` callers exist in app/lib/components/scripts
- All 34 Supabase migrations are present in `supabase/migrations/` and now listed in `RUNBOOK_DEPLOY.md`
- Remaining go-live blockers are environment-dependent (Vercel access, production Supabase, direct outbound network) — not code defects

### Decision 009
Status: accepted
Type: go-live blocker classification

The 2026-05-03 go-live evidence failures (`CONNECT tunnel failed, response 403`) are confirmed as outbound proxy restrictions of the sandbox execution environment, not application-layer or code defects.

Resolution (2026-05-15): Network access became available. Go-no-go gate re-run produced **PASS** with all checks green. Evidence committed to `qa-logs/go-live-evidence-2026-05-15.md` and `qa-logs/go-no-go-2026-05-15.log`.

### Decision 010
Status: accepted
Type: go-live gate closure

The 2026-05-15 go-no-go gate run **PASSED** against the live Vercel deployment. All scripted checks green:
- Trust surfaces (terms, privacy, security, support): HTTP 200
- `/api/health`: ok:true, db_ok:true, core_ok:true
- `/api/readiness`: ok:true, all 7 sub-checks pass
- `/api/finance-governance/readiness`: HTTP 200, ok:true
- No legacy server-store callers
- Vitest: 252 passed, 4 skipped, 0 failed
- TypeScript typecheck: zero errors

Go-live truth is now: **PASS** for current scripted gate. Live E2E against Supabase (requires injected credentials) remains an open follow-up, non-blocking for current deployment.
