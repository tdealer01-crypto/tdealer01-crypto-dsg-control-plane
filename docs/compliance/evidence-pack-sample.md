# DSG Evidence Pack Sample

Purpose: show what evidence a reviewer, consultant, or buyer can expect from DSG during governed AI execution.

Boundary: this is a sample evidence structure. It is not an independent audit report.

## Evidence sources

| Evidence source | Purpose | Current status |
|---|---|---|
| Production Gateway Benchmark | Shows end-to-end gateway checks | Implemented |
| SMT2 Runtime Invariants | Shows runtime invariant pass/fail evidence | Implemented |
| Public Vendor Baseline | Shows public documentation baseline comparison boundary | Implemented |
| Audit Events API | Shows event history | Implemented |
| Audit Export API | Exports JSON evidence | Implemented |
| GitHub Marketplace Action | Provides CI/CD gate evidence | Implemented |
| Signed Evidence Bundle | Portable signed package | Planned |
| Evidence PDF Report | Human-readable reviewer report | Planned |

## Latest observed evidence summary

```text
Production Gateway Benchmark:
pass: true
checks: 6/6
passRate: 100%
avgLatencyMs: 2047
minLatencyMs: 1029
maxLatencyMs: 4254

SMT2 Runtime Invariants:
pass: true
checks: 6/6
passRate: 100%

Comparison Rubric:
score: 190/200
percent: 95%

Public Vendor Baseline:
pass: true
dsgRuntimeTested: true
publicDocVendors: 5
vendorRuntimeTested: 0
```

## Sample JSON structure

```json
{
  "evidenceType": "dsg-ai-action-governance",
  "generatedAt": "2026-05-01T00:00:00.000Z",
  "organizationId": "org-smoke",
  "actorId": "agent-001",
  "actorRole": "agent_operator",
  "toolName": "custom_http.customer_webhook",
  "action": "post",
  "decision": "allow",
  "risk": "medium",
  "approvalRequired": false,
  "requestHash": "sha256-request-placeholder",
  "recordHash": "sha256-record-placeholder",
  "auditToken": "gat_example",
  "result": {
    "ok": true,
    "provider": "customer_runtime"
  },
  "checks": {
    "organizationIdentity": true,
    "actorIdentity": true,
    "roleAllowed": true,
    "planEntitled": true,
    "toolRegistered": true,
    "actionMatchesTool": true,
    "evidenceWritable": true
  }
}
```

## Reviewer interpretation

Use this evidence to answer:

- Who requested the action?
- What tool/action was requested?
- Was the actor allowed?
- Was approval required?
- Did the action pass deterministic checks?
- Was the request hashed?
- Was the result committed and hashed?
- Can the event be exported for review?

## Safe wording

DSG produces structured AI action governance evidence with request hashes, record hashes, runtime decisions, and exportable audit records.
