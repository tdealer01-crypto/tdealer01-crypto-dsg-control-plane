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
Status: accepted
Type: conflict handling

Test-status disagreement between `README.md` and `docs/REPO_TRUTH.md` must be treated as an open conflict.

Observed values:
- README: `185 tests passed, 3 skipped`
- REPO_TRUTH snapshot: `85 tests`, `41 test files`, `0 failures`

Rule:
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
