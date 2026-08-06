# ISO/IEC 42001 Alignment Matrix

DSG positioning: AI governance control layer for governed AI execution.

Boundary: this document describes alignment support. It is not a certification claim.

Source basis: ISO/IEC 42001:2023 specifies requirements for establishing, implementing, maintaining, and continually improving an Artificial Intelligence Management System for organizations that provide or use AI-based products or services.

Official source: https://www.iso.org/standard/42001

## Matrix

| DSG capability | Governance workflow support | Current evidence | Status |
|---|---|---|---|
| Deterministic action gate | Controlled execution boundary before AI-proposed actions affect production systems | Gateway Mode, Monitor Mode, production benchmark | Implemented |
| Policy and approval checks | Documented control workflow for sensitive AI actions | plan-check and tool execution routes | Implemented |
| Invariant checks | Repeatable required-condition checks before execution | SMT2-compatible runtime invariant evidence | Implemented |
| requestHash and recordHash | Traceability for action decision and result evidence | auditToken, requestHash, recordHash | Implemented |
| Monitor Mode | Customer keeps runtime/API keys while DSG records evidence | plan-check plus audit commit | Implemented |
| Audit export | Reviewable evidence records | audit export JSON endpoint | Implemented |
| GitHub Secure Deploy Gate Action | CI/CD gating evidence | GitHub Marketplace Action v1.0.2 | Implemented |
| Signed evidence bundle | Portable evidence package | evidence-bundle JSON and PDF report | Planned |
| Control library | Reusable governance controls | policy/control templates | Planned |
| Organization workspace | Organization-scoped governance operations | workspace/admin UI | Planned |

## Safe wording

DSG supports ISO/IEC 42001-aligned AI governance workflows by providing deterministic action control, invariant checks, approval gating, and exportable audit evidence.
