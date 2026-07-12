# Tracking Plan — DSG ONE / ProofGate

**Version:** 1.0  
**Date:** July 12, 2026  
**Status:** Design-ready (ready for implementation)

---

## Overview

This tracking plan defines the target event schema, user journeys, and PostHog instrumentation for DSG ONE. It bridges the gap between current state (4 billing events) and target state (full product + compliance visibility).

**Scope:** Event definitions, properties, user journeys, group hierarchy, and success metrics.

---

## Core Principles

1. **Event naming:** `subject_action` (e.g., `policy_created`, `execution_submitted`)
2. **Properties:** Org/workspace/agent ID on every event (for grouping)
3. **Determinism:** Same user input → same properties (no timestamps in properties unless necessary)
4. **Idempotency:** Track by action ID to avoid duplicate counts
5. **Compliance:** No PII in properties (user ID, not email)

---

## PostHog Group Hierarchy

```
Organization (top level)
└── Workspace (optional)
    └── Agent (API consumer)
        └── Execution (decision)
```

### Group Structure

| Group Type | Level | ID Format | Parent | Usage |
|-----------|-------|-----------|--------|-------|
| **organization** | L0 | UUID | None | Billing, org-wide metrics, RBAC |
| **workspace** | L1 | UUID | organization_id | Team/dept division (optional) |
| **agent** | L2 | UUID (prefixed `agent_*`) | workspace_id or org_id | API consumer, quota tracking |

### PostHog Group() Calls

Every event must include **minimum group context**:

```javascript
posthog.capture({
  distinctId: user_id,
  event: 'event_name',
  groups: {
    organization: org_id,
    workspace: workspace_id || org_id,  // fallback to org if no workspace
    agent: agent_id || null,             // null if org-level action
  },
  properties: { /* event-specific */ }
})
```

---

## Event Catalog

### 1. CONVERSION FUNNEL EVENTS

#### 1.1 Signup / Access

**Event:** `user_signup`
- **Trigger:** User creates account (Supabase auth)
- **Distinct ID:** user_id
- **Groups:** None (org doesn't exist yet)
- **Properties:**
  ```json
  {
    "signup_method": "email|google|github",
    "ref_code": "optional_referral_code",
    "email_domain": "company.com",
    "timestamp": "ISO8601"
  }
  ```

**Event:** `organization_created`
- **Trigger:** User provisions org
- **Distinct ID:** user_id
- **Groups:** `{ organization: org_id }`
- **Properties:**
  ```json
  {
    "organization_id": "org_uuid",
    "organization_name": "Acme Inc",
    "plan_tier": "free",
    "created_by_user_id": "user_id",
    "timestamp": "ISO8601"
  }
  ```

#### 1.2 Policy Adoption

**Event:** `policy_created`
- **Trigger:** User creates first/new policy
- **Distinct ID:** user_id
- **Groups:** `{ organization: org_id, workspace: workspace_id }`
- **Properties:**
  ```json
  {
    "organization_id": "org_id",
    "workspace_id": "workspace_id",
    "policy_id": "policy_uuid",
    "policy_name": "Transfer Limit",
    "policy_type": "amount_threshold|rate_limit|time_window|other",
    "is_first_policy": true|false,
    "created_by_user_id": "user_id",
    "timestamp": "ISO8601"
  }
  ```

**Event:** `policy_activated`
- **Trigger:** Policy status changed to "active"
- **Distinct ID:** user_id
- **Groups:** `{ organization: org_id, workspace: workspace_id }`
- **Properties:**
  ```json
  {
    "organization_id": "org_id",
    "policy_id": "policy_uuid",
    "policy_type": "amount_threshold|rate_limit|time_window|other",
    "activated_by_user_id": "user_id",
    "timestamp": "ISO8601"
  }
  ```

#### 1.3 Execution / Gate Invocation

**Event:** `execution_submitted`
- **Trigger:** Agent calls `/api/execute` with request
- **Distinct ID:** agent_id (or system_id if not user-initiated)
- **Groups:** `{ organization: org_id, workspace: workspace_id, agent: agent_id }`
- **Properties:**
  ```json
  {
    "organization_id": "org_id",
    "agent_id": "agent_uuid",
    "execution_id": "exec_uuid",
    "policy_id": "policy_uuid",
    "policy_version": "v1.0",
    "is_first_execution": true|false,
    "request_type": "transfer|approval|other",
    "timestamp": "ISO8601"
  }
  ```

**Event:** `decision_made`
- **Trigger:** Z3 gate produces decision
- **Distinct ID:** agent_id
- **Groups:** `{ organization: org_id, workspace: workspace_id, agent: agent_id }`
- **Properties:**
  ```json
  {
    "organization_id": "org_id",
    "execution_id": "exec_uuid",
    "decision": "ALLOW|BLOCK|REVIEW|ESCALATE|UNSUPPORTED",
    "policy_id": "policy_uuid",
    "policy_version": "v1.0",
    "decision_latency_ms": 12,
    "proof_hash": "sha256_hash",
    "timestamp": "ISO8601"
  }
  ```

#### 1.4 Approval & Execution

**Event:** `approval_requested`
- **Trigger:** Decision is REVIEW/ESCALATE (human approval needed)
- **Distinct ID:** agent_id
- **Groups:** `{ organization: org_id, workspace: workspace_id }`
- **Properties:**
  ```json
  {
    "organization_id": "org_id",
    "execution_id": "exec_uuid",
    "approval_queue_id": "queue_uuid",
    "policy_id": "policy_uuid",
    "decision_reason": "REVIEW|ESCALATE",
    "timestamp": "ISO8601"
  }
  ```

**Event:** `approval_completed`
- **Trigger:** Approver reviews and decides
- **Distinct ID:** approver_user_id
- **Groups:** `{ organization: org_id, workspace: workspace_id }`
- **Properties:**
  ```json
  {
    "organization_id": "org_id",
    "execution_id": "exec_uuid",
    "approval_decision": "approved|rejected",
    "approver_user_id": "user_id",
    "approval_turnaround_ms": 45000,
    "timestamp": "ISO8601"
  }
  ```

**Event:** `execution_completed`
- **Trigger:** Final decision executed (ALLOW) or blocked (BLOCK/REJECTED)
- **Distinct ID:** agent_id
- **Groups:** `{ organization: org_id, workspace: workspace_id, agent: agent_id }`
- **Properties:**
  ```json
  {
    "organization_id": "org_id",
    "execution_id": "exec_uuid",
    "final_decision": "ALLOW|BLOCK|REJECTED",
    "total_latency_ms": 250,
    "went_to_approval": true|false,
    "timestamp": "ISO8601"
  }
  ```

#### 1.5 Billing & Upgrade

**Event:** `checkout_started`
- **Trigger:** User clicks "Upgrade" button (Stripe checkout session created)
- **Distinct ID:** user_id
- **Groups:** `{ organization: org_id }`
- **Properties:**
  ```json
  {
    "organization_id": "org_id",
    "plan_tier": "pro|business|enterprise",
    "checkout_session_id": "stripe_session_id",
    "current_plan": "free|pro|business|enterprise",
    "timestamp": "ISO8601"
  }
  ```

**Event:** `subscription_created`
- **Trigger:** Stripe webhook: subscription activated
- **Distinct ID:** org_id (or primary user email if available)
- **Groups:** `{ organization: org_id }`
- **Properties:**
  ```json
  {
    "organization_id": "org_id",
    "plan_tier": "pro|business|enterprise",
    "stripe_subscription_id": "sub_xxxxx",
    "stripe_customer_id": "cus_xxxxx",
    "billing_period": "monthly|yearly",
    "mrr": 99.00,
    "timestamp": "ISO8601"
  }
  ```

**Event:** `plan_upgraded`
- **Trigger:** Stripe webhook: subscription plan changed to higher tier
- **Distinct ID:** org_id
- **Groups:** `{ organization: org_id }`
- **Properties:**
  ```json
  {
    "organization_id": "org_id",
    "from_plan": "free|pro|business|enterprise",
    "to_plan": "pro|business|enterprise",
    "upgrade_trigger": "manual|auto_scaling",
    "timestamp": "ISO8601"
  }
  ```

---

### 2. OPERATIONAL / PRODUCT METRICS

#### 2.1 Organization Health

**Event:** `workspace_created`
- **Trigger:** User provisions workspace
- **Distinct ID:** user_id
- **Groups:** `{ organization: org_id }`
- **Properties:**
  ```json
  {
    "organization_id": "org_id",
    "workspace_id": "workspace_uuid",
    "workspace_name": "Finance Team",
    "created_by_user_id": "user_id",
    "timestamp": "ISO8601"
  }
  ```

**Event:** `agent_created`
- **Trigger:** User provisions new agent/API consumer
- **Distinct ID:** user_id
- **Groups:** `{ organization: org_id, workspace: workspace_id }`
- **Properties:**
  ```json
  {
    "organization_id": "org_id",
    "agent_id": "agent_uuid",
    "agent_name": "Transfer Service",
    "agent_type": "external_api|internal_service|hermes|trinity",
    "created_by_user_id": "user_id",
    "timestamp": "ISO8601"
  }
  ```

**Event:** `team_member_invited`
- **Trigger:** User invites team member
- **Distinct ID:** inviter_user_id
- **Groups:** `{ organization: org_id }`
- **Properties:**
  ```json
  {
    "organization_id": "org_id",
    "invited_email": "user@company.com",  // email is non-PII for audit, use domain only if needed
    "invited_role": "admin|operator|approver|auditor",
    "inviter_user_id": "user_id",
    "timestamp": "ISO8601"
  }
  ```

#### 2.2 Policy Metrics

**Event:** `policy_updated`
- **Trigger:** Policy rules changed
- **Distinct ID:** user_id
- **Groups:** `{ organization: org_id, workspace: workspace_id }`
- **Properties:**
  ```json
  {
    "organization_id": "org_id",
    "policy_id": "policy_uuid",
    "policy_version": "v1.0 → v1.1",
    "change_type": "constraint_modified|approval_rule_changed|other",
    "updated_by_user_id": "user_id",
    "timestamp": "ISO8601"
  }
  ```

**Event:** `policy_archived`
- **Trigger:** Policy deactivated
- **Distinct ID:** user_id
- **Groups:** `{ organization: org_id, workspace: workspace_id }`
- **Properties:**
  ```json
  {
    "organization_id": "org_id",
    "policy_id": "policy_uuid",
    "archived_by_user_id": "user_id",
    "active_duration_days": 30,
    "total_executions": 150,
    "timestamp": "ISO8601"
  }
  ```

#### 2.3 Approval Workflow

**Event:** `approval_queue_checked`
- **Trigger:** Approver opens approval queue (UI nav or API query)
- **Distinct ID:** user_id
- **Groups:** `{ organization: org_id }`
- **Properties:**
  ```json
  {
    "organization_id": "org_id",
    "pending_count": 5,
    "oldest_pending_age_minutes": 30,
    "checked_by_user_id": "user_id",
    "timestamp": "ISO8601"
  }
  ```

**Event:** `execution_replayed`
- **Trigger:** Auditor/operator replays past decision
- **Distinct ID:** user_id
- **Groups:** `{ organization: org_id }`
- **Properties:**
  ```json
  {
    "organization_id": "org_id",
    "execution_id": "exec_uuid",
    "policy_version": "v1.0",
    "replay_result": "deterministic_match|divergence",
    "replayed_by_user_id": "user_id",
    "timestamp": "ISO8601"
  }
  ```

---

### 3. COMPLIANCE & AUDIT EVENTS

#### 3.1 Evidence / Audit Trail

**Event:** `evidence_exported`
- **Trigger:** User exports audit trail / compliance pack
- **Distinct ID:** user_id
- **Groups:** `{ organization: org_id }`
- **Properties:**
  ```json
  {
    "organization_id": "org_id",
    "export_format": "json|pdf|ccvs_l1_l5",
    "evidence_count": 500,
    "date_range_days": 90,
    "exported_by_user_id": "user_id",
    "timestamp": "ISO8601"
  }
  ```

**Event:** `audit_trail_queried`
- **Trigger:** User searches/filters audit trail
- **Distinct ID:** user_id
- **Groups:** `{ organization: org_id }`
- **Properties:**
  ```json
  {
    "organization_id": "org_id",
    "query_type": "by_execution|by_policy|by_agent|by_date_range",
    "records_returned": 150,
    "queried_by_user_id": "user_id",
    "timestamp": "ISO8601"
  }
  ```

**Event:** `compliance_report_generated`
- **Trigger:** User generates EU AI Act / CCVS / PDPA report
- **Distinct ID:** user_id
- **Groups:** `{ organization: org_id }`
- **Properties:**
  ```json
  {
    "organization_id": "org_id",
    "report_type": "ccvs_l1_l5|eu_ai_act|pdpa|other",
    "coverage_percentage": 85,
    "generated_by_user_id": "user_id",
    "timestamp": "ISO8601"
  }
  ```

#### 3.2 Proof & Verification

**Event:** `proof_verified`
- **Trigger:** Z3 formal proof verified or audit validates decision
- **Distinct ID:** system (no user)
- **Groups:** `{ organization: org_id }`
- **Properties:**
  ```json
  {
    "organization_id": "org_id",
    "execution_id": "exec_uuid",
    "proof_type": "z3_formal|replay_deterministic|hash_chain",
    "verification_result": "valid|tampered|unknown",
    "timestamp": "ISO8601"
  }
  ```

---

## User Journeys

### Journey 1: Free → Pro Upgrade (Conversion Funnel)

```
user_signup
  ↓
organization_created (free tier)
  ↓
policy_created (first policy)
  ↓
agent_created (first API integration)
  ↓
execution_submitted (first request)
  ↓
decision_made (gate produces result)
  ↓
approval_requested (if REVIEW)
  ↓
approval_completed (approver acts)
  ↓
checkout_started (user clicks "Upgrade")
  ↓
subscription_created (Stripe confirms)
  ↓
plan_upgraded (now on Pro tier)
```

**Success Metrics:**
- Conversion rate: % of free users who reach `subscription_created`
- Time to upgrade: days from `organization_created` to `subscription_created`
- Drop-off points: where users abandon (after policy? execution? approval?)

---

### Journey 2: Operational Approval Workflow

```
execution_submitted (new request)
  ↓
decision_made (gate produces REVIEW)
  ↓
approval_requested (queued for human)
  ↓
approval_queue_checked (approver opens queue)
  ↓
approval_completed (approver decides)
  ↓
execution_completed (final result)
```

**Success Metrics:**
- Approval turnaround time: `approval_turnaround_ms` (P50/P95)
- Queue depth: `pending_count` at any moment
- Approval rate: % of REVIEW decisions that are APPROVED (vs REJECTED)
- SLA compliance: % of approvals ≤ 1 hour

---

### Journey 3: Compliance Audit

```
policy_created / execution_submitted / ... (events accumulate)
  ↓
evidence_exported (auditor exports pack)
  ↓
audit_trail_queried (auditor searches)
  ↓
execution_replayed (auditor validates determinism)
  ↓
compliance_report_generated (auditor certifies)
  ↓
proof_verified (validation passes)
```

**Success Metrics:**
- Audit frequency: how often evidence_exported happens
- Audit coverage: % of executions in exported evidence
- Proof validity: % of replayed executions with `deterministic_match`
- Compliance maturity: report generation frequency (weekly? monthly?)

---

## Implementation Priorities

### Phase 1: Critical Path (Week 1)

Events required to unblock conversion funnel visibility:

1. `user_signup`
2. `organization_created`
3. `policy_created`
4. `agent_created`
5. `execution_submitted`
6. `decision_made`
7. `checkout_started`
8. `subscription_created`

**Where to instrument:**
- Auth/signup: `/api/auth/**` routes
- Org/workspace: `/app/dashboard/setup`, Supabase triggers
- Policy: `/app/dashboard/markdoc-policies` component + API
- Agent: `/app/dashboard/agents/connect` + API
- Execution: `/api/execute`, `/api/spine/execute` (core gate)
- Checkout: `/app/api/billing/**` (Stripe integration)

### Phase 2: Operational Metrics (Week 2)

Events required for product health:

1. `approval_requested`
2. `approval_completed`
3. `execution_completed`
4. `policy_updated`
5. `policy_archived`
6. `workspace_created`
7. `team_member_invited`

### Phase 3: Compliance (Week 3)

Events required for audit maturity:

1. `evidence_exported`
2. `audit_trail_queried`
3. `execution_replayed`
4. `compliance_report_generated`
5. `proof_verified`

---

## Success Criteria

| Goal | Metric | Target |
|------|--------|--------|
| **Conversion funnel visible** | Events E2E: signup → subscription | ✅ By Week 1 |
| **Policy adoption clear** | % of free orgs creating policies | ≥ 40% within 7 days |
| **Approval SLA trackable** | P95 approval turnaround | ≤ 1 hour |
| **Compliance audit-ready** | % of executions with proof verification | ≥ 95% |
| **Product health visible** | Decision latency, approval rate, policy count | Dashboards ready Week 2 |

---

## PostHog Dashboard Setup (Design)

### Dashboard 1: Conversion Funnel

- Step 1: `user_signup`
- Step 2: `organization_created`
- Step 3: `policy_created`
- Step 4: `execution_submitted`
- Step 5: `subscription_created`

**Metrics:** Conversion rate, dropoff points, time between steps

### Dashboard 2: Product Health

- Decision latency histogram (from `decision_made.decision_latency_ms`)
- Decision distribution pie (ALLOW/BLOCK/REVIEW/ESCALATE ratio)
- Active policies count (distinct `policy_id` with status=active)
- Approval SLA compliance (% of `approval_completed` with `approval_turnaround_ms ≤ 3600000`)

### Dashboard 3: Compliance Readiness

- Evidence export frequency (events/week)
- Audit trail query frequency (events/week)
- Proof validity rate (% of `proof_verified` with `verification_result=valid`)
- Policy version adoption (% of executions on latest policy version)

---

## Notes

- All timestamps are ISO8601 (UTC)
- No PII in properties (use IDs, not emails, unless explicitly audit-required)
- Group hierarchy is critical for multi-tenant queries
- Event properties should be additive (add new properties to existing events only if backward compatible)

---

**Next Phase:** Implementation Guide (`.telemetry/tracking-guide.md`)  
**Ready for:** Code review, stakeholder feedback, integration testing
