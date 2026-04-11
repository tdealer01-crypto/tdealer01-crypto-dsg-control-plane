# Finance Governance Schema Delta

Updated: 2026-04-11
Owner: Product / Architecture / Backend
Status: Implementation-ready schema outline

---

## Purpose

This document defines the minimum finance-governance domain objects required on top of the current DSG control-plane schema.

The current repository already contains strong enterprise foundations for:
- organizations
- users
- policies
- audit logs
- executions
- usage and billing
- SSO / SCIM / onboarding

What is still missing for a sellable finance governance workflow is the domain layer for financial items, approval state, exceptions, evidence packaging, and export jobs.

---

## Design rule

The customer's ERP or accounting system remains the financial system of record.

DSG becomes the governance system of record for:
- approval state
- policy routing state
- exception state
- evidence packaging
- export history

---

## New tables

### 1. transactions

Purpose: store governed financial items submitted for approval.

Suggested fields:
- `id`
- `org_id`
- `external_reference`
- `transaction_type`
- `amount`
- `currency`
- `vendor_name`
- `cost_center`
- `submitter_user_id`
- `status`
- `metadata`
- `created_at`
- `updated_at`

Constraints:
- unique `(org_id, external_reference)`
- status enum: `submitted`, `in_review`, `approved`, `rejected`, `escalated`, `exception`, `exported`, `archived`

### 2. transaction_documents

Purpose: store document attachments and integrity data.

Suggested fields:
- `id`
- `transaction_id`
- `storage_key`
- `document_type`
- `checksum`
- `uploaded_by`
- `uploaded_at`
- `metadata`

### 3. approval_requests

Purpose: represent the approval process instance for one transaction.

Suggested fields:
- `id`
- `org_id`
- `transaction_id`
- `policy_id`
- `current_step`
- `status`
- `submitted_at`
- `updated_at`

Constraints:
- status enum: `pending`, `approved`, `rejected`, `escalated`, `exception`, `canceled`, `completed`

### 4. approval_steps

Purpose: define each routed approval stage.

Suggested fields:
- `id`
- `approval_request_id`
- `step_order`
- `required_role`
- `assigned_user_id`
- `rule_snapshot`
- `status`
- `due_at`
- `acted_at`
- `created_at`
- `updated_at`

Constraints:
- unique `(approval_request_id, step_order)`
- status enum: `pending`, `approved`, `rejected`, `skipped`, `escalated`, `expired`

### 5. approval_decisions

Purpose: capture every decision taken within an approval step.

Suggested fields:
- `id`
- `approval_step_id`
- `actor_user_id`
- `decision`
- `reason`
- `decided_at`
- `metadata`

Constraints:
- decision enum: `approved`, `rejected`, `escalated`, `requested_changes`, `overridden`

### 6. exceptions

Purpose: capture workflow exceptions that need review or waiver.

Suggested fields:
- `id`
- `approval_request_id`
- `exception_type`
- `severity`
- `opened_by`
- `resolution_status`
- `details`
- `opened_at`
- `resolved_at`

Constraints:
- severity enum: `low`, `medium`, `high`, `critical`
- resolution enum: `open`, `under_review`, `resolved`, `waived`

### 7. reconciliation_runs

Purpose: track comparison runs between governance state and source system state.

Suggested fields:
- `id`
- `org_id`
- `run_type`
- `source_system`
- `result_status`
- `summary`
- `created_by`
- `created_at`
- `completed_at`

Constraints:
- result status enum: `pending`, `completed`, `failed`, `partial`

### 8. evidence_bundles

Purpose: package a case or time-bounded scope into an exportable evidence object.

Suggested fields:
- `id`
- `org_id`
- `scope_type`
- `scope_id`
- `manifest_json`
- `integrity_hash`
- `generated_by`
- `generated_at`

### 9. export_jobs

Purpose: manage export processing and history.

Suggested fields:
- `id`
- `org_id`
- `bundle_id`
- `format`
- `status`
- `created_by`
- `output_location`
- `created_at`
- `completed_at`

Constraints:
- format enum: `csv`, `pdf`, `json`
- status enum: `queued`, `running`, `completed`, `failed`, `expired`

---

## Recommended indexes

- `transactions(org_id, created_at desc)`
- `transactions(org_id, status)`
- `approval_requests(org_id, status)`
- `approval_requests(transaction_id)`
- `approval_steps(approval_request_id, step_order)`
- `approval_steps(assigned_user_id, status)`
- `exceptions(approval_request_id, resolution_status)`
- `reconciliation_runs(org_id, created_at desc)`
- `evidence_bundles(org_id, scope_type, scope_id)`
- `export_jobs(org_id, status)`

---

## Permission and workflow notes

- Makers must not approve their own requests
- Approval routing must honor policy thresholds and SoD rules
- Export actions must be auditable
- Re-opening a case must add a new event instead of mutating history silently
- Duplicate or replayed submissions should be caught before approval requests are created

---

## Delivery order

1. Add `transactions` and `transaction_documents`
2. Add `approval_requests`, `approval_steps`, `approval_decisions`
3. Add `exceptions`
4. Add `evidence_bundles` and `export_jobs`
5. Add `reconciliation_runs`

This sequence gives the team a clean path from core workflow to exportability.
