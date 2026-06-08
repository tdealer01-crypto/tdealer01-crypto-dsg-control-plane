# DSG Governance Gate Integration Tutorial (30 Minutes)

**Estimated time: 30 minutes**  
**For: Engineers and integration teams**  
**Goal: Understand how to wire DSG Governance Gate into your payment flow**

Welcome to the integration deep-dive. This guide covers architecture, OAuth setup, webhook configuration, and testing your governance layer end-to-end.

---

## Architecture Overview

### High-Level Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                     Your Payment System                           │
│                                                                  │
│   Payment Request → OAuth Connected Account → Policy Check      │
│                                               │                  │
│                                               ↓                  │
│                            DSG Governance Gate                   │
│                         (Policy Evaluation)                      │
│                                 │                                │
│              ┌──────────────────┼──────────────────┐             │
│              ↓                  ↓                  ↓             │
│         ALLOW               BLOCK               REVIEW          │
│       (proceed)            (decline)          (pending)         │
│              │                  │                  │             │
│              └──────────────────┼──────────────────┘             │
│                                 ↓                                │
│                        Webhook to Your System                    │
│                     (audit trail + decision)                     │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Key Components

1. **OAuth Integration**
   - Your app redirects users to Stripe OAuth
   - DSG uses that OAuth token to access Stripe data
   - Tokens are stored securely in Supabase

2. **Policy Engine**
   - Your policies define conditions and actions
   - Every transaction is evaluated in <100ms
   - Decisions are deterministic (same input = same decision)

3. **Webhook Delivery**
   - DSG sends governance decisions to your system
   - Webhooks include full decision context and audit trail
   - Your app acts on the decision (approve, decline, review)

4. **Audit Trail**
   - Every decision is logged with evidence
   - Immutable record for compliance
   - Exportable for audits and reviews

---

## Step 1: OAuth Connection (5 minutes)

### What is OAuth?

OAuth allows DSG to access your Stripe account without storing passwords. Instead:
1. You authorize DSG in Stripe dashboard
2. Stripe issues an access token
3. DSG stores that token securely
4. DSG uses the token to read transaction data

### Setup Process

#### 1.1 User initiates OAuth flow

Your user goes to DSG Dashboard and clicks "Connect Stripe".

```
User clicks "Connect Stripe"
        ↓
DSG redirects to Stripe OAuth URL
        ↓
Stripe shows authorization dialog
```

#### 1.2 Stripe authorization dialog

The dialog shows:
- "This app is requesting access to:"
  - Read transaction history
  - Create charges
  - View disputes
  - Access customer data
- User clicks "Authorize"

#### 1.3 Stripe redirects back to DSG

After authorization:
```
Stripe redirects to:
https://tdealer01-crypto-dsg-control-plane.vercel.app/callback?
  code=ac_1234567890&
  state=random_state_token
```

DSG's backend:
1. Validates the state token (security check)
2. Exchanges the `code` for an access token
3. Stores the token in Supabase (encrypted)
4. Redirects user to dashboard

#### 1.4 Verify connection

After OAuth succeeds, your dashboard shows:
```
✓ Stripe Connected
  Account ID: acct_1234567890
  Connected: June 7, 2026 at 2:00 PM
  Permissions: Charges, Disputes, Customers
```

### Troubleshooting OAuth

| Issue | Solution |
|-------|----------|
| "Invalid redirect URI" | Check that your Stripe OAuth app has correct callback URL: `https://tdealer01-crypto-dsg-control-plane.vercel.app/callback` |
| "State mismatch" | Browser cleared cookies mid-flow. Refresh and retry. |
| "Token expired" | OAuth tokens auto-refresh. If issues persist, re-authorize in Settings. |

---

## Step 2: Create Your First Policy (8 minutes)

### What is a Policy?

A **policy** is a single governance rule:
```
IF [condition]
THEN [action]
RECORD [audit trail]
```

### Example Policies

#### Policy 1: Block High-Value Transfers
```
Name: Block Transfers Over $10,000
Condition: transaction_amount > 10000
Action: BLOCK
Message: "Transfers over $10,000 require manager approval"
Audit: Record in compliance evidence
```

#### Policy 2: Flag Refunds for Review
```
Name: Compliance: Refund Review
Condition: transaction_type = "refund"
Action: REVIEW
Message: "Refunds require compliance verification"
Audit: Record with full transaction context
```

#### Policy 3: Agent Spend Limit
```
Name: Daily Agent Spend Limit
Condition: agent_daily_spend > 1000
Action: BLOCK
Message: "Agent has exceeded daily limit"
Audit: Record agent ID and daily total
```

### Creating a Policy via Dashboard

1. **Go to Policies → New Policy**

2. **Enter policy details**
   - Name: `High-Value Transaction Review`
   - Description: `Catch large transactions for review`
   
3. **Set conditions**
   - Condition 1: `transaction_amount > 5000`
   - Operator: `AND` (if multiple conditions)
   - Condition 2: (optional)

4. **Set action**
   - Action: `REVIEW` (sends decision webhook)
   - Message: `Large transaction requires review`

5. **Set metadata** (for audit trail)
   - Tags: `compliance`, `high-value`
   - Owner: Your name
   - Review SLA: `4 hours`

6. **Click "Create Policy"**
   - Policy ID: `pol_abc123def456`
   - Status: `ACTIVE`
   - Version: `1`

### Creating a Policy via API

If you're building custom policy creation:

```bash
curl -X POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/policies \
  -H "Authorization: Bearer sk_test_..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "High-Value Transaction Review",
    "conditions": {
      "transaction_amount": {
        "operator": "greater_than",
        "value": 5000
      }
    },
    "action": "REVIEW",
    "message": "Large transaction requires review"
  }'
```

**Response:**
```json
{
  "id": "pol_abc123def456",
  "name": "High-Value Transaction Review",
  "status": "ACTIVE",
  "version": 1,
  "created_at": "2026-06-07T12:00:00Z"
}
```

---

## Step 3: Configure Webhook (8 minutes)

### What are Webhooks?

Webhooks are HTTP POST requests that DSG sends to your system when a policy is evaluated.

**Why webhooks?**
- You get real-time decision notifications
- You can act on decisions (approve, decline, review)
- Full decision context is included
- Audit trail is automatically recorded

### Setting Up Webhook Endpoint

#### 3.1 Create a webhook endpoint

Your app needs to accept POST requests:

```javascript
// Node.js / Express example
app.post('/webhooks/dsg', (req, res) => {
  const event = req.body;
  
  console.log('Received DSG webhook:', event.type);
  console.log('Decision:', event.decision.action);
  
  // Process the decision
  if (event.decision.action === 'BLOCK') {
    // Decline the transaction
    declineTransaction(event.transaction.id);
  } else if (event.decision.action === 'REVIEW') {
    // Create a pending approval
    createApprovalTask(event.transaction);
  } else if (event.decision.action === 'ALLOW') {
    // Proceed with transaction
    proceedWithTransaction(event.transaction.id);
  }
  
  // Important: Return 200 OK within 30 seconds
  res.status(200).json({ received: true });
});
```

#### 3.2 Register webhook endpoint with DSG

In your DSG Dashboard:

1. **Go to Settings → Integrations**

2. **Click "Add Webhook"**

3. **Enter webhook details**
   - Endpoint URL: `https://your-api.com/webhooks/dsg`
   - Events: `policy.evaluated`, `policy.reviewed`, `policy.updated`
   - Retry: Enable (retry 3 times if timeout)

4. **Test webhook**
   - Click "Send Test Event"
   - Should return `200 OK`

5. **Save webhook**
   - Status: `Active`
   - Last sent: (will update after first event)

#### 3.3 Webhook Payload Structure

Example webhook event:

```json
{
  "id": "evt_abc123def456",
  "type": "policy.evaluated",
  "timestamp": "2026-06-07T12:30:45Z",
  "policy": {
    "id": "pol_xyz789",
    "name": "Block Transfers Over $10,000",
    "version": 1,
    "tags": ["compliance", "high-value"]
  },
  "decision": {
    "action": "BLOCK",
    "reason": "Transaction amount $12,500 exceeds policy limit of $10,000",
    "confidence": 1.0,
    "policy_version": 1
  },
  "transaction": {
    "id": "txn_abc123",
    "amount": 12500,
    "currency": "USD",
    "agent_id": "agent_prod_001",
    "description": "Large wire transfer",
    "created_at": "2026-06-07T12:30:40Z"
  },
  "audit_trail": {
    "entry_id": "audit_abc123def456",
    "decision_id": "dec_xyz789",
    "timestamp": "2026-06-07T12:30:45Z",
    "evidence_hash": "sha256:abc123...",
    "policy_version_hash": "sha256:xyz789..."
  }
}
```

### Webhook Best Practices

1. **Always return 200 OK** within 30 seconds
   - DSG will retry if no 200 response
   - Store event in a queue for async processing

2. **Validate webhook signature** (optional but recommended)
   - DSG includes `X-DSG-Signature` header
   - Verify signature matches your webhook secret

3. **Handle duplicate events**
   - Store `event.id` to detect duplicates
   - Same event may be delivered twice
   - Use idempotent operations

4. **Process events asynchronously**
   - Don't make blocking calls in webhook handler
   - Queue the event and process async
   - Return 200 immediately

5. **Log all webhooks**
   - Store for debugging
   - Include timestamp, status, error
   - Help with troubleshooting

---

## Step 4: Test Transaction Flow (7 minutes)

### Testing Strategy

#### 4.1 Test Mode (Sandbox)

Your account has **Test Mode** enabled by default. Use it for:
- Testing policy logic without charging cards
- Verifying webhook delivery
- Debugging integration
- User acceptance testing

#### 4.2 Create Test Transaction

1. **Go to Dashboard → Test Mode**

2. **Click "Create Test Transaction"**

3. **Enter transaction details**
   - Amount: `$12,500`
   - Currency: `USD`
   - Agent ID: `test-agent-001`
   - Description: `Test high-value transfer`

4. **Submit**
   - Transaction created
   - Policies evaluated
   - Decision made

#### 4.3 Verify Policy Execution

1. **Go to Logs → Recent Decisions**

2. **Find your test transaction**
   - Timestamp: Should match your submission
   - Amount: `$12,500`
   - Status: `BLOCKED` (if amount > $10k policy is active)

3. **Click transaction to see details**
   - **Decision**: BLOCK
   - **Reason**: "Transaction amount $12,500 exceeds limit of $10,000"
   - **Policy Name**: "Block Transfers Over $10,000"
   - **Execution Time**: `45ms` (example)

#### 4.4 Verify Webhook Delivery

1. **Go to Logs → Webhook Events**

2. **Find your webhook event**
   - Event Type: `policy.evaluated`
   - Endpoint: `https://your-api.com/webhooks/dsg`
   - Status: `Delivered` or `Pending`

3. **Click to see details**
   - Full webhook payload
   - Request/response headers
   - Retry history (if any)

#### 4.5 Verify Audit Trail

1. **Go to Compliance → Audit Log**

2. **Find audit entry**
   - Transaction ID: Should match
   - Decision: BLOCK
   - Timestamp: Should match
   - Evidence Hash: Should be present

3. **Click "Export Entry"**
   - Export as JSON or PDF
   - Includes full decision context
   - Ready for audit/compliance review

### Testing Checklist

- [ ] Test Mode is enabled
- [ ] Created test transaction
- [ ] Policy was evaluated
- [ ] Decision appears in logs
- [ ] Webhook was delivered
- [ ] Webhook endpoint returned 200 OK
- [ ] Audit trail entry was created
- [ ] Can export audit trail

### Common Test Scenarios

#### Scenario 1: Block Transaction

```
Policy: Block Transfers Over $10,000
Test: Create $12,500 transaction
Expected: BLOCKED
Verify: Logs show decision, webhook delivered, audit trail recorded
```

#### Scenario 2: Review Transaction

```
Policy: Flag Refunds for Review
Test: Create refund transaction
Expected: REVIEW
Verify: Appears in approval queue, team gets notification
```

#### Scenario 3: Allow Transaction

```
Policy: Allow transfers under $5,000
Test: Create $2,000 transaction
Expected: ALLOWED
Verify: Webhook shows ALLOW decision, no approval needed
```

---

## Troubleshooting Guide

### Issue: Policy Not Executing

**Symptom:** Transaction passed through but policy didn't execute

**Diagnosis:**
1. Go to Policies → Click your policy
2. Check if status is "ACTIVE" (not "DISABLED")
3. Check if condition matches your test transaction
4. Check policy version number

**Solution:**
1. Enable policy if disabled: Click "Enable"
2. Update condition if needed: Click "Edit"
3. Create another test transaction

---

### Issue: Webhook Not Delivering

**Symptom:** Policy executed but webhook didn't arrive

**Diagnosis:**
1. Go to Logs → Webhook Events
2. Click your event and check status
3. Check if endpoint URL is reachable

**Solution:**
1. Verify endpoint URL is correct: `https://your-api.com/webhooks/dsg`
2. Make sure your API is running and accessible
3. Check firewall/security group allows inbound traffic
4. Implement retry logic in your endpoint (return 200 OK)
5. Click "Retry" in webhook event to resend

---

### Issue: Duplicate Webhooks

**Symptom:** Same decision webhook received multiple times

**Diagnosis:**
- This is expected behavior (at-least-once delivery)
- DSG retries on timeout or non-200 response

**Solution:**
1. Store `event.id` to detect duplicates
2. Make your webhook handler idempotent
3. Ensure your endpoint returns 200 OK immediately

---

### Issue: Audit Trail Missing

**Symptom:** Decision made but not in audit log

**Diagnosis:**
1. Go to Logs → Recent Decisions
2. Click transaction → check `audit_trail` section
3. Check if `entry_id` is populated

**Solution:**
1. Audit trails are created automatically
2. If missing, contact support: hello@dsg.one
3. Provide transaction ID for investigation

---

### Issue: Test Mode Not Working

**Symptom:** Can't create test transactions

**Diagnosis:**
1. Go to Settings → Environment
2. Check if "Test Mode" is toggled ON

**Solution:**
1. Enable Test Mode in Settings
2. Retry creating test transaction
3. Test transactions don't charge cards (safe to retry)

---

## Next Steps

### Immediate (This Week)
1. ✓ Complete OAuth integration
2. ✓ Deploy first policy
3. ✓ Test transaction flow
4. Invite team member to approve REVIEW decisions

### Short-term (This Month)
1. Move policies from Test Mode to production
2. Implement proper error handling in webhook endpoint
3. Set up monitoring/alerting on webhook delivery
4. Create custom policies for your business

### Long-term (Ongoing)
1. Build advanced policies with multiple conditions
2. Create custom webhooks for different events
3. Integrate governance into your existing workflows
4. Monitor compliance metrics monthly

---

## API Reference Quick Links

| Endpoint | Purpose |
|----------|---------|
| `POST /api/policies` | Create a policy |
| `GET /api/policies/:id` | Get policy details |
| `PUT /api/policies/:id` | Update policy |
| `DELETE /api/policies/:id` | Delete policy |
| `POST /api/policies/:id/test` | Test policy with sample data |
| `POST /api/webhooks` | Register webhook endpoint |
| `GET /api/webhooks` | List webhooks |
| `POST /api/webhooks/:id/test` | Send test webhook event |
| `GET /api/logs/decisions` | Get decision logs |
| `GET /api/audit/trail` | Get audit trail |

For full API reference, see: https://tdealer01-crypto-dsg-control-plane.vercel.app/docs/api

---

## Support

- **Questions?** Reply to your onboarding email
- **Documentation**: https://tdealer01-crypto-dsg-control-plane.vercel.app/docs
- **Email Support**: hello@dsg.one
- **Chat Support**: Available in-app during business hours

You've completed the Integration Tutorial. Your governance layer is now wired and tested.

**Next stop: Advanced Policies and Integrations** when you're ready to scale.

Happy integrating!

— The DSG Team
