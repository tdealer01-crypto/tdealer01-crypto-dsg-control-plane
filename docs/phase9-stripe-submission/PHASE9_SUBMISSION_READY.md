# Phase 9: Stripe Marketplace Submission Ready

**Status:** Ready for Manual Dashboard Submission  
**Last Updated:** 2026-06-07  
**Timeline:** Submission → Review (Days 1-43) → Approval

---

## Pre-Submission Validation Checklist

Run these checks BEFORE submitting to Stripe Dashboard:

```bash
# 1. Validate all assets exist and meet specs
bash docs/phase9-stripe-submission/scripts/validate-submission.sh

# 2. Generate submission manifest for reference
node docs/phase9-stripe-submission/scripts/generate-submission-manifest.json

# 3. Run final 20-item pre-submit checklist
bash docs/phase9-stripe-submission/scripts/pre-submit-checklist.sh
```

**All three scripts must pass before proceeding to Dashboard.**

---

## Quick Pre-Flight Check (2 minutes)

Before opening Stripe Dashboard:

- [ ] App name finalized: **DSG Governance Gate**
- [ ] Support email ready: **t.dealer01@dsg.pics**
- [ ] Homepage URL ready: **https://dsg.pics**
- [ ] Webhook endpoint ready: **https://tdealer01-crypto-dsg-control-plane.vercel.app/api/stripe/webhook/events**
- [ ] OAuth redirect URIs ready (see section below)
- [ ] Icon ready: 1200x1200 PNG
- [ ] 3+ screenshots ready (1200x800 recommended)
- [ ] Description ready: 4000 chars max
- [ ] Support contact info validated
- [ ] Privacy policy URL ready
- [ ] Terms of Service URL ready

---

## Step-by-Step Stripe Dashboard Submission

### T+0: Open Stripe Apps (2 min)

1. Go to: https://dashboard.stripe.com/apps
2. Click **Create an app**
3. You'll see the app creation form

**Expected:** App creation form displays

---

### T+2: Fill App Metadata (5 min)

#### Section: App Details

**Field: App Name**
```
DSG Governance Gate
```

**Field: App Category**
```
Select from dropdown: "Risk Management"
(If not available, select "Tools" or "Utilities")
```

**Field: Short Description (140 characters max)**
```
Pre-execution governance gates for Stripe operations with deterministic audit trails and approval workflows
```

**Field: Long Description (4000 characters max)**

Copy from `SUBMISSION_DATA.json` → `long_description` field.

**Expected Description:**
```
DSG Governance Gate provides risk-managed pre-execution governance for Stripe operations.

Key capabilities:
- Deterministic policy evaluation before charges, refunds, and payouts execute
- Immutable audit trails with cryptographic proof
- Flexible approval workflows with role-based access control
- Seamless OAuth integration with Stripe Connect
- Real-time policy enforcement across your entire Stripe account

Use cases:
- Compliance-driven organizations requiring pre-execution governance
- Multi-approval workflows for high-risk transactions
- Audit trail requirements for regulatory compliance
- Risk management with automated policy gates

The app integrates directly into your Stripe Dashboard, providing governance without requiring custom infrastructure.

Permissions requested:
- Read charges, payment intents, payouts, refunds for policy evaluation
- Write decisions to charges for governance enforcement
- Webhook access for real-time event processing

All governance decisions are recorded with cryptographic proof in an immutable ledger.
```

**Field: Category (if separate field)**
```
Risk Management
```

Click **Save & Continue**

**Expected:** Form saves, moves to next section

---

### T+7: Upload App Icon & Screenshots (5 min)

#### Icon Upload

**Specification:**
- Format: PNG
- Size: 1200 × 1200 pixels
- Background: Transparent or solid color
- Style: Clear at all sizes (64x64 to 256x256)

**File Location:**
```
docs/assets/icon-1200x1200.png
```

**Upload Steps:**
1. Click "Upload Icon"
2. Select `icon-1200x1200.png`
3. Verify preview looks correct
4. Stripe auto-generates 64x, 128x, 256x versions

**Expected:** Icon appears in preview

---

#### Screenshot Uploads (3-5 required)

**Specification:**
- Format: PNG or JPG
- Recommended size: 1200 × 800 pixels
- Aspect ratio: 3:2 or landscape
- Content: Show app in use, governance workflows, audit trail UI

**Required Screenshots:**

1. **Screenshot 1: Dashboard Integration**
   ```
   File: docs/assets/screenshot-1-dashboard-integration.png
   Shows: App integrated in Stripe Dashboard charge detail view
   ```

2. **Screenshot 2: Governance Gate Decision**
   ```
   File: docs/assets/screenshot-2-governance-gate.png
   Shows: Governance gate evaluation result (PASS/REVIEW/BLOCK)
   ```

3. **Screenshot 3: Audit Trail**
   ```
   File: docs/assets/screenshot-3-audit-trail.png
   Shows: Immutable audit trail with cryptographic proof
   ```

4. **Screenshot 4: Policy Configuration (optional)**
   ```
   File: docs/assets/screenshot-4-policy-config.png
   Shows: Policy management interface
   ```

5. **Screenshot 5: Approval Workflow (optional)**
   ```
   File: docs/assets/screenshot-5-approval-workflow.png
   Shows: Multi-approval workflow UI
   ```

**Upload Steps:**
1. Click "Add Screenshots"
2. Select all 3-5 PNG/JPG files
3. Drag to reorder if needed (1st screenshot is hero image)
4. Add captions (optional but recommended):
   - "Governance gates in Stripe Dashboard"
   - "Policy evaluation results"
   - "Immutable audit trail"

**Expected:** All screenshots upload successfully

Click **Save & Continue**

---

### T+12: Configure Permissions (3 min)

#### Section: API Access & Permissions

**Select OAuth Access Type:**
```
☑ OAuth (Recommended)
   Allows merchants to grant permission via Stripe's standard OAuth flow
```

**Redirect URI 1 (Primary):**
```
https://tdealer01-crypto-dsg-control-plane.vercel.app/stripe/oauth/callback
```

**Redirect URI 2 (Secondary - optional):**
```
https://dsg-stripe-app.vercel.app/api/stripe-app/oauth/callback
```

**Click "Add Permission" for each of these:**

| Permission | Purpose | Check |
|-----------|---------|-------|
| `charge:read` | Read charge details for governance policy evaluation | ☑ |
| `charge:write` | Apply governance decisions to charge operations | ☑ |
| `payment_intent:read` | Monitor payment intents for policy compliance | ☑ |
| `payout:read` | Track payouts for governance audit trail | ☑ |
| `refund:read` | Monitor refunds for compliance evidence | ☑ |

**Permission Selection UI:**
1. Click "Add Permission"
2. Search for: `charge:read`
3. Select and add description: "Read charge details for governance policy evaluation"
4. Repeat for each permission above
5. Stripe displays each permission with your stated purpose

**Expected:** All 5 permissions appear in the form

Click **Save & Continue**

---

### T+15: Configure Webhooks (3 min)

#### Section: Webhooks

**Webhook Endpoint URL:**
```
https://tdealer01-crypto-dsg-control-plane.vercel.app/api/stripe/webhook/events
```

**Webhook Events to Receive:**

Select/enable these events:

```
☑ charge.created
☑ charge.updated
☑ charge.failed
☑ payment_intent.created
☑ payment_intent.succeeded
☑ payment_intent.payment_failed
☑ payout.created
☑ payout.updated
☑ payout.paid
☑ refund.created
☑ refund.updated
```

**Webhook Steps:**
1. Click "Add Webhook Endpoint"
2. Paste: `https://tdealer01-crypto-dsg-control-plane.vercel.app/api/stripe/webhook/events`
3. Scroll down to "Events to Listen"
4. Check all events listed above
5. Click "Save Webhook"

**Expected:** Webhook endpoint appears as "Pending" or "Verified"

**Note:** Stripe will verify the endpoint by sending a test request. If verification fails:
- Check that the endpoint is accessible from public internet
- Confirm CORS headers allow stripe.com origin
- See section "Webhook Verification Troubleshooting" below

Click **Save & Continue**

---

### T+18: Support & Contact Info (2 min)

#### Section: Support Information

**Support Email:**
```
t.dealer01@dsg.pics
```

**Support URL (Help page):**
```
https://dsg.pics/support
(or your actual support page)
```

**Support Phone (optional):**
```
Leave blank or enter if available
```

**Contact Email (for Stripe to contact you about the app):**
```
t.dealer01@dsg.pics
```

Click **Save & Continue**

**Expected:** Contact info is saved

---

### T+20: Legal & Compliance (3 min)

#### Section: Legal Information

**Privacy Policy URL:**
```
https://dsg.pics/privacy
```

**Terms of Service URL:**
```
https://dsg.pics/terms
```

**User Assistance:**
```
https://dsg.pics/support
```

**Upload Privacy Policy (if required by Stripe):**
1. If Stripe asks for file upload (not just URL):
   - Prepare a PDF version: `docs/assets/privacy-policy.pdf`
   - Click "Upload Privacy Policy"
   - Select PDF file

**Upload Terms of Service (if required by Stripe):**
1. If Stripe asks for file upload:
   - Prepare a PDF version: `docs/assets/terms-of-service.pdf`
   - Click "Upload Terms of Service"
   - Select PDF file

**Security & Privacy Questionnaire:**

If Stripe asks:
- "Does your app collect personal data?" → Yes/No (based on your implementation)
- "Is data encrypted in transit?" → Yes
- "Is data stored securely?" → Yes
- "Do you use third-party services?" → Yes (Supabase for audit trails)

Click **Save & Continue**

**Expected:** Legal URLs are saved

---

### T+23: Review & Submit (2 min)

#### Final Review Screen

Stripe displays all your information:

- ✓ App Name: DSG Governance Gate
- ✓ Category: Risk Management
- ✓ Icon: [Preview]
- ✓ Screenshots: [3-5 thumbnails]
- ✓ Short Description: [140 chars preview]
- ✓ Long Description: [4000 chars preview]
- ✓ Permissions: charge:read, charge:write, etc.
- ✓ Support Email: t.dealer01@dsg.pics
- ✓ Legal URLs: privacy, terms, support
- ✓ Webhook Endpoint: [URL]

**Review Checklist:**
- [ ] App name correct
- [ ] Icon looks professional
- [ ] Screenshots clearly show functionality
- [ ] Description is clear and complete
- [ ] Permissions are only what you need
- [ ] Support email is monitored
- [ ] Legal URLs work
- [ ] Webhook endpoint is correct

**If any field is wrong:**
1. Click "Edit" next to that section
2. Make correction
3. Return to review

**Submit:**
1. Click **"Submit for Review"** or **"Submit"** button
2. Confirm in popup: "Yes, submit my app"

**Expected:** Confirmation message appears

---

### T+25: Submission Confirmation

Stripe displays:

```
Submission Received ✓

App ID: [Your App ID will appear here]
Status: In Review
Submitted: [Current date/time]

Your app is now in our review queue.
Estimated review time: 1-43 days.

We'll email you at t.dealer01@dsg.pics with updates.
```

**Save/Screenshot this confirmation:**
- App ID (will need later)
- Submission date
- Estimated completion date

---

## Post-Submission Steps (Day 1)

### Check Stripe Email

Stripe sends confirmation to `t.dealer01@dsg.pics`:

```
Subject: We've received your app submission - DSG Governance Gate

Your app has been submitted for review. We'll notify you of any issues
or when your app is approved. Typical review time is 1-43 days.

App ID: xxx-xxx-xxx
Submission Time: [timestamp]
```

**Action:** Reply to confirm receipt if Stripe requests additional information.

---

### Monitor Submission Status

**Check status daily:**

```bash
# Go to dashboard and check app status
https://dashboard.stripe.com/apps/xxxx-xxxx-xxxx
```

Or use our monitoring script (if created):

```bash
bash docs/phase9-stripe-submission/scripts/check-submission-status.sh
```

---

## Timeline: Days 1-43

| Day | Status | Action |
|-----|--------|--------|
| 0 | Submitted | Confirmation email sent to you |
| 1-5 | In Review | Stripe reviews assets, permissions, legal docs |
| 5-10 | In Review | Stripe tests OAuth flow and webhook integration |
| 10-20 | Possible: Changes Requested | Respond to Stripe feedback within 7 days |
| 20-30 | Final Review | Stripe verifies all requested changes |
| 30-43 | Approved or Rejected | Final decision notification |

**Common feedback from Stripe (Days 5-20):**
- "Please add more detail to your description"
- "Your icon should have more contrast"
- "Can you explain this permission requirement?"
- "Can you provide a working demo account?"

**See section below:** "Common Stripe Questions & Response Templates"

---

## If Stripe Requests Changes

### Response Workflow

1. **Stripe sends email to t.dealer01@dsg.pics**
   ```
   Subject: Changes Requested - DSG Governance Gate
   
   Your app requires clarification on:
   - [List of items]
   
   Please respond within 7 days.
   ```

2. **Respond immediately:**
   - Reply to Stripe's email with requested information
   - Include screenshots/videos if asked
   - Be specific and factual
   - No exaggeration or unverified claims

3. **Update your dashboard:**
   - If changes are to description, icon, or screenshots:
   - Go to https://dashboard.stripe.com/apps/xxxx-xxxx-xxxx
   - Click Edit next to the item Stripe flagged
   - Make the change
   - Save and submit

4. **Confirm to Stripe:**
   - Email Stripe: "Changes submitted, please review"
   - Stripe re-queues your app

5. **Track the update:**
   - Check dashboard for status change
   - Expect 3-5 more business days for re-review

---

## Common Stripe Questions & Response Templates

### Q: "Can you clarify what 'deterministic governance' means?"

**Template Response:**
```
Thank you for reviewing our app.

By "deterministic governance," we mean:
- Policy evaluation is reproducible given the same inputs
- All decisions are recorded in an immutable audit trail
- Merchants can understand exactly why a decision was made
- The same input data always produces the same decision

This is important for compliance-driven organizations that need
verifiable governance records for audits and regulatory reporting.

Example: A charge of $X from customer Y always receives the same
governance decision (PASS/REVIEW/BLOCK) when the same policy is
active, enabling predictable and auditable operations.
```

---

### Q: "Why does your app need charge:write permission?"

**Template Response:**
```
Good question. We request charge:write specifically to:
1. Apply governance decisions to charges when they require review
2. Attach governance metadata to charges for audit purposes
3. Support optional workflow automation (when merchant enables it)

In most cases, the app only reads charges. Write access is requested
for merchants who want automated enforcement of governance policies.

All write operations are:
- Logged in the immutable audit trail
- Restricted to policy-defined actions only
- Reversible by the merchant or an approver
- Subject to approval workflows

If merchants prefer read-only operation, they can grant only read
permissions during OAuth, and governance decisions appear as
recommendations in the UI rather than automatic actions.
```

---

### Q: "What data do you store? Can you provide privacy details?"

**Template Response:**
```
Thank you for the privacy question.

Data Storage:
- Governance decisions and audit trails stored in Supabase PostgreSQL
- Charge/payout metadata stored only as needed for policy evaluation
- Personal data (PII) is NOT stored by our app
- All data is encrypted in transit (HTTPS) and at rest (Supabase encryption)

Data Retention:
- Audit trails retained for [specify: 7 years / indefinitely / per merchant preference]
- Charge metadata retained [same]
- Deleted on merchant request or Stripe disconnection

Third-Party Services:
- Supabase for data storage and audit logs
- Stripe API for webhook ingestion and OAuth
- No other third parties access merchant data

Data Processing:
- Data processed only in [specify region: US / EU]
- No ML training or secondary use
- No data sharing with third parties

Full privacy policy available at: https://dsg.pics/privacy
```

---

### Q: "Can we verify your OAuth flow works?"

**Template Response:**
```
Absolutely. We provide test credentials for verification:

1. Test Stripe Account (Sandbox):
   Email: [Your test account email]
   You can create a test dashboard account here:
   https://dashboard.stripe.com/register?redirect=/test

2. Our Test Installation:
   https://[Your test deployment URL]/stripe/oauth/test

3. OAuth Flow:
   - Redirect: https://tdealer01-crypto-dsg-control-plane.vercel.app/stripe/oauth/callback
   - Scopes: As requested in the app submission
   - Token exchange: Implemented per Stripe OAuth spec

4. Webhook Verification:
   - Endpoint: https://tdealer01-crypto-dsg-control-plane.vercel.app/api/stripe/webhook/events
   - Signature verification: Using Stripe's stripe-signature header
   - Retry logic: Standard exponential backoff

We can also schedule a live demo if Stripe prefers.
```

---

### Q: "Tell us about your company/team"

**Template Response:**
```
DSG (Governance Gate) is [specify your organization details]:

Team:
- Governance/Security: [Your name/title]
- Engineering: [Team details]
- Operations: [Contact info]

Experience:
- [X years] building compliance and governance systems
- [X customers/organizations] using similar technology
- Regular security audits and compliance training

Support:
- Email: t.dealer01@dsg.pics
- Response time: [X business hours]
- Location: [Your timezone/region]

Company/Foundation:
- Incorporated: [Date/Location]
- Business focus: Risk management and governance automation
- Stripe integration: First priority for marketplace expansion

For detailed company information, see:
https://dsg.pics/about
```

---

### Q: "What happens if your app fails or has a bug?"

**Template Response:**
```
Great question. We've built in multiple safety measures:

Failure Handling:
- If our app is unreachable, governance decisions fail safely to REVIEW
  (requiring manual approval) rather than PASS (automatic execution)
- Webhook failures are queued and retried by Stripe
- All decisions are logged even if they fail

Merchant Control:
- Merchants can disconnect our app at any time via OAuth revocation
- Merchants can disable specific governance policies
- Merchants retain full access to their Stripe account and data

Monitoring & Support:
- We monitor our service 24/7 for uptime and errors
- Errors are logged and reviewed daily
- Any recurring issues trigger immediate investigation
- We publish a status page: [https://status.dsg.pics or similar]

Bug Fixes & Updates:
- Critical security issues: Fixed within 24 hours, pushed immediately
- Important bugs: Fixed within 72 hours, deployed with merchant notification
- Minor issues: Deployed on regular 2-week cycle with changelog

We test all changes in sandbox before deploying to production.
```

---

## Webhook Verification Troubleshooting

If Stripe shows your webhook endpoint as "Pending" after 5 minutes:

### Check 1: Is the endpoint publicly accessible?

```bash
# From your terminal, test the endpoint:
curl -X POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/stripe/webhook/events \
  -H "Content-Type: application/json" \
  -d '{"type":"webhook.verification.test"}' \
  -v
```

**Expected response:**
```
HTTP/1.1 200 OK
Content-Type: application/json
{ "received": true }
```

**If you get 404, 403, 500, or timeout:**
- The endpoint is not accessible
- Check with DevOps: Is the server running?
- Check firewall/network rules
- Verify DNS resolution: `nslookup tdealer01-crypto-dsg-control-plane.vercel.app`

### Check 2: Is CORS configured?

Stripe requests from `api.stripe.com`. Your endpoint should accept POST from any origin:

```bash
curl -X OPTIONS https://tdealer01-crypto-dsg-control-plane.vercel.app/api/stripe/webhook/events \
  -H "Origin: https://api.stripe.com" \
  -v
```

**Expected:**
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: POST, OPTIONS
```

### Check 3: Is the webhook signature verification correct?

Stripe sends a `stripe-signature` header. Your endpoint must verify it:

```bash
# Stripe will show you a test event to verify signature validation
# Check the webhook logs for failures
```

### Check 4: Review Stripe's webhook logs

1. Go to: https://dashboard.stripe.com/webhooks
2. Click on your webhook endpoint
3. Check "Recent events"
4. Look for red X marks (failed deliveries)
5. Click the failed event to see the error

**Common errors:**
- `Connection timeout` → Server not running or slow
- `401 Unauthorized` → Missing auth header (if endpoint requires it)
- `400 Bad Request` → Signature verification failed
- `500 Internal Server Error` → Endpoint crashed

### Check 5: If still failing, contact Stripe support

Email stripe-partner-support@stripe.com:

```
Subject: Webhook Verification Issue - DSG Governance Gate App

Webhook URL: https://tdealer01-crypto-dsg-control-plane.vercel.app/api/stripe/webhook/events
Issue: Webhook endpoint shows "Pending" after 30 minutes
Error: [Copy exact error message from Stripe logs]

We've verified:
✓ Endpoint is publicly accessible (curl test successful)
✓ CORS headers are correct
✓ Signature verification is implemented
✓ Server is responding with 200 OK

Can you please:
1. Verify the endpoint from Stripe's side
2. Provide more detailed error logs
3. Requeue the webhook verification

Thanks,
[Your name]
```

---

## After Approval (Day X: Your App is Live!)

### Stripe sends approval email:

```
Subject: Your app "DSG Governance Gate" is now approved!

Congratulations! Your app has been approved and is now
available in the Stripe App Marketplace.

App URL: https://marketplace.stripe.com/apps/dsg-governance-gate
App ID: [Your App ID]
Status: Live

Merchants can now discover and install your app directly from:
1. Stripe Dashboard → Apps → Marketplace
2. Marketplace Search: "DSG Governance Gate"
3. Direct link (share with merchants)
```

### Immediate post-approval tasks:

1. **Update your public materials:**
   - Update website: "Now available in Stripe App Marketplace"
   - Add App Marketplace link to dsg.pics homepage
   - Update any marketing materials

2. **Monitor adoption:**
   ```bash
   # Check how many merchants have installed your app
   # Stripe Dashboard → Apps → Your App → Analytics
   ```

3. **Gather feedback:**
   - Email early adopters
   - Ask for feedback and feature requests
   - Log issues and track improvements

4. **Plan ongoing support:**
   - Monitor support email daily
   - Create FAQ page based on common questions
   - Plan quarterly updates

---

## Dashboard Navigation Reference

| Page | URL | Purpose |
|------|-----|---------|
| Apps Home | https://dashboard.stripe.com/apps | View all apps |
| Create App | https://dashboard.stripe.com/apps/create | Submit new app |
| Your App | https://dashboard.stripe.com/apps/[APP_ID] | Edit details, check status |
| Settings | https://dashboard.stripe.com/settings/apps | Configure app settings |
| Webhooks | https://dashboard.stripe.com/webhooks | Configure webhook events |
| API Keys | https://dashboard.stripe.com/apikeys | Get API credentials |
| OAuth | https://dashboard.stripe.com/apps/oauth | Configure OAuth settings |

---

## Key Contacts

| Role | Email | Purpose |
|------|-------|---------|
| Support | t.dealer01@dsg.pics | General inquiries |
| Tech Lead | t.dealer01@dsg.pics | Technical questions |
| Approver | [Boss/PM email] | Approval before major decisions |

---

## Success Criteria

Your submission is successful when:

- [ ] All 3 pre-submission scripts pass
- [ ] Stripe Dashboard form submission succeeds
- [ ] Confirmation email arrives at t.dealer01@dsg.pics
- [ ] App status shows "In Review" (not "Draft")
- [ ] Webhook verification completes (Verified status)
- [ ] App enters review queue (Days 1-43)

**You're done with submission. Stripe takes it from here.**

Next step: Monitor email and dashboard daily for Stripe feedback.

---

## Appendix: File Locations

All submission-related files are located in:

```
docs/phase9-stripe-submission/
├── PHASE9_SUBMISSION_READY.md          ← You are here
├── SUBMISSION_DATA.json                ← Pre-filled data
├── SUBMISSION_CHECKLIST.txt            ← 20-item pre-flight
├── POST_SUBMISSION_TRACKING.md         ← After you submit
├── scripts/
│   ├── validate-submission.sh          ← Validate assets
│   ├── generate-submission-manifest.json ← Create manifest
│   └── pre-submit-checklist.sh         ← Final checks
└── assets/
    ├── icon-1200x1200.png              ← App icon
    ├── screenshot-1-*.png              ← Screenshots
    ├── privacy-policy.pdf              ← Legal docs
    └── terms-of-service.pdf
```

---

## Version History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-07 | Initial submission pack created | Claude Code |
| TBD | Submission date | You |
| TBD | Approval/rejection date | Stripe |

---

**Ready to submit? Start with:**
```bash
bash docs/phase9-stripe-submission/scripts/validate-submission.sh
```

**Questions?** See the "Common Stripe Questions & Response Templates" section above.
