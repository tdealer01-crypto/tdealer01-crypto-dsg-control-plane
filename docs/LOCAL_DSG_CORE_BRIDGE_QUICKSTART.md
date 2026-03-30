# Local DSG Core Bridge Quickstart

## Goal

Run the customer-facing control-plane against the production-compatible DSG core bridge.

## Repositories

### Product shell
`tdealer01-crypto-dsg-control-plane`

### Core bridge
`DSG-Deterministic-Safety-Gate`

---

## 1. Run DSG core bridge

In `DSG-Deterministic-Safety-Gate`:

```bash
pip install -e ./dsg-core[dev]
uvicorn dsg.prod_main:app --host 0.0.0.0 --port 8000 --reload
```

This starts the production-compatible bridge app with:
- `POST /execute`
- `POST /evaluate`
- `GET /health`
- `GET /metrics`
- `GET /ledger`
- `GET /audit/events`
- `GET /audit/determinism/{sequence}`
- `GET /audit/determinism?sequence=...`
- `GET /ledger/verify`

---

## 2. Configure the control-plane

In `tdealer01-crypto-dsg-control-plane`, set:

```bash
DSG_CORE_URL=http://localhost:8000
```

Optional:

```bash
DSG_CORE_API_KEY=
DSG_API_KEY=
```

---

## 3. Run the control-plane

```bash
npm install
cp .env.example .env.local
npm run dev
```

Make sure `.env.local` includes:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
DSG_CORE_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
```

---

## 4. Verify health

### Core bridge
```bash
curl http://localhost:8000/health
```

### Product shell
```bash
curl http://localhost:3000/api/health
```

The control-plane health response should show `core_ok: true` once the bridge is reachable.

---

## 5. Verify agent -> execute loop

### Create an agent from control-plane
```bash
curl -X POST http://localhost:3000/api/agents \
  -H "Content-Type: application/json" \
  -d '{
    "name": "demo-agent",
    "policy_id": "policy_default",
    "monthly_limit": 10000
  }'
```

### Execute through control-plane
Use the API key returned from agent creation:

```bash
curl -X POST http://localhost:3000/api/execute \
  -H "Authorization: Bearer YOUR_AGENT_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "YOUR_AGENT_ID",
    "input": {
      "value": 10
    },
    "context": {
      "risk_score": 0.12,
      "trace_id": "demo-trace-001"
    }
  }'
```

Expected result:
- control-plane validates agent key
- control-plane calls DSG core bridge
- DSG core returns canonical decision payload
- control-plane persists execution, audit, and usage state

---

## 6. Verify audit and metrics

```bash
curl http://localhost:8000/metrics
curl http://localhost:8000/ledger
curl http://localhost:8000/audit/events
curl http://localhost:8000/audit/determinism/1
```

Then open the control-plane dashboard and audit pages.

---


## 7. Enable MCP tools that agents can call

Set `MCP_TOOL_REGISTRY_JSON` in `.env.local` with real tool endpoints:

```bash
MCP_TOOL_REGISTRY_JSON=[
  {
    "name":"ledger_verify",
    "description":"Verify DSG ledger chain",
    "endpoint":"http://localhost:8100/mcp/ledger/verify",
    "method":"POST",
    "timeout_ms":10000
  },
  {
    "name":"monitor_snapshot",
    "description":"Collect current monitor snapshot",
    "endpoint":"http://localhost:8100/mcp/monitor/snapshot",
    "method":"POST",
    "timeout_ms":8000
  }
]
```

List available tools for an agent:

```bash
curl "http://localhost:3000/api/mcp/tools?agent_id=YOUR_AGENT_ID" \
  -H "Authorization: Bearer YOUR_AGENT_KEY"
```

Execute a tool via control-plane:

```bash
curl -X POST http://localhost:3000/api/mcp/call \
  -H "Authorization: Bearer YOUR_AGENT_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "YOUR_AGENT_ID",
    "tool_name": "ledger_verify",
    "input": {"sequence": 42},
    "request_id": "mcp-demo-001"
  }'
```

Expected behavior:
- only active agent + valid bearer key can list/call tools
- tool name must exist in `MCP_TOOL_REGISTRY_JSON`
- each call is recorded into `usage_events` with `event_type = mcp_tool_call`

---


## Success condition

The local bridge setup is correct when:
1. `/api/health` shows DSG core online
2. agent creation works
3. `/api/execute` returns ALLOW, STABILIZE, or BLOCK from DSG core
4. usage updates in control-plane
5. audit data is visible in the dashboard
