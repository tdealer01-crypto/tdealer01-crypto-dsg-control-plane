# Client AI Governance Readiness Report Template

Purpose: provide consultants with a structured report format for presenting AI action governance readiness findings and DSG implementation recommendations.

Boundary: this report template supports advisory and readiness workflows. It is not a certification report.

## 1. Executive summary

Client:
Assessment date:
Consultant:
Scope:

Summary:

```text
This assessment reviewed selected AI workflows and action paths for governance readiness, audit evidence, and pre-execution control gaps. DSG was evaluated as a compliance-enabling control layer for deterministic action gating, invariant checks, approval/risk workflow, and evidence export.
```

## 2. Workflows assessed

| Workflow ID | Name | Owner | Tool/action | Risk level | Current evidence | DSG recommendation |
|---|---|---|---|---|---|---|
| WF-001 |  |  |  |  |  |  |

## 3. Key findings

| Finding | Severity | Evidence | Recommendation |
|---|---|---|---|
| AI action lacks pre-execution approval | High |  | Add DSG plan-check and approval path |
| No portable audit evidence | Medium |  | Use audit export and signed evidence bundle when available |
| Customer API keys should remain internal | High |  | Use DSG Monitor Mode |

## 4. DSG control mapping

| Need | DSG control | Status |
|---|---|---|
| Pre-execution decision | plan-check / Gateway execute | Available |
| Audit trail | audit events / audit export | Available |
| Request proof | requestHash | Available |
| Result proof | recordHash | Available |
| Customer key custody | Monitor Mode | Available |
| CI/CD gate | GitHub Secure Deploy Gate Action | Available |
| Signed report | signed evidence bundle | Planned |

## 5. Recommended pilot

Pilot workflow:
Owner:
Mode: Gateway Mode / Monitor Mode / Deploy Gate
Success criteria:

```text
AI action proposal
→ DSG plan-check
→ allow/block/review decision
→ customer runtime or DSG gateway execution
→ audit commit
→ evidence export
```

## 6. Evidence package

Attach or link:

- audit export JSON
- production evidence page
- benchmark summary
- requestHash / recordHash examples
- GitHub Action run summary if CI/CD is in scope

## 7. Next steps

1. Select pilot workflow.
2. Register tool/action and risk level.
3. Configure plan-check or Gateway Mode.
4. Run controlled demo.
5. Export evidence.
6. Review control gaps.
7. Decide hardening path.

## Boundary statement

DSG supports AI governance readiness, deterministic action controls, and audit evidence workflows. This report does not claim certification, legal compliance, or independent audit status unless separately performed by an authorized body.
