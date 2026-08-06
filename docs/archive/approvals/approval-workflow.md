# DSG Approval Workflow

Purpose: route high-risk or approval-required AI/tool actions into a review queue before execution.

Boundary: approval workflow records are DSG-generated governance evidence. They are not certification claims or independent third-party audit reports.

## Public page

```text
/approvals?orgId=<org-id>
```

Default demo organization:

```text
/approvals?orgId=org-smoke
```

## API

List pending approvals:

```text
GET /api/gateway/approvals?orgId=<org-id>
```

Approve or reject an event:

```text
POST /api/gateway/approvals
```

Sample approve request:

```bash
curl -X POST https://your-domain.com/api/gateway/approvals \
  -H "Content-Type: application/json" \
  -H "x-reviewer-id: reviewer-001" \
  -H "x-reviewer-role: finance_approver" \
  -d '{
    "orgId": "org-smoke",
    "auditToken": "gat_example",
    "decision": "approved",
    "note": "approved for controlled pilot"
  }'
```

Sample reject request:

```bash
curl -X POST https://your-domain.com/api/gateway/approvals \
  -H "Content-Type: application/json" \
  -H "x-reviewer-id: reviewer-001" \
  -H "x-reviewer-role: finance_approver" \
  -d '{
    "orgId": "org-smoke",
    "auditToken": "gat_example",
    "decision": "rejected",
    "note": "risk too high"
  }'
```

## Evidence produced

| Field | Meaning |
|---|---|
| `approvalToken` | Token generated for approved actions |
| `approvalHash` | Hash of approval decision context |
| `reviewerId` | Reviewer identity |
| `reviewerRole` | Reviewer role |
| `note` | Optional reviewer note |
| `decision` | `approved` or `rejected` |

## Workflow

```text
AI action proposal
→ DSG plan-check
→ decision = review
→ approval queue
→ reviewer approves/rejects
→ approvalHash recorded
→ approved action can be retried with approvalToken
```

## Safe wording

DSG provides an approval workflow for high-risk AI actions, producing review evidence, approval tokens, and approval hashes for governed execution.

## Not claimed

- Independent certification
- Guaranteed compliance
- Legal approval
- Replacement for organizational review policy
