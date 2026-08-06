# DSG Mid-Market Governance Autopilot

## Purpose

This feature is a customer-facing onboarding and operator workflow for mid-market companies that need governance, audit, invariant checks, runtime monitoring, and fast integration into existing systems without replacing their current stack.

It turns a customer system inventory into:

- connector boundary guidance
- operation-level risk classification
- deterministic invariant gate results
- required evidence list
- ISO/IEC 42001 and NIST AI RMF control mapping
- rollout waves for shadow → gated → approval-backed automation
- runtime monitor cards for the UI
- decision and request hashes for replay/audit traceability

## New product route

- UI: `/dsg/midmarket-governance-autopilot`
- API template: `GET /api/dsg/midmarket-governance-autopilot`
- API evaluate: `POST /api/dsg/midmarket-governance-autopilot`

## Why this targets mid-market customers

Mid-market buyers usually do not want to rebuild ERP, CRM, finance, support, or payment systems. They need a control layer that connects to what already exists, proves what happened, and makes risky automation comfortable for finance, operations, and compliance teams.

The workflow therefore focuses on practical value:

1. inventory existing systems
2. identify owner, data class, environment, action type, audit support, approval support, rollback support
3. block unsafe direct database mutation by default
4. review high/critical actions until approval and rollback evidence exist
5. allow low-risk actions to move into gated automation quickly
6. show customer value as time-to-first-value and governed actions per month

## Gate behavior

Decision states:

- `PASS` — ready for low-risk customer pilot
- `REVIEW` — usable for customer pilot, but high/critical paths need approval, owner, audit, or rollback evidence
- `BLOCK` — cannot pilot because a hard invariant failed, e.g. no system inventory or direct database mutation

This route does not execute customer-system mutations. It evaluates readiness and produces a governed rollout plan. Execution still belongs behind DSG controlled executor, approval, audit, and evidence proof.

## Invariants

The current engine checks:

- `integration_inventory_present`
- `system_owner_defined`
- `no_direct_database_mutation`
- `approval_for_high_risk`
- `audit_coverage`
- `rollback_path_for_mutations`
- `autopilot_boundary`

## Data contract

Minimal request:

```json
{
  "workspaceId": "customer-workspace",
  "customerName": "Example Co",
  "companySize": "mid-market",
  "automationPreference": "gated",
  "systems": [
    {
      "systemId": "crm",
      "name": "CRM",
      "category": "crm",
      "integrationType": "api",
      "environment": "production",
      "dataClasses": ["internal", "pii"],
      "businessCriticality": "medium",
      "ownerTeam": "Revenue Ops",
      "hasAuditLog": true,
      "hasApprovalFlow": false,
      "hasRollbackPath": true,
      "operations": [
        { "name": "update lifecycle stage", "method": "PATCH", "mutation": true, "pii": true }
      ]
    }
  ]
}
```

## Acceptance checklist

- [x] No mock production claim: the feature evaluates readiness only and does not claim execution completed.
- [x] No direct model-to-API execution.
- [x] Direct database write path is a hard BLOCK.
- [x] High/critical risk actions require REVIEW unless approval evidence exists in the later runtime layer.
- [x] Every result includes `requestHash` and `decisionHash`.
- [x] UI surfaces customer value, risk, invariants, evidence, runtime monitor, and rollout waves.
- [x] API is deterministic for the same request and timestamp.

## Follow-up hardening for production

Before calling this `PRODUCTION`, wire the assessment result to DB-backed source of truth:

- `dsg_midmarket_autopilot_assessments`
- `dsg_midmarket_runtime_monitor_bindings`
- RBAC permission: `midmarket:assess`
- audit ledger write on every evaluation
- evidence manifest creation on customer pilot approval
- controlled executor binding for actual connector calls
