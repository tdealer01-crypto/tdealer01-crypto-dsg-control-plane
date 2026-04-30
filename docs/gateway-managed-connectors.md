# Gateway Managed Connectors

Phase 1 avoids Zapier paid-plan dependency by letting each customer register a custom HTTP webhook or REST endpoint directly inside DSG.

## Product decision

Zapier remains a future provider path.

The immediate product path is DSG-managed connector registration:

```text
Customer endpoint / webhook
→ registered in DSG Connector Registry
→ mapped to a DSG tool name
→ governed by policy / risk / approval
→ executed by /api/gateway/tools/execute
→ proof hashes returned
```

## Register connector

```http
POST /api/gateway/connectors
```

Required headers:

```http
x-org-id: <org-id>
x-actor-id: <actor-id>
x-actor-role: admin
```

Body:

```json
{
  "name": "Customer webhook",
  "endpointUrl": "https://customer.example.com/dsg/webhook",
  "toolName": "custom_http.customer_webhook",
  "action": "post",
  "risk": "medium",
  "requiresApproval": false,
  "description": "Customer-managed webhook receiver"
}
```

## Execute connector

```http
POST /api/gateway/tools/execute
```

Example:

```bash
curl -i -X POST "https://<host>/api/gateway/tools/execute" \
  -H "content-type: application/json" \
  -H "x-org-id: org-smoke" \
  -H "x-actor-id: agent-001" \
  -H "x-actor-role: agent_operator" \
  -H "x-org-plan: enterprise" \
  -d '{
    "toolName": "custom_http.customer_webhook",
    "action": "post",
    "planId": "PLAN-001",
    "input": {
      "message": "DSG governed connector execution"
    }
  }'
```

## Database tables

```text
gateway_connectors
gateway_tools
```

`gateway_connectors` stores the customer-managed endpoint.

`gateway_tools` maps a DSG tool name to that connector.

## Safety posture

- No Zapier paid plan required
- Customer controls their endpoint
- DSG checks role, plan, risk, and approval before execution
- High-risk or critical tools can require `x-approval-token`
- DSG returns `requestHash` and `recordHash`
- Provider calls fail closed if endpoint is missing or returns an error

## Phase 2

Zapier OAuth / embedded setup can be added later as a provider-specific install flow.

Do not block the Phase 1 product on Zapier paid-plan requirements.
