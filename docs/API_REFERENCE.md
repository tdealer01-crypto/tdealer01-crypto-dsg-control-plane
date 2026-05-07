# Release Gate API Reference

## Overview

Release Gate API ให้ผู้ใช้ตรวจสอบแอปว่าพร้อมใช้งานหรือไม่ด้วย HTTP API

---

## Endpoints

### 1. Check Release Readiness

```
GET /api/release-gate/check
```

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | ✅ | URL ของแอปที่ต้องการตรวจสอบ |
| `session_id` | string | ❌ | Stripe session ID (สำหรับ Pro users) |

#### Example Request

```bash
# Free Tier
curl "https://your-app.com/api/release-gate/check?url=https://myapp.com"

# Pro Tier (with session)
curl "https://your-app.com/api/release-gate/check?url=https://myapp.com&session_id=cs_test_..."
```

#### Response (Free User)

```json
{
  "verdict": "GO",
  "checks": [
    {
      "name": "Health Check",
      "status": "pass",
      "detail": "API responding normally"
    },
    {
      "name": "Response Time",
      "status": "pass",
      "detail": "< 1 second"
    },
    {
      "name": "Trust Pages",
      "status": "pass",
      "detail": "/trust endpoint exists"
    }
  ],
  "timestamp": "2026-05-07T23:39:20Z",
  "tier": "free",
  "pro": false,
  "accessSource": "free",
  "message": "Free tier active - basic checks only. Upgrade to Pro for advanced features.",
  "features": {
    "reports": "ℹ️ Not available - Upgrade to Pro",
    "history": "ℹ️ Not available - Upgrade to Pro",
    "scheduling": "ℹ️ Not available - Upgrade to Pro",
    "notifications": "ℹ️ Not available - Upgrade to Pro",
    "teamAccess": "ℹ️ Not available - Upgrade to Pro"
  },
  "upgrade": {
    "message": "Want to save reports and automate checks?",
    "proPlan": {
      "name": "Pro",
      "price": "$29/month",
      "description": "Saved reports and repeat checks for active products.",
      "features": [
        "Everything in Free",
        "Report history",
        "Shareable evidence links",
        "Daily scheduled checks"
      ],
      "ctaText": "Upgrade to Pro",
      "ctaLink": "/release-gate/checkout?plan=pro"
    }
  },
  "sessionInfo": {
    "hint": "Include session_id in next request for faster verification",
    "example": "/api/release-gate/check?url=...&session_id=<your-session-id>"
  }
}
```

#### Response (Pro User)

```json
{
  "verdict": "GO",
  "checks": [
    {
      "name": "Health Check",
      "status": "pass",
      "detail": "API responding normally"
    },
    {
      "name": "Response Time",
      "status": "pass",
      "detail": "< 1 second"
    },
    {
      "name": "Trust Pages",
      "status": "pass",
      "detail": "/trust endpoint exists"
    }
  ],
  "timestamp": "2026-05-07T23:39:20Z",
  "tier": "pro",
  "pro": true,
  "accessSource": "subscription_active",
  "message": "Pro access enabled - full checks available",
  "features": {
    "reports": "Available - Save unlimited reports",
    "history": "Available - View check history",
    "scheduling": "Available - Daily automated checks",
    "notifications": "Available - Email alerts",
    "teamAccess": "Available - Share with team"
  },
  "sessionInfo": {
    "sessionId": "cs_test_abc123...",
    "email": "user@example.com",
    "hint": "Use this session_id for faster future checks"
  }
}
```

#### Error Response

```json
{
  "error": "missing_url",
  "message": "URL parameter is required"
}
```

```json
{
  "error": "check_failed",
  "message": "Release gate check failed"
}
```

#### HTTP Status Codes

| Status | Meaning |
|--------|----------|
| 200 | ✅ Check สำเร็จ |
| 400 | ❌ Missing URL |
| 500 | ❌ Server error |

---

### 2. Create Checkout Session

```
POST /api/release-gate/checkout
```

#### Parameters

```json
{
  "plan": "pro"
}
```

#### Example Request

```bash
curl -X POST "https://your-app.com/api/release-gate/checkout" \
  -H "Content-Type: application/json" \
  -d '{"plan": "pro"}'
```

#### Response

```json
{
  "url": "https://checkout.stripe.com/pay/cs_test_..."
}
```

---

## Authentication

### Types

1. **Public API** (No auth required)
   - `/api/release-gate/check`

2. **Session-based** (Stripe session_id)
   - Verify via Stripe webhook

3. **Database-backed** (Pro subscriptions)
   - Check `release_gate_entitlements` table

---

## Rate Limiting

| Tier | Limit | Window |
|------|-------|--------|
| Free | 10 requests | 1 hour |
| Pro | 100 requests | 1 hour |
| Enterprise | Unlimited | - |

---

## Error Handling

### Graceful Fallback

ถ้า Stripe down หรือ Database ไม่ตอบสนอง:
- ระบบจะ fallback เป็น Free tier อัตโนมัติ
- ผู้ใช้ยังสามารถตรวจสอบแอปได้
- ไม่มี HTTP 402 error

```json
{
  "accessSource": "free_fallback",
  "debug": {
    "warning": "Payment service temporarily unavailable - using free tier as fallback",
    "retryable": true
  }
}
```

---

## Examples

### Example 1: JavaScript/Frontend

```javascript
async function checkApp() {
  const url = document.getElementById('url').value;
  
  const response = await fetch(
    `/api/release-gate/check?url=${encodeURIComponent(url)}`
  );
  
  const data = await response.json();
  
  if (data.verdict === 'GO') {
    console.log('✅ App is ready!');
    console.log(`Tier: ${data.tier}`);
    console.log(`Message: ${data.message}`);
  } else {
    console.log('⚠️ App has issues');
    data.checks.forEach(check => {
      console.log(`- ${check.name}: ${check.status}`);
    });
  }
}
```

### Example 2: Python/Backend

```python
import requests

def check_release_readiness(url, session_id=None):
    params = {'url': url}
    if session_id:
        params['session_id'] = session_id
    
    response = requests.get(
        'https://your-app.com/api/release-gate/check',
        params=params
    )
    
    data = response.json()
    
    if response.status_code == 200:
        print(f"✅ Verdict: {data['verdict']}")
        print(f"🎯 Tier: {data['tier']}")
        print(f"📝 Message: {data['message']}")
        
        for check in data['checks']:
            status = '✅' if check['status'] == 'pass' else '❌'
            print(f"{status} {check['name']}: {check['detail']}")
    else:
        print(f"❌ Error: {data['error']}")

# Usage
check_release_readiness('https://myapp.com')
check_release_readiness('https://myapp.com', 'cs_test_...')
```

### Example 3: cURL Script

```bash
#!/bin/bash

# Function to check app
check_app() {
  local url=$1
  local session_id=$2
  
  local endpoint="/api/release-gate/check?url=${url}"
  if [ -n "$session_id" ]; then
    endpoint="${endpoint}&session_id=${session_id}"
  fi
  
  curl -s "https://your-app.com${endpoint}" | jq '.'
}

# Usage
check_app "https://myapp.com"
check_app "https://myapp.com" "cs_test_..."
```

---

## SDKs

### JavaScript SDK

```javascript
import { ReleaseGate } from '@dsg/release-gate-sdk';

const gateClient = new ReleaseGate({
  baseURL: 'https://your-app.com',
  sessionId: localStorage.getItem('sessionId')
});

const result = await gateClient.check('https://myapp.com');
```

### Python SDK

```python
from dsg.release_gate import ReleaseGateClient

client = ReleaseGateClient(
    base_url='https://your-app.com',
    session_id=os.getenv('RELEASE_GATE_SESSION_ID')
)

result = client.check('https://myapp.com')
```

---

## Webhooks

### Subscription Events

```
POST /api/stripe/webhook
```

#### Events

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

#### Payload

```json
{
  "type": "customer.subscription.updated",
  "data": {
    "object": {
      "id": "sub_...",
      "customer": "cus_...",
      "status": "active",
      "current_period_end": 1620000000,
      "metadata": {
        "email": "user@example.com"
      }
    }
  }
}
```

---

## Changelog

### v1.0 (2026-05-07)
- ✅ Initial release
- ✅ Free tier access
- ✅ Pro tier with session ID
- ✅ Graceful error handling
- ✅ User-friendly responses

---

**Last Updated**: May 7, 2026
**API Version**: 1.0
