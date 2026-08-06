# DSG Audit Readiness Checklist

Purpose: help a consultant or buyer verify that an AI action governance flow produces usable evidence before a pilot is considered complete.

Boundary: this is an audit-readiness aid. It is not an independent audit, legal opinion, or certification report.

## Completion rule

A DSG consult/audit flow is complete only when all four questions can be answered:

1. What benefit does the user get?
2. Where does the user click or what command/API does the user run?
3. What evidence proves the flow worked?
4. Where is the tangible output?

## Checklist

| Area | Required evidence | Pass criteria | Status |
|---|---|---|---|
| Workflow scope | Workflow name, owner, tool/action | Workflow is clearly identified | Required |
| Risk classification | Risk level and rationale | Low/medium/high/critical recorded | Required |
| Pre-execution decision | DSG decision | allow/block/review visible | Required |
| Approval workflow | approvalHash or rejection evidence | High-risk actions have reviewer evidence | Required for high/critical |
| Request proof | requestHash | Hash exists before execution/audit commit | Required |
| Result proof | recordHash | Hash exists after execution/audit commit | Required |
| Evidence export | JSON export or bundle | Export can be downloaded/opened | Required |
| Signed/hash bundle | bundleHash, eventHashes, signature metadata | Portable evidence package exists | Required |
| Control mapping | DSG controls mapped to need | At least one control mapped per risk | Required |
| Boundary statement | No certification overclaim | Page/report says support/aligned, not certified | Required |

## Output package

A completed pilot should produce:

```text
workflow-inventory.md
risk-classification.md
evidence-bundle.json
approvalHash or review decision
requestHash
recordHash
client-readiness-report.md
```

## Safe wording

DSG provides audit-ready evidence for governed AI/tool execution workflows. It does not provide independent certification by itself.
