# DSG Codex Closure 06: Governance, Approval Flow, Rollback

Status: REVIEW
Production claim: false

## Scope
Advanced governance, approval flow, and rollback.

## Completed evidence
- App Builder has goal lock, PRD/plan, gate, approval, and runtime handoff flow.
- Governed tool records include eventHash, previousEventHash, revision, and materialized state.
- Missing proof must stay missing in UI.
- Fake governance numbers must not be shown.

## Remaining work
- ApprovalRequest persistence for paused high-risk operations.
- User approve/deny API for governed tool execution.
- RollbackEvent persistence.
- Tests for file/API/persistence rollback.

## Truth boundary
This instruction is closed as REVIEW, not PASS.
