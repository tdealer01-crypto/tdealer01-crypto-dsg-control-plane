# Risk Classification Checklist

Purpose: classify AI-proposed actions so consultants can decide which workflows need DSG controls before execution.

Boundary: this checklist supports readiness assessment. It does not replace legal, security, or compliance review.

## Risk levels

| Level | Description | DSG recommendation |
|---|---|---|
| Low | Read-only or low-impact action | Log and monitor |
| Medium | Business action with limited impact | DSG plan-check and audit evidence |
| High | Action can affect customers, money, permissions, production systems, or regulated data | DSG approval/risk gate required |
| Critical | Action can cause material financial, legal, security, or operational impact | DSG block by default or require explicit approved path |

## Classification questions

| Question | Yes/No | Risk implication |
|---|---|---|
| Can the action change production data? |  | High |
| Can the action send external communication? |  | Medium/High |
| Can the action move money or approve payment? |  | High/Critical |
| Can the action deploy software? |  | High |
| Can the action grant access or change permissions? |  | High/Critical |
| Can the action access regulated or sensitive data? |  | High |
| Can the action call admin or internal APIs? |  | High |
| Can the action affect more than one customer or tenant? |  | High/Critical |
| Is there no current audit trail? |  | Raises risk |
| Is there no approval before execution? |  | Raises risk |

## DSG control recommendation

| Risk result | Required controls |
|---|---|
| Low | audit log, optional Monitor Mode |
| Medium | plan-check, requestHash, recordHash, audit export |
| High | plan-check, approval/risk control, invariant check, audit export |
| Critical | block by default, explicit approval path, signed evidence bundle when available |

## Output

For each workflow, record:

```text
riskLevel:
requiresApproval:
recommendedMode:
requiredEvidence:
owner:
reviewer:
```

## Safe wording

DSG helps classify and govern AI actions by risk level before execution, with deterministic gates, approval checks, and audit evidence.
