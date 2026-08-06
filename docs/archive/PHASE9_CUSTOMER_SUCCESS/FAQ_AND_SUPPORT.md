# FAQ & Support — Everything You Need to Know

**For: All DSG Governance Gate customers**  
**Purpose: Quick answers to common questions + escalation paths**

---

## Top 10 Questions

### 1. How long does it take to set up DSG Governance Gate?

**Q: Will I lose uptime during setup?**

A: No. DSG is non-blocking:
- Step 1: Connect via OAuth (5 minutes) — no changes to your system
- Step 2: Deploy first policy (3 minutes) — runs in shadow mode initially
- Step 3: Receive webhooks (1 minute setup) — your endpoint receives events
- Step 4: Test in Test Mode (5 minutes) — safe sandbox testing

**Total time to first live policy: 15-30 minutes**

You can test fully before any production transactions are affected.

---

### 2. What happens if DSG goes down?

**Q: Will my transactions be blocked?**

A: No. DSG operates as an **advisory layer**, not a blocking layer in your critical path:

**Default behavior (DSG unreachable):**
- Policies default to `ALLOW` (fail-open)
- Transaction proceeds normally
- You receive no decision (but transaction goes through)
- You get an alert about DSG being unreachable

**Optional strict mode (for high-compliance needs):**
- You can configure policies to default to `BLOCK`
- Requires explicit decision to allow transaction
- More protective but riskier during outages
- Only recommended with redundancy plan

**Our SLA:** 99.9% uptime (11.5 hours downtime/year)

---

### 3. How are webhooks secured?

**Q: Could someone fake a webhook to trick my system?**

A: No. Webhooks include cryptographic signatures:

```
Header: X-DSG-Signature: sha256=abc123def456...

Your endpoint validates:
1. Signature matches payload
2. Timestamp is recent (<5 minutes old)
3. Event hasn't been replayed before

Steps:
1. Get your webhook secret from Settings → Integrations
2. Validate signature before processing
3. Check timestamp to detect old/replayed events
```

**Code example (Node.js):**
```javascript
const crypto = require('crypto');

function validateWebhook(req, webhookSecret) {
  const signature = req.headers['x-dsg-signature'];
  const timestamp = req.headers['x-dsg-timestamp'];
  const payload = JSON.stringify(req.body);
  
  // Create HMAC
  const hmac = crypto
    .createHmac('sha256', webhookSecret)
    .update(`${timestamp}.${payload}`)
    .digest('hex');
  
  // Compare signatures (timing-safe)
  const expected = `sha256=${hmac}`;
  return crypto.timingSafeEqual(expected, signature);
}
```

---

### 4. Can policies evaluate custom data?

**Q: Can I use data that's not in Stripe?**

A: Yes. Policies can include:
- Standard transaction fields (amount, currency, type)
- Stripe metadata (custom JSON fields)
- Agent ID, user ID, risk score
- Timestamp, geolocation
- Custom headers passed from your system

**Example: Custom metadata policy**
```
Name: Flag High-Risk Merchants
Condition: metadata.merchant_risk_score > 7
Action: REVIEW
Message: "High-risk merchant requires review"
```

When you send a transaction to DSG, include custom data:
```json
{
  "amount": 5000,
  "metadata": {
    "merchant_risk_score": 8,
    "customer_type": "high_value",
    "vip_customer": true
  }
}
```

DSG evaluates all fields in your policy condition.

---

### 5. How long do you keep audit trails?

**Q: How long are decision logs retained?**

A: **Forever** (with unlimited retention):

- All decisions stored in encrypted Supabase
- Compliant with SOC 2, HIPAA, ISO 27001
- Can be exported anytime
- Versioning tracks policy changes

**What's included in audit trail:**
- Decision (ALLOW/BLOCK/REVIEW)
- Reason (policy name + condition + value)
- Transaction details (amount, agent, timestamp)
- Evidence hash (for integrity verification)
- Policy version (for compliance traceability)

**Export options:**
1. Single decision: Download JSON/PDF from UI
2. Date range: Export → Select dates
3. Full history: Export all decisions
4. Compliance pack: SOC 2 / ISO 27001 pre-formatted

---

### 6. What if I accidentally deploy a bad policy?

**Q: Can I roll back a policy quickly?**

A: Yes. Multiple options:

**Option 1: Disable Policy (Immediate)**
```
Go to Policies → [Policy Name] → Click "Disable"
Status changes to DISABLED
Transactions bypass this policy
Previous decisions still in audit trail
Takes effect: Immediately
```

**Option 2: Update Policy**
```
Go to Policies → [Policy Name] → Click "Edit"
Change condition or action
Click "Update"
Takes effect: Immediately
```

**Option 3: Rollback to Previous Version**
```
Go to Policies → [Policy Name] → Click "History"
See all versions of this policy
Click "Rollback to Version 2"
Previous logic restored
All decisions logged
```

**All options:**
- Instant execution (no deploy cycle)
- Logged for compliance
- No data loss
- Can re-enable anytime

---

### 7. Can multiple policies evaluate the same transaction?

**Q: What if two policies conflict?**

A: Yes, multiple policies can evaluate the same transaction. Here's how conflicts are resolved:

**Evaluation order (by strictness):**
1. All BLOCK policies checked first
2. If any BLOCK matches → Decision is BLOCK
3. Then REVIEW policies checked
4. If any REVIEW matches → Decision is REVIEW
5. Finally ALLOW policies
6. If all pass → Decision is ALLOW

**Example:**
```
Policy 1: Block amount > $10,000
Policy 2: Review amount > $5,000
Transaction: $8,000

Evaluation:
1. Check Policy 1: $8,000 < $10,000 → No block
2. Check Policy 2: $8,000 > $5,000 → REVIEW

Final Decision: REVIEW
```

**View evaluation trace:**
Go to Logs → Click transaction → "Evaluation Trace"
Shows which policies were evaluated and their results.

---

### 8. How do I prevent false positives (incorrectly blocked transactions)?

**Q: A legitimate transaction got blocked. How do I fix this?**

A: Three strategies:

**Strategy 1: Fine-tune your policy condition**
```
Current (Too strict):
  Block amount > $5,000

Refined (Better):
  Block amount > $5,000 AND customer_type = "new"
  (Only block high-value transactions from new customers)
```

**Strategy 2: Use REVIEW instead of BLOCK**
```
Change from:
  Action: BLOCK

To:
  Action: REVIEW
  (Requires human approval instead of auto-blocking)
```

**Strategy 3: Add exceptions with metadata**
```
Policy Condition:
  amount > $5,000 AND metadata.vip = false

Then:
  VIP customers can bypass policy (set vip: true)
  Other customers get reviewed
```

**Measure false positive rate:**
Go to Dashboard → Metrics
- % of BLOCKED transactions that were legitimate
- Target: <2%
- If higher: Review policy conditions

---

### 9. How do I train my team on DSG?

**Q: Where do team members learn how to use this?**

A: Multiple resources available:

**Built-in Resources:**
1. **In-app Help** — ? icon in bottom-right corner
2. **Docs** — https://tdealer01-crypto-dsg-control-plane.vercel.app/docs
3. **Video Tutorials** — Coming soon on our YouTube channel

**Onboarding Materials:**
1. Getting Started Guide (10 minutes)
2. Integration Tutorial (30 minutes)
3. Advanced Policies (60 minutes)

**Live Training:**
1. **30-min onboarding call** — hello@dsg.one
2. **Team workshop** (2 hours) — Custom training
3. **One-on-one support** — For specific team members

**Training Schedule by Role:**

| Role | Training | Time | Next Steps |
|------|----------|------|-----------|
| Owner | All materials | 3 hours | Set team up |
| Approver | REVIEW process, logs | 30 min | Start approving |
| Admin | Policies, team mgmt | 1 hour | Create policies |
| Viewer | Logs, audit exports | 20 min | Generate reports |

---

### 10. Can I use DSG with multiple payment processors (not just Stripe)?

**Q: Does DSG work with PayPal, Square, etc.?**

A: Currently **Stripe-native** but expanding:

**Today:**
- Stripe marketplace app (OAuth-integrated)
- Direct API integration (custom webhook from your system)

**Coming Soon:**
- PayPal integration
- Square integration
- Coinbase integration
- Custom payment processor webhooks

**If you use other processors now:**
1. Use our **Generic Webhook Adapter** (API integration)
2. Send transaction data from your system to DSG
3. DSG evaluates and returns decision
4. Your system acts on the decision

**Integration Steps:**
1. Create an API key in Settings
2. Send transactions via REST API
3. Receive decisions in real-time
4. Log decisions in your system

Example:
```bash
curl -X POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/evaluate \
  -H "Authorization: Bearer sk_test_..." \
  -d '{
    "amount": 5000,
    "agent_id": "agent_123",
    "processor": "paypal"
  }'
```

---

## Troubleshooting Guide

### Connection Issues

#### "Stripe not connected" error

**What this means:** OAuth connection failed or expired

**Fix:**
1. Go to Settings → Integrations
2. Click "Connect Stripe"
3. Re-authorize in Stripe OAuth dialog
4. Dashboard shows "Connected ✓"

**Why this happens:**
- First-time authorization
- OAuth token expired (auto-refresh failed)
- Stripe account revoked access

---

#### "Webhook not delivering" error

**What this means:** Your endpoint isn't receiving events

**Fix:**
1. Verify endpoint URL is correct: Settings → Integrations → Webhooks
2. Make sure your API is running
3. Check firewall allows inbound traffic
4. Test endpoint is reachable: `curl https://your-endpoint.com/webhooks/dsg`
5. Click "Send Test Event" to retry

**Why this happens:**
- URL typo
- Endpoint not running
- Firewall blocking inbound
- Endpoint doesn't return 200 OK
- Endpoint times out (>30 sec)

---

#### "Policy not executing" error

**What this means:** Policy created but not evaluating transactions

**Fix:**
1. Go to Policies → Click policy
2. Check status: Should be "ACTIVE" (not DISABLED)
3. Check condition: Make sure it matches your transaction
4. Create test transaction to verify

**Example:**
```
Policy: Block amount > $10,000
Test: Create $12,500 transaction
Expected: Should appear in logs as BLOCKED

If not showing up:
- Check policy is ACTIVE
- Check $12,500 matches condition
- Check transaction was sent to DSG
```

---

### Performance Issues

#### "Decision is slow" (>500ms)

**What this means:** Policy evaluation taking longer than expected

**Diagnosis:**
1. Go to Logs → Click transaction
2. Check "Execution Time" field
3. Normally <100ms
4. If >500ms, something is slow

**Causes & fixes:**
- Too many policies: Disable unused policies
- Complex conditions: Simplify policy logic
- Large metadata: Reduce data passed per transaction
- Network latency: Check webhook endpoint speed

---

#### "Logs are loading slowly"

**What this means:** Dashboard is slow to load decision history

**Fix:**
1. Try narrower date range: Filter last 7 days instead of 90
2. Search by policy name: Reduces result set
3. Close browser tabs: Free up memory
4. Refresh page: Force reload

---

### Data Issues

#### "Decision shows wrong reason"

**What this means:** Policy decision made but reason doesn't match condition

**Fix:**
1. Go to Logs → Click transaction
2. Click "Evaluation Trace"
3. See all policies evaluated and results
4. Identify which policy fired
5. Click policy name to view condition

**Why this happens:**
- Multiple policies evaluated
- Policy condition updated after decision
- Metadata values changed

---

#### "Audit trail is missing"

**What this means:** Decision made but not logged for compliance

**Fix:**
1. Go to Compliance → Audit Log
2. Search for transaction ID
3. If not found: Contact support

**Why this happens:**
- Rare case (auto-logged)
- System error (we'll fix)
- Data not sent to DSG

---

## Escalation Procedures

### Support Tiers

#### Tier 1: Self-Service (You can fix this)
- Check FAQ in this doc
- Review in-app documentation
- Look at Getting Started Guide

**Response time:** Immediate (you're reading it now)

#### Tier 2: Email Support
- For questions not in FAQ
- For advice on policies
- For feature requests

**Email:** hello@dsg.one  
**Response time:** <4 hours (business hours)

**What to include in email:**
- What's happening (be specific)
- Expected behavior
- Steps to reproduce
- Screenshot if possible
- Transaction ID if policy-related

**Example:**
```
Subject: Policy not executing for high-value transactions

Details:
- Policy: "Block Transfers Over $10,000"
- Test transaction: $12,500
- Expected: Decision should be BLOCKED
- Actual: No decision appears in logs
- Transaction ID: txn_abc123def456
```

#### Tier 3: In-App Chat
- Quick questions (non-urgent)
- Clarifications on features
- Integration help

**Access:** Click "?" icon bottom-right of dashboard  
**Hours:** Business hours (9am-6pm Pacific)  
**Response time:** <15 minutes during hours

#### Tier 4: Phone Support (Enterprise only)
- Critical production issues
- High-impact bugs
- Strategic questions

**Availability:** By appointment  
**How to request:** Email hello@dsg.one with "URGENT" in subject

---

### Issue Severity

**Critical (P1)** — Stop responding to requests
- Example: "All transactions are being blocked"
- Response: Immediate engineer assignment
- ETA: 15 minutes

**High (P2)** — Significant impact
- Example: "Webhook not delivering"
- Response: Urgent investigation
- ETA: 1 hour

**Medium (P3)** — Some impact
- Example: "One policy not executing"
- Response: Standard support
- ETA: 4 hours

**Low (P4)** — Cosmetic / question
- Example: "Can't find button on page"
- Response: During business hours
- ETA: 24 hours

---

## Community & Feedback Channels

### Customer Community
- **Slack:** Join our customer Slack (invite in onboarding email)
- **Forum:** https://community.dsg.one (feature requests, tips, ideas)
- **Twitter:** @dsg_one (product updates, customer spotlights)

### Feedback & Feature Requests
1. Use "Feature Request" button in Settings
2. Vote on existing requests in forum
3. Attend monthly product webinar (last Friday of month)

### Customer Success Stories
- Interested in being featured? Email: hello@dsg.one
- We love sharing customer wins
- Testimonial: 30-minute interview, brief case study

---

## Contact Information

| Channel | Contact | Hours | Response Time |
|---------|---------|-------|---|
| Email | hello@dsg.one | 24/7 | <4 hours |
| Chat | In-app widget | 9am-6pm PT | <15 min |
| Phone | +1 (415) 555-0100 | By appt | <2 hours |
| Slack | community.dsg.one | 24/7 | Community-driven |
| Forum | community.dsg.one | 24/7 | <24 hours |

---

## Common Integrations & Extensions

### Slack Notifications
Get real-time alerts when policies trigger:
1. Settings → Notifications → Add Slack
2. Connect your Slack workspace
3. Choose channel for alerts
4. Alerts for BLOCK, REVIEW, or all decisions

### Email Alerts
Get daily digest or real-time emails:
1. Settings → Notifications → Add Email
2. Choose frequency (real-time, hourly, daily)
3. Choose event types (BLOCK only, all, etc.)

### Jira Integration (Coming Soon)
Auto-create Jira tickets for REVIEW decisions:
- Settings → Integrations → Add Jira
- Map REVIEW decisions to ticket type
- Auto-assign to team members

### Custom Webhooks
Send decisions to your own system:
- Settings → Webhooks → Add Endpoint
- We POST full decision context
- Your system acts on the decision

---

## Data Privacy & Security

### What data does DSG store?

We store:
- Policy definitions (rules you create)
- Transaction data (amount, agent ID, timestamp)
- Decisions (ALLOW/BLOCK/REVIEW)
- Audit trail (for compliance)

We **never** store:
- Full credit card numbers
- Customer PII (personal info)
- Passwords or secrets
- Raw Stripe API keys

### Where is data stored?

- **Primary:** Encrypted at rest in Supabase (US region)
- **Backup:** Geographically redundant backups
- **Compliance:** SOC 2 Type II certified

### Can I delete data?

Yes:
1. **Policies:** Delete anytime (history remains)
2. **Audit trail:** Request via email for GDPR compliance
3. **Account:** Request full deletion, 30-day retention

---

## Getting Started

**Now that you understand DSG:**

1. ✓ Read top 10 Q&As above
2. Review troubleshooting guide (bookmarks for later)
3. Save contact info (hello@dsg.one)
4. Join community (Slack invite in email)
5. Deploy your first policy

**Questions not covered here?**
Email: hello@dsg.one  
Subject: "DSG Question: [Your topic]"

We're here to help you succeed.

— The DSG Team
