# Post-Submission Tracking — DSG Governance Gate

**Status:** Submission submitted (or in progress)  
**Timeline:** Days 1-43 from submission date  
**Review URL:** https://dashboard.stripe.com/apps

---

## Submission Record

Fill in these details immediately after submitting:

```
Submission Date: _____________
App ID: _____________
Confirmation Email Received: Yes / No
Email Received Date: _____________
```

---

## Days 1-5: Initial Review

**What Stripe is doing:**
- Reviewing your app metadata (name, description, icons, screenshots)
- Checking legal documents (privacy policy, terms of service)
- Verifying company information
- Initial compliance scan

**What you should do:**
- Check email daily for any questions from Stripe
- Verify support email is monitored
- Keep this dashboard open: https://dashboard.stripe.com/apps
- Take daily screenshot of app status

**Common Stripe emails (Days 1-5):**
- "We received your submission" (confirmation)
- Sometimes: "More info needed on [item]"

**If Stripe asks a question:**
- Respond within 24 hours
- Be specific and factual
- Include evidence (screenshots, links) if requested

---

## Days 5-10: Technical Testing

**What Stripe is doing:**
- Testing OAuth implementation
  - Granting permission via OAuth
  - Verifying token exchange
  - Testing credential refresh
- Testing webhook endpoint
  - Sending test events
  - Verifying signature validation
  - Checking error handling
- Testing API access with requested permissions

**What you should do:**
- Ensure OAuth endpoint is accessible
- Ensure webhook endpoint is accessible
- Monitor webhook logs at: https://dashboard.stripe.com/webhooks
- Check app logs for errors

**Expected Status Change:**
```
Before: "In Review" or "Pending"
After:  "In Review" or "Testing OAuth"
```

**If webhook shows "Pending":**

See: PHASE9_SUBMISSION_READY.md → "Webhook Verification Troubleshooting"

Quick fix checklist:
```bash
# 1. Test endpoint is accessible
curl -X POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/stripe/webhook/events \
  -H "Content-Type: application/json" \
  -d '{"type":"test"}' -v

# Expected: 200 OK or 400 Bad Request (not 503, 404, timeout)

# 2. Check endpoint logs
# Go to your app logs/monitoring and look for webhook requests

# 3. If still failing, email Stripe with:
# - Exact webhook URL
# - Curl test result
# - Any error messages from your logs
```

---

## Days 10-20: Possible Change Requests

**What Stripe might ask:**
- "Your description is unclear. Please clarify [feature]."
- "Can you provide test credentials for OAuth testing?"
- "Your permissions seem excessive. Why do you need [permission]?"
- "Can you explain what 'deterministic governance' means?"
- "Do you have a working demo we can test?"
- "Tell us more about your company/team."
- "What data do you store and for how long?"
- "How do you handle failures or outages?"

**Response Template Process:**

1. **Stripe sends email to t.dealer01@dsg.pics**
   ```
   Subject: Changes Requested - DSG Governance Gate [APP_ID]
   
   We need clarification on:
   - [Item 1]
   - [Item 2]
   
   Please respond within 7 days.
   ```

2. **Respond within 24 hours with:**
   - Detailed answer to each question
   - Supporting evidence (links, screenshots, videos)
   - Factual claims only, no exaggeration
   - Professional tone

3. **Update dashboard if needed:**
   - If change is to description, icon, or screenshots:
     - Go to https://dashboard.stripe.com/apps/[APP_ID]
     - Click "Edit" next to the field
     - Make the change
     - Save
     - Go back to Dashboard
     - Submit for review again

4. **Confirm to Stripe:**
   - Reply to their email: "Changes submitted on [date]. Please review."
   - Stripe will re-queue your app
   - Expect 3-5 more business days

---

## Response Templates for Common Questions

### Q: "Your description is unclear. Can you explain your value proposition?"

**Response:**
```
Thank you for the feedback.

DSG Governance Gate prevents unwanted or risky Stripe operations before 
they execute. Here's what that means in practice:

Current Problem:
- Stripe charges execute immediately
- No control points to review high-risk charges before execution
- No audit trail explaining why a charge succeeded or failed
- Complex organizations can't enforce governance policies

DSG Solution:
1. Pre-Execution Gate: When a charge/refund/payout is about to execute, 
   our app evaluates a policy (e.g., "charges > $10,000 need approval")
2. Deterministic Decision: The policy always produces the same decision 
   (PASS/REVIEW/BLOCK) for the same input, making audits verifiable
3. Immutable Audit Trail: Every decision is recorded with proof, 
   enabling regulatory compliance
4. No Code Required: Merchants configure policies in our UI, no custom 
   integration needed

Use Cases:
- Compliance teams requiring pre-execution governance
- Multi-approval workflows for high-value charges
- Regulatory audit trails (PCI-DSS, SOC2, etc.)
- Risk management at scale

The key innovation: governance BEFORE execution, with immutable proof of 
every decision.

Live demo available at: [Your demo URL or offer to schedule a call]
```

---

### Q: "Why does your app need charge:write permission? That seems like a lot of access."

**Response:**
```
Great question. Here's why we request charge:write specifically:

Permission Levels Explained:
1. charge:read (requested): Examine a charge to evaluate policy
2. charge:write (requested): Apply the policy decision to the charge

However, we design for graceful degradation:

Scenario 1 - Read-Only Mode:
If a merchant grants only charge:read, governance decisions appear as 
RECOMMENDATIONS in the dashboard. The merchant approves/rejects manually.

Scenario 2 - Automated Enforcement:
If a merchant grants charge:write, policy decisions can auto-execute. 
But ONLY policy-defined actions are allowed. We can't:
- Charge random customers
- Modify amounts
- Access other merchant data
- Do anything outside the active policies

Safety Measures:
- All write operations are logged
- Merchants can revoke our access at any time (OAuth revocation)
- Each write is tied to a specific, recorded policy
- Merchants retain full control of their Stripe account
- Write operations are reversible

Recommendation for Stripe review:
We recommend merchants start in read-only mode and escalate to automated 
enforcement only after proving the policies are correct.
```

---

### Q: "Can you clarify what 'deterministic' means? Why is that important?"

**Response:**
```
Absolutely. This is a key innovation.

What "Deterministic" Means:
- Reproducible: Given the same inputs (charge amount, customer, policy), 
  the same decision is produced every time
- Predictable: Merchants can understand exactly why a decision was made
- Auditable: An independent auditor can verify the decision was correct
- Immutable: The decision and its justification are recorded permanently

Example:
Policy: "Block charges > $50,000 from new customers"

Charge 1: $60,000 from customer_id=123 (new) → BLOCK
Charge 2: $60,000 from customer_id=123 (new) → BLOCK (same decision)
Charge 3: $60,000 from customer_id=456 (returning) → PASS (different)

Because the decision is deterministic, an auditor can verify:
✓ The policy was correctly applied
✓ The decision matches the documented rule
✓ The same rule is applied consistently
✓ No hidden or unpredictable behavior

Why It Matters:
- Compliance: Regulators (PCI-DSS, SOC2) require auditability
- Risk: Predictable policies reduce operational risk
- Trust: Merchants know exactly what the app does
- Certification: Deterministic systems are easier to certify

This contrasts with non-deterministic systems (e.g., ML-based risk scores) 
where the same input might produce different decisions. Those are useful 
but harder to audit and certify.
```

---

### Q: "What data do you store? What about privacy and compliance?"

**Response:**
```
Thank you for the privacy question. Here's our data handling:

Data We Collect:
1. Governance decisions (PASS/REVIEW/BLOCK)
2. Policy evaluations (which rules matched, why)
3. Audit trail (timestamp, user, decision, proof)
4. Webhook events (charge metadata, payout status, refund status)

Data We DO NOT Collect:
- Personal information (name, email, phone) of customers
- Payment methods or card details
- Customer addresses or identity details
- Any PII beyond what Stripe sends in webhooks

Data Storage:
- Location: [Specify: US East 1 / US or EU based on your setup]
- Backend: Supabase PostgreSQL
- Encryption: In-transit (HTTPS) + at-rest (AES-256 via Supabase)
- Retention: [Specify your policy, e.g., 7 years for compliance, or 
  indefinitely, or until merchant deletes]
- Deletion: Merchants can request full deletion at any time

Third-Party Services:
- Supabase (data storage) — SOC2 certified
- Stripe API — We read only what you authorize
- [Any other services]
- NO: We do not share data with third parties
- NO: We do not use data for ML training
- NO: We do not sell data

Compliance:
- HTTPS encryption (always)
- Restricted database access (API keys per customer)
- Audit logs (all access is logged)
- Stripe OAuth (no direct credentials stored)

Security:
- We conduct regular security reviews
- We use industry-standard encryption
- We follow OWASP guidelines
- [Mention any certifications: SOC2, ISO27001, etc.]

Regulatory:
- GDPR compliant (EU customer data deletion on request)
- CCPA compliant (California data deletion on request)
- PCI-DSS scope: We do not process or store card data
- SOC2: [Status — pending audit / in progress / certified]

Full details available at: https://dsg.pics/privacy
```

---

### Q: "Can you provide test credentials and demo access?"

**Response:**
```
Absolutely. Here's how Stripe can test our app:

Option 1 - Sandbox Test Account (Recommended):
1. Create a Stripe Sandbox account here:
   https://dashboard.stripe.com/register?redirect=/test
   
2. Use these test cards:
   - Success: 4242 4242 4242 4242 (Exp: 12/25, CVC: 123)
   - Decline: 4000 0000 0000 0002 (Exp: 12/25, CVC: 123)
   
3. Our app is live on production. You can test OAuth flow:
   - Start at: https://tdealer01-crypto-dsg-control-plane.vercel.app/stripe/connect
   - Complete OAuth with your test account
   - Governance policies will be evaluated on test charges

Option 2 - Live Demo Environment:
We've set up a demo environment at:
- URL: [If you have one]
- Test policies are pre-configured
- You can simulate charges and see governance gates in action
- Reset available on demand

Option 3 - Scheduled Demo Call:
If you prefer a live walkthrough:
- Schedule: [Your availability]
- Duration: 30-45 minutes
- We'll show OAuth flow, policy evaluation, webhook integration
- Q&A about security, compliance, data handling
- Contact: t.dealer01@dsg.pics to schedule

Technical Details for Review:
OAuth Flow:
- Redirect URI: https://tdealer01-crypto-dsg-control-plane.vercel.app/stripe/oauth/callback
- Scope Requested: charge:read, charge:write, payout:read, refund:read, payment_intent:read
- Token Exchange: Per Stripe OAuth spec (client_credentials + refresh)
- Error Handling: Graceful fallback on auth failures

Webhook Configuration:
- Endpoint: https://tdealer01-crypto-dsg-control-plane.vercel.app/api/stripe/webhook/events
- Signature Verification: Using stripe-signature header
- Event Handling: Fire-and-forget with exponential backoff retry
- Logging: All events logged for audit trail

Let us know which option works best.
```

---

### Q: "What happens if your app fails or goes down?"

**Response:**
```
Great question about reliability. Here's our failover strategy:

Failure Modes and Responses:

Scenario 1 - Our app is unreachable (connection timeout):
- User sees: "Governance decision pending manual review"
- Charge status: Temporarily held pending approval
- User action: Can manually review and approve/reject
- Timeline: Safe to wait 5-10 minutes for us to recover
- Our side: We're alerted immediately, on-call engineer responds

Scenario 2 - Our app returns an error (500 error):
- User sees: "Governance policy evaluation failed"
- Charge status: Held pending manual review
- Safety: App NEVER defaults to PASS/auto-approve on error
- User action: Can manually approve, or wait for fix
- Our side: Error is logged, root cause investigated within 1 hour

Scenario 3 - Webhook delivery fails:
- Stripe retry: Stripe retries webhook delivery (exponential backoff)
- Our side: Queue will catch up when we're healthy
- Timeline: Typical retry window is 24 hours
- Notification: User gets email if webhook fails 5+ times

Our Uptime Commitment:
- Target: 99.9% uptime (11.5 minutes downtime/month)
- Monitoring: 24/7 automated monitoring, alerts to on-call
- Redundancy: [Specify: Multiple instances, multi-region, etc.]
- Status Page: https://status.dsg.pics (optional — add if available)

Maintenance Windows:
- Scheduled: Announced 2 weeks in advance
- Typical length: 15-30 minutes
- Frequency: Monthly (2nd Tuesday, 2am-3am US/Eastern)
- Notice: Email sent to support_email with window date/time

Incident Response:
- Critical issues: Fixed within 4 hours
- Major issues: Fixed within 24 hours
- Minor issues: Fixed in next 2-week deployment

Communication:
- Major outages: Email sent immediately
- Status updates: Every 30 minutes during incident
- Resolution notification: Email + status page update

You retain full control:
- You can disable our app at any time (OAuth revocation)
- All your Stripe data remains in Stripe
- We have no mechanism to block or hold charges after disconnect
- Charge history is preserved
```

---

## Days 20-30: Final Review (if changes requested)

**What Stripe is doing:**
- Re-reviewing your changes
- Verifying answers to questions
- Final compliance check
- Preparing approval or rejection

**What you should do:**
- Monitor status on https://dashboard.stripe.com/apps/[APP_ID]
- Don't submit further changes unless asked
- Continue monitoring support email
- Prepare for approval announcement

**Expected Status Change:**
```
Before: "Changes Requested" or "In Review"
After:  "Approved" or "In Review" (final)
```

---

## Days 30-43: Final Decision

**Stripe will send one of these emails:**

### Scenario 1: Approval ✓

```
Subject: Your app "DSG Governance Gate" has been approved!

Congratulations! Your app submission has been approved and will be 
published in the Stripe App Marketplace.

App ID: [Your App ID]
App Name: DSG Governance Gate
Status: APPROVED
Marketplace URL: https://marketplace.stripe.com/apps/dsg-governance-gate

Your app is now available for merchants to discover and install:
- Through Stripe Dashboard → Apps → Marketplace
- Direct link: [Direct URL]
- Search results for "governance", "risk management", etc.

Next Steps:
1. Update your website to mention Stripe App Marketplace availability
2. Promote your app to potential customers
3. Monitor support email for merchant inquiries
4. Check app analytics on https://dashboard.stripe.com/apps

Welcome to the Stripe App Marketplace!
```

**What to do if approved:**
1. Email goes to: t.dealer01@dsg.pics
2. Check the Stripe App Marketplace URL
3. Update website/marketing materials with new link
4. Create FAQ page based on feedback from Stripe
5. Plan ongoing support and feature updates
6. Monitor installations on app analytics dashboard

### Scenario 2: Rejection ✗

```
Subject: Update needed - DSG Governance Gate

We're unable to approve your app at this time due to:
- [Reason 1]
- [Reason 2]

You can resubmit after making these changes:
- [Required change 1]
- [Required change 2]

Contact us at [support email] if you have questions.
```

**What to do if rejected:**
1. Read the email carefully
2. Identify each required change
3. Fix the issue (description, permissions, docs, etc.)
4. Resubmit through dashboard
5. Timeline resets (expect 1-43 days again)

Note: Rejections are rare. Most apps get approved after 1-3 feedback rounds.

---

## Daily Status Checklist

Print this and check daily for first 43 days:

```
Day ___  Date: _______

[ ] Email checked for Stripe communications
[ ] Dashboard status reviewed: https://dashboard.stripe.com/apps/[APP_ID]
[ ] Support email (t.dealer01@dsg.pics) checked
[ ] App logs checked for errors
[ ] Webhook logs checked: https://dashboard.stripe.com/webhooks
[ ] Any issues responded to within 24 hours
[ ] Status logged in tracking document

Current Status: _______________
Last Stripe Email: _____________
Date Received: _____________
```

---

## Status Reference

| Status | Meaning | Expected Next |
|--------|---------|---|
| Draft | Not yet submitted | Submit to Stripe |
| Submitted | Initial review | Stripe reviews assets (Days 1-5) |
| In Review | Active review | Stripe tests OAuth/webhooks (Days 5-10) |
| Testing OAuth | OAuth testing in progress | Test results (Days 10-15) |
| Changes Requested | Stripe needs clarification | Respond & resubmit (Days 10-20) |
| Final Review | After changes submitted | Approval or rejection (Days 20-30) |
| Approved | App approved! | App goes live in marketplace |
| Rejected | App declined | Fix issues & resubmit |
| On Marketplace | App is live | Monitor installations |

---

## What NOT to Do

❌ **Don't:**
- Claim features you haven't built
- Exaggerate compliance/certifications
- Promise SLAs you can't keep
- Hide failures or downtime
- Use vague or unclear language
- Respond to Stripe after 7 days without contact
- Change submission multiple times without asking
- Include secrets or API keys in documentation

---

## Escalation Contacts

| Issue | Contact | Email |
|-------|---------|-------|
| Webhook not verifying | Stripe Partner Support | stripe-partner-support@stripe.com |
| App stuck in review | Stripe Support | support@stripe.com |
| OAuth not working | Stripe API Support | api-support@stripe.com |
| Technical question | Your team | t.dealer01@dsg.pics |

---

## Success Indicators

Your submission is succeeding if you see:

✓ Status changes from "Submitted" → "In Review" → "Testing" (Days 1-10)
✓ Stripe sends at least 1 confirmation email
✓ Webhook shows "Verified" in Stripe dashboard
✓ No error messages in Stripe app logs (first 10 days)
✓ If asked questions, you respond within 24 hours
✓ Status changes to "Approved" (Days 10-43)

---

## Next Steps After Approval

Once approved, see: `docs/MARKETPLACE_LAUNCH.md` for:
- Marketing your app
- Promoting to potential customers
- Setting up support processes
- Monitoring adoption metrics
- Planning feature roadmap

---

**Version:** 1.0  
**Last Updated:** 2026-06-07  
**Maintained by:** DSG Team
