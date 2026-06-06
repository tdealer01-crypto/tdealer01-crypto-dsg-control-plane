# DSG Stripe App - API Reference

**Version**: 1.0.0  
**Base URL**: `https://dsg-stripe-app.vercel.app` (production)  
**Auth**: Bearer token (OAuth)

---

## Table of Contents

1. [Authentication](#authentication)
2. [Base Routes](#base-routes)
3. [OAuth Flow](#oauth-flow)
4. [Gateway Evaluation](#gateway-evaluation)
5. [Webhooks](#webhooks)
6. [Policies](#policies)
7. [Audit Trail](#audit-trail)
8. [Error Handling](#error-handling)
9. [Rate Limiting](#rate-limiting)

---

## Authentication

### Bearer Token

All endpoints (except `/health` and webhook) require a Bearer token:

```http
Authorization: Bearer <token>
```

Token is obtained via OAuth flow or from DSG Control Plane.

### API Key (Server-to-Server)

For server-to-server requests, use API key header:

```http
X-API-Key: <dsg-api-key>
```

---

## Base Routes

### Health Check

```http
GET /api/health
```

**No authentication required**

Returns application health status.

**Response**:
```json
{
  "status": "healthy",
  "service": "dsg-stripe-app",
  "version": "1.0.0",
  "timestamp": "2025-06-06T12:00:00Z"
}
```

### Readiness Check

```http
GET /api/readiness
```

**No authentication required**

Returns whether app is ready to handle requests (DB, Redis, Stripe connected).

**Response**:
```json
{
  "ready": true,
  "checks": {
    "database": "ok",
    "cache": "ok",
    "stripe": "ok"
  }
}
```

---

## OAuth Flow

### 1. Authorize Endpoint

```http
GET /api/stripe-app/oauth/authorize
```

**Parameters**:
- `response_type` (required): `code`
- `client_id` (required): Your Stripe OAuth client ID
- `redirect_uri` (required): Must match configured URI
- `scope` (required): Space-separated permissions
- `state` (recommended): CSRF token

**Example**:
```http
GET /api/stripe-app/oauth/authorize?
  response_type=code&
  client_id=ca_xxxxx&
  redirect_uri=https://dsg-stripe-app.vercel.app/api/stripe-app/oauth/callback&
  scope=charge_read%20charge_write&
  state=random_state_value
```

### 2. Authorization Code Flow

User approves, you receive:

```http
GET https://your-app.com/callback?
  code=ac_xxxxx&
  state=random_state_value
```

### 3. Exchange Code for Token

```http
POST /api/stripe-app/oauth/token
Content-Type: application/json

{
  "grant_type": "authorization_code",
  "code": "ac_xxxxx",
  "client_id": "ca_xxxxx",
  "client_secret": "sk_test_xxxxx"
}
```

**Response**:
```json
{
  "access_token": "sk_live_xxxxx",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "rt_xxxxx",
  "scope": "charge_read charge_write"
}
```

### 4. Use Token

```http
GET /api/stripe-app/account
Authorization: Bearer sk_live_xxxxx
```

---

## Gateway Evaluation

### Evaluate Operation

```http
POST /api/stripe-app/gateway/evaluate
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "stripe_account_id": "acct_1Nj3WxCZEKhGw6Nx",
  "operation": {
    "type": "charge.create",
    "action": "charge_write"
  },
  "context": {
    "amount_cents": 10000,
    "currency": "usd",
    "customer_id": "cus_NnZaLvL8nP6Kak",
    "description": "Order #12345",
    "metadata": {
      "order_id": "12345",
      "customer_tier": "premium"
    }
  }
}
```

**Required Fields**:
- `stripe_account_id`: Stripe account (acct_xxx)
- `operation.type`: Operation type (charge.create, refund.create, etc.)
- `operation.action`: Permission scope needed
- `context.amount_cents`: Amount in cents
- `context.currency`: 3-letter currency code

**Optional Fields**:
- `context.customer_id`: Stripe customer ID
- `context.description`: Operation description
- `context.metadata`: Custom metadata dictionary

**Response** (ALLOW):
```json
{
  "decision": "ALLOW",
  "reason": "Operation within policy limits",
  "policy_id": "pol_123",
  "policy_version": 1,
  "proof": {
    "hash": "sha256_xxxxx",
    "timestamp": "2025-06-06T12:00:00Z",
    "decision_id": "dec_xxxxx"
  }
}
```

**Response** (REVIEW):
```json
{
  "decision": "REVIEW",
  "reason": "High-value operation requires manual approval",
  "policy_id": "pol_456",
  "policy_version": 2,
  "pending_review_id": "rev_xxxxx",
  "proof": {
    "hash": "sha256_xxxxx",
    "timestamp": "2025-06-06T12:00:00Z",
    "decision_id": "dec_xxxxx"
  }
}
```

**Response** (BLOCK):
```json
{
  "decision": "BLOCK",
  "reason": "Policy blocks operations of this type",
  "policy_id": "pol_789",
  "policy_version": 1,
  "proof": {
    "hash": "sha256_xxxxx",
    "timestamp": "2025-06-06T12:00:00Z",
    "decision_id": "dec_xxxxx"
  }
}
```

### Decision Types

| Decision | Meaning | Next Step |
|----------|---------|-----------|
| `ALLOW` | Operation approved | Proceed with execution |
| `REVIEW` | Requires manual approval | Route to approver, wait for decision |
| `BLOCK` | Operation denied | Reject operation, notify user |

---

## Webhooks

### Webhook Events Endpoint

```http
POST /api/stripe-app/webhook/events
Content-Type: application/json
Stripe-Signature: t=timestamp,v1=signature
```

**Stripe Signature Validation**: Required

The `Stripe-Signature` header contains:
- `t`: Timestamp (Unix seconds)
- `v1`: HMAC-SHA256 signature

Signature is computed using the webhook secret.

### Supported Events

- `charge.succeeded`
- `charge.failed`
- `charge.dispute.created`
- `charge.refunded`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `payout.created`
- `payout.failed`
- `refund.created`

### Event Payload

```json
{
  "id": "evt_1234567890",
  "object": "event",
  "api_version": "2020-08-27",
  "created": 1234567890,
  "data": {
    "object": {
      "id": "ch_1234567890",
      "object": "charge",
      "amount": 10000,
      "currency": "usd",
      "status": "succeeded"
    }
  },
  "livemode": true,
  "pending_webhooks": 1,
  "request": {
    "id": null,
    "idempotency_key": null
  },
  "type": "charge.succeeded"
}
```

### Webhook Handler Response

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "received": true,
  "event_id": "evt_1234567890"
}
```

Webhook handler:
1. Validates Stripe signature
2. Extracts event type and data
3. Evaluates against policies
4. Records decision in audit trail
5. Updates Stripe object state (if applicable)
6. Returns 200 OK

---

## Policies

### List Policies

```http
GET /api/stripe-app/policies
Authorization: Bearer <token>
```

**Query Parameters**:
- `stripe_account_id` (required): Account to list policies for
- `status` (optional): active | inactive | all (default: active)
- `limit` (optional): Max results (default: 50, max: 100)
- `offset` (optional): Pagination offset (default: 0)

**Response**:
```json
{
  "policies": [
    {
      "id": "pol_123",
      "name": "High-Value Review",
      "description": "Charges over $5000 require review",
      "type": "amount_threshold",
      "rule": {
        "operator": "greater_than",
        "field": "amount_cents",
        "value": 500000
      },
      "action": "review",
      "priority": 1,
      "version": 1,
      "enabled": true,
      "created_at": "2025-06-01T10:00:00Z",
      "updated_at": "2025-06-01T10:00:00Z"
    }
  ],
  "count": 5,
  "limit": 50,
  "offset": 0
}
```

### Get Policy Details

```http
GET /api/stripe-app/policies/{policy_id}
Authorization: Bearer <token>
```

**Response**:
```json
{
  "id": "pol_123",
  "name": "High-Value Review",
  "description": "Charges over $5000 require review",
  "type": "amount_threshold",
  "rule": {
    "operator": "greater_than",
    "field": "amount_cents",
    "value": 500000
  },
  "action": "review",
  "priority": 1,
  "version": 1,
  "enabled": true,
  "stripe_account_id": "acct_1Nj3WxCZEKhGw6Nx",
  "created_by": "user_123",
  "created_at": "2025-06-01T10:00:00Z",
  "updated_at": "2025-06-01T10:00:00Z"
}
```

### Create Policy

```http
POST /api/stripe-app/policies
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "stripe_account_id": "acct_1Nj3WxCZEKhGw6Nx",
  "name": "High-Value Review",
  "description": "Charges over $5000 require review",
  "type": "amount_threshold",
  "rule": {
    "operator": "greater_than",
    "field": "amount_cents",
    "value": 500000
  },
  "action": "review",
  "priority": 1
}
```

**Response** (201 Created):
```json
{
  "id": "pol_123",
  "name": "High-Value Review",
  "version": 1,
  "created_at": "2025-06-06T12:00:00Z"
}
```

### Update Policy

```http
PUT /api/stripe-app/policies/{policy_id}
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body**: Same as Create (any field can be updated)

**Response**:
```json
{
  "id": "pol_123",
  "version": 2,
  "updated_at": "2025-06-06T12:30:00Z"
}
```

**Note**: Update increments policy version, which invalidates cached decisions.

### Delete Policy

```http
DELETE /api/stripe-app/policies/{policy_id}
Authorization: Bearer <token>
```

**Response** (204 No Content)

Policy is soft-deleted (disabled, not removed from audit trail).

---

## Audit Trail

### List Operations

```http
GET /api/stripe-app/audit/operations
Authorization: Bearer <token>
```

**Query Parameters**:
- `stripe_account_id` (required): Account to query
- `start_date` (optional): ISO 8601 date (default: 7 days ago)
- `end_date` (optional): ISO 8601 date (default: now)
- `decision` (optional): ALLOW | REVIEW | BLOCK (default: all)
- `limit` (optional): Max results (default: 50, max: 100)
- `offset` (optional): Pagination offset (default: 0)

**Example**:
```http
GET /api/stripe-app/audit/operations?
  stripe_account_id=acct_1Nj3WxCZEKhGw6Nx&
  decision=REVIEW&
  limit=25
```

**Response**:
```json
{
  "operations": [
    {
      "id": "op_123",
      "stripe_account_id": "acct_1Nj3WxCZEKhGw6Nx",
      "operation_type": "charge.create",
      "context": {
        "amount_cents": 10000,
        "currency": "usd",
        "customer_id": "cus_NnZaLvL8nP6Kak"
      },
      "decision": "REVIEW",
      "reason": "High-value operation requires approval",
      "policy_id": "pol_456",
      "policy_version": 2,
      "proof_hash": "sha256_xxxxx",
      "decision_id": "dec_xxxxx",
      "status": "pending",
      "created_at": "2025-06-06T12:00:00Z"
    }
  ],
  "count": 150,
  "limit": 50,
  "offset": 0
}
```

### Get Operation Details

```http
GET /api/stripe-app/audit/operations/{operation_id}
Authorization: Bearer <token>
```

**Response**:
```json
{
  "id": "op_123",
  "stripe_account_id": "acct_1Nj3WxCZEKhGw6Nx",
  "operation_type": "charge.create",
  "context": {
    "amount_cents": 10000,
    "currency": "usd",
    "customer_id": "cus_NnZaLvL8nP6Kak",
    "description": "Order #12345"
  },
  "decision": "REVIEW",
  "reason": "High-value operation requires approval",
  "policy_id": "pol_456",
  "policy_version": 2,
  "proof": {
    "hash": "sha256_xxxxx",
    "timestamp": "2025-06-06T12:00:00Z",
    "decision_id": "dec_xxxxx"
  },
  "status": "pending",
  "pending_review_id": "rev_xxxxx",
  "created_at": "2025-06-06T12:00:00Z",
  "resolved_at": null
}
```

### Resolve Review

```http
POST /api/stripe-app/audit/operations/{operation_id}/resolve
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "decision": "approved",
  "reason": "Approved by manager"
}
```

**Response**:
```json
{
  "id": "op_123",
  "status": "approved",
  "resolved_at": "2025-06-06T12:30:00Z",
  "resolved_by": "user_456"
}
```

---

## Error Handling

### Error Response Format

```json
{
  "error": "INVALID_REQUEST",
  "message": "Missing required field: stripe_account_id",
  "code": 400,
  "details": {
    "field": "stripe_account_id",
    "reason": "required"
  }
}
```

### Error Codes

| Code | Error | Meaning |
|------|-------|---------|
| 400 | INVALID_REQUEST | Missing or invalid parameters |
| 401 | UNAUTHORIZED | Missing or invalid authentication |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Resource not found |
| 409 | CONFLICT | Resource already exists or version conflict |
| 429 | RATE_LIMITED | Too many requests |
| 500 | INTERNAL_ERROR | Server error |
| 503 | SERVICE_UNAVAILABLE | Service temporarily unavailable |

### Retry Logic

- 4xx errors: Do not retry (fix the request)
- 5xx errors: Retry with exponential backoff (max 3 retries)
- 429 errors: Respect `Retry-After` header

---

## Rate Limiting

### Rate Limit Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1623004200
```

### Limits

| Endpoint | Limit |
|----------|-------|
| Gateway Evaluation | 1000/min per account |
| Policy CRUD | 100/min per account |
| Audit Trail | 100/min per account |
| Webhooks | Unlimited |

### Backoff Example

```javascript
async function evaluateWithRetry(request, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch('/api/stripe-app/gateway/evaluate', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(request)
      });

      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
        await sleep(retryAfter * 1000);
        continue;
      }

      return response;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(Math.pow(2, i) * 1000);
    }
  }
}
```

---

## Common Use Cases

### Use Case 1: Pre-Charge Validation

```javascript
const response = await fetch('/api/stripe-app/gateway/evaluate', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    stripe_account_id: 'acct_xxx',
    operation: {
      type: 'charge.create',
      action: 'charge_write'
    },
    context: {
      amount_cents: 10000,
      currency: 'usd',
      customer_id: 'cus_xxx'
    }
  })
});

const { decision, reason, proof } = await response.json();

if (decision === 'ALLOW') {
  // Proceed with charge creation
} else if (decision === 'REVIEW') {
  // Route to approval queue
} else {
  // Block charge, notify customer
}
```

### Use Case 2: Monitor High-Risk Operations

```javascript
const response = await fetch(
  '/api/stripe-app/audit/operations?decision=REVIEW',
  {
    headers: { 'Authorization': `Bearer ${token}` }
  }
);

const { operations } = await response.json();

// Send alert for each pending review
for (const op of operations) {
  if (op.status === 'pending') {
    sendAlert(`High-risk operation pending: ${op.id}`);
  }
}
```

---

## Support

- **Documentation**: See SETUP.md and ARCHITECTURE.md
- **Issues**: Email t.dealer01@dsg.pics
- **Status Page**: https://status.dsg.pics

---

**Version**: 1.0.0  
**Last Updated**: 2025-06-06  
**API Stability**: Stable
