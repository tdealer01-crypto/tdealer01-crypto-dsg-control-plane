# DSG Finance Governance Control Plane

DSG Finance Governance Control Plane is a production-oriented SaaS governance gateway for finance approval workflows. It adds deterministic policy gates, RBAC/entitlement checks, audit ledger proof, and runtime readiness checks around high-risk finance actions.

## Current production status

Live deployment:

- https://tdealer01-crypto-dsg-control-plane.vercel.app

Verified runtime status:

- Vercel deployment: READY
- Finance readiness endpoint: HTTP 200
- Supabase env: configured
- Finance governance tables: reachable
- RBAC-gated approve API: HTTP 200
- Audit proof write path: verified
- `request_hash` and `record_hash`: generated and stored

Smoke-tested approval:

```text
org_id: org-smoke
transaction_id: TX-SMOKE-001
approval_id: APR-SMOKE-001
action: approve
result: ok
next_status: approved

Stored audit proof:

request_hash: 5c1a727def56cf684cc5282f5c95e90d45a27809ec35e7da705804e5f459d5e9
record_hash: 36bbe8fc4594abc9159868a22f6eb6a185c4e80220848f8be2008d1506b45179
```

Product purpose

DSG prevents high-risk finance actions from becoming ungoverned AI or workflow outputs.

It provides:

deterministic approval decisions

finance action gating before execution

role and plan entitlement enforcement

immutable audit evidence

request and record hashing

readiness checks for production deployment

proof export and verification APIs


Core backend capabilities

Finance readiness

GET /api/finance-governance/readiness

Expected healthy response:

{
  "ok": true,
  "service": "finance-governance"
}

The readiness gate checks:

NEXT_PUBLIC_SUPABASE_URL

SUPABASE_SERVICE_ROLE_KEY

finance_transactions

finance_approval_requests

finance_approval_decisions

finance_governance_audit_ledger

finance_workflow_action_events


RBAC / entitlement gate

Protected write routes:

POST /api/finance-governance/approvals/:id/approve
POST /api/finance-governance/approvals/:id/reject
POST /api/finance-governance/approvals/:id/escalate

Required headers:

x-org-id: <organization-id>
x-actor-id: <user-or-agent-id>
x-actor-role: finance_approver
x-org-plan: enterprise

Allowed write roles:

owner

admin

finance_admin

finance_approver


Allowed write plans:

enterprise

business

pro


Denied requests return:

403 for role/access failures

402 for entitlement/plan failures


Audit ledger

Audit ledger records are written to:

finance_governance_audit_ledger

Each audit record stores:

org_id

case_id

approval_id

action

actor

result

target

message

next_status

request_hash

record_hash

payload

created_at


Read audit records:

GET /api/finance-governance/audit-ledger?limit=50
x-org-id: <org-id>

Verify one audit record:

GET /api/finance-governance/audit-ledger/:recordHash/verify
x-org-id: <org-id>

Production database tables

Required Supabase tables:

finance_transactions
finance_approval_requests
finance_approval_decisions
finance_governance_audit_ledger
finance_workflow_action_events

Verified schema status:

finance_transactions              OK
finance_approval_requests         OK
finance_approval_decisions        OK
finance_governance_audit_ledger   OK
finance_workflow_action_events    OK

RLS is enabled on all five tables.

Smoke test

Readiness:

curl -i https://tdealer01-crypto-dsg-control-plane.vercel.app/api/finance-governance/readiness

Approve action:

curl -i -X POST "https://tdealer01-crypto-dsg-control-plane.vercel.app/api/finance-governance/approvals/APR-SMOKE-001/approve" \
  -H "x-org-id: org-smoke" \
  -H "x-actor-id: smoke-user" \
  -H "x-actor-role: finance_approver" \
  -H "x-org-plan: enterprise"

Expected response:

{
  "ok": true,
  "action": "approve",
  "message": "Approval marked as approved",
  "nextStatus": "approved"
}

Deployment

The app is deployed on Vercel and uses Supabase as the runtime database.

Required environment variables:

NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
DSG_CORE_MODE
NEXTAUTH_SECRET
DSG_FINANCE_GOVERNANCE_ENABLED=true

GO / NO-GO

Production GO requires:

Vercel deployment is READY

/api/finance-governance/readiness returns HTTP 200

Supabase tables exist and are reachable

RLS is enabled

approve/reject/escalate routes require RBAC headers

audit ledger writes request_hash and record_hash

smoke test action returns HTTP 200


Current status:

GO for finance governance backend smoke path.
UI/UX still needs to send RBAC headers consistently.

Product boundary

This repository is the DSG Finance Governance Control Plane backend and SaaS surface.

It is not just a landing page. It includes:

production readiness checks

Supabase-backed finance workflow records

RBAC-gated finance actions

deterministic audit proof storage

runtime hash verification APIs
