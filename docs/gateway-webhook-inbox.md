# Gateway Webhook Inbox

`POST /api/gateway/webhook/inbox` is an internal smoke receiver and customer webhook template.

It exists so DSG managed connector execution can be tested end-to-end without depending on Zapier paid Webhooks or a third-party endpoint.

## Endpoint

```http
POST /api/gateway/webhook/inbox
```

## Behavior

The endpoint accepts JSON POST payloads and returns:

- `ok: true`
- `service: gateway-webhook-inbox`
- sanitized DSG headers
- echoed payload
- `receivedAt` timestamp

## Smoke flow

Register this endpoint as a custom HTTP connector:

```text
https://<host>/api/gateway/webhook/inbox
```

Then execute through:

```http
POST /api/gateway/tools/execute
```

Expected result:

```text
Gateway policy passes
→ custom_http provider POSTs to inbox
→ inbox returns HTTP 200
→ gateway returns ok:true
→ requestHash and recordHash are returned
```

## Purpose

This endpoint is not a replacement for customer infrastructure.

It is a production-safe receiver for:

- smoke testing DSG managed connectors
- documenting payload format
- proving POST execution path
- giving customers a template for their own webhook endpoint
