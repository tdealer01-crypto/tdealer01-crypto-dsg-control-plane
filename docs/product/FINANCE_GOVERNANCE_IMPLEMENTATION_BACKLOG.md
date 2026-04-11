# Finance Governance Implementation Backlog

Updated: 2026-04-11
Owner: Product / Engineering
Status: Build backlog

---

## Goal

Translate the finance governance PRD into buildable work packages for product, backend, frontend, and go-to-market execution.

---

## Milestone 1 — Domain foundation

### Epic 1.1: Add finance workflow schema
- Add `transactions`
- Add `transaction_documents`
- Add `approval_requests`
- Add `approval_steps`
- Add `approval_decisions`
- Add `exceptions`
- Add `evidence_bundles`
- Add `export_jobs`
- Add `reconciliation_runs`

### Done when
- Schema reviewed
- Migration drafted
- Types regenerated
- Basic migration tests added

---

## Milestone 2 — Policy-driven workflow

### Epic 2.1: Submission flow
- Create transaction submission API
- Validate required finance fields
- Validate required documents
- Add duplicate reference detection
- Add replay-protection design

### Epic 2.2: Approval orchestration
- Create approval request on submission
- Build approval step generation from policy rules
- Enforce maker-checker
- Enforce threshold routing
- Enforce required reasons for reject / override

### Done when
- Sample transaction can move from submit to approval state
- Self-approval is blocked
- Policy route is visible in logs or UI

---

## Milestone 3 — Operator UX

### Epic 3.1: Approval queue
- Build pending approvals list
- Add filtering by age, status, vendor, policy
- Add approve / reject / escalate actions
- Add permission-denied states

### Epic 3.2: Case detail page
- Show transaction summary
- Show attached documents
- Show policy snapshot
- Show approval chain
- Show timeline and exception panel

### Epic 3.3: Admin and onboarding
- Add finance-governance onboarding template
- Add role assignment UI
- Add policy-builder entry point

### Done when
- A pilot user can onboard, submit, review, and resolve a case without manual DB intervention

---

## Milestone 4 — Audit and evidence

### Epic 4.1: Event completeness
- Define event taxonomy
- Ensure each decision is logged with actor, timestamp, reason, and state transition
- Add export logging

### Epic 4.2: Evidence bundles
- Build bundle manifest generation
- Add bundle export job runner
- Add CSV / JSON / PDF export design
- Add integrity hash generation

### Epic 4.3: Audit view
- Build audit screen with filters
- Add export actions
- Add empty / loading / error states

### Done when
- An auditor can open a case and export an evidence bundle from the product UI

---

## Milestone 5 — GTM and trust surface

### Epic 5.1: Pricing and packaging
- Rewrite pricing page for finance governance packaging
- Align plan descriptions to Starter / Growth / Enterprise governance value
- Clarify enterprise pilot path

### Epic 5.2: Marketing surface
- Rewrite landing headline and subhead
- Add audit-ready trust strip
- Add buyer-focused use-case copy

### Epic 5.3: Trust surface
- Publish Terms / Privacy / Security pages
- Add support and contact flow
- Add enterprise trust summary

### Done when
- A buyer can understand the product, pricing, and trust posture from the web app alone

---

## Milestone 6 — Enterprise readiness

### Epic 6.1: SSO / SCIM alignment
- Map finance roles to current org role substrate
- Document admin provisioning path
- Test group-to-role mapping strategy

### Epic 6.2: Tenant safety
- Review org scoping across new routes
- Add cross-org access tests
- Add export authorization tests

### Epic 6.3: Operational readiness
- Add dashboards / alerts for approval backlog and exceptions
- Add support runbook for pilot customers

### Done when
- The product can support one enterprise design partner without manual ad hoc handling for every approval case

---

## Priority order

### P0
- Schema delta
- Submission API
- Approval orchestration
- Approval queue
- Case detail page
- Audit timeline
- Evidence export

### P1
- Landing and pricing rewrite
- Terms / Privacy / Security pages
- Admin role UX
- Exception dashboard

### P2
- Reconciliation engine
- External auditor portal
- Advanced SoD modeling
- Dedicated deployment options

---

## Marketplace release rule

Do not call the product marketplace-ready until all of the following are true:

- One finance workflow is fully usable end-to-end
- Billing works for self-serve or pilot conversion
- Policy-driven approvals are visible and enforceable
- Evidence export works from UI
- Trust pages exist
- Permission-denied, error, and empty states are designed and implemented

---

## Current truth

### Already strong
- Control-plane foundation
- Org/auth/billing substrate
- Runtime contract coverage
- Governance-oriented product narrative

### Still missing before real market readiness
- Finance-specific workflow layer
- Approval UX completion
- Exportable evidence bundle implementation
- Pricing/landing rewrite aligned to finance governance buyers
