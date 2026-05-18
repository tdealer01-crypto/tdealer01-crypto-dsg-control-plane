# DSG ONE UI/UX Blueprint (Enterprise Governance Pattern Synthesis)

## Product Message (must stay consistent)

**Primary statement:** “DSG ONE is a runtime governance gateway for AI actions — not another GRC record system.”

**Hero:** “Govern AI actions before they reach production.”

**Primary CTA:** “View live gate evidence”

**Secondary CTA:** “Open control plane”

## Positioning Guardrails

- DSG ONE does **not** replace incumbent GRC systems; it governs runtime actions before execution.
- Finance Governance appears as a **solution module under DSG ONE**, never as the product identity.
- Do **not** claim certification, WORM storage, external Z3 production invocation, JWT/JWKS completion, or enterprise-ready proof system.

## Pattern Synthesis (inspired by, not copied)

- **Workflow-driven operations (ServiceNow IRM style):** explicit state transitions, assignment, and reviewer routing.
- **Action-path + risk context graph (Wiz style):** visual relation of actor → requested action → policy checks → gate result.
- **Evidence-first posture (Vanta style):** each status is backed by verifiable artifacts visible inline.
- **AI system registry + lifecycle (Credo AI style):** governed AI action context tied to system record and lifecycle phase.
- **Policy-as-code decisioning (Sentinel/OPA style):** deterministic allow/block/review output with traceable rule references.

## Global UX Rules

1. Make first user task obvious on every page.
2. Show evidence, not claims.
3. PASS must explain what passed.
4. BLOCK must explain why blocked.
5. REVIEW must show next required reviewer/action.
6. UNSUPPORTED must never resemble success.
7. Dark control-room theme, high-contrast cards, minimal decoration, operational clarity first.

## Core Action Evidence Contract (required in every high-risk action view)

Every high-risk action card/detail must show:

- requestedAction
- actor
- riskLevel
- policyVersion
- entitlementOrApprovalRequirement
- deterministicGateResult
- constraintsChecked
- replayProtectionEvidence
- finalDecision
- auditEvidenceExport

## Information Architecture

1. Home
2. Dashboard
3. Action Review
4. Evidence Pack
5. Policy & Connectors

---

## 1) Home

### Primary user task
Understand DSG ONE value in <30 seconds and jump to live evidence.

### Layout
- **Hero left:** message, supporting sentence, primary/secondary CTA.
- **Proof rail right:** latest gate outcomes (PASS/BLOCK/REVIEW/UNSUPPORTED) with tiny rationale snippets.
- **Capability strip:** runtime governance domains (AI, workflow, finance, deployment) as modules.
- **“How it works” 4-step strip:** request → evaluate → approve/escalate → audit export.

### Required components
- Status badge legend with explicit color semantics:
  - PASS (green)
  - BLOCK (red)
  - REVIEW (amber)
  - UNSUPPORTED (gray, low-emphasis)
- “What this is / what this is not” compare panel.
- CTA group pinned above fold.

---

## 2) Dashboard

### Primary user task
Triage live high-risk actions by risk and decision state.

### Layout
- **Top KPI row:** Open actions, BLOCK count (24h), pending REVIEW SLA, exported evidence packs.
- **Center pane:** Action queue table/cards sorted by urgency.
- **Right pane:** Action path graph + gate decision summary.
- **Bottom pane:** recent policyVersion changes and connector health.

### Queue columns (minimum)
- actionId
- requestedAction
- actor
- riskLevel
- policyVersion
- gateResult
- requiredApprover
- updatedAt

### Decision semantics
- PASS row: include “passed constraints” count.
- BLOCK row: include top violated constraints + rule IDs.
- REVIEW row: include next reviewer role and due-by.
- UNSUPPORTED row: grayed with warning icon + required connector/policy gap.

---

## 3) Action Review

### Primary user task
Make or route a governance decision with complete rationale.

### Layout
- **Header:** action metadata + risk badge + final decision state.
- **Left column:** decision narrative (what is requested, why risky, who initiated).
- **Main column:** deterministic gate trace (policy refs, constraints checked, outcomes).
- **Right drawer:** evidence drawer (snapshots, logs, approvals, replay proof).
- **Footer action bar:** Approve, Block, Request Review, Export Evidence.

### Mandatory explanation blocks
- PASS: “Passed because …” list each satisfied constraint.
- BLOCK: “Blocked because …” with machine + human-readable reason.
- REVIEW: “Pending review by …” with next required action.
- UNSUPPORTED: “Unsupported because …” with remediation path.

### Safety UX
- Decision buttons disabled when required evidence fields are missing.
- Replay-protection evidence always visible before final decision.

---

## 4) Evidence Pack

### Primary user task
Export defensible audit evidence for a selected action window.

### Layout
- **Filter bar:** date range, policyVersion, connector, decision type.
- **Evidence timeline:** immutable-style chronological entries.
- **Pack composer panel:** selected artifacts + hash/checksum fields.
- **Export panel:** JSON/CSV/PDF metadata export options.

### Must include per pack
- decision summary
- policyVersion + rules evaluated
- constraintsChecked + results
- actor & approver chain
- replayProtectionEvidence
- export timestamp + pack hash

### Copy rules
- Never claim certified storage guarantees.
- Use wording like “exportable evidence bundle” rather than compliance certification.

---

## 5) Policy & Connectors

### Primary user task
Understand and manage policy logic and execution dependencies.

### Layout
- **Policy list:** active/inactive policies, versions, scopes.
- **Policy diff panel:** side-by-side version changes affecting decisions.
- **Connector grid:** status, last heartbeat, permission scope, supported action types.
- **Gate simulation panel:** run dry-run to preview PASS/BLOCK/REVIEW/UNSUPPORTED.

### Mandatory connector states
- Healthy
- Degraded
- Unsupported (distinct from success visuals)

### Governance controls
- policyVersion pinning per workflow.
- explicit approval requirements by risk tier.
- deterministic gate result preview before publish.

---

## Cross-Page Component System

- **StatusBadge** with strict semantic variants.
- **GateResultCard** summarizing result + reason + rule refs.
- **ConstraintChecklist** with pass/fail/review markers.
- **ActionPathGraph** to expose end-to-end decision path.
- **EvidenceDrawer** persistent side panel.
- **AuditExportPanel** uniform export behavior.

## Visual Direction

- Dark control-room theme: neutral charcoal base, high-contrast content surfaces.
- Accent colors reserved for state semantics, not decoration.
- Dense but readable data tables.
- Clear typography hierarchy, minimal marketing ornament.
- Motion only for state transition clarity (not flair).

## First-Task Clarity by Page

- Home: “View live gate evidence.”
- Dashboard: “Open highest-risk blocked/review item.”
- Action Review: “Resolve this action with explicit rationale.”
- Evidence Pack: “Export this action window evidence.”
- Policy & Connectors: “Validate policy and connector readiness.”
