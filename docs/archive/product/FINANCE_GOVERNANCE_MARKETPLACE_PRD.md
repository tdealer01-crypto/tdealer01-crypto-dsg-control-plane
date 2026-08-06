# DSG Finance Governance Control Plane

## Product Requirements Document

Updated: 2026-04-11
Owner: Product / Architecture / GTM
Status: Draft for design-partner and marketplace readiness

---

## 1. Product summary

DSG Finance Governance Control Plane is an enterprise workflow control plane for finance, compliance, and audit teams.

It is designed to control how financial transactions and supporting documents are submitted, reviewed, approved, escalated, and audited.

The product does **not** replace the customer's ERP or accounting system. Instead, it acts as the governance layer that enforces policy, separation of duties, and evidence-backed approval flows.

### One-line positioning

An audit-ready approval control plane for finance teams that need policy enforcement, maker-checker workflows, and exportable evidence for every decision.

### What the product is not

- Not a general-purpose chatbot
- Not a bookkeeping system
- Not a lightweight approval toy
- Not a policy document repository without runtime enforcement

---

## 2. Ideal customer profile

### Primary buyers

- Finance Controller
- Head of Finance Operations
- Compliance Lead
- Internal Audit Manager
- Governance Office Lead

### End users

- Finance Maker
- Approver
- Compliance Reviewer
- Auditor
- Org Admin
- Billing Admin

### Best-fit organizations

- Mid-market to enterprise organizations
- Finance teams with multi-step approvals
- Teams currently using email, spreadsheets, and ERP together
- Regulated or audit-heavy organizations
- Shared services finance teams

---

## 3. Problems worth paying for

### Core buyer pain

- Approval decisions are fragmented across email, chat, and spreadsheets
- Policies are documented but not enforced at runtime
- Overrides and exceptions are not well traced
- Internal or external audit requires manual evidence collection
- Duplicate or replayed actions are difficult to detect
- Segregation of duties is not enforced consistently
- Buyers cannot easily answer who approved what, when, and why

### Why customers pay

Customers pay to reduce operational risk, reduce audit friction, and make approvals governable under real usage.

---

## 4. Beachhead use case

### Beachhead

**Invoice and payment approval governance**

### Secondary expansion

- Expense exception approval
- Vendor onboarding approval
- Manual journal entry review
- High-risk transaction escalation

### Scope rule

The first sellable version should focus on a single high-value workflow rather than a broad finance platform.

---

## 5. Product thesis

If an organization is going to automate or accelerate financial approvals, then the approval layer must be:

- policy-enforced
- role-aware
- evidence-backed
- exportable for audit
- resilient against duplicate, replayed, or unauthorized actions

---

## 6. MVP

### MVP goal

Ship a finance workflow product that a design partner can use for invoice or payment approval governance.

### MVP capabilities

- Org workspace creation and onboarding
- Team invitation and role assignment
- Policy creation and versioning
- Transaction or document submission
- Approval queue
- Maker-checker enforcement
- Multi-step approval (minimum sequential support)
- Exception capture and escalation
- Audit timeline per case
- Evidence bundle export
- Dashboard for pending, rejected, escalated, and overridden cases
- Billing and plan gating

### Non-goals for MVP

- Full ERP replacement
- Broad analytics warehouse features
- Advanced AI summarization as a primary feature
- Universal workflow builder for all departments

---

## 7. Feature roadmap

### MVP

- Org workspace
- User invitation
- Role-based access control
- Policy definition
- Submit / review / approve / reject / escalate
- Case timeline and audit log
- Evidence export
- Trial and subscription gating

### v1

- Threshold-based routing
- Vendor / category policy rules
- SLA and reminder rules
- Override with required reason
- Approval templates by workflow type
- API integration with upstream finance systems
- Scheduled reports

### v2

- Reconciliation workflows
- Dispute and re-open flows
- Policy simulation and dry-run validation
- Advanced SoD modeling
- Tamper-evident hash-chained evidence ledger
- External auditor portal
- Private deployment options

---

## 8. User flows

### 8.1 Sign up and onboarding

1. User starts trial
2. Org workspace is created
3. User verifies sign-in and lands in onboarding
4. User selects workflow template
5. User invites team members
6. User configures baseline policy and roles

### 8.2 Team setup

1. Admin invites users
2. Users are mapped to roles
3. Enterprise customers may enable SSO / SCIM
4. Group-to-role mappings are applied where configured

### 8.3 Policy setup

1. Finance admin opens policy builder
2. Sets thresholds and route rules
3. Defines required approver roles
4. Defines segregation-of-duties rules
5. Publishes a policy version

### 8.4 Transaction submission

1. Maker submits transaction or supporting document set
2. System validates required fields and attachments
3. System runs duplicate and replay checks
4. Policy engine determines approval route
5. Approval request is created

### 8.5 Review and approval

1. Approver opens assigned queue
2. Approver reviews evidence
3. Approver approves, rejects, escalates, or requests more information
4. Every action is logged with actor, timestamp, reason, and policy context

### 8.6 Audit and export

1. Auditor filters cases by period, entity, vendor, policy, or exception type
2. Auditor opens case timeline
3. Auditor exports evidence bundle as CSV, PDF, or JSON package
4. Export is logged as an auditable event

---

## 9. User experience requirements

The product must behave like a real enterprise app, not a prototype.

### Required states

- Loading states
- Empty states
- Error states
- Permission-denied states
- Expired session states
- Retry states for transient failures
- Billing-restricted states
- Suspended org states

### Required surfaces

- Login / signup
- Org onboarding
- Dashboard
- Approval queue
- Audit view
- Policy builder
- Admin console
- Billing / plan page
- Support / contact page
- Terms / Privacy / Security pages

---

## 10. Data model delta

The current control-plane schema already includes organizations, users, policies, agents, executions, audit logs, usage, billing, SSO, SCIM, and onboarding substrates.

To support the finance governance product, the following domain tables must be added:

### transactions

- id
- org_id
- external_reference
- transaction_type
- amount
- currency
- vendor_name
- cost_center
- submitter_user_id
- status
- created_at

### transaction_documents

- id
- transaction_id
- storage_key
- document_type
- checksum
- uploaded_by
- uploaded_at

### approval_requests

- id
- org_id
- transaction_id
- policy_id
- current_step
- status
- submitted_at

### approval_steps

- id
- approval_request_id
- step_order
- required_role
- assigned_user_id
- rule_snapshot
- status

### approval_decisions

- id
- approval_step_id
- actor_user_id
- decision
- reason
- decided_at

### exceptions
n
- id
- approval_request_id
- exception_type
- severity
- opened_by
- resolution_status
- resolved_at

### reconciliation_runs

- id
- org_id
- run_type
- source_system
- result_status
- summary
- created_at

### evidence_bundles

- id
- org_id
- scope_type
- scope_id
- manifest_json
- integrity_hash
- generated_at

### export_jobs

- id
- org_id
- bundle_id
- format
- status
- created_by
- completed_at

---

## 11. Permission model and role design

### Roles

- org_owner
- org_admin
- finance_maker
- finance_approver
- compliance_reviewer
- auditor
- billing_admin
- viewer

### Core access rules

- Makers can submit but cannot approve their own items
- Approvers can act only within policy and threshold boundaries
- Auditors can read and export but cannot mutate workflow state
- Compliance reviewers can review and escalate but not bypass constraints without explicit override permission
- Billing admins do not gain approval authority by default

---

## 12. Approval workflow design

### Workflow principles

- Maker-checker separation
- No self-approval
- Threshold-driven routing
- Required reason for reject or override
- Escalation path for blocked or stale cases
- Idempotent approval actions
- Replay protection
- Duplicate detection

### Example workflow

1. Maker submits invoice
2. Duplicate and checksum checks run
3. Policy resolves route based on amount, vendor, entity, and risk tags
4. First approver acts
5. Second approver is required if threshold is exceeded
6. Compliance review is added for high-risk vendors or exception cases
7. Final decision is recorded
8. Evidence bundle is updated

---

## 13. Audit log and evidence model

### Mandatory event types

- submitted
- validated
- reviewed
- approved
- rejected
- escalated
- exception_opened
- exception_resolved
- override_used
- exported

### Event shape

- event_id
- org_id
- actor_id
- actor_role
- object_type
- object_id
- previous_state
- new_state
- reason
- evidence_refs
- timestamp
- previous_hash
- current_hash

### Evidence bundle contents

- Transaction metadata
- Attached documents
- Policy snapshot
- Approval chain
- Decision log
- Exceptions
- Export history
- Integrity manifest

---

## 14. Reconciliation, exception, and dispute handling

### Reconciliation

- Compare governance-layer state with source system state
- Detect missing approvals
- Detect duplicate references
- Detect policy mismatches

### Exception flow

- Missing document
- Policy violation
- Threshold breach
- Missing approver
- Vendor risk flag
- Duplicate or replay suspicion

### Dispute flow

- Disputed approval
- Disputed override
- Re-open case with trace
- Final resolution recorded as a new event, not silent overwrite

---

## 15. Reporting, export, dashboard, and alerting

### Dashboards

- Pending approvals
- Breached SLA
- Exceptions by type
- Overrides by policy
- Approvals by user / team / period
- Audit readiness score

### Reports

- By period
- By vendor
- By approver
- By policy version
- By exception type

### Export

- CSV
- PDF evidence report
- JSON evidence bundle

### Alerts

- Approval aging
- Missing approver
- Override spike
- Duplicate detection hit
- Reconciliation failure
- Export completed

---

## 16. Backend architecture

### Source of truth model

The customer's ERP or accounting system remains the financial system of record.

The DSG control plane becomes the governance system of record for:

- policy state
- approval state
- exception state
- audit trail
- evidence bundle generation

### Runtime model

- Web application: Next.js
- Data / auth / tenant substrate: Supabase
- Billing: Stripe
- Monitoring: Sentry
- Rate-limiting / abuse protection: Upstash

### Design rule

Marketplace surfaces or chatbot-like interfaces must not become the system of record. They should remain access and action layers over the control-plane backend.

---

## 17. Auth, SSO, SCIM, org workspace, tenant isolation

### Minimum

- Org workspace isolation
- Role-based access control
- Trial org onboarding
- User invite flows

### Enterprise

- SAML / SSO
- SCIM / directory sync
- Group-to-role mapping
- Seat activation policy
- Tenant-aware billing policy

### Isolation rule

Every request, policy evaluation, export, and audit event must be scoped to a single organization tenant.

---

## 18. Billing, pricing, and packaging

### Starter

- 1 org
- limited approval volume
- basic audit trail
- CSV export
- no SSO

### Growth

- unlimited users
- multi-step approvals
- exception workflows
- scheduled reports
- API access

### Enterprise

- SSO / SCIM
- advanced SoD rules
- evidence bundle export
- custom retention
- dedicated support
- optional private deployment

### Pricing principle

Price on governance value and approval volume, not on vague AI usage.

---

## 19. Legal, privacy, security, and QA

### Required legal and trust surfaces

- Terms of Service
- Privacy Policy
- Security Overview
- Data Processing Addendum
- Subprocessor list
- Retention policy
- Access control policy
- Incident response summary

### Security baseline

- RBAC
- Audit trail
- Idempotency
- Anti-replay
- Duplicate protection
- Least privilege
- Secret handling
- Export access controls

### QA must include

- Maker cannot self-approve
- Wrong-role approval is blocked
- Duplicate reference is detected
- Replay attempt is blocked
- Missing evidence blocks decision
- Export bundle includes full timeline
- Cross-org access is denied
- Suspended org behavior is correct
- Billing restriction states render correctly

---

## 20. Marketplace readiness and truth

### Required for a real market app

- Clear value proposition
- Narrow use case
- Working billing
- Admin console
- Role-aware dashboard
- Policy builder
- Approval queue
- Audit view
- Support flow
- Terms / Privacy / Security pages
- Reliable empty / loading / error / permission states

### What is already strong in the current control-plane foundation

- Multi-tenant enterprise substrate
- Auth and onboarding foundation
- Billing substrate
- Runtime contract coverage
- Governance-oriented positioning

### What is not yet ready for broad launch

- Finance-specific domain schema
- Full approval UX for transaction workflows
- External-audit-grade evidence bundle packaging
- Final pricing/package messaging
- Full trust and support surface for marketplace launch

### Launch truth

The current repository is a strong product foundation, but not yet a finished finance governance application. The fastest path to revenue is to narrow to a single use case and complete the domain layer, approval UX, and evidence export experience.
