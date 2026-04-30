# Gateway Tool Execution API

This API is the production entry point for DSG-governed connector execution.

It is designed for real provider calls, starting with Zapier webhooks, while failing closed when policy, risk, approval, or provider configuration is missing.

## Endpoint

```http
POST /api/gateway/tools/execute
```

## Required headers

```http
x-org-id: <organization-id>
x-actor-id: <user-or-agent-id>
x-actor-role: agent_operator
x-org-plan: enterprise
```

For approved high-risk or critical tools:

```http
x-approval-token: <approval-token>
```

The same values can also be provided in the JSON body, but headers are preferred for runtime gateway calls.

## Request body

```json
{
  "toolName": "zapier.gmail.send_email",
  "action": "send_email",
  "planId": "PLAN-123",
  "input": {
    "to": "customer@example.com",
    "subject": "Approved message",
    "body": "Message generated after DSG approval."
  }
}
```

## Production behavior

The gateway performs these steps:

```text
normalize request
→ find tool registry entry
→ evaluate org/actor/plan/risk policy
→ require approval token for high-risk/critical tools
→ execute provider only if allowed
→ return provider result
→ return requestHash and recordHash
```

## Zapier provider configuration

The Zapier provider uses a fail-closed env lookup.

Per-tool env key:

```text
ZAPIER_WEBHOOK_ZAPIER_GMAIL_SEND_EMAIL
ZAPIER_WEBHOOK_ZAPIER_SLACK_POST_MESSAGE
ZAPIER_WEBHOOK_ZAPIER_HUBSPOT_UPDATE_DEAL
```

Fallback env key:

```text
ZAPIER_WEBHOOK_URL
```

If no webhook URL is configured, the request does not execute and returns `provider_not_configured`.

## Example: real Zapier Gmail execution

```bash
curl -i -X POST "https://<host>/api/gateway/tools/execute" \
  -H "content-type: application/json" \
  -H "x-org-id: org-smoke" \
  -H "x-actor-id: agent-001" \
  -H "x-actor-role: agent_operator" \
  -H "x-org-plan: enterprise" \
  -H "x-approval-token: APPROVED-001" \
  -d '{
    "toolName": "zapier.gmail.send_email",
    "action": "send_email",
    "planId": "PLAN-001",
    "input": {
      "to": "customer@example.com",
      "subject": "Approved DSG message",
      "body": "This action passed DSG governance before Zapier execution."
    }
  }'
```

Expected allowed response shape:

```json
{
  "ok": true,
  "decision": "allow",
  "providerResult": {
    "ok": true,
    "provider": "zapier",
    "toolName": "zapier.gmail.send_email",
    "action": "send_email"
  },
  "audit": {
    "committed": true,
    "requestHash": "...",
    "recordHash": "..."
  }
}
```

## Example: high-risk tool without approval

```bash
curl -i -X POST "https://<host>/api/gateway/tools/execute" \
  -H "content-type: application/json" \
  -H "x-org-id: org-smoke" \
  -H "x-actor-id: agent-001" \
  -H "x-actor-role: agent_operator" \
  -H "x-org-plan: enterprise" \
  -d '{
    "toolName": "zapier.gmail.send_email",
    "action": "send_email",
    "input": {"to":"customer@example.com"}
  }'
```

Expected result:

```json
{
  "ok": false,
  "decision": "review",
  "reason": "approval_required"
}
```

## Smoke-only tool

`mock.safe.echo` exists only for zero-risk gateway smoke tests. It should not be treated as a product connector.

Production connector paths should use `zapier.*`, `custom_http.*`, or future DB-backed tool registry entries.
