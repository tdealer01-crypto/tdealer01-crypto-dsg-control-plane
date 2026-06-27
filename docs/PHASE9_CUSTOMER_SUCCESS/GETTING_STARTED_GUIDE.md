# Getting Started with DSG Governance Gate (10 Minutes)

**Estimated time: 10 minutes**  
**No technical background required**

Welcome to DSG ONE — the control plane for AI governance and transaction approval. This guide gets you from signup to your first live policy in 10 minutes.

---

## What is DSG Governance Gate?

DSG Governance Gate is a **real-time decision layer** that sits between your transactions and execution. It:

✓ **Evaluates every transaction or AI action** against your governance policies  
✓ **Makes instant decisions** (Allow, Block, or Review)  
✓ **Builds an audit trail** for compliance  
✓ **Scales with your business** (from 1 transaction to 10M/month)  

### Use Cases

**Transaction Safety**
- Block transfers > $10,000 until manager approval
- Flag suspicious payment patterns
- Enforce 24-hour holds on high-risk transactions

**AI Agent Governance**
- Limit agent daily spend to $X
- Require approval before agent can execute risky actions
- Record every agent decision in audit trail

**Compliance & Audit**
- Generate real-time audit evidence
- Export compliance reports (SOC 2, ISO 27001, etc.)
- Prove governance decisions to auditors

---

## Step 1: Install on Stripe Dashboard (2 minutes)

### Prerequisites
- A Stripe account (live or test mode)
- Owner or Admin access to Stripe dashboard
- An email address for DSG account

### Installation Steps

1. **Go to your Stripe account**
   - URL: https://dashboard.stripe.com

2. **Navigate to Apps > Apps & Integrations**
   - Click the 3-line menu (top-left)
   - Select Settings > Apps & integrations
   - Click "Find new apps"

3. **Search for "DSG Governance Gate"**
   - Click on the DSG app card
   - Click "Install app"

4. **Authorize DSG Access**
   - You'll be redirected to https://tdealer01-crypto-dsg-control-plane.vercel.app
   - Click "Connect Stripe"
   - A Stripe OAuth window appears
   - Click "Authorize" to approve
   - You'll be redirected to your DSG Dashboard

5. **You're Connected!**
   - Your dashboard now shows "Stripe Connected ✓"
   - Your Stripe account ID is displayed

---

## Step 2: View Your Dashboard (2 minutes)

Once connected, you'll see:

### Dashboard Home
- **Quick Stats**: Active policies, decisions made today, team members
- **Recent Decisions**: Log of the last 10 policy evaluations
- **Quick Actions**: "New Policy" button, "View Logs" button
- **Welcome Banner**: Links to tutorials and support

### Left Sidebar Navigation
- **Dashboard** → Overview and quick stats
- **Policies** → Create and manage governance policies
- **Logs** → View all policy decisions in real-time
- **Compliance** → Export audit trails and evidence
- **Settings** → Configure integrations, team, notifications
- **Docs** → In-app documentation and tutorials
- **Support** → Contact our team

### Key Dashboard Metrics (Month 1)
- **Policies Active**: How many policies are currently running
- **Decisions Made**: Total number of policy evaluations
- **Average Decision Time**: How fast policies execute (typically <100ms)
- **Blocked/Reviewed**: How many decisions weren't auto-approved
- **Team Members**: Who has access to your governance

---

## Step 3: Deploy Your First Policy (3 minutes)

A **policy** is a single rule that makes decisions about transactions or actions.

### Example Policy: "Block Large Transfers"

1. **Go to Policies → New Policy**

2. **Name your policy**
   - Name: `Block Transfers Over $10,000`

3. **Set your condition**
   - Condition Type: `Transaction Amount`
   - Operator: `Greater Than`
   - Value: `10000`

4. **Set your action**
   - Action: `BLOCK`
   - Message: `Transfers over $10,000 require manual approval`

5. **Deploy**
   - Click "Deploy Policy"
   - Status changes to "ACTIVE ✓"
   - Policy is now live

### What Happens Next
- Every transaction is evaluated against this policy
- Transactions > $10,000 are blocked automatically
- Blocked transactions appear in your logs
- You receive a notification (if configured)

---

## Step 4: Test Webhook Delivery (2 minutes)

A **webhook** is how DSG sends governance decisions to your system.

### View Recent Webhook Events

1. **Go to Logs → Webhook Events**

2. **Look for recent events**
   - Event Type: `policy.evaluated`
   - Status: `Delivered` or `Pending`
   - Timestamp: Shows when the decision was made

3. **Click an event to see details**
   - Policy Name: Which policy was evaluated
   - Decision: ALLOW / BLOCK / REVIEW
   - Reason: Why the decision was made
   - Transaction Details: Amount, agent ID, etc.

### Example Webhook Payload
```json
{
  "id": "evt_abc123",
  "type": "policy.evaluated",
  "timestamp": "2026-06-07T12:00:00Z",
  "policy": {
    "id": "pol_xyz789",
    "name": "Block Transfers Over $10,000",
    "version": 1
  },
  "decision": {
    "action": "BLOCK",
    "reason": "Transaction amount $12,500 exceeds limit of $10,000",
    "confidence": 1.0
  },
  "transaction": {
    "amount": 12500,
    "currency": "USD",
    "agent_id": "agent_123",
    "timestamp": "2026-06-07T11:59:45Z"
  },
  "audit_trail": {
    "entry_id": "audit_abc123",
    "timestamp": "2026-06-07T12:00:00Z"
  }
}
```

---

## Step 5: Quick Wins — 3 Policies to Start With

Once you're comfortable with the basics, deploy these 3 policies to see immediate results:

### Policy 1: High-Value Transaction Review
**Goal:** Catch big transactions for review before they settle  
**When to use:** You want visibility into large moves but don't want to block them outright

```
Name: High-Value Transaction Review
Condition: Transaction Amount > $5,000
Action: REVIEW (creates a pending decision in your queue)
Message: "Large transaction requires review before settlement"
```

**What Happens:**
- Transactions > $5,000 appear in your "Pending Approvals" queue
- Your team can click "Approve" or "Block" in real-time
- Decision is recorded in the audit trail

### Policy 2: Agent Spend Limit
**Goal:** Limit how much an AI agent can spend per day  
**When to use:** You want guardrails on agent autonomy

```
Name: Daily Agent Spend Limit
Condition: Agent Daily Spend > $1,000
Action: BLOCK
Message: "Agent has exceeded daily spend limit of $1,000. Requires escalation."
```

**What Happens:**
- Agents can spend up to $1,000/day automatically
- Anything over that requires manual approval
- Daily limits reset at midnight UTC

### Policy 3: Dispute & Refund Flag
**Goal:** Ensure high-risk actions are logged and reviewed  
**When to use:** You need audit evidence for every chargeback or refund

```
Name: Compliance: Flag All Refunds
Condition: Transaction Type = "Refund" OR "Dispute"
Action: REVIEW
Message: "Refund/dispute requires compliance review"
```

**What Happens:**
- Every refund or dispute is flagged automatically
- Your compliance team gets a notification
- The decision is recorded with full evidence trail
- You can export this for audits

---

## How to Test These Policies (Safe Testing)

### Test Mode (No Real Transactions)
1. Go to **Settings → Environment**
2. Toggle **Test Mode ON**
3. Create a test transaction without charging a card
4. Watch the policy execute in real-time
5. See the decision in your logs

### Test Transaction Example
```
Amount: $12,500
Agent ID: test-agent-001
Type: Transfer
Expected Decision: BLOCK (because > $10,000)
```

### View Test Results in Logs
1. Go to **Logs → Recent Decisions**
2. Filter by "test" in the search box
3. Click on your test transaction
4. See:
   - Policy that was evaluated
   - Decision (ALLOW / BLOCK / REVIEW)
   - Reason for decision
   - Execution time (should be <100ms)
   - Full audit trail entry

---

## Verify Your Setup is Working

By this point, you should see:

✓ **Stripe Connected** (Dashboard shows "Connected ✓")  
✓ **First Policy Live** (Status shows "ACTIVE" in Policies list)  
✓ **Logs Visible** (At least one test transaction in Logs → Recent Decisions)  
✓ **Audit Trail Recorded** (Compliance → Audit Log shows entries)  

If any of these are missing:
- **Stripe not connected?** Go back to Step 1 and retry authorization
- **No logs appearing?** Make sure test transactions are being sent (check Test Mode is ON)
- **Policy not executing?** Click the policy to verify its condition is correct

---

## What's Next

### Immediate (This Week)
1. ✓ Deploy first policy (you're done!)
2. Create 1-2 more policies from the "Quick Wins" section
3. Invite a team member to approve REVIEW decisions
4. Test a transaction in Test Mode

### Short-term (This Month)
1. Move one policy from Test Mode to Live (production transactions)
2. Create a custom policy for your specific business rules
3. Set up Slack or email notifications
4. Export your first audit trail for compliance

### Long-term (Ongoing)
1. Add advanced policies with multiple conditions
2. Set up custom webhooks to send decisions to your systems
3. Integrate governance into your approval workflows
4. Monthly compliance reviews and policy updates

---

## Quick Reference: Key URLs

| What | URL |
|------|-----|
| Your Dashboard | https://tdealer01-crypto-dsg-control-plane.vercel.app/dashboard |
| Create New Policy | https://tdealer01-crypto-dsg-control-plane.vercel.app/policies/new |
| View Logs | https://tdealer01-crypto-dsg-control-plane.vercel.app/logs |
| Audit Trail | https://tdealer01-crypto-dsg-control-plane.vercel.app/compliance/audit |
| Settings | https://tdealer01-crypto-dsg-control-plane.vercel.app/settings |
| Team Management | https://tdealer01-crypto-dsg-control-plane.vercel.app/settings/team |
| Integrations | https://tdealer01-crypto-dsg-control-plane.vercel.app/settings/integrations |
| Full Docs | https://tdealer01-crypto-dsg-control-plane.vercel.app/docs |
| Support | https://help.dsg.one |

---

## Getting Help

### Self-Service
- **In-app Help**: Click "?" icon in bottom-right corner
- **Documentation**: https://tdealer01-crypto-dsg-control-plane.vercel.app/docs
- **FAQ**: https://help.dsg.one/faq
- **Video Tutorials**: https://youtube.com/@dsgone (coming soon)

### Live Support
- **Email**: hello@dsg.one
- **Chat**: Click chat icon on dashboard (during business hours)
- **Phone**: +1 (415) 555-0100 (enterprise only)

### Common Questions

**Q: When do my policies take effect?**  
A: Immediately after you click "Deploy Policy". There's no waiting period.

**Q: Can I test without affecting real transactions?**  
A: Yes! Turn on Test Mode in Settings. Test transactions don't charge cards.

**Q: What happens if I disable a policy?**  
A: Transactions bypass that policy going forward. Historical decisions remain in audit trail.

**Q: How long do you keep audit logs?**  
A: All decisions are kept forever (encrypted, compliant with SOC 2).

**Q: Can I change a policy after deploying it?**  
A: Yes. Click the policy, edit it, and click "Update". Changes take effect immediately.

---

## You're Ready

You've completed the Getting Started Guide. Your DSG Governance Gate is now protecting your transactions in real-time.

**Next stop: Integration Tutorial (30 minutes)** to understand webhooks, APIs, and advanced testing.

**Happy governing!**

— The DSG Team
