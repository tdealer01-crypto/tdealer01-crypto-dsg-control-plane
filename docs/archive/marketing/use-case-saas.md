# DSG for SaaS: Refund Control & Compliance

**Challenge → Solution → ROI**

---

## The Challenge

As a SaaS company, refunds are inevitable—and dangerous.

**The risks**:
- A customer service rep refunds $50k to the wrong account (honest mistake)
- A buggy integration script refunds every customer simultaneously ($500k exposure)
- A disgruntled employee refunds friends' accounts without authorization
- An API endpoint processes a refund request with zero verification (customer = attacker)

**Today's reality**:
- Refunds are fully automated (no approval gates)
- You audit refunds after they execute (too late)
- One mistake costs thousands, or more
- Compliance auditors ask: "How do you control large refunds?" (You don't.)

You need governance that prevents mistakes *before* the refund processes.

---

## The Solution: Pre-Execution Refund Control

DSG Governance Gate gates refund requests *before* Stripe processes them, evaluates them against your policies, and routes them to approvers when needed.

### Step 1: Define Your Policies

Create governance rules for refund size and risk:

```
Refund < $100:
  → Auto-approve instantly
  → No human review
  → Log for audit
  → Reason: Low risk, customer impact minimal

Refund $100–$500:
  → Auto-approve with logging
  → Log approval for audit trail
  → Alert finance if customer requested > 2 refunds in 7 days
  → Reason: Normal refund range, automatic handling safe

Refund $500–$2,000:
  → Require 1 approval (Customer Success Manager)
  → Route to CSM in Stripe Dashboard
  → Timeout: 30 minutes (auto-approve if no response)
  → Reason: Unusual size, verify customer reason + legitimacy

Refund $2,000–$10,000:
  → Require 2 approvals (CSM + Finance Manager)
  → Parallel approval (faster)
  → Timeout: 45 minutes total
  → Require comment: "Customer reason + CSM verification"
  → Reason: High financial impact, needs verification

Refund > $10,000:
  → Require 2 approvals + manager sign-off
  → Sequential approval (CSM → Finance → Ops Manager)
  → No timeout (must be manual, no auto-approve)
  → Require customer phone verification (CSM confirms identity)
  → Document: "Reason for refund + customer contact details"
  → Reason: Extreme risk, always manual review
```

### Step 2: Stripe Does the Gate

When a refund is requested (by customer or your system):

1. **Customer contacts support**: "I need to refund the last 3 months ($2,400)"
2. **Support agent opens customer in Stripe Dashboard**
3. **Agent initiates refund**: Clicks "Refund" on charge detail page
4. **DSG intercepts the refund request**:
   - Amount: $2,400
   - Policy matched: "$2,000–$10,000" tier
   - Action: Require 2 approvals
5. **DSG routes to approvers**:
   - CSM receives notification: "Refund request: $2,400. Verify customer reason."
   - Finance Manager receives notification: "Refund request: $2,400. Pending CSM approval."
6. **CSM reviews and approves** (within 15 min):
   - Comment: "Customer spoke by phone, verified integration failure on our side, refund justified"
7. **Finance Manager approves** (within 20 min):
   - Comment: "Approved, noted in customer account"
8. **DSG executes refund** (automatically after 2nd approval)
9. **Refund completes** + audit trail sealed with proof hash
10. **Customer receives email**: "Your refund of $2,400 has been processed and will appear in 3–5 business days"

### Step 3: You Get Proof

When auditors ask: *"How do you ensure large refunds are legitimate?"* you show:

**Audit Trail Example:**
```
Date: 2026-06-06
Refund ID: refund_1HkFxW
Charge ID: ch_1HjKqE
Amount: $2,400 USD
Policy Version: v1.8 (effective 2026-04-01)
Policy Hash: 4c7d2e1f...

Evaluation:
  Decision: REQUIRES_2_APPROVALS
  Reason: Amount in $2,000–$10,000 range
  Policy rule: "refund >= 2000 AND refund < 10000"
  Risk Score: 0.32 (low risk)
  Factors: Existing customer, normal product, legitimate reason
  
Approval Chain:
  ✓ Approver 1: Jennifer Lee (Customer Success Manager)
    Time: 2026-06-06 14:23:15 UTC
    Comment: "Customer verified by phone, integration failure confirmed on our end, refund justified"
    Duration: 14 minutes (from request to approval)
    Proof Hash: a1b2c3d4...
    
  ✓ Approver 2: Marcus Johnson (Finance Manager)
    Time: 2026-06-06 14:25:32 UTC
    Comment: "Approved, noted in customer account for follow-up"
    Duration: 2 minutes (from CSM approval to finance approval)
    Proof Hash: e5f6g7h8...

Final Proof: EXECUTION_APPROVED
  Chain Hash: z9y8x7w6v5u4t3s2r1q0p...
  Timestamp: 2026-06-06 14:25:33 UTC
  Execution Status: COMPLETED
  Settlement: 2026-06-09 (T+3 business days)
```

Auditors verify:
- Every refund > $500 has approval chain
- Refund reasons documented
- Approvers are verified staff (with roles)
- No large refunds approved by single person (conflict prevention)
- Proof hashes confirm no tampering

Result: Auditor-ready evidence in minutes, not spreadsheets.

---

## Real Numbers: Before & After DSG

### Before DSG

| Metric | Value |
|--------|--------|
| Refunds per week | 12–18 |
| Approval process | Email chains + spreadsheet |
| Time to process 1 refund | 10–45 minutes |
| Risk of unauthorized refund | Medium-high |
| Audit trail | Manual logs (easily altered) |
| Compliance review time | 2–3 weeks |
| Ability to block refund | Manual only (reactive) |
| One employee can refund | Up to $10k+? (unclear) |

**Scenario**: A disgruntled support rep gives a "friend" a $5k refund without customer request. No approval gate. Refund processes. Discovered in monthly audit (30 days later). $5k loss + reputational damage.

### After DSG

| Metric | Value |
|--------|--------|
| Refunds per week | 12–18 (same) |
| Approval process | DSG gates + Stripe Dashboard |
| Time to process 1 refund | 1–15 minutes (depends on size) |
| Risk of unauthorized refund | Low (gates prevent improper refunds) |
| Audit trail | Cryptographic proof hashes |
| Compliance review time | 1–2 hours |
| Ability to block refund | Instant (pre-execution) |
| One employee can refund | Only within $500 auto-approval tier |

**Same scenario**: Support rep initiates $5k refund. DSG blocks it (requires 2 approvals). CSM receives notification. CSM asks: "Why?" Rep has no answer. Refund blocked. Issue escalated. Risk prevented.

### Financial Impact (Year 1)

| Cost Item | Amount |
|-----------|--------|
| DSG Pro plan | $99/month × 12 = $1,188 |
| Staff time saved (approval chains) | 2 hours/week × 52 weeks × $50/hr = $5,200 |
| Prevented unauthorized refunds | 2–3 incidents × $5k average = $10,000–$15,000 |
| Compliance audit time saved | 3 weeks/year × 1 FTE × $80k salary = $4,615 |
| Improved customer trust | Harder to quantify, but valuable |
| **Total Benefit** | **$21,000–$26,000** |
| **ROI** | **1,700–2,100%** |

---

## Use-Case Scenarios

### Scenario 1: Auto-Approval (Small Refund)

**Customer Context**: Customer requests $75 refund (wrong product ordered)

**Timeline**:
- 09:15 UTC: Customer clicks "Request refund" in your app
- 09:15:01 UTC: DSG evaluates policy
- 09:15:02 UTC: Decision: ALLOW (amount < $100, auto-approve)
- 09:15:03 UTC: Refund created in Stripe
- 09:15:04 UTC: Audit trail generated with proof hash
- 09:16:00 UTC: Customer receives email: "Refund processed, will appear in 3–5 business days"

**Benefit**: Instant refund. Zero friction. Zero manual review. Customer happy.

---

### Scenario 2: Manual Approval (Medium Refund)

**Customer Context**: Customer disputes $1,500 charge (integration failure on our side)

**Timeline**:
- 14:20 UTC: Customer contacts support
- 14:20:15 UTC: Support agent verifies issue + initiates refund in Stripe Dashboard
- 14:20:16 UTC: DSG evaluates policy
- 14:20:17 UTC: Decision: REQUIRES_1_APPROVAL (amount $500–$2k tier)
- 14:20:18 UTC: Notification sent to CSM
  - Stripe Dashboard: "Refund request: $1,500 — Approve or Reject"
  - Slack: "@jennifer_lee New refund request: $1,500 (integration issue)"
- 14:22:00 UTC: Jennifer (CSM) reviews the charge details
- 14:22:30 UTC: Jennifer clicks "Approve" with comment: "Verified integration failure on 2026-05-10, customer entitled to refund"
- 14:22:31 UTC: DSG executes refund
- 14:22:32 UTC: Audit trail sealed, proof hash generated
- 14:23:00 UTC: Customer receives notification: "Your refund of $1,500 has been approved"

**Benefit**: Fast approval (2–3 minutes). Verification that refund is legitimate. Audit trail proves it was approved.

---

### Scenario 3: Escalation & Review (Large Refund)

**Customer Context**: Customer requests $12,000 refund after 30 days (unusual)

**Timeline**:
- 08:00 UTC: Customer contacts sales team: "I want to refund my annual subscription"
- 08:15 UTC: Sales agent routes to CSM + Finance
- 08:15:30 UTC: Support agent initiates refund in Stripe Dashboard
- 08:15:31 UTC: DSG evaluates policy
- 08:15:32 UTC: Risk factors detected:
  - Amount: $12,000 (exceeds $10k threshold)
  - Days since purchase: 37 (beyond normal return window)
  - Customer type: Annual subscriber (high value)
- 08:15:33 UTC: Decision: REQUIRES_ESCALATION + MANUAL_REVIEW
  - Reason: "High-value refund, requires manager sign-off"
- 08:15:34 UTC: Notifications sent
  - Jennifer (CSM): "Urgent: $12k refund request, customer is annual subscriber"
  - Marcus (Finance Manager): "Escalation: $12k refund needs your approval"
  - Sarah (Ops Manager): "Alert: Unusual refund amount"
- 08:30 UTC: Jennifer calls customer, verifies reason (business closure, legitimate)
- 08:35 UTC: Jennifer approves in Stripe Dashboard: "Customer verified, business closure confirmed, refund approved by CSM"
- 08:36 UTC: Marcus reviews CSM approval, verifies customer value + business case
- 08:40 UTC: Marcus approves: "Approved, issue partial service credit for unused time"
- 08:40:30 UTC: Sarah (Ops) reviews both approvals
- 08:41 UTC: Sarah approves: "Approved, process refund"
- 08:41:01 UTC: DSG executes refund
- 08:42:00 UTC: Audit trail sealed with 3-approval chain, proof hash generated
- 08:43:00 UTC: Customer receives notification + wire instructions

**Benefit**: Escalation triggers review by multiple stakeholders. Refund is verified as legitimate. Audit trail documents the entire approval chain. Compliance-ready evidence for auditors.

---

### Scenario 4: Blocked Refund (Fraud Prevention)

**Customer Context**: Attacker requests 5 refunds within 10 minutes (same card, different account)

**Timeline**:
- 03:00 UTC: Request 1: $300 refund
  - DSG: ALLOW (auto-approved, < $500)
  - Refund executes
- 03:02 UTC: Request 2: $450 refund (same card, different account)
  - DSG: ALLOW (auto-approved, < $500)
  - Refund executes
- 03:04 UTC: Request 3: $500 refund (pattern detected)
  - DSG analyzes: 3 refunds in 4 minutes from same card
  - Risk score: 0.85 (high risk, multiple refunds, rapid fire)
  - Decision: BLOCK (anomaly detected)
  - Reason: "Multiple refunds detected in short period. Requires manual review."
- 03:04:01 UTC: Notifications sent
  - Email (urgent): "BLOCKED refund attempt detected"
  - Slack: "@security_team ALERT: Unusual refund pattern detected"
- 03:05 UTC: Security team reviews
  - Sees 3 refunds in 4 minutes, same card
  - Checks account creation: Created 5 minutes ago (new account)
  - Conclusion: Likely fraud attempt
- 03:06 UTC: Security team blocks all further refunds for this card
- 03:10 UTC: Security team contacts customer via original payment method
  - "We detected unusual refund activity. Can you verify?"
  - If no response: Account flagged, card blocked

**Benefit**: Anomaly detection prevents fraud. Blocks refunds before they process. Alerts security team instantly.

---

## Implementation Checklist

### Week 1: Setup
- [ ] Install DSG from Stripe App Marketplace
- [ ] Connect to Stripe account
- [ ] Review policy templates (SaaS option)
- [ ] Customize refund tiers (based on your metrics)
- [ ] Test with non-production refunds

### Week 2: Onboarding
- [ ] Set up approver roles (CSM, Finance, Ops)
- [ ] Configure Slack notifications
- [ ] Train support team on approval UI in Stripe Dashboard
- [ ] Test approval workflow (CSM + Finance)
- [ ] Set up audit trail exports

### Week 3: Go-Live
- [ ] Enable DSG on production Stripe account
- [ ] Start with conservative thresholds (more auto-approvals)
- [ ] Monitor first 50 refunds
- [ ] Collect feedback from approvers
- [ ] Refine policies based on feedback

### Ongoing: Optimization
- [ ] Monitor approval rates + times
- [ ] Adjust thresholds based on refund patterns
- [ ] Review blocked/anomaly refunds monthly
- [ ] Share audit trails with compliance team
- [ ] Plan integrations (Slack workflows, custom webhooks)

---

## ROI Metrics to Track

### Operational Metrics
- **Median refund time**: Target < 5 minutes
- **Auto-approval rate**: Target 80%+ (most refunds auto-approved)
- **Approval success rate**: Target 95%+ (few refunds rejected)
- **Blocked/anomaly rate**: Target 1–3% (catch fraud/mistakes)

### Compliance Metrics
- **Audit trail generation**: 100% of refunds have proof hash
- **Large refund approval**: 100% of refunds > $1k have approvals
- **Audit review time**: Reduction from weeks to hours

### Financial Metrics
- **Prevented fraud/mistakes**: $ value of blocked unauthorized refunds
- **Staff time saved**: Hours/week spent on approval chains
- **Cost per gated refund**: (Annual DSG cost) / (Annual refunds)
- **Compliance audit cost**: Reduction in audit fees

---

## Common Questions

**Q: Will this delay refunds for customers?**
A: No. Auto-approved refunds (< $500) execute instantly. Refunds requiring approval are routed to approvers within seconds—most are approved within 2–5 minutes. Total time is usually less than manual email chains.

**Q: What if an approver rejects a refund?**
A: The refund is blocked. Your support team is notified and can follow up with the customer to discuss. You have full control over the decision.

**Q: Can we set different approval rules for different customer types?**
A: Yes. You can create custom policies based on customer segment, subscription type, revenue, or other metadata. Contact DSG team for advanced customization.

**Q: How does this integrate with our billing system?**
A: DSG sits between your system and Stripe. When you call Stripe's refund API, DSG intercepts it, evaluates policy, and routes for approval. Your API call returns with decision metadata.

**Q: Can we export refund audit trails?**
A: Yes. CSV/JSON exports available. Schedule exports to your compliance system. Use for audits, chargeback documentation, and tax reconciliation.

---

## Next Steps

1. **Schedule a 30-min demo**: [Calendar link](https://calendar.app.google.com/calendar/u/0/r/eventedit?ctz=America/Los_Angeles)
2. **Install DSG** from [Stripe App Marketplace](https://marketplace.stripe.com)
3. **Start with Free plan** (100 refunds/month) and test your policies
4. **Upgrade to Pro** when ready for unlimited operations

---

## Contact

Questions about DSG for your SaaS refund control?

- **Email**: [support@dsg.pics](mailto:support@dsg.pics)
- **Sales**: [sales@dsg.pics](mailto:sales@dsg.pics)
- **Security & Compliance**: [security@dsg.pics](mailto:security@dsg.pics)

*DSG Governance Gate: Pre-execution gating, proof hashes, compliance ready.*
