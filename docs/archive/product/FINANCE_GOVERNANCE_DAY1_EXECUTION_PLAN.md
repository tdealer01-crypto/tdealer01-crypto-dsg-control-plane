# Finance Governance Marketplace Readiness

## Day 1 Execution Plan

Updated: 2026-04-11
Owner: Product / Architecture / GTM
Status: Execution guide

---

## Objective

Turn the current control-plane foundation into a finance governance product direction that a design partner can understand, evaluate, and pilot.

This is not a full build plan for the entire product. It is the first-day execution plan that locks the product direction, the first sellable use case, and the architecture delta required to start building.

---

## Day 1 outcome

By the end of Day 1, the team must have:

1. A single beachhead use case
2. A one-page positioning statement
3. A clearly bounded MVP scope
4. A schema delta for finance approval workflows
5. A screen-by-screen workflow outline
6. A first pass at pricing and packaging
7. A launch truth statement: what is ready vs not ready

---

## Recommended beachhead

**Invoice / Payment Approval Governance**

Why this use case first:

- Clear operational pain
- Easy to explain to buyers
- Strong audit value
- High policy and SoD importance
- Easier to scope than a broad finance platform

---

## Workstream 1 — Positioning

### Task

Write a one-page positioning document that answers:

- Who is the buyer?
- What painful process do they have today?
- Why is email + spreadsheet + ERP not enough?
- Why is this a governance product rather than a generic approval tool?

### Required output

- Category name
- One-line pitch
- 3 buyer pains
- 3 business outcomes
- 3 reasons to buy now

### Draft positioning

DSG Finance Governance Control Plane is an audit-ready approval system for finance teams that need policy-enforced workflows, maker-checker controls, and exportable evidence for every decision.

---

## Workstream 2 — MVP boundary

### Task

Decide what is in MVP and what is explicitly out.

### In MVP

- Org workspace
- Team invitation
- Role-based access
- Policy setup
- Transaction submission
- Approval queue
- Maker-checker routing
- Exceptions
- Audit timeline
- Evidence export
- Billing gate

### Out of MVP

- Full ERP features
- Universal workflow builder for all departments
- AI-generated narrative as the core product
- Advanced external auditor portal
- Complex reconciliation engine

---

## Workstream 3 — Domain schema delta

### Task

Define the minimum new tables to add on top of the current control-plane schema.

### Minimum additions

- transactions
- transaction_documents
- approval_requests
- approval_steps
- approval_decisions
- exceptions
- evidence_bundles
- export_jobs

### Data model rule

The governance system records approval state and evidence state.
The customer's ERP remains the financial system of record.

---

## Workstream 4 — UX and workflow outline

### Task

Write the end-to-end flow and identify all required UI surfaces.

### Required screens

- Landing page
- Pricing page
- Signup / login
- Org onboarding
- Team invite
- Policy builder
- Approval queue
- Transaction detail page
- Audit view
- Export page
- Admin console
- Support / contact page
- Privacy / Terms / Security pages

### Core workflow

1. Sign up
2. Create org
3. Invite team
4. Create policy
5. Submit invoice/payment
6. Review and approve
7. Handle exception or escalation
8. Export evidence bundle

### Mandatory states

- Loading
- Empty
- Error
- Permission denied
- Billing blocked
- Retry after transient failure

---

## Workstream 5 — Packaging and launch truth

### Task

Define the first commercial packaging and state honestly what is ready and not ready.

### Suggested packaging

#### Starter
- 1 org
- limited approval volume
- basic audit timeline
- CSV export

#### Growth
- unlimited users
- multi-step approvals
- exception workflows
- scheduled reporting
- API access

#### Enterprise
- SSO / SCIM
- advanced SoD
- evidence bundle export
- custom retention
- dedicated support

### Launch truth

#### Ready now
- Control-plane foundation
- Org / auth / billing substrate
- Governance-oriented runtime base
- CI and runtime contract coverage

#### Not ready yet
- Finance-specific workflow data model
- Complete approval UX
- Audit-grade evidence bundle packaging
- Final pricing page and legal trust surfaces

---

## Execution order for the next build cycle

### Step 1
Add finance workflow schema tables

### Step 2
Add approval queue and transaction detail UI

### Step 3
Implement policy-to-approval routing logic

### Step 4
Implement evidence bundle export

### Step 5
Update landing, pricing, and trust pages to reflect finance governance positioning

### Step 6
Run pilot with one design partner workflow

---

## Immediate design-partner pitch

If you need a short pitch for outreach:

> We built a finance governance control plane that sits between your team and your existing systems to enforce approval policy, maker-checker controls, and evidence-backed auditability without forcing you to replace your ERP.

---

## Decision rule

Do not expand the product surface until the first use case can do all of the following well:

- route approvals correctly
- block invalid actions
- record every decision
- export a full evidence trail
- survive internal audit review

That is the threshold for being a product instead of a prototype.
