# 📚 API Reference

Complete DSG Control Plane API documentation with examples.

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Public APIs](#public-apis)
4. [Dashboard APIs](#dashboard-apis)
5. [DSG Core APIs](#dsg-core-apis)
6. [Response Formats](#response-formats)
7. [Error Handling](#error-handling)

---

## Overview

**Base URL**: `https://tdealer01-crypto-dsg-control-plane.vercel.app`

**API Versions**:
- v1 (current)
- All routes under `/api/*`

**Rate Limits**:
- Public endpoints: 10 requests/minute per IP
- Authenticated endpoints: 100 requests/minute
- DSG gates: 1000 requests/minute

**Timeouts**:
- Standard requests: 30 seconds
- Long-running operations: 120 seconds

---

## Authentication

### API Keys

Some endpoints require Anthropic API key header:

```bash
curl -H "Authorization: Bearer sk-ant-..." \
  https://tdealer01-crypto-dsg-control-plane.vercel.app/api/agent/status
```

### Session Tokens

Dashboard endpoints use session cookies:

```bash
# Cookies automatically sent by browser
# For CLI: Include cookies manually
curl -b "cookie.txt" https://tdealer01-crypto-dsg-control-plane.vercel.app/api/dashboard/trinity/chat
```

### No Authentication

Public endpoints (marked with 🔓) don't require auth:

```bash
curl https://tdealer01-crypto-dsg-control-plane.vercel.app/api/public/test/arbiter-validation \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"minArbiterCount": 2, "actualArbiterCount": 3}'
```

---

## Public APIs

### 🔓 Health Check

**Endpoint**: `GET /api/agent/status`

**Description**: Check production health

**Response**:
```json
{
  "ok": true,
  "repo": "dsg-control-plane",
  "version": "27ae64216ccbd1fa80d9ae04b71c68c0cb1fe8b0",
  "commit": "27ae64216ccbd1fa80d9ae04b71c68c0cb1fe8b0",
  "env": "production",
  "ts": "2026-07-18T06:10:30.684Z",
  "checks": {
    "db": true
  }
}
```

**Curl**:
```bash
curl https://tdealer01-crypto-dsg-control-plane.vercel.app/api/agent/status
```

**Use Case**: Monitoring, health dashboards, uptime checks

---

### 🔓 Public Test: Arbiter Validation

**Endpoint**: `POST /api/public/test/arbiter-validation`

**Description**: Test arbiter count validation without authentication

**Request**:
```json
{
  "minArbiterCount": 2,
  "actualArbiterCount": 3,
  "context": "optional_metadata"
}
```

**Response** (ALLOW):
```json
{
  "testId": "test-1721311430684-a1b2c3d4",
  "decision": "ALLOW",
  "reason": "ARBITER_COUNT_SUFFICIENT: got 3, need 2",
  "minArbiterCount": 2,
  "actualArbiterCount": 3,
  "proofChain": {
    "requestHash": "sha256(minArbiterCount|actualArbiterCount)",
    "proofHash": "sha256(requestHash + decision)",
    "bundleHash": "sha256(proofHash + timestamp)",
    "merkleRoot": "sha256(bundleHash + ...)"
  },
  "compliance": {
    "ccvs_level": "L2",
    "pdpa_section_37": true,
    "eu_ai_act_article_12": true
  },
  "shareableLink": "https://tdealer01-crypto-dsg-control-plane.vercel.app/public/test-result/test-1721311430684-a1b2c3d4",
  "timestamp": "2026-07-18T06:15:30.684Z"
}
```

**Response** (BLOCK):
```json
{
  "testId": "test-1721311430685-x9y8z7w6",
  "decision": "BLOCK",
  "reason": "ARBITER_COUNT_INSUFFICIENT: got 1, need 2",
  "minArbiterCount": 2,
  "actualArbiterCount": 1,
  "proofChain": {...},
  "compliance": {...},
  "timestamp": "2026-07-18T06:16:00.000Z"
}
```

**Curl**:
```bash
curl -X POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/public/test/arbiter-validation \
  -H "Content-Type: application/json" \
  -d '{
    "minArbiterCount": 2,
    "actualArbiterCount": 3
  }'
```

**Rate Limit**: 10 requests/minute per IP

**Use Case**: Third-party verification, benchmarking, compliance testing

---

## Dashboard APIs

### Trinity Agent Chat

**Endpoint**: `POST /api/dashboard/trinity/chat`

**Description**: Chat with Trinity multi-agent system (Mind/Hand/Eye/Nerve/Spine)

**Request**:
```json
{
  "message": "What jobs are available?",
  "agent": "Mind",
  "language": "en",
  "sessionId": "session-1721311430684-abc123"
}
```

**Response**:
```json
{
  "response": "Found 3 smart-contract-audit jobs:\n1. Fix reentrancy vulnerability...",
  "toolCalls": ["discover_jobs"],
  "source": "production",
  "timestamp": "2026-07-18T06:20:00.000Z"
}
```

**Agents**:
- `Mind` - Job discovery expert
- `Hand` - Execution expert
- `Eye` - Quality verification expert
- `Nerve` - Payment & reputation expert
- `Spine` - DSG governance expert
- `All` - All agents (default)

**Languages**: `th`, `en`

**Available Tools**:
- `discover_jobs` - Search jobs by category/difficulty/reward
- `execute_job` - Execute and track job
- `verify_deliverable` - Check quality
- `settle_payment` - Process payment
- `validate_governance` - Check DSG policies
- `read_dsg_documentation` - Read DSG.md

**Curl**:
```bash
curl -X POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/dashboard/trinity/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Find backend development jobs",
    "agent": "Mind",
    "language": "en",
    "sessionId": "session-test-123"
  }'
```

**Use Case**: Interactive agent chat, job discovery, task execution

---

### Trinity Chat (Streaming)

**Endpoint**: `POST /api/dashboard/trinity/chat-stream`

**Description**: Stream Trinity chat responses with real-time tool progress

**Request**: (Same as above)

**Response**: Server-Sent Events (SSE)

```
data: {"type":"status","data":{"message":"Processing with real MCP tools..."}}
data: {"type":"tool_start","data":{"tool":"discover_jobs","timestamp":"2026-07-18T06:20:05.000Z"}}
data: {"type":"tool_result","data":{"tool":"discover_jobs","result":{"count":3,"jobs":[...]}}}
data: {"type":"response","data":{"text":"Found 3 jobs...","toolCalls":["discover_jobs"]}}
data: {"type":"done","data":{"message":"Chat completed"}}
```

**Curl**:
```bash
curl -X POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/dashboard/trinity/chat-stream \
  -H "Content-Type: application/json" \
  -d '{"message":"Find jobs","agent":"Mind","streaming":true}' \
  -N  # Disable buffering for SSE
```

**Use Case**: Real-time chat UI, progress tracking, long-running operations

---

## DSG Core APIs

### DSG Gate: Arbiter Validation

**Endpoint**: `POST /api/spine/gate/arbiter-validation` (Internal)

**Description**: Core DSG gate - validate arbiter counts (production use)

**Features**:
- Deterministic verification
- Z3 formal proof generation
- CCVS L1-L5 compliance levels
- SHA-256 proof chain
- Tamper detection

**Request**:
```json
{
  "minArbiterCount": 2,
  "actualArbiterCount": 3,
  "policy": "REQUIRE_MAJORITY_ARBITERS",
  "evidence_level": "CCVS_L3"
}
```

**Response**:
```json
{
  "decision": "ALLOW",
  "reason": "ARBITER_COUNT_SUFFICIENT",
  "proof": {
    "z3_proof": "sat (..)",
    "deterministic_hash": "0x...",
    "ccvs_level": "L3",
    "evidence_chain": [...]
  },
  "audit_trail_id": "audit-1721311430684",
  "timestamp": "2026-07-18T06:25:00.000Z"
}
```

**Use Case**: Production DSG gates, formal verification, compliance

---

### DSG Runtime: Decision Logging

**Endpoint**: `POST /api/spine/runtime/log-decision` (Internal)

**Description**: Record DSG decision in immutable audit trail

**Request**:
```json
{
  "decision": "ALLOW",
  "reason": "ARBITER_COUNT_SUFFICIENT",
  "inputs": {"minArbiterCount": 2, "actualArbiterCount": 3},
  "proof_hash": "0x...",
  "ccvs_level": "L2"
}
```

**Response**:
```json
{
  "decision_id": "dec-1721311430684",
  "recorded_at": "2026-07-18T06:26:00.000Z",
  "immutable": true,
  "audit_trail": {
    "entry_hash": "sha256(...)",
    "chain_position": 1234,
    "replayed_successfully": true
  }
}
```

**Use Case**: Audit trails, compliance, decision history

---

## Response Formats

### Success Response (200 OK)

```json
{
  "ok": true,
  "data": {...},
  "timestamp": "2026-07-18T06:30:00.000Z"
}
```

### Partial Success Response (206)

```json
{
  "ok": true,
  "data": {...},
  "warnings": ["Field X was skipped"],
  "timestamp": "2026-07-18T06:30:00.000Z"
}
```

### Paginated Response

```json
{
  "ok": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "next_page": 2,
    "has_more": true
  }
}
```

---

## Error Handling

### Error Response Format

```json
{
  "error": "Descriptive error message",
  "code": "ERROR_CODE",
  "details": {...},
  "timestamp": "2026-07-18T06:31:00.000Z"
}
```

### HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | Success | Request processed |
| 206 | Partial Success | Some fields skipped |
| 400 | Bad Request | Invalid input format |
| 401 | Unauthorized | Missing/invalid auth |
| 403 | Forbidden | No permission for resource |
| 404 | Not Found | Resource doesn't exist |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Server Error | Internal server error |
| 503 | Service Unavailable | Database/API down |

### Common Error Codes

**VALIDATION_ERROR**
```json
{
  "error": "Invalid parameter",
  "code": "VALIDATION_ERROR",
  "details": {
    "field": "minArbiterCount",
    "expected": "integer 0-5",
    "got": 2.5
  }
}
```

**RATE_LIMIT_EXCEEDED**
```json
{
  "error": "Too many requests",
  "code": "RATE_LIMIT_EXCEEDED",
  "details": {
    "limit": 10,
    "window": "1m",
    "retry_after": 45
  }
}
```

**DATABASE_ERROR**
```json
{
  "error": "Database connection failed",
  "code": "DATABASE_ERROR",
  "details": {
    "service": "Supabase",
    "action": "connect"
  }
}
```

### Error Recovery

**Retry Strategy**:
```javascript
const retryWithBackoff = async (fn, maxAttempts = 3) => {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn()
    } catch (error) {
      if (i === maxAttempts - 1) throw error
      const delay = Math.pow(2, i) * 1000  // 1s, 2s, 4s
      await new Promise(r => setTimeout(r, delay))
    }
  }
}

// Usage
const result = await retryWithBackoff(
  () => fetch('/api/dashboard/trinity/chat'),
  3
)
```

---

## Examples

### Example 1: Check if Service is Alive

```bash
#!/bin/bash
curl -f https://tdealer01-crypto-dsg-control-plane.vercel.app/api/agent/status || \
  echo "Service is down!"
```

### Example 2: Test Arbiter Validation

```javascript
// Test insufficient arbiters
const response = await fetch(
  'https://tdealer01-crypto-dsg-control-plane.vercel.app/api/public/test/arbiter-validation',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      minArbiterCount: 3,
      actualArbiterCount: 1  // Not enough
    })
  }
)

const result = await response.json()
console.log(result.decision)  // "BLOCK"
console.log(result.reason)    // "ARBITER_COUNT_INSUFFICIENT"
```

### Example 3: Stream Agent Chat

```javascript
const response = await fetch(
  'https://tdealer01-crypto-dsg-control-plane.vercel.app/api/dashboard/trinity/chat-stream',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'Find smart contract audit jobs',
      agent: 'Mind',
      streaming: true
    })
  }
)

const reader = response.body.getReader()
const decoder = new TextDecoder()

while (true) {
  const { done, value } = await reader.read()
  if (done) break
  
  const text = decoder.decode(value)
  const lines = text.split('\n')
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const event = JSON.parse(line.slice(6))
      console.log(event.type, event.data)
    }
  }
}
```

---

## Related Documentation

- [MONITORING_RUNBOOK.md](MONITORING_RUNBOOK.md) - Production monitoring
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Common issues & solutions
- [PERFORMANCE_GUIDE.md](PERFORMANCE_GUIDE.md) - Optimization tips
- [docs/SECURITY.md](docs/SECURITY.md) - Security best practices

---

**Last Updated**: 2026-07-18  
**API Version**: v1  
**Maintained By**: DSG Platform Team
