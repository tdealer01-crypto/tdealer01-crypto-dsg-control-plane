# Production Readiness Gate

This document defines the backend readiness gate for the DSG control plane and Finance Governance backend.

## Endpoints

Global health:

```http
GET /api/health
```

Global deployment readiness:

```http
GET /api/readiness
```

Finance governance backend readiness:

```http
GET /api/finance-governance/readiness
```

## Finance governance checks

`/api/finance-governance/readiness` checks:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `finance_transactions`
- `finance_approval_requests`
- `finance_approval_decisions`
- `finance_governance_audit_ledger`
- `finance_workflow_action_events`

The route returns HTTP `200` when all required checks pass and HTTP `503` when any required dependency is missing or unreachable.

## Global readiness integration

`getDeploymentReadiness()` now includes:

```json
{
  "checks": {
    "financeGovernanceBackend": {
      "ok": true
    }
  }
}
```

If `DSG_FINANCE_GOVERNANCE_ENABLED=false`, the finance backend check is skipped and marked as enabled for global readiness with detail `skipped:finance_governance_disabled`.

## Smoke checks

```bash
curl -i https://<host>/api/health
curl -i https://<host>/api/readiness
curl -i https://<host>/api/finance-governance/readiness
```

Expected production gate:

- `/api/health` returns `ok: true`
- `/api/readiness` returns HTTP 200 and `ok: true`
- `/api/finance-governance/readiness` returns HTTP 200 and `ok: true`

## GO / NO-GO

Production remains **NO-GO** if any required readiness check fails.

Common blockers:

- missing Supabase env vars
- Supabase service role cannot query required tables
- finance governance migrations not applied
- audit ledger table missing
- DSG core health failing
- global readiness returns HTTP 503
