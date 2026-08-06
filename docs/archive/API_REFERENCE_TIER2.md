# Tier 2 API Reference — Admin Approval Dashboard + Readiness Gate

**Version:** 1.0.0  
**Last Updated:** 2026-06-04

---

## Base URL

```
https://tdealer01-crypto-dsg-control-plane.vercel.app/api
```

---

## Authentication

All endpoints require authentication via Bearer token (OAuth2):

```http
Authorization: Bearer <token>
```

In production, tokens are issued by Supabase/Auth0 and validated via middleware.

---

## Approval Queue Endpoints

### POST /approval-queue/request

Create a new approval request for agent action.

**Request:**

```http
POST /approval-queue/request HTTP/1.1
Content-Type: application/json
Authorization: Bearer <token>

{
  "agentId": "claude-code-01",
  "orgId": "550e8400-e29b-41d4-a716-446655440000",
  "action": "Deploy to production environment",
  "input": {
    "environment": "prod",
    "region": "us-east-1"
  },
  "expiresInHours": 24,
  "priority": "high"
}
```

**Request Fields:**

| Field | Type | Required | Constraints |
|-------|------|----------|-----------|
| agentId | string | Yes | 2-255 characters |
| orgId | UUID | Yes | Valid UUID format |
| action | string | Yes | 5-500 characters |
| input | object | No | JSON object (any structure) |
| expiresInHours | number | No | 1-720 hours, default: 24 |
| priority | string | No | "low" \| "medium" \| "high", default: "medium" |

**Response (201):**

```json
{
  "success": true,
  "data": {
    "requestId": "areq_1717502400000_a1b2c3d4e",
    "agentId": "claude-code-01",
    "action": "Deploy to production environment",
    "status": "pending",
    "priority": "high",
    "expiresAt": "2026-06-05T12:00:00.000Z",
    "createdAt": "2026-06-04T12:00:00.000Z",
    "timeoutInHours": 24
  }
}
```

**Error Responses:**

| Status | Code | Example |
|--------|------|---------|
| 400 | INVALID_JSON | Request body is not valid JSON |
| 400 | VALIDATION_ERROR | See `details` array for specific field errors |
| 429 | RATE_LIMITED | Too many requests (free tier: 100/mo, pro: unlimited) |
| 500 | INTERNAL_ERROR | Unexpected server error |

**Validation Errors Example:**

```json
{
  "error": "Request validation failed",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "field": "orgId",
      "message": "orgId must be a valid UUID"
    },
    {
      "field": "action",
      "message": "action must be between 5 and 500 characters"
    }
  ]
}
```

---

### GET /approval-queue/pending

Fetch pending approval requests with filtering and pagination.

**Request:**

```http
GET /approval-queue/pending?status=pending&agentId=claude-code-01&offset=0&limit=25 HTTP/1.1
Authorization: Bearer <token>
```

**Query Parameters:**

| Parameter | Type | Default | Constraints |
|-----------|------|---------|-----------|
| status | string | all | "pending" \| "approved" \| "rejected" \| "all" |
| agentId | string | - | Filter by agent |
| priority | string | - | "low" \| "medium" \| "high" |
| offset | number | 0 | 0-10000 |
| limit | number | 25 | 1-100 |

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "requestId": "areq_1717502400000_a1b2c3d4e",
      "agentId": "claude-code-01",
      "orgId": "550e8400-e29b-41d4-a716-446655440000",
      "action": "Deploy to production environment",
      "status": "pending",
      "priority": "high",
      "expiresAt": "2026-06-05T12:00:00.000Z",
      "createdAt": "2026-06-04T12:00:00.000Z",
      "approvalDeadlineInMinutes": 1440
    }
  ],
  "pagination": {
    "offset": 0,
    "limit": 25,
    "total": 5,
    "pages": 1
  }
}
```

**Error Responses:**

| Status | Code |
|--------|------|
| 400 | VALIDATION_ERROR (invalid pagination params) |
| 401 | UNAUTHORIZED (invalid token) |
| 500 | INTERNAL_ERROR |

---

### PATCH /approval-queue/{id}

Approve or reject an approval request.

**Request:**

```http
PATCH /approval-queue/areq_1717502400000_a1b2c3d4e HTTP/1.1
Content-Type: application/json
Authorization: Bearer <token>

{
  "decision": "approved",
  "reason": "Looks good, all checks passed"
}
```

**Request Fields:**

| Field | Type | Required | Constraints |
|-------|------|----------|-----------|
| decision | string | Yes | "approved" \| "rejected" |
| reason | string | No | Max 1000 characters |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "requestId": "areq_1717502400000_a1b2c3d4e",
    "decision": "approved",
    "reason": "Looks good, all checks passed",
    "status": "approved",
    "decisionAt": "2026-06-04T12:15:00.000Z"
  }
}
```

**Error Responses:**

| Status | Code | Notes |
|--------|------|-------|
| 400 | INVALID_ID | Request ID format invalid or not found |
| 400 | VALIDATION_ERROR | Decision or reason invalid |
| 401 | UNAUTHORIZED | Token invalid or insufficient permissions |
| 404 | NOT_FOUND | Request does not exist |
| 409 | ALREADY_DECIDED | Request already approved/rejected |
| 500 | INTERNAL_ERROR | Unexpected error |

---

## Readiness Gate Endpoints

### POST /readiness/check

Run readiness checks for a repository.

**Request:**

```http
POST /readiness/check HTTP/1.1
Content-Type: application/json
Authorization: Bearer <token>

{
  "repoUrl": "https://github.com/myorg/myrepo",
  "coveragePercent": 82,
  "approvalCount": 1
}
```

**Request Fields:**

| Field | Type | Required | Constraints |
|-------|------|----------|-----------|
| repoUrl | string | Yes | Valid HTTP/HTTPS URL |
| coveragePercent | number | No | 0-100, default: 82 |
| approvalCount | number | No | 0-20, default: 1 |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "overallStatus": "review_required",
    "checks": [
      {
        "type": "ci_status",
        "status": "pass",
        "message": "All GitHub Actions workflows passed",
        "details": {
          "latestWorkflow": "test.yml",
          "status": "completed",
          "duration": 245
        },
        "blocksDeployment": false
      },
      {
        "type": "coverage",
        "status": "review_required",
        "message": "Test coverage 82% below minimum (90%)",
        "details": {
          "currentCoverage": 82,
          "minimumRequired": 90,
          "uncoveredLines": 900,
          "trend": "increasing"
        },
        "blocksDeployment": false
      },
      {
        "type": "reviews",
        "status": "review_required",
        "message": "PR needs 1 more approval(s)",
        "details": {
          "currentApprovals": 1,
          "requiredApprovals": 2,
          "reviewers": ["alice@company.com"],
          "commentCount": 4
        },
        "blocksDeployment": false
      }
    ],
    "timestamp": "2026-06-04T12:00:00.000Z",
    "blockerCount": 0,
    "reviewCount": 2,
    "passCount": 1
  },
  "metadata": {
    "repoUrl": "https://github.com/myorg/myrepo",
    "checkedAt": "2026-06-04T12:00:00.000Z",
    "evaluationDurationMs": 245,
    "nextCheckRecommendedAt": "2026-06-04T13:00:00.000Z",
    "config": {
      "minTestCoveragePercent": 90,
      "requireNApprovals": 2,
      "blockOnSecrets": true,
      "blockOnFailedCI": true
    }
  }
}
```

**Overall Status Values:**

- **ready** — All checks passed, safe to deploy
- **review_required** — Some checks need attention, but don't block deployment
- **blocked** — One or more blocking checks failed, deployment prevented

**Check Types:**

| Type | Triggered By | Blocks Deploy? |
|------|--------------|----------------|
| ci_status | GitHub Actions workflow failure | Yes (if blockOnFailedCI=true) |
| migrations | Pending database migrations | No (review only) |
| secrets | Hardcoded credentials detected | Yes (if blockOnSecrets=true) |
| coverage | Test coverage below threshold | No (review only) |
| reviews | Insufficient code approvals | No (review only) |

**Error Responses:**

| Status | Code | Notes |
|--------|------|-------|
| 400 | INVALID_JSON | Request body is not valid JSON |
| 400 | VALIDATION_ERROR | See `details` for specific field errors |
| 401 | UNAUTHORIZED | Token invalid |
| 500 | EVALUATION_ERROR | Check evaluation failed |

---

### GET /readiness/config

Fetch current readiness configuration for your organization.

**Request:**

```http
GET /readiness/config HTTP/1.1
Authorization: Bearer <token>
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "minTestCoveragePercent": 80,
    "requireNApprovals": 2,
    "blockOnSecrets": true,
    "blockOnFailedCI": true,
    "autoMergeOnPass": false
  },
  "orgId": "550e8400-e29b-41d4-a716-446655440000",
  "createdAt": "2026-05-27T12:00:00.000Z",
  "updatedAt": "2026-06-04T12:00:00.000Z"
}
```

**Error Responses:**

| Status | Code |
|--------|------|
| 401 | UNAUTHORIZED |
| 500 | FETCH_ERROR |

---

### PATCH /readiness/config

Update readiness configuration (all fields optional).

**Request:**

```http
PATCH /readiness/config HTTP/1.1
Content-Type: application/json
Authorization: Bearer <token>

{
  "minTestCoveragePercent": 90,
  "requireNApprovals": 3,
  "blockOnSecrets": true,
  "blockOnFailedCI": true,
  "autoMergeOnPass": true
}
```

**Request Fields (All Optional):**

| Field | Type | Constraints |
|-------|------|-----------|
| minTestCoveragePercent | number | 0-100, must be integer |
| requireNApprovals | number | 1-10, must be integer |
| blockOnSecrets | boolean | true or false |
| blockOnFailedCI | boolean | true or false |
| autoMergeOnPass | boolean | true or false |

**Response (200):**

```json
{
  "success": true,
  "data": {
    "minTestCoveragePercent": 90,
    "requireNApprovals": 3,
    "blockOnSecrets": true,
    "blockOnFailedCI": true,
    "autoMergeOnPass": true
  },
  "message": "Readiness configuration updated successfully",
  "changedFields": [
    "minTestCoveragePercent",
    "requireNApprovals",
    "autoMergeOnPass"
  ],
  "updatedAt": "2026-06-04T12:30:00.000Z"
}
```

**Error Responses:**

| Status | Code | Notes |
|--------|------|-------|
| 400 | INVALID_JSON | Request body not valid JSON |
| 400 | VALIDATION_ERROR | See `details` for field-specific errors |
| 401 | UNAUTHORIZED | Token invalid or insufficient permissions |
| 500 | INTERNAL_ERROR | Unexpected error |

---

### GET /readiness/history

Fetch audit trail of readiness checks.

**Request:**

```http
GET /readiness/history?checkType=coverage&days=7&limit=50&offset=0 HTTP/1.1
Authorization: Bearer <token>
```

**Query Parameters:**

| Parameter | Type | Default | Constraints |
|-----------|------|---------|-----------|
| checkType | string | all | "ci_status" \| "migrations" \| "secrets" \| "coverage" \| "reviews" \| "all" |
| days | number | 7 | 1-365 |
| limit | number | 50 | 1-100 |
| offset | number | 0 | 0-10000 |

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "checkType": "coverage",
      "status": "pass",
      "message": "Coverage 84% exceeds minimum 80%",
      "timestamp": "2026-06-04T12:00:00.000Z",
      "details": {
        "coverage": 84,
        "minimum": 80
      }
    }
  ],
  "pagination": {
    "offset": 0,
    "limit": 50,
    "total": 5,
    "pages": 1
  },
  "filters": {
    "days": 7,
    "checkType": "coverage"
  }
}
```

**Error Responses:**

| Status | Code |
|--------|------|
| 400 | VALIDATION_ERROR |
| 401 | UNAUTHORIZED |
| 500 | INTERNAL_ERROR |

---

## Error Codes

### Global Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| INVALID_JSON | 400 | Request body is not valid JSON |
| VALIDATION_ERROR | 400 | One or more fields failed validation |
| INVALID_ID | 400 | Resource ID format is invalid |
| UNAUTHORIZED | 401 | Token is missing, invalid, or expired |
| NOT_FOUND | 404 | Resource does not exist |
| ALREADY_DECIDED | 409 | Resource is in a conflicting state |
| RATE_LIMITED | 429 | Too many requests (quota exceeded) |
| INTERNAL_ERROR | 500 | Unexpected server error |

### Approval-Specific Errors

| Code | HTTP | Description |
|------|------|-------------|
| REQUEST_NOT_FOUND | 404 | Approval request does not exist |
| ALREADY_APPROVED | 409 | Approval already processed |
| EXPIRED | 410 | Approval request has expired |

### Readiness-Specific Errors

| Code | HTTP | Description |
|------|------|-------------|
| EVALUATION_ERROR | 500 | Check evaluation failed |
| CONFIG_NOT_FOUND | 404 | Organization configuration not found |
| INVALID_REPO_URL | 400 | Repository URL is malformed or unreachable |

---

## Rate Limits

| Tier | Requests/Min | Requests/Day | Requests/Month |
|------|--------------|--------------|-----------------|
| Freemium | 100 | 2,400 | 10 approval requests, 5 checks |
| Pro | 1,000 | 50,000 | Unlimited |
| Enterprise | Custom | Custom | Custom |

Response includes rate limit headers:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1717502460
```

When rate limited:

```json
{
  "error": "Rate limit exceeded",
  "code": "RATE_LIMITED",
  "retryAfter": 60
}
```

---

## Request/Response Best Practices

### Pagination

- Always provide `offset` and `limit` for list endpoints
- Default `limit=25`, maximum `limit=100`
- Use `pagination.pages` to know total number of pages
- Results are sorted by creation date (newest first)

### Idempotency

- All POST requests are idempotent by design
- Approval requests have unique `requestId` values
- Readiness checks can be re-run for the same repo without side effects

### Timestamps

- All timestamps are ISO 8601 UTC format: `2026-06-04T12:00:00.000Z`
- Use `createdAt` and `updatedAt` to track audit trail
- Calculate `expiresAt` = `createdAt` + `expiresInHours`

---

## Example Workflows

### Complete Approval Workflow

```bash
# 1. Create approval request
curl -X POST https://api.dsg/approval-queue/request \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "claude-code",
    "orgId": "org-123",
    "action": "Deploy to prod",
    "priority": "high"
  }'
# Returns: { "requestId": "areq_..." }

# 2. Check pending approvals
curl https://api.dsg/approval-queue/pending \
  -H "Authorization: Bearer token"

# 3. Approve
curl -X PATCH https://api.dsg/approval-queue/areq_... \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{ "decision": "approved", "reason": "Looks good" }'
```

### Complete Readiness Check Workflow

```bash
# 1. Get current config
curl https://api.dsg/readiness/config \
  -H "Authorization: Bearer token"

# 2. Update config (raise coverage requirement)
curl -X PATCH https://api.dsg/readiness/config \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{ "minTestCoveragePercent": 90 }'

# 3. Run readiness check
curl -X POST https://api.dsg/readiness/check \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{
    "repoUrl": "https://github.com/org/repo",
    "coveragePercent": 85
  }'
# Returns: { "overallStatus": "review_required", "checks": [...] }

# 4. View check history
curl 'https://api.dsg/readiness/history?days=7&limit=10' \
  -H "Authorization: Bearer token"
```

---

## Monitoring & Observability

Each endpoint logs:
- Request ID (unique identifier)
- Client IP address
- Processing duration (ms)
- Error stack trace (on failure)

Example log entry:

```json
{
  "timestamp": "2026-06-04T12:00:00.000Z",
  "endpoint": "/approval-queue/request",
  "method": "POST",
  "clientIp": "203.0.113.42",
  "duration": 245,
  "statusCode": 201,
  "requestId": "areq_1717502400000_a1b2c3d4e"
}
```

---

**Last Updated:** 2026-06-04  
**API Version:** 1.0.0  
**Status:** Production Ready
