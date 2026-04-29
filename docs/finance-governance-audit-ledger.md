# Finance Governance Audit Ledger Cutover

This document tracks the backend cutover for the Finance Governance control plane from UI-only proof to DB-backed audit evidence.

## Status

This branch adds a dedicated audit ledger path for finance governance actions.

Implemented in this cutover:

- `finance_governance_audit_ledger` migration
- stable SHA-256 request hash
- stable SHA-256 record hash
- repository-level audit ledger writer
- workflow action payload now includes audit proof metadata
- unit coverage for audit ledger inserts and proof hashes

## Dataset / benchmark reference

External dataset reference provided for DSG Finance Governance Control Plane evidence:

- DOI: https://doi.org/10.34740/kaggle/dsv/16000593

The referenced Kaggle dataset is used as supporting evidence context for DSG finance governance benchmark/provenance materials. The backend audit ledger in this repo is the runtime persistence layer; the dataset reference is not treated as a replacement for live production audit logs.

## Runtime write path

For finance governance actions, the repository now writes:

1. Control-layer records where available:
   - `finance_approval_decisions`
   - `finance_approval_requests`
   - `finance_transactions`
   - `finance_exceptions`
   - `finance_evidence_bundles`
2. Legacy compatibility records where legacy workflow tables exist:
   - `finance_workflow_approvals`
   - `finance_workflow_cases`
   - `finance_workflow_action_events`
3. Dedicated audit ledger:
   - `finance_governance_audit_ledger`

## Audit proof fields

Each audit ledger row includes:

- `org_id`
- `case_id`
- `approval_id`
- `action`
- `actor`
- `result`
- `target`
- `message`
- `next_status`
- `request_hash`
- `record_hash`
- `payload`
- `created_at`

The repository also stores the audit proof in the legacy workflow action event payload:

```json
{
  "audit": {
    "requestHash": "<sha256>",
    "recordHash": "<sha256>",
    "stored": true
  }
}
```

## Hashing rule

Hashes are generated from stable JSON serialization with sorted object keys.

- `request_hash`: hash of the normalized finance governance action event
- `record_hash`: hash of the database ledger record payload including `request_hash`

## Validation

Run the targeted unit test:

```bash
npm run test:unit -- tests/unit/finance-governance-repository.test.ts
```

On Android/Termux, `npm install` may fail because the Supabase package postinstall does not support Android arm64. Validate this PR in GitHub Actions, Vercel, or a Linux/macOS development environment instead of relying only on local Termux install.

## GO / NO-GO

This change moves backend audit evidence forward, but production is still **NO-GO** until:

- migrations are applied in the target Supabase project
- CI test/build is green
- `/api/health` is green
- `/api/readiness` is green
- production env vars are configured
- RBAC/org enforcement is verified end-to-end
- entitlement/billing gates are verified if the route is exposed to paid plans
