# 🔗 Integration Guides

Integrate DSG Control Plane with your tools and workflows.

---

## Quick Links

- [GitHub Actions](#github-actions) - CI/CD workflows
- [Slack](#slack) - Team notifications
- [Custom Webhook](#custom-webhook) - Receive DSG events
- [REST Client](#rest-client) - Postman/Insomnia examples

---

## GitHub Actions

Trigger DSG validation in your GitHub Actions workflows.

### Use Case

Automatically validate arbiter counts when PRs are created or merged.

### Setup

1. Copy [`github-actions-example.yml`](./github-actions-example.yml) to your repo:
   ```
   .github/workflows/dsg-validation.yml
   ```

2. Customize for your needs:
   ```yaml
   env:
     ARBITER_COUNT: 3  # Your arbiter count
     MIN_REQUIRED: 2   # Minimum required
   ```

3. The workflow will:
   - Call DSG public API
   - Check arbiter validation
   - Fail the check if validation fails
   - Post evidence link to pull request

### Example Workflow Output

```
✅ Arbiter validation passed
Evidence: https://tdealer01-crypto-dsg-control-plane.vercel.app/public/test-result/test-123
```

### Advanced: Custom Logic

```yaml
- name: Validate Based on Branch
  run: |
    if [[ "${{ github.ref }}" == "refs/heads/main" ]]; then
      MIN=3
    else
      MIN=2
    fi
    
    RESPONSE=$(curl -s -X POST ... -d "{\"minArbiterCount\": $MIN, ...}")
    # Process response
```

---

## Slack

Send DSG results to Slack channels.

### Use Case

Notify team when arbiter validation succeeds or fails.

### Setup

1. Create Incoming Webhook in Slack:
   - Go to Slack App Directory
   - Install "Incoming Webhooks"
   - Create new webhook for your channel
   - Copy webhook URL

2. Add to your environment:
   ```bash
   export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."
   ```

3. Use the example:
   ```bash
   node docs/integrations/slack-notification-example.js
   ```

### Example Message

Slack shows:
```
✅ DSG Arbiter Validation: ALLOW

Min Arbiters: 2
Actual Arbiters: 3
CCVS Level: L2

[View Evidence] button → opens proof chain
```

### Custom Formatting

```javascript
const message = {
  attachments: [{
    color: '#36a64f',  // Green for ALLOW, red for BLOCK
    title: 'DSG Validation Result',
    text: dsgResult.reason,
    actions: [{
      type: 'button',
      text: 'View Proof Chain',
      url: dsgResult.shareableLink
    }]
  }]
}
```

---

## Custom Webhook

Receive DSG events via webhook.

### Setup

1. Subscribe to DSG events:
   ```bash
   curl -X POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/webhooks/subscribe \
     -H "Content-Type: application/json" \
     -d '{
       "url": "https://your-app.com/webhook/dsg",
       "events": ["arbiter_validation", "proof_generated"],
       "secret": "your-secret-key"
     }'
   ```

2. Handle webhook in your app:
   ```javascript
   app.post('/webhook/dsg', (req, res) => {
     // Verify signature
     const signature = req.headers['x-dsg-signature']
     const payload = JSON.stringify(req.body)
     const hash = crypto
       .createHmac('sha256', process.env.DSG_WEBHOOK_SECRET)
       .update(payload)
       .digest('hex')
     
     if (hash !== signature) {
       return res.status(401).send('Unauthorized')
     }
     
     // Process event
     const { event, data } = req.body
     if (event === 'arbiter_validation') {
       console.log('Validation:', data.decision, data.reason)
     }
     
     res.json({ ok: true })
   })
   ```

### Webhook Events

**arbiter_validation**
```json
{
  "event": "arbiter_validation",
  "data": {
    "testId": "test-123",
    "decision": "ALLOW",
    "reason": "ARBITER_COUNT_SUFFICIENT",
    "timestamp": "2026-07-18T06:30:00Z"
  }
}
```

**proof_generated**
```json
{
  "event": "proof_generated",
  "data": {
    "proofHash": "0x...",
    "ccvs_level": "L2",
    "deterministic": true,
    "timestamp": "2026-07-18T06:30:00Z"
  }
}
```

---

## REST Client

Use Postman/Insomnia to test DSG API.

### Postman Collection

1. Create collection: "DSG Control Plane"

2. Add requests:

#### Request 1: Health Check
```
GET https://tdealer01-crypto-dsg-control-plane.vercel.app/api/agent/status
```

#### Request 2: Arbiter Validation
```
POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/public/test/arbiter-validation
Content-Type: application/json

{
  "minArbiterCount": 2,
  "actualArbiterCount": 3
}
```

#### Request 3: Trinity Chat
```
POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/dashboard/trinity/chat
Content-Type: application/json

{
  "message": "What jobs are available?",
  "agent": "Mind",
  "language": "en",
  "sessionId": "session-test-123"
}
```

### Environment Variables

```json
{
  "baseUrl": "https://tdealer01-crypto-dsg-control-plane.vercel.app",
  "minArbiters": 2,
  "actualArbiters": 3
}
```

### Test Scripts

```javascript
// Verify response format
pm.test("Response is valid", function() {
  pm.response.to.have.status(200)
  pm.response.to.be.json
  pm.expect(pm.response.json()).to.have.property('decision')
})

// Check decision
pm.test("Decision is ALLOW or BLOCK", function() {
  const decision = pm.response.json().decision
  pm.expect(['ALLOW', 'BLOCK']).to.include(decision)
})
```

---

## Rate Limits

When integrating, respect rate limits:

- **Public API**: 10 req/min per IP
- **Dashboard**: 100 req/min per session
- **Webhooks**: 1000 req/min

### Handling Rate Limits

```javascript
const response = await fetch('/api/public/test/arbiter-validation', ...)
if (response.status === 429) {
  const retryAfter = response.headers.get('Retry-After')
  console.log(`Rate limited. Retry after ${retryAfter} seconds`)
  
  // Exponential backoff
  await new Promise(r => setTimeout(r, retryAfter * 1000))
}
```

---

## Error Handling

All integrations should handle errors gracefully:

```javascript
try {
  const response = await callDSGAPI(...)
  
  if (response.ok) {
    // Process success
  } else if (response.status === 429) {
    // Rate limited - retry with backoff
  } else if (response.status >= 500) {
    // Server error - log and retry
  } else {
    // Client error - check request
  }
} catch (error) {
  // Network error - reconnect or queue for retry
  console.error('DSG API call failed:', error)
}
```

---

## Testing

Test your integration locally:

```bash
# 1. Start local dev server
npm run dev

# 2. Test integration
node docs/integrations/slack-notification-example.js

# 3. Verify in Slack or monitoring tool
```

---

## Support

- **Issue**: GitHub Issues
- **Question**: Slack channel
- **Bug**: TROUBLESHOOTING.md

---

## Related

- [API_REFERENCE.md](../API_REFERENCE.md) - Full API documentation
- [TROUBLESHOOTING.md](../TROUBLESHOOTING.md) - Common issues
- [MONITORING_RUNBOOK.md](../MONITORING_RUNBOOK.md) - Production monitoring
