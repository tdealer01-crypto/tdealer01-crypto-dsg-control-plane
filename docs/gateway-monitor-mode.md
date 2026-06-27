# Gateway Monitor Mode

Monitor Mode lets DSG govern tool execution without taking custody of the customer's API keys.

## Flow

```text
Customer agent/tool runtime
→ POST /api/gateway/plan-check
→ DSG returns decision, audit token, request hash, constraints
→ Customer executes its own tool
→ Customer commits result to /api/gateway/audit/commit
→ DSG records final record hash and evidence event
```

## APIs

### Plan check

```http
POST /api/gateway/plan-check
```

Required headers:

```http
x-org-id: org-smoke
x-actor-id: agent-001
x-actor-role: agent_operator
x-org-plan: enterprise
```

Body:

```json
{
  "toolName": "custom_http.customer_webhook",
  "action": "post",
  "planId": "PLAN-MONITOR-001",
  "input": {
    "message": "Customer runtime will execute this after DSG allow"
  }
}
```

Expected allow response:

```json
{
  "ok": true,
  "decision": "allow",
  "mode": "monitor",
  "auditToken": "gat_...",
  "requestHash": "...",
  "decisionHash": "...",
  "recordHash": "...",
  "constraints": {
    "expiresInSeconds": 300,
    "allowedTool": "custom_http.customer_webhook",
    "allowedAction": "post",
    "decision": "allow"
  }
}
```

### Audit commit

```http
POST /api/gateway/audit/commit
```

Body:

```json
{
  "auditToken": "gat_...",
  "result": {
    "ok": true,
    "provider": "customer_runtime",
    "target": "customer.tool",
    "messageId": "msg_123"
  }
}
```

Expected response:

```json
{
  "ok": true,
  "committed": true,
  "recordHash": "..."
}
```

### Events

```http
GET /api/gateway/audit/events?orgId=org-smoke
```

### Export

```http
GET /api/gateway/audit/export?orgId=org-smoke
```

## UI

```text
/gateway/monitor?orgId=org-smoke
```

The UI shows:

- latest plan checks
- decision history
- actor/tool/risk/status
- request hash
- record hash
- audit JSON download link
- runtime settings snippets

## Product use

Use Monitor Mode when the customer wants governance without giving DSG direct access to production APIs.

Use Gateway Mode when DSG should execute a connector directly.
