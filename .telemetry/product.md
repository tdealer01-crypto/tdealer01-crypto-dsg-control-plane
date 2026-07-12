# Product: DSG ONE / ProofGate Control Plane

**Last updated:** July 12, 2026  
**Method:** Codebase scan + live API inspection + dashboard surface analysis

---

## Product Identity

- **One-liner:** Policy-driven teams write rules in Thai/English, submit AI requests to a deterministic gate that proves every decision with formal verification (Z3), records tamper-evident audit trails, and produces compliance artifacts that survive 2+ year audits.

- **Category:** B2B SaaS — AI governance / runtime control plane

- **Product type:** B2B (multi-tenant SaaS with organization/workspace hierarchy)

- **Collaboration:** Multiplayer — policy writers, approvers, auditors, API consumers, operators all work on shared policies and evidence trails

- **Primary motion:** 
  1. Operator creates policy in natural language
  2. AI agent submits request to DSG gate
  3. Deterministic solver (Z3) gates the request in ~11ms
  4. Decision + cryptographic proof returned
  5. Execution logged with SHA-256 audit chain
  6. Auditors/compliance teams query evidence for proof of compliance

---

## Business Model

- **Monetization:** Freemium + metered usage (pay-per-decision or pay-per-organization)

- **Pricing tiers:** 
  - Free (limited requests, basic features)
  - Pro/Standard (metered billing, audit trails, compliance pack)
  - Enterprise (volume pricing, dedicated support, custom integrations, SLA)

- **Billing integration:** Stripe (detected in code: `stripe` dependency, `/api/billing`, `/api/revenue`, Stripe Connect for payouts)

- **Quota model:** Per-organization request limits, enforced at gate time via capacity tracking

---

## Tech Stack

- **Primary language:** TypeScript (Next.js 15)

- **Framework:** Next.js 15 (App Router), React 18

- **Database:** PostgreSQL (via Supabase)

- **Background jobs:** Node.js-based (no explicit Sidekiq/Celery detected; using Next.js cron or Vercel functions)

- **Formal verification:** Z3 SMT solver (z3-solver dependency), NVIDIA HPC optional (verify-policy-hpc scripts)

- **Authentication:** Supabase Auth + OAuth 2.0 + PKCE

- **Analytics:** PostHog (posthog-node in dependencies)

- **Blockchain:** Solana (Web3.js), Ethereum (ethers.js) — for payment/settlement layer

- **Module organization:** TypeScript modules under `lib/` organized by domain (dsg/, runtime/, gate/, audit/, etc.)

---

## Value Mapping

### Primary Value Action

**Gate AI requests with deterministic, formally-verified policies and produce tamper-evident audit trails that satisfy compliance auditors.**

If this drops to zero, the product has failed. Everything else is supporting this core motion.

### Core Features (directly deliver value)

1. **Deterministic Policy Gate** — Define rules in natural language (Thai/English), route requests through Z3 solver, produce decision in ~11ms. Why it's core: The decision speed and reproducibility is the entire product value.

2. **Formal Verification & Proof** — Z3 proves constraints at design time; gate verifies policy compliance at runtime. Why it's core: "Provable" is the core differentiator vs. LLM-based agents.

3. **Audit Trail & Evidence Chain** — SHA-256 Merkle ledger, CCVS L1-L5 compliance artifacts, tamper detection. Why it's core: Auditors won't accept the system without this; compliance teams need it.

4. **Multi-Organization Governance** — Organizations, workspaces, agents, policies, RBAC, RLS enforcement. Why it's core: B2B multi-tenant SaaS requires this to isolate customers.

5. **Approval Workflow** — Pending decisions, human review queues, policy approval gates. Why it's core: Financial/compliance use cases require human oversight before execution.

### Supporting Features (enable core actions)

1. **Billing & Capacity Enforcement** — Stripe integration, quota limits, per-request metering
2. **Multi-Agent Orchestration** — Hermes/Trinity frameworks for coordinating multiple agents under one governance plane
3. **API Key Management** — Secure credential lifecycle for API consumers
4. **Compliance Reporting** — EU AI Act mapping, PDPA readiness, evidence export
5. **Dashboard UI** — Policy editor, execution replay, audit browser, approval queue UI
6. **Webhooks & Integrations** — External system notifications, event streaming
7. **Support & Documentation** — FAQ, ticket system, API docs

---

## Entity Model

### Users

- **ID format:** UUID (Supabase auth.users.id)
- **Roles:** 
  - `admin` — full control, can modify policies, approve decisions, manage org
  - `operator` — can write policies, manage agents, view audit trails
  - `approver` — can approve pending decisions
  - `auditor` — can query evidence, export compliance reports (read-only)
  - `api_consumer` — can call `/api/execute` with agent requests (programmatic)
- **Multi-account:** Yes — users can be members of multiple organizations

### Organizations

- **ID format:** UUID
- **Hierarchy:** Flat at org level; orgs contain workspaces
- **Scope:** All policies, agents, executions, audit trails, billing are org-scoped
- **Access control:** Row-level security (RLS) enforces org isolation at database level

### Workspaces

- **ID format:** UUID
- **Purpose:** Sub-divisions within an organization (e.g., Finance, Risk, Operations)
- **Parent:** Organization
- **Scope:** Policies, agents, and execution queues can be workspace-scoped

### Agents

- **ID format:** UUID with prefixed identifier (e.g., `agent_xxxxx`)
- **Scope:** Per-organization
- **API Key:** Each agent has unique API key for calling `/api/execute`
- **Quota:** Individual request limits per agent per period (hourly/daily/monthly)
- **Status:** active/paused/suspended

### Policies

- **ID format:** UUID
- **Scope:** Per-organization, optionally per-workspace
- **Format:** Natural language (Thai/English) + Markdoc syntax
- **Lifecycle:** Draft → Active → Archived
- **Versioning:** Policy version history with approval workflow
- **Constraints:** Amount thresholds, rate limits, time windows, approval rules

### Executions / Decisions

- **ID format:** UUID with prefix (e.g., `exec_xxxxx`)
- **Scope:** Per-organization
- **Decision states:** ALLOW, BLOCK, REVIEW, UNSUPPORTED, ESCALATE
- **Proof:** SHA-256 hash, policy version, constraint satisfaction evidence
- **Audit trail:** Immutable ledger entry with deterministic hash chain
- **Approval workflow:** Pending → Approved → Executed → Archived

### Evidence / Audit Trail

- **ID format:** UUID
- **Scope:** Per-organization, queryable by auditor
- **Schema:** CCVS L1-L5 levels (unit, integration, adversarial, mutation, provenance)
- **Retention:** 2+ years (compliance requirement)
- **Queryable by:** Audit date, agent, policy, decision type, compliance status

---

## Group Hierarchy

```
Organization (top level - org-scoped billing, RBAC)
└── Workspace (optional - team/department division)
    └── Agent (API consumer, has quota)
        └── Execution (individual decision)
            └── Evidence (audit trail)
```

| Group Type | Parent | Where Actions Happen | Tracking Level |
|------------|--------|---------------------|-----------------|
| Organization | None | Policy creation, approval, billing, org settings | `org_id` |
| Workspace | Organization | Policy assignment, team collaboration (optional) | `workspace_id` |
| Agent | Workspace (or direct org) | API calls, request rate limiting, quota | `agent_id` |
| Execution | Agent | Decision gate, proof generation, audit trail | `execution_id` |

**Default event level:** Agent (most specific level for meaningful telemetry)  
**Admin actions at:** Organization (policy changes, approval workflows, org-level settings)  
**Audit/compliance queries at:** Organization + Workspace (full history)

---

## Current State

- **Existing tracking:** PostHog (analytics client-side and server-side)

- **Live deployment:** Production on Vercel, all health checks passing, DB connected

- **Documentation:** Comprehensive (README, docs/, API references)

- **Known gaps:** 
  - Policy adoption rate across org tiers
  - Decision approval velocity (how long pending → approved)
  - Agent request volume by feature/policy type
  - Conversion funnel (free → pro → enterprise)
  - Decision replay success rates (deterministic proof validation)
  - Compliance audit trail access patterns

---

## Integration Targets

| Destination | Purpose | Priority | Notes |
|-------------|---------|----------|-------|
| PostHog | In-app analytics, funnel, user behavior, feature adoption | High | Already integrated; can expand |
| Stripe | Billing events, subscription changes, upgrade/downgrade, payout status | High | Core to revenue understanding |
| Supabase | Audit trail source of truth, RLS enforcement, compliance queries | High | Already primary DB |
| Anthropic API | LLM integration (policy advisory); track token usage, model calls | Medium | `@anthropic-ai/sdk` integrated |
| NVIDIA HPC | Formal verification batches, Z3 solve latency tracking (optional) | Low | Design-time verification only |
| Webhook targets | Customer integrations, event delivery reliability | Medium | Detect/measure webhook failures |

---

## Codebase Observations

### Feature Areas Inferred (from routes)

- **Core Gate:** `/api/execute`, `/api/spine/execute`, `/api/intent` — deterministic decision path
- **Policy Management:** `/app/dashboard/markdoc-policies`, `/app/dashboard/policies`, governance controls
- **Approvals:** `/app/dashboard/approvals`, approval queue workflow
- **Audit & Compliance:** `/app/dashboard/audit`, `/app/compliance`, `/app/delivery-proof`, evidence export
- **Billing & Capacity:** `/app/dashboard/billing`, `/app/dashboard/capacity`, `/app/dashboard/revenue`
- **Multi-Agent Orchestration:** `/app/dashboard/hermes`, `/app/dashboard/trinity`, `/app/dashboard/dsg-brain` — agent coordination
- **Integrations:** `/app/dashboard/stripe-app`, `/app/dashboard/integrations`, webhooks
- **Dashboard & Operations:** Settings, team management, security, monitoring, notifications
- **Enterprise Features:** Delivery proof reports, enterprise proof printouts, compliance packs

### Entity Model Inferred (from database schema)

- `organizations` — account/tenant entity
- `users` — with roles and org membership
- `agents` — with API keys and per-org quotas
- `policies` — Markdoc-based rules with versioning
- `executions` / `runtime_intents` — decision log with proofs
- `audit_trails` / `evidence` — tamper-evident ledger (CCVS L1-L5)
- `approvals` / `approval_queue` — workflow state for pending decisions
- `billing_events` / `subscriptions` — Stripe-backed monetization
- `access_requests` — onboarding / access control
- `api_keys` — agent credential lifecycle

### Key Architectural Patterns

- **Deterministic execution:** Same input → same output (Z3 verification at design time, runtime gate validation)
- **Immutable audit trail:** SHA-256 Merkle chain, append-only semantics
- **Row-level security (RLS):** Supabase RLS policies enforce org/workspace isolation
- **Multi-tenant:** Org-scoped operations, cross-org data access prevented by RLS
- **Metered billing:** Usage-based quotas per organization/agent
- **Formal proof integration:** Z3 SMT solver for constraint satisfaction, NVIDIA HPC optional

---

## Notes for Next Phase

**Audit (product-tracking-audit-current-tracking):**
- Scan existing PostHog events to understand current coverage
- Identify gaps: policy adoption metrics, decision velocity, approval rates, conversion funnel
- Check Stripe webhook integration for billing event tracking
- Review audit trail logging completeness

**Design (product-tracking-design-tracking-plan):**
- Define core conversion funnel: Signup → Policy Created → First Execution → Approval → Enterprise Upgrade
- Design policy adoption metrics: Policies per org, active policies, policy replay success
- Plan approval workflow metrics: Queue depth, approval time (P50/P95), escalation rates
- Compliance/audit metrics: Evidence access patterns, export frequency, retention compliance
- Agent-level metrics: Request rate, quota utilization, decision distribution (ALLOW/BLOCK/REVIEW)

---

**Built by:** Claude Code | **Repository:** tdealer01-crypto-dsg-control-plane
