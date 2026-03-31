# ADR-2026-03-31: Introduce Task Layer Above the Runtime Truth/Safety Spine

## Status
Proposed

## Context

The control-plane already has the foundations for a runtime truth/safety spine:

- approval-bound execution
- atomic truth + execution + ledger commit
- replay-safe execution semantics
- checkpoints and recovery validation
- enterprise proof/report surfaces
- runtime roles / governance visibility
- usage and audit lineage

This means the next architecture step should **not** replace the spine.
The right next step is to introduce a **Task Layer above the spine** so users can express goals, while DSG still owns truth, evidence, approvals, effects, lineage, and org-scoped control.

## Decision

We will add a Task Layer that translates user goals into planned steps and executes them through external orchestrators/executors, while **all authoritative state transitions still write back through DSG**.

### Control model

User Goal
-> Task Composer
-> Planner
-> Task Run / Task Steps
-> Orchestrator
-> External executor(s)
-> Results write back into DSG Spine
-> approvals / effects / ledger / audit / checkpoints / verification

### Non-goals

We are **not** turning Airflow, OpenTofu, Ansible, Argo CD, or any other external system into the source of truth.
We are **not** using preview/demo policy UI as active runtime governance.
We are **not** letting executors write ledger/effects/truth tables directly.

## Architecture

### 1) DSG Spine remains authoritative

DSG remains the system of record for:

- truth state
- approval decisions
- execution lineage
- effects
- ledger
- checkpoints
- audit evidence
- replay / verify semantics
- exception ownership
- org-scoped access control

### 2) Task Layer becomes the user-facing action surface

Users should submit goals such as:

- rotate agent key
- reconcile failed execution
- export audit pack
- re-run failed callback chain
- apply approved infra change
- remediate host drift

The planner turns a goal into typed steps.
The orchestrator dispatches those steps to external systems.
All externally observed outcomes return to DSG and are committed into the spine.

### 3) External systems are execution arms, not authority

- **Airflow** = workflow brain for scheduling, retries, waits, resume, fan-out/fan-in
- **OpenTofu** = primary declarative infra executor
- **Ansible** = config/remediation executor
- **Argo CD** = optional deploy/rollback executor for Kubernetes
- **Prometheus + Alertmanager** = anomaly / SLO / drift detection and operator escalation
- **Pulumi** = optional later path for embedded programmatic IaC UX, not day-1 default

## Phase Plan

### Phase 0 — Freeze and harden the spine

Before adding task abstractions, lock the runtime contracts that make evidence trustworthy.

#### Deliverables

- lock schema/runtime contracts for:
  - approvals
  - effects
  - ledger_entries
  - state_checkpoints
  - executions
- define the policy runtime source of truth separately from any preview/demo UI
- add end-to-end integration coverage for:
  - execute -> effect -> ledger -> replay/verify

#### Acceptance criteria

- replay-safe execution remains deterministic
- ledger/truth lineage is stable under retries
- checkpoint verification passes for the canonical path
- policy runtime source of truth is explicit and not tied to preview surfaces

---

### Phase 1 — Minimal Task Layer

Introduce the smallest useful goal-to-step abstraction without changing the spine.

#### New tables

- `task_templates`
- `task_runs`
- `task_steps`

#### New routes

- `POST /api/tasks/plan`
- `POST /api/tasks/run`
- `GET /api/tasks/:id`
- `GET /api/tasks/:id/steps`

#### New services

- `lib/tasks/planner.ts`
- `lib/tasks/orchestrator.ts`
- `lib/tasks/templates.ts`

#### UI

- Task Composer
- Task Runs
- Task Detail

#### Behavior

Users submit a goal.
DSG plans that goal into step definitions.
Steps are mapped onto the existing runtime spine.
Users should not need to manually pass raw runtime sequence parameters.

#### Acceptance criteria

- a task can be planned from a goal
- a task run creates step records deterministically
- step outputs write back through DSG routes
- audit lineage remains visible in the existing spine model

---

### Phase 2 — Airflow Integration

Use Airflow as orchestration/worker control, but not as truth authority.

#### Airflow responsibilities

- scheduling
- retries / backoff
- wait-for-callback
- resume-after-callback
- periodic runs
- fan-out / fan-in
- long-running workflow control

#### DSG responsibilities

- authoritative task state
- authoritative approval/effect/ledger/audit commit
- callback validation
- exception ownership
- replay and verification

#### New tables

- `scheduler_jobs`
- `task_attempts`
- `exception_queue`

#### New services

- `lib/tasks/scheduler.ts`
- `lib/tasks/retries.ts`

#### Worker contracts

- `POST /api/tasks/:id/step/:stepId/start`
- `POST /api/tasks/:id/step/:stepId/complete`
- `POST /api/tasks/:id/step/:stepId/fail`

#### Acceptance criteria

- Airflow can start steps but cannot mutate DSG truth tables directly
- retries and backoff are visible in DSG task history
- callback timeouts enter `exception_queue`
- resumed workflows preserve lineage

---

### Phase 3 — Real Executors

#### Phase 3A — OpenTofu adapter

##### New files

- `lib/executors/opentofu.ts`
- `app/api/executors/opentofu/plan/route.ts`
- `app/api/executors/opentofu/apply/route.ts`

##### Execution pattern

1. planner emits step type `infra.plan`
2. DSG requests OpenTofu plan
3. plan output is hashed and stored as evidence
4. policy runtime decides auto-approve or manual approval
5. apply result returns to DSG
6. DSG writes effects + ledger + audit evidence

##### Notes

OpenTofu is the primary infra executor because declarative plan/apply and state handling fit the spine’s evidence model.

#### Phase 3B — Ansible adapter

##### New files

- `lib/executors/ansible.ts`
- `app/api/executors/ansible/run/route.ts`

##### Use cases

- config remediation
- patching
- key rotation on hosts
- drift correction
- incident response playbooks

##### Notes

Ansible should be used for ordered host/config actions and remediation, not for DSG truth ownership.

#### Phase 3C — Argo CD adapter (optional)

Only add this if Kubernetes delivery becomes a real product path.

##### New files

- `lib/executors/argocd.ts`
- `app/api/executors/argocd/sync/route.ts`
- `app/api/executors/argocd/rollback/route.ts`

##### Example task templates

- `deploy_service`
- `rollback_service`
- `sync_environment`

##### Notes

Argo CD is deploy-specific and should not become the general task engine.

---

### Phase 4 — Reliability Loop

This is where DSG moves from “runnable” to “can safely act on behalf of the operator”.

#### New tables

- `compensation_actions`
- `outcome_verifications`

#### New services

- `lib/tasks/compensation.ts`
- `lib/tasks/verifier.ts`

#### Rules

- every external mutating action should define a compensation mapping where feasible
- every critical workflow should define a post-condition verifier
- if verifier fails:
  - retry when safe
  - compensate when retry is wrong
  - escalate when policy/risk threshold is exceeded

#### Acceptance criteria

- failed mutating workflows do not silently drift
- post-condition verification is first-class
- operator escalation is deterministic and auditable

---

### Phase 5 — Monitoring and Exception Nervous System

Prometheus and Alertmanager become the anomaly and escalation layer.

#### Integrations

- scrape DSG API metrics
- scrape worker metrics
- scrape executor metrics

#### Initial alert rules

- repeated step failures
- callback timeout
- ledger verify mismatch
- replay mismatch
- too many blocked tasks
- long-running stuck tasks
- policy runtime unavailable

#### Routing targets

- `exception_queue`
- operator inbox
- Slack / email / PagerDuty

#### Acceptance criteria

- alert events are grouped and deduplicated
- actionable incidents become operator-visible work items
- DSG can distinguish runtime failure, policy failure, callback failure, and executor failure

## Recommended Repository Layout

```text
lib/
  tasks/
    planner.ts
    orchestrator.ts
    scheduler.ts
    retries.ts
    compensation.ts
    verifier.ts
    templates.ts
    policy-bridge.ts
  executors/
    opentofu.ts
    ansible.ts
    argocd.ts
  monitoring/
    alerts.ts
    metrics.ts

app/api/
  tasks/
    plan/route.ts
    run/route.ts
    [id]/route.ts
    [id]/steps/route.ts
    [id]/retry/route.ts
    [id]/cancel/route.ts
    [id]/rollback/route.ts
  executors/
    opentofu/plan/route.ts
    opentofu/apply/route.ts
    ansible/run/route.ts
    argocd/sync/route.ts
    argocd/rollback/route.ts
  exceptions/
    route.ts
    [id]/resolve/route.ts
  schedules/
    route.ts
```

## Hard constraints

Do not do the following:

- do not let Airflow write truth tables directly
- do not let executors write ledger/effects directly
- do not treat preview/demo policy UI as runtime authority
- do not treat OpenTofu / Ansible / Argo CD / Pulumi as the audit source of truth

DSG must remain the owner of truth, evidence, decision lineage, and org-scoped control.

## Investment order

Recommended implementation order:

1. Task Layer minimal
2. Airflow integration
3. OpenTofu adapter
4. Prometheus + Alertmanager
5. Ansible adapter
6. Argo CD only if Kubernetes-heavy
7. Pulumi only if embedded IaC UX becomes a product requirement

## Immediate next slice

The highest-value next implementation slice is:

- migrations for `task_templates`, `task_runs`, `task_steps`, `task_attempts`, `exception_queue`
- TypeScript domain types for task planning / task execution / task status
- route contracts for `/api/tasks/plan` and `/api/tasks/run`
- first built-in template set:
  - `rotate_agent_key`
  - `reconcile_failed_execution`
  - `export_audit_pack`
  - `infra_plan_apply`
