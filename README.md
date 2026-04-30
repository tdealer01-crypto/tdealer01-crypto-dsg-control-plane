# DSG Finance Governance Control Plane

DSG Finance Governance Control Plane is the first production surface of the broader **DSG Governance Gateway**: a governance, invariant, and audit layer for high-risk AI agent actions.

This repository is not only a finance approval app. It is a SaaS control plane that lets existing agents keep their runtime while DSG governs risky tool execution before it reaches external apps.

```text
DSG = Governance / Invariant / Audit Gateway
Zapier = Universal Connector to external apps
Agent = Existing runtime that must submit plans/tool calls through DSG first
```

Core gateway flow:

```text
Agent
→ DSG Plan Check
→ Policy / Invariant / Risk
→ DSG Connector
→ Zapier / Make / n8n / MCP / REST
→ App destination
→ Result back to DSG
→ Audit Ledger / Proof Export
```

DSG does not replace customer agents or apps. DSG governs high-risk AI actions before they execute, then records proof after execution.

## Current production status

Live deployment:

- https://tdealer01-crypto-dsg-control-plane.vercel.app

Verified runtime status:

- Vercel deployment: READY
- Finance readiness endpoint: HTTP 200
- Supabase env: configured
- Finance governance tables: reachable
- RBAC-gated approve API: HTTP 200
- Audit proof write path: verified
- `request_hash` and `record_hash`: generated and stored

Smoke-tested approval:

```text
org_id: org-smoke
transaction_id: TX-SMOKE-001
approval_id: APR-SMOKE-001
action: approve
result: ok
next_status: approved
```

Stored audit proof:

```text
request_hash: 5c1a727def56cf684cc5282f5c95e90d45a27809ec35e7da705804e5f459d5e9
record_hash: 36bbe8fc4594abc9159868a22f6eb6a185c4e80220848f8be2008d1506b45179
```

## Product purpose

DSG prevents high-risk finance and AI-agent actions from becoming ungoverned workflow outputs.

It provides:

- deterministic approval decisions
- finance action gating before execution
- role and plan entitlement enforcement
- immutable audit evidence
- request and record hashing
- readiness checks for production deployment
- proof export and verification APIs
- a path to universal connector governance through Zapier, Make, n8n, MCP, REST, and custom APIs

## Product boundary

This repository is the DSG Finance Governance Control Plane backend and SaaS surface.

It includes:

- production readiness checks
- Supabase-backed finance workflow records
- RBAC-gated finance actions
- deterministic audit proof storage
- runtime hash verification APIs
- gateway-oriented documentation for connector/provider expansion

Finance Governance is the first product surface. The broader platform direction is DSG as a universal governance gateway for AI actions.

See:

- `docs/dsg-governance-gateway.md`
- `docs/zapier-provider-roadmap.md`
- `docs/finance-governance-audit-ledger.md`
- `docs/finance-governance-access-gate.md`
- `docs/production-readiness-gate.md`

---

## Core backend capabilities

### Finance readiness

```http
GET /api/finance-governance/readiness
```

Expected healthy response:

```json
{
  "ok": true,
  "service": "finance-governance"
}
```

The readiness gate checks:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `finance_transactions`
- `finance_approval_requests`
- `finance_approval_decisions`
- `finance_governance_audit_ledger`
- `finance_workflow_action_events`

### RBAC / entitlement gate

Protected write routes:

```http
POST /api/finance-governance/approvals/:id/approve
POST /api/finance-governance/approvals/:id/reject
POST /api/finance-governance/approvals/:id/escalate
```

Required headers:

```http
x-org-id: <organization-id>
x-actor-id: <user-or-agent-id>
x-actor-role: finance_approver
x-org-plan: enterprise
```

Allowed write roles:

- `owner`
- `admin`
- `finance_admin`
- `finance_approver`

Allowed write plans:

- `enterprise`
- `business`
- `pro`

Denied requests return:

- `403` for role/access failures
- `402` for entitlement/plan failures

### Audit ledger

Audit ledger records are written to:

```text
finance_governance_audit_ledger
```

Each audit record stores:

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

Read audit records:

```http
GET /api/finance-governance/audit-ledger?limit=50
x-org-id: <org-id>
```

Verify one audit record:

```http
GET /api/finance-governance/audit-ledger/:recordHash/verify
x-org-id: <org-id>
```

## Production database tables

Required Supabase tables:

```text
finance_transactions
finance_approval_requests
finance_approval_decisions
finance_governance_audit_ledger
finance_workflow_action_events
```

Verified schema status:

```text
finance_transactions              OK
finance_approval_requests         OK
finance_approval_decisions        OK
finance_governance_audit_ledger   OK
finance_workflow_action_events    OK
```

RLS is enabled on all five tables.

## Smoke test

Readiness:

```bash
curl -i https://tdealer01-crypto-dsg-control-plane.vercel.app/api/finance-governance/readiness
```

Approve action:

```bash
curl -i -X POST "https://tdealer01-crypto-dsg-control-plane.vercel.app/api/finance-governance/approvals/APR-SMOKE-001/approve" \
  -H "x-org-id: org-smoke" \
  -H "x-actor-id: smoke-user" \
  -H "x-actor-role: finance_approver" \
  -H "x-org-plan: enterprise"
```

Expected response:

```json
{
  "ok": true,
  "action": "approve",
  "message": "Approval marked as approved",
  "nextStatus": "approved"
}
```

## Gateway expansion roadmap

The next SaaS layer should add connector/provider execution behind DSG governance.

Priority lock points:

```text
Tool Registry
Risk Classification
Gateway Execution
Audit Commit
Proof Export
```

Target connector/provider flow:

```text
Agent submits plan + requested tool call
→ DSG Plan Check
→ Policy / Invariant / Risk decision
→ DSG Connector Provider
→ Zapier webhook/action
→ App destination
→ Result returns to DSG
→ Audit Commit
→ Evidence Export
```

Near-term targets:

- Zapier webhook provider
- DB-backed tool registry
- risk classification table
- `POST /api/gateway/tools/execute`
- customer-facing connector setup UI
- audit proof export UI

## Deployment

The app is deployed on Vercel and uses Supabase as the runtime database.

Required environment variables:

```text
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
DSG_CORE_MODE
NEXTAUTH_SECRET
DSG_FINANCE_GOVERNANCE_ENABLED=true
```

## GO / NO-GO

Production GO requires:

- Vercel deployment is READY
- `/api/finance-governance/readiness` returns HTTP 200
- Supabase tables exist and are reachable
- RLS is enabled
- approve/reject/escalate routes require RBAC headers
- audit ledger writes `request_hash` and `record_hash`
- smoke test action returns HTTP 200

Current status:

```text
GO for finance governance backend smoke path.
UI/UX still needs to send RBAC headers consistently.
Gateway provider expansion is documented but not yet implemented.
```

---

## Historical production checkpoint

The previous DSG Action Layer production checkpoint remains useful as the baseline for the wider runtime control plane.

**DSG Action Layer Gate: GO**

| Area | Status | Evidence |
|---|---:|---|
| Production deployment | ✅ PASS | Vercel production deployment was READY on the validated checkpoint commit |
| Production URL | ✅ PASS | `https://tdealer01-crypto-dsg-control-plane.vercel.app` |
| Health endpoint | ✅ PASS | `/api/health` returns HTTP 200 with `ok: true` |
| Readiness endpoint | ✅ PASS | `/api/readiness` returns HTTP 200 with `ok: true` |
| Trust pages | ✅ PASS | `/terms`, `/privacy`, `/security`, `/support` return HTTP 200 |
| Protected monitor endpoint | ✅ PASS | `/api/core/monitor` returns HTTP 401 when unauthenticated, which is expected |
| Go/no-go script | ✅ PASS | `GO/NO-GO RESULT: PASS` on scripted checks |

### Re-run the launch gate

```bash
BASE="https://tdealer01-crypto-dsg-control-plane.vercel.app"
./scripts/go-no-go-gate.sh "$BASE"
```

Expected result:

```text
GO/NO-GO RESULT: PASS (all scripted checks green)
```

---

## Repository inventory

This repository covers:

- **Auth & SSO**: magic-link, password, SSO, RBAC, JIT provisioning
- **Spine Execution Engine**: intent → gate → ledger pipeline
- **DSG Core**: internal + remote safety gate
- **Agent Management**: CRUD, key rotation, tools, planner
- **Billing**: Stripe checkout, overage, seat activation
- **Enterprise Proof**: public + verified runtime proof
- **Finance Governance**: approval queue, action gates, audit ledger, proof verification
- **Dashboard**: operational SaaS views
- **API Routes**: health, readiness, runtime, governance, agent, audit, billing, policy, proof, and spine surfaces
- **Database**: Supabase migrations + runtime tables
- **Security**: rate-limit, safe-log, error handling, CSP/security headers

Latest validated product posture: **DSG Finance Governance backend smoke path is GO**, and the next product work should extend the gateway model into connector/provider execution.
