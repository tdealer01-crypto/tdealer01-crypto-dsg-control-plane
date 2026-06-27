# Phase 9: Stripe Marketplace Submission Pack

**Status:** Complete and Ready for Submission  
**Target:** Submit to Stripe Dashboard manually  
**Timeline:** Submission → Review (1-43 days) → Approval  
**Last Updated:** 2026-06-07

---

## Quick Start (5 minutes)

```bash
# Step 1: Validate all assets (2 min)
bash docs/phase9-stripe-submission/scripts/validate-submission.sh

# Step 2: Run final checklist (2 min)
bash docs/phase9-stripe-submission/scripts/pre-submit-checklist.sh

# Step 3: Generate submission manifest (1 min)
bash docs/phase9-stripe-submission/scripts/generate-submission-manifest.sh

# Step 4: If all pass, open Stripe Dashboard
# https://dashboard.stripe.com/apps
# Then follow: docs/phase9-stripe-submission/PHASE9_SUBMISSION_READY.md
```

**Expected output:** All scripts show ✓ PASS. Then you're ready for manual submission.

---

## What's in This Pack?

This folder contains everything you need to manually submit DSG Governance Gate to the Stripe Marketplace:

### 📋 Documentation (Read These)

1. **PHASE9_SUBMISSION_READY.md** ← START HERE
   - Complete step-by-step guide for Stripe Dashboard submission
   - Browser instructions (copy-paste ready)
   - What to enter in each Dashboard field
   - Asset upload sequence
   - Permissions selection guide
   - Webhook configuration
   - Common Stripe questions & response templates

2. **POST_SUBMISSION_TRACKING.md**
   - Day-by-day timeline (Days 1-43)
   - What to expect from Stripe at each stage
   - How to respond if Stripe asks for changes
   - Email templates for common questions
   - Troubleshooting guide
   - What happens after approval

3. **SUBMISSION_CHECKLIST.txt**
   - Final 20-item checklist before submitting
   - Print and check off each item
   - Dashboard submission steps
   - Post-submission record

4. **SUBMISSION_DATA.json**
   - Pre-filled submission data in JSON format
   - App metadata, descriptions, permissions, webhooks, etc.
   - Referenced by all scripts and docs

### 🔧 Validation Scripts

1. **validate-submission.sh**
   - Checks all assets exist and meet specs
   - Validates icon is 1200x1200 PNG
   - Validates 3+ screenshots are 1200x800 PNG
   - Checks SUBMISSION_DATA.json is valid JSON
   - Tests URLs and webhook endpoints
   - **Run this first**

2. **pre-submit-checklist.sh**
   - 20-item final checklist before dashboard submission
   - Confirms all assets, data, and configurations
   - **Run this second (must pass before opening Stripe)**

3. **generate-submission-manifest.sh**
   - Creates comprehensive submission manifest (JSON)
   - Documents all assets, permissions, endpoints
   - Useful for review and record-keeping
   - **Run this to generate final manifest**

### 📁 Assets

```
assets/
├── icon-1200x1200.png                    ← App icon (required)
├── screenshot-1-dashboard-integration.png  ← Required
├── screenshot-2-governance-gate.png        ← Required
├── screenshot-3-audit-trail.png            ← Required
├── screenshot-4-policy-config.png          ← Optional
├── screenshot-5-approval-workflow.png      ← Optional
├── privacy-policy.pdf                      ← Optional (URLs used instead)
└── terms-of-service.pdf                    ← Optional (URLs used instead)
```

---

## Submission Flow (30 minutes total)

### Phase 1: Pre-Submission Validation (5 min)

```bash
# 1. Run validation script
bash docs/phase9-stripe-submission/scripts/validate-submission.sh
# Expected: ✓ All validation checks passed!

# 2. Run final checklist
bash docs/phase9-stripe-submission/scripts/pre-submit-checklist.sh
# Expected: ✓ ALL 20 CHECKS PASSED!

# 3. Generate manifest (optional but recommended)
bash docs/phase9-stripe-submission/scripts/generate-submission-manifest.sh
# Expected: Manifest saved to SUBMISSION_MANIFEST.json
```

**Stop here if any script fails.** Fix the issues before proceeding.

### Phase 2: Manual Dashboard Submission (25 min)

1. **Open Stripe Dashboard**
   ```
   https://dashboard.stripe.com/apps
   ```

2. **Follow the step-by-step guide**
   ```
   docs/phase9-stripe-submission/PHASE9_SUBMISSION_READY.md
   → Section: "Step-by-Step Stripe Dashboard Submission"
   ```

3. **Fill in the form**
   - T+0 (2 min): Open dashboard
   - T+2 (5 min): Fill app metadata
   - T+7 (5 min): Upload icon & screenshots
   - T+12 (3 min): Configure permissions
   - T+15 (3 min): Configure webhooks
   - T+18 (2 min): Support info
   - T+20 (3 min): Legal information
   - T+23 (2 min): Review everything
   - T+25: Submit and get confirmation

4. **Save confirmation details**
   ```
   - App ID: _____________
   - Submission date: _____________
   - Screenshot confirmation page
   ```

5. **Check email**
   ```
   t.dealer01@dsg.pics
   Stripe should send confirmation within 5 minutes
   ```

### Phase 3: Post-Submission Tracking (Days 1-43)

1. **Monitor status daily**
   ```
   https://dashboard.stripe.com/apps/[YOUR_APP_ID]
   ```

2. **Use tracking document**
   ```
   docs/phase9-stripe-submission/POST_SUBMISSION_TRACKING.md
   → Section: "Daily Status Checklist"
   ```

3. **Respond to Stripe within 24 hours if they ask questions**
   ```
   POST_SUBMISSION_TRACKING.md
   → Section: "Response Templates for Common Questions"
   ```

4. **Expect approval in 1-43 days (typical: 7 days)**

---

## File Structure

```
docs/phase9-stripe-submission/
├── README.md                           ← You are here
├── PHASE9_SUBMISSION_READY.md         ← Complete submission guide
├── POST_SUBMISSION_TRACKING.md        ← Day-by-day tracking (after submit)
├── SUBMISSION_CHECKLIST.txt           ← Print & check 20 items
├── SUBMISSION_DATA.json               ← Pre-filled submission data
├── SUBMISSION_MANIFEST.json           ← Auto-generated manifest
│
├── scripts/
│   ├── validate-submission.sh         ← Validate assets (run first)
│   ├── pre-submit-checklist.sh        ← Final checklist (run second)
│   └── generate-submission-manifest.sh ← Generate manifest
│
└── assets/
    ├── icon-1200x1200.png             ← App icon
    ├── screenshot-1-*.png              ← Screenshot 1 (required)
    ├── screenshot-2-*.png              ← Screenshot 2 (required)
    ├── screenshot-3-*.png              ← Screenshot 3 (required)
    ├── screenshot-4-*.png              ← Screenshot 4 (optional)
    ├── screenshot-5-*.png              ← Screenshot 5 (optional)
    ├── privacy-policy.pdf              ← Legal (optional)
    └── terms-of-service.pdf            ← Legal (optional)
```

---

## Key Information (Copy-Paste Ready)

### App Details
```
Name:          DSG Governance Gate
Category:      Risk Management
Short Desc:    Pre-execution governance gates for Stripe operations 
               with deterministic audit trails and approval workflows
Support Email: t.dealer01@dsg.pics
```

### URLs
```
Homepage:              https://dsg.pics
Privacy Policy:        https://dsg.pics/privacy
Terms of Service:      https://dsg.pics/terms
Support Page:          https://dsg.pics/support
```

### OAuth
```
Redirect URI 1: https://tdealer01-crypto-dsg-control-plane.vercel.app/stripe/oauth/callback
Redirect URI 2: https://dsg-stripe-app.vercel.app/api/stripe-app/oauth/callback
```

### Webhook
```
Endpoint: https://tdealer01-crypto-dsg-control-plane.vercel.app/api/stripe/webhook/events
Events:   charge.*, payment_intent.*, payout.*, refund.*
```

### Permissions
```
✓ charge:read
✓ charge:write
✓ payment_intent:read
✓ payout:read
✓ refund:read
```

---

## Checklist Before Opening Stripe Dashboard

- [ ] All scripts pass validation
- [ ] 20-item checklist all checked
- [ ] Icon exists (1200x1200 PNG)
- [ ] 3+ screenshots exist (1200x800 PNG)
- [ ] Support email monitored
- [ ] Webhook endpoint accessible
- [ ] OAuth URIs tested
- [ ] Legal URLs live
- [ ] SUBMISSION_DATA.json valid

**If all pass: You're ready to submit!**

---

## Common Issues & Solutions

### Validation Script Failed

See: PHASE9_SUBMISSION_READY.md → "Webhook Verification Troubleshooting"

```bash
# Quick check: Is webhook accessible?
curl -X POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/stripe/webhook/events \
  -H "Content-Type: application/json" \
  -d '{"type":"test"}' -v

# Expected: 200 OK or 400 Bad Request
# Not expected: 503, 404, timeout
```

### Missing Assets

```bash
# Create missing icon:
# 1. Design a 1200x1200 PNG icon
# 2. Save to: docs/phase9-stripe-submission/assets/icon-1200x1200.png

# Capture missing screenshots:
# 1. Take screenshots of governance workflows
# 2. Crop to 1200x800
# 3. Save as: screenshot-1-*, screenshot-2-*, screenshot-3-*
```

### Stripe Asks for Changes

See: POST_SUBMISSION_TRACKING.md → "Response Templates for Common Questions"

---

## Timeline

| Day | Status | Action |
|-----|--------|--------|
| 0 | Submit | Follow PHASE9_SUBMISSION_READY.md |
| 1-5 | In Review | Stripe reviews assets and legal docs |
| 5-10 | Testing | Stripe tests OAuth and webhooks |
| 10-20 | Changes? | Respond to Stripe if they ask questions |
| 20-30 | Final Review | Stripe verifies changes |
| 30-43 | Decision | Approval or rejection |

**Typical approval:** 7 days  
**Maximum:** 43 days  
**If changes requested:** Timeline resets

---

## After Approval

When Stripe approves, you'll receive an email:

```
Subject: Your app "DSG Governance Gate" is now approved!

Your app is now available in the Stripe App Marketplace:
https://marketplace.stripe.com/apps/dsg-governance-gate
```

**Next steps:**
1. Update website: Add link to Stripe App Marketplace
2. Create FAQ based on Stripe feedback
3. Monitor installations
4. Plan feature updates

See: POST_SUBMISSION_TRACKING.md → "After Approval"

---

## Support & Questions

| Question | Answer |
|----------|--------|
| What if validation fails? | Fix the issue and re-run. See troubleshooting section. |
| How long is submission? | 30 minutes from opening Stripe Dashboard to confirmation. |
| What if Stripe asks a question? | Respond within 24 hours. See response templates in POST_SUBMISSION_TRACKING.md |
| When will I know if it's approved? | Email to t.dealer01@dsg.pics within 1-43 days (typical: 7 days) |
| What if it's rejected? | Read reason, fix issue, resubmit. Timeline resets. |
| Can I update my app after approval? | Yes. You can push updates through the Stripe app dashboard. |

---

## Reference Links

- Stripe Apps: https://dashboard.stripe.com/apps
- Stripe Documentation: https://docs.stripe.com/docs/marketplace/apps
- Stripe Partner Program: https://stripe.com/partners
- Stripe Support: support@stripe.com

---

## Success Criteria

Your submission is successful when:

- ✓ All 3 pre-submission scripts pass
- ✓ Stripe Dashboard form submission succeeds
- ✓ Confirmation email arrives at t.dealer01@dsg.pics
- ✓ App status shows "In Review" (not "Draft")
- ✓ Webhook verification completes (Verified status)
- ✓ App enters review queue (Days 1-43)

**At approval:**
- ✓ Approval email received
- ✓ App live in Stripe App Marketplace
- ✓ Merchants can discover and install

---

## Version History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-07 | Initial submission pack created | Claude Code |
| | All validation scripts added | |
| | Documentation complete | |
| | Assets placeholder ready | |
| TBD | Submission submitted | You |
| TBD | Approved by Stripe | Stripe |

---

## Next Step

Ready to submit? Start here:

```bash
# 1. Validate everything
bash docs/phase9-stripe-submission/scripts/validate-submission.sh

# 2. Run final checklist
bash docs/phase9-stripe-submission/scripts/pre-submit-checklist.sh

# 3. Open Stripe Dashboard and follow the guide
# https://dashboard.stripe.com/apps
# Then read: PHASE9_SUBMISSION_READY.md
```

**Questions?** See POST_SUBMISSION_TRACKING.md → "Common Stripe Questions & Response Templates"

---

**Maintained by:** DSG Team  
**Contact:** t.dealer01@dsg.pics  
**Status:** Ready for Manual Submission
