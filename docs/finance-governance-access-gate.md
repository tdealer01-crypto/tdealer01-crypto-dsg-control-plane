# Finance Governance Access Gate

This document describes the backend RBAC and entitlement gate for Finance Governance actions.

## Protected write actions

The following routes require the finance governance access gate:

```http
POST /api/finance-governance/approvals/<id>/approve
POST /api/finance-governance/approvals/<id>/reject
POST /api/finance-governance/approvals/<id>/escalate
```

## Required headers

```http
x-org-id: <organization-id>
x-actor-id: <user-or-agent-id>
x-actor-role: <role>
x-org-plan: <plan>
```

Accepted role headers:

- `x-actor-role`
- `x-user-role`

Accepted actor headers:

- `x-actor-id`
- `x-user-id`

Accepted plan headers:

- `x-org-plan`
- `x-plan`

## Write roles

Write actions are allowed only for:

- `owner`
- `admin`
- `finance_admin`
- `finance_approver`

## Write plans

Write actions are allowed only for:

- `enterprise`
- `business`
- `pro`

## Deny reasons

The gate can deny with:

- `missing_actor_role` -> HTTP 403
- `missing_org_plan` -> HTTP 403
- `role_not_allowed` -> HTTP 403
- `plan_not_entitled` -> HTTP 402
- `finance_governance_access_denied` -> HTTP 403

## Smoke checks

Allowed request:

```bash
curl -i -X POST "https://<host>/api/finance-governance/approvals/<id>/approve" \
  -H "x-org-id: <org-id>" \
  -H "x-actor-id: user_123" \
  -H "x-actor-role: finance_approver" \
  -H "x-org-plan: enterprise"
```

Denied by role:

```bash
curl -i -X POST "https://<host>/api/finance-governance/approvals/<id>/approve" \
  -H "x-org-id: <org-id>" \
  -H "x-actor-id: user_123" \
  -H "x-actor-role: viewer" \
  -H "x-org-plan: enterprise"
```

Denied by entitlement:

```bash
curl -i -X POST "https://<host>/api/finance-governance/approvals/<id>/approve" \
  -H "x-org-id: <org-id>" \
  -H "x-actor-id: user_123" \
  -H "x-actor-role: finance_approver" \
  -H "x-org-plan: free"
```

## Production note

This gate is the server-side enforcement layer for finance action routes. It should later be replaced or backed by persisted organization membership, plan, and entitlement tables when billing and identity data are fully DB-backed.
