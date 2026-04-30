# DSG AI Action Governance Gateway

DSG is a production-oriented governance gateway for high-risk AI, agent, workflow, and finance actions.

It lets teams keep their existing agents, tools, APIs, and business systems while routing risky actions through deterministic policy, invariant, entitlement, approval, connector, and audit-proof controls.

Live deployment:

- https://tdealer01-crypto-dsg-control-plane.vercel.app

Marketplace evidence:

- `/marketplace`
- `/marketplace/production-evidence`
- `/gateway/monitor?orgId=org-smoke`
- `/api/gateway/audit/export?orgId=org-smoke`

## Current production status

Verified production surfaces:

- Vercel deployment: READY
- Supabase runtime env: configured
- Finance readiness endpoint: HTTP 200
- Finance governance tables: reachable
- RBAC-gated approve API: HTTP 200
- Finance audit proof write path: verified
- Gateway connector registry: verified
- Gateway custom HTTP execution: verified
- Monitor Mode plan-check: verified
- Monitor Mode audit commit: verified
- Audit events API: verified
- Audit export API: verified
- `requestHash` / `recordHash`: generated and returned
- Production gateway benchmark: 6/6 passed

Production benchmark summary:

```text
pass: true
total: 6
passed: 6
failed: 0
passRate: 100%
avgLatencyMs: 1812
minLatencyMs: 905
maxLatencyMs: 3303
```

Evidence boundary: the benchmark is internal production evidence for marketplace/demo validation. It is not an independent third-party certification.

## Product purpose

DSG prevents high-risk AI, agent, workflow, and finance actions from becoming ungoverned outputs.

It provides:

- deterministic approval decisions
- finance action gating before execution
- AI/tool action policy checks before execution
- role and plan entitlement enforcement
- connector registry for customer-managed HTTP endpoints
- Gateway Mode for DSG-managed connector execution
- Monitor Mode for customer-owned runtime execution
- request and record hashing
- audit event history and export APIs
- deterministic SMT2-compatible invariant evidence
- production benchmark evidence
- comparison benchmark rubric for adjacent market tools

## Core modes

### Gateway Mode

DSG executes the configured connector after policy/risk/approval checks pass.

```text
Agent / workflow
→ POST /api/gateway/tools/execute
→ DSG checks role / plan / risk / approval
→ DSG executes customer connector
→ DSG returns provider result + audit proof
```

Core routes:

```text
POST /api/gateway/connectors
POST /api/gateway/tools/execute
GET  /api/gateway/webhook/inbox
POST /api/gateway/webhook/inbox
```

Gateway Mode is useful when the customer wants DSG to execute a webhook or REST connector directly.

### Monitor Mode

DSG checks the action and returns a decision/audit token. The customer keeps execution inside their own runtime and commits the result back to DSG.

```text
Customer agent/tool runtime
→ POST /api/gateway/plan-check
→ DSG returns allow/block/review + auditToken + requestHash
→ customer executes its own tool
→ POST /api/gateway/audit/commit
→ DSG writes final recordHash
→ /gateway/monitor shows history and export
```

Core routes:

```text
POST /api/gateway/plan-check
POST /api/gateway/audit/commit
GET  /api/gateway/audit/events
GET  /api/gateway/audit/export
GET  /gateway/monitor?orgId=org-smoke
```

Monitor Mode is useful when customers do not want DSG to hold production API keys.

## Gateway connector registry

Register a customer-managed webhook or REST endpoint:

```bash
curl -i -X POST "https://tdealer01-crypto-dsg-control-plane.vercel.app/api/gateway/connectors" \
  -H "content-type: application/json" \
  -H "x-org-id: org-smoke" \
  -H "x-actor-id: admin-001" \
  -H "x-actor-role: admin" \
  -d '{
    "name": "Internal gateway inbox",
    "endpointUrl": "https://tdealer01-crypto-dsg-control-plane.vercel.app/api/gateway/webhook/inbox",
    "toolName": "custom_http.customer_webhook",
    "action": "post",
    "risk": "medium",
    "requiresApproval": false,
    "description": "Internal POST-capable gateway smoke receiver"
  }'
```

Execute the registered tool:

```bash
curl -i -X POST "https://tdealer01-crypto-dsg-control-plane.vercel.app/api/gateway/tools/execute" \
  -H "content-type: application/json" \
  -H "x-org-id: org-smoke" \
  -H "x-actor-id: agent-001" \
  -H "x-actor-role: agent_operator" \
  -H "x-org-plan: enterprise" \
  -d '{
    "toolName": "custom_http.customer_webhook",
    "action": "post",
    "planId": "PLAN-CUSTOM-001",
    "input": {
      "message": "DSG managed connector execution"
    }
  }'
```

Expected result:

```text
HTTP 200
ok: true
decision: allow
provider: custom_http
requestHash: present
recordHash: present
```

## Monitor Mode audit flow

Plan-check:

```bash
curl -i -X POST "https://tdealer01-crypto-dsg-control-plane.vercel.app/api/gateway/plan-check" \
  -H "content-type: application/json" \
  -H "x-org-id: org-smoke" \
  -H "x-actor-id: agent-001" \
  -H "x-actor-role: agent_operator" \
  -H "x-org-plan: enterprise" \
  -d '{
    "toolName": "custom_http.customer_webhook",
    "action": "post",
    "planId": "PLAN-MONITOR-001",
    "input": {
      "message": "Customer runtime will execute after DSG allow"
    }
  }'
```

Commit result after the customer runtime executes its own tool:

```bash
curl -i -X POST "https://tdealer01-crypto-dsg-control-plane.vercel.app/api/gateway/audit/commit" \
  -H "content-type: application/json" \
  -H "x-org-id: org-smoke" \
  -d '{
    "auditToken": "gat_REPLACE_WITH_PLAN_CHECK_TOKEN",
    "result": {
      "ok": true,
      "provider": "customer_runtime",
      "target": "customer.tool",
      "messageId": "msg_001"
    }
  }'
```

Expected result:

```text
HTTP 200
ok: true
committed: true
recordHash: present
```

## Finance Governance

DSG also includes a finance governance control plane for approval workflows.

Finance readiness:

```text
GET /api/finance-governance/readiness
```

Expected healthy response:

```json
{
  "ok": true,
  "service": "finance-governance"
}
```

Protected finance write routes:

```text
POST /api/finance-governance/approvals/:id/approve
POST /api/finance-governance/approvals/:id/reject
POST /api/finance-governance/approvals/:id/escalate
```

Required headers:

```text
x-org-id: <organization-id>
x-actor-id: <user-or-agent-id>
x-actor-role: finance_approver
x-org-plan: enterprise
```

Allowed write roles:

- owner
- admin
- finance_admin
- finance_approver

Allowed write plans:

- enterprise
- business
- pro

Denied requests return:

- 403 for role/access failures
- 402 for entitlement/plan failures

Smoke-tested approval:

```text
org_id: org-smoke
transaction_id: TX-SMOKE-001
approval_id: APR-SMOKE-001
action: approve
result: ok
next_status: approved

Stored audit proof:
request_hash: 5c1a727def56cf684cc5282f5c95e90d45a27809ec35e7da705804e5f459d5e9
record_hash: 36bbe8fc4594abc9159868a22f6eb6a185c4e80220848f8be2008d1506b45179
```

Finance audit routes:

```text
GET /api/finance-governance/audit-ledger?limit=50
GET /api/finance-governance/audit-ledger/:recordHash/verify
```

## Deterministic SMT2-compatible invariants

DSG emits deterministic SMT-LIB v2-compatible invariant evidence for gateway governance checks.

Covered invariants:

- organization id required
- actor id required
- actor role required and allowed
- organization plan required and entitled
- tool must be registered
- requested action must match registered tool action
- evidence must be writable before allow
- high-risk / critical / approval-required actions require approval

Run the invariant evidence suite:

```bash
npm run benchmark:gateway:smt2
```

Outputs:

```text
artifacts/gateway-smt2/gateway-smt2-invariants-result.json
artifacts/gateway-smt2/gateway-smt2-invariants-report.md
```

Evidence boundary: the current SMT2 implementation emits SMT-LIB v2-compatible constraint text and hashes the SMT2 input/result. It performs deterministic static invariant evaluation without invoking an external Z3/cvc5 solver. External solver verification can be added later using the emitted SMT2 text.

Safe wording:

```text
DSG emits deterministic SMT2-compatible invariant evidence before governed AI/tool execution.
```

Do not claim independent formal verification until external solver artifacts and independent review exist.

## Benchmarks

Production gateway benchmark:

```bash
npm run benchmark:gateway
```

Outputs:

```text
artifacts/gateway-benchmark/gateway-benchmark-result.json
artifacts/gateway-benchmark/gateway-benchmark-report.md
```

Market comparison scoring:

```bash
npm run benchmark:gateway:compare
```

Outputs:

```text
artifacts/gateway-comparison/gateway-comparison-result.json
artifacts/gateway-comparison/gateway-comparison-report.md
```

SMT2 deterministic invariant evidence:

```bash
npm run benchmark:gateway:smt2
```

## Market comparison boundary

The comparison suite is a same-criteria rubric for adjacent tools such as automation platforms, workflow systems, API gateways, observability stacks, and compliance evidence tools.

Current DSG submitted score:

```text
188 / 200
94%
```

Safe wording:

```text
DSG has a 94% submitted score against its public AI Action Governance Gateway comparison rubric.
```

Do not use:

```text
DSG is 94% better than Zapier.
DSG beats Workato.
Certified best-in-market.
```

Those claims require same-suite evidence for every vendor and ideally independent review.

## Production database tables

Finance governance tables:

```text
finance_transactions
finance_approval_requests
finance_approval_decisions
finance_governance_audit_ledger
finance_workflow_action_events
```

Gateway tables:

```text
gateway_connectors
gateway_tools
gateway_monitor_events
```

Verified schema status:

```text
finance_transactions              OK
finance_approval_requests         OK
finance_approval_decisions        OK
finance_governance_audit_ledger   OK
finance_workflow_action_events    OK
gateway_connectors                OK
gateway_tools                     OK
gateway_monitor_events            OK
```

## Deployment

The app is deployed on Vercel and uses Supabase as the runtime database.

Required environment variables include:

```text
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
DSG_CORE_MODE
NEXTAUTH_SECRET
DSG_FINANCE_GOVERNANCE_ENABLED=true
```

Optional provider variables:

```text
ZAPIER_WEBHOOK_URL
CUSTOM_HTTP_WEBHOOK_URL
```

Zapier note: Zapier Webhooks may require a paid Zapier plan or partner/OAuth path. DSG does not depend on Zapier for the current Gateway/Monitor production path.

## GO / NO-GO

Production GO requires:

- Vercel deployment is READY
- `/api/finance-governance/readiness` returns HTTP 200
- Supabase tables exist and are reachable
- RBAC-gated routes enforce role and plan headers
- Gateway connector registration works
- Gateway execution returns provider result and proof hashes
- Monitor Mode plan-check records an audit token
- Monitor Mode audit commit writes final record hash
- audit export returns evidence JSON
- benchmark scripts pass for the target deployment

Current status:

```text
Finance governance backend smoke path: GO
Gateway Mode production benchmark: GO
Monitor Mode production benchmark: GO
SMT2-compatible deterministic invariant evidence: available
Marketplace production evidence page: available
```

## Product boundary

This repository is the DSG AI Action Governance Gateway backend and SaaS surface.

It includes:

- production readiness checks
- Supabase-backed finance workflow records
- RBAC-gated finance actions
- customer-managed connector registry
- Gateway Mode execution
- Monitor Mode decision/audit flow
- deterministic audit proof storage
- runtime hash verification APIs
- audit export APIs
- production benchmark evidence
- deterministic SMT2-compatible invariant evidence

It is not a claim of independent third-party certification, nor a claim that DSG is universally better than every automation or governance vendor.
