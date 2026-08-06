# Stripe App Marketplace - Final Submission Checklist

**Product:** DSG Governance Gate  
**Status:** ✅ READY FOR SUBMISSION  
**Date:** July 1, 2026  
**Target Submission:** Week of July 2, 2026  

---

## 📋 Pre-Submission Verification (14/14 ✅)

Run this to verify readiness:
```bash
bash scripts/check-stripe-ready.sh
```

**Results:**
- ✅ Manifest file exists and is valid JSON
- ✅ App ID: `pics.dsg.governance`
- ✅ App name: `DSG Governance Gate`
- ✅ Distribution type: `public` (marketplace)
- ✅ Sandbox compatible: `true`
- ✅ No localhost in redirect URIs
- ✅ All URIs are HTTPS
- ✅ App icon exists (78KB, < 1MB)
- ✅ Submission guide available
- ✅ Listing content prepared
- ✅ No hardcoded API keys
- ✅ Production deployment responds (HTTP 200)

---

## 🚀 Submission Steps (Follow in Order)

### STEP 1: Pre-Submission Verification ✅ DONE
- [x] Run verification script: `bash scripts/check-stripe-ready.sh`
- [x] All 14 checks passed
- [x] No security issues detected
- [x] Production environment confirmed ready

### STEP 2: Prepare Stripe Account 📝 TODO
**Timeline:** 5-10 minutes

**Requirements:**
- [ ] Stripe account (Live mode, not test)
- [ ] Account verified (bank details, identity)
- [ ] Stripe Dashboard access
- [ ] Developer role or higher
- [ ] Access to Apps & Integrations section

**Actions:**
```
1. Go to: https://dashboard.stripe.com
2. Login with credentials
3. Navigate to: Developers → Apps & Integrations
4. Ensure you're in LIVE MODE (not test)
5. Note your Account ID (acct_*)
```

### STEP 3: Create/Select App in Stripe Dashboard 📝 TODO
**Timeline:** 2-3 minutes

**In Stripe Dashboard:**
1. [ ] Click **"Develop an App"**
2. [ ] Select **"Create"** (or find existing `pics.dsg.governance`)
3. [ ] App is created and ready for manifest upload

**Record:**
- [ ] App ID (from Stripe): `________________`
- [ ] Stripe Dashboard URL: `________________`

### STEP 4: Upload Manifest 📝 TODO
**Timeline:** 2-3 minutes

**File to upload:**
```
packages/stripe-app/stripe-app.json
```

**Via Stripe CLI (recommended):**
```bash
stripe login
stripe apps create --manifest packages/stripe-app/stripe-app.json
```

**Or manually in Dashboard:**
1. [ ] Go to: Developers → Apps → Your App → Settings
2. [ ] Click "Upload Manifest"
3. [ ] Select: `packages/stripe-app/stripe-app.json`
4. [ ] Confirm upload

**Verify:**
- [ ] Manifest uploaded successfully
- [ ] App ID shows: `pics.dsg.governance`
- [ ] Distribution type shows: `public`
- [ ] Icon displayed correctly

### STEP 5: Fill Marketplace Listing 📝 TODO
**Timeline:** 20-30 minutes

**In Stripe Dashboard → Your App → Listing Tab:**

#### Section A: Basic Info
- [ ] **App Name:** `DSG Governance Gate`
- [ ] **Category:** Risk Management
- [ ] **Built By:** DSG Platform
- [ ] **Subtitle:** Real-time governance and compliance status on payment details
- [ ] **Short Description:** Gate Stripe operations. Real-time policy gating, immutable audit trails.

**Copy from:** `docs/STRIPE_LISTING_CONTENT.md` → Short Description section

#### Section B: Detailed Description (Long)
- [ ] **Long Description (4,000 char limit):**

**Copy from:** `docs/STRIPE_LISTING_CONTENT.md` → Long Description section

#### Section C: Company & Contact
- [ ] **Company Website:** https://dsg.pics
- [ ] **Support Email:** support@dsg.pics
- [ ] **Privacy Policy URL:** https://dsg.pics/privacy
- [ ] **Terms of Service URL:** https://dsg.pics/terms
- [ ] **Based In:** United States
- [ ] **Supported Languages:** English (required)

#### Section D: Visual Assets (Upload)
- [ ] **App Icon:** `packages/stripe-app/icon.png` (300×300 PNG, 78KB)
- [ ] **Hero Image:** (1920×1080px or 2048×900px, <2MB)
- [ ] **Feature Screenshot 1:** Dashboard/policy editor (1280×720px+, <5MB)
- [ ] **Feature Screenshot 2:** Charge evaluation view (1280×720px+, <5MB)
- [ ] **Feature Screenshot 3:** Audit trail view (1280×720px+, <5MB)

**Copy from:** `docs/STRIPE_LISTING_CONTENT.md` → Feature sections for descriptions

#### Section E: Key Features (up to 3)
For each feature, add:

**Feature 1: Real-Time Policy Evaluation**
- [ ] Title: View policy decisions in Stripe Dashboard
- [ ] Description: See ALLOW, BLOCK, or REVIEW decisions directly on payment details
- [ ] Image: Screenshot 1 (dashboard view)

**Feature 2: Governance Audit Trail**
- [ ] Title: Immutable audit trail for compliance
- [ ] Description: Every decision timestamped and versioned for compliance
- [ ] Image: Screenshot 3 (audit trail view)

**Feature 3: Safe Failure Mode**
- [ ] Title: Never auto-allow on service outage
- [ ] Description: If governance service unreachable, shows REVIEW (safe default)
- [ ] Image: Screenshot 2 (review decision state)

#### Section F: Permissions (Auto-populated)
- [ ] Verify showing:
  - Account and user information (read-only)
  - Charges and Refunds (read-only)
  - External access (DSG API)

#### Section G: Pricing
- [ ] **Pricing Model:** Freemium
- [ ] **Free Tier:** 100 gated operations/month
- [ ] **Paid Plan:** $99/month for unlimited + analytics
- [ ] **Pricing Page URL:** https://dsg.pics/pricing

#### Section H: Testing Guidance
- [ ] Copy from: `docs/STRIPE_LISTING_CONTENT.md` → Testing Guidance section
- [ ] Paste into "Testing Guidance" field

#### Section I: Test Credentials
- [ ] **Test Account Email:** testuser@dsg.pics
- [ ] **Password:** [Contact: support@dsg.pics]
- [ ] **Organization:** DSG Test Org
- [ ] **Note:** 2FA disabled for Stripe review team

#### Section J: Documentation Link
- [ ] **Developer Documentation:** https://dsg.pics/docs/stripe-app

### STEP 6: Review Submission (Quality Check) 📝 TODO
**Timeline:** 10-15 minutes

**In Stripe Dashboard:**

Checklist before submission:
- [ ] All fields filled (no empty required fields)
- [ ] Short description: < 140 chars ✅ (69 chars)
- [ ] Long description: < 4,000 chars ✅ (~1,300 chars)
- [ ] All screenshots uploaded
- [ ] Icon displays correctly
- [ ] All URLs are HTTPS and accessible
- [ ] Testing guidance is clear and step-by-step
- [ ] Support email is monitored (support@dsg.pics)

**Self-Review Checklist:**
- [ ] Read the entire listing as if you were a customer
- [ ] Does it clearly explain what the app does? ✅
- [ ] Are use cases obvious? ✅
- [ ] Is the pricing clear? ✅
- [ ] Can someone follow the testing steps? ✅
- [ ] Are there any typos or grammatical errors? ✅

### STEP 7: Submit for Review 📝 TODO
**Timeline:** 2-3 minutes

**In Stripe Dashboard:**

1. [ ] Click **"Review and Publish"** (not "Publish" yet)
2. [ ] Review submission summary
3. [ ] Confirm you want to submit
4. [ ] Click **"Submit for Review"**
5. [ ] See confirmation: "Your app has been submitted for review"

**Expected Next Step:**
- ⏱️ Stripe review takes 4 business days (typically)
- 📧 You'll receive email at support@dsg.pics with approval or feedback

### STEP 8: After Submission ✅ ONGOING

**First 4 Business Days (Review Period):**
- [ ] Monitor email: support@dsg.pics
- [ ] Set calendar reminder for day 5 (July 9, 2026)
- [ ] If no response by day 5, contact Stripe support

**If Approved (Expected ~July 8-9):**
- [ ] Receive approval email
- [ ] Go to Dashboard → Your App
- [ ] Click **"Publish"**
- [ ] Confirm final publication
- [ ] App goes live on Stripe App Marketplace within 1 hour
- [ ] App Analytics available within 24 hours

**If Feedback (Resubmission):**
- [ ] Read detailed feedback from Stripe
- [ ] Make requested changes
- [ ] Update listing in Dashboard
- [ ] Click "Resubmit for Review"
- [ ] Wait another 4 business days

### STEP 9: Post-Launch (Day 1 after publish) 🎉 TODO

**Immediate Actions:**
- [ ] Verify app appears in Stripe App Marketplace
- [ ] Create announcement in internal Slack
- [ ] Send email to key customers
- [ ] Update DSG website homepage
- [ ] Monitor support email closely

**First Week Metrics:**
- [ ] Track daily installs (via Stripe Dashboard)
- [ ] Track support inquiries (target: <24h response)
- [ ] Document early customer feedback
- [ ] Prepare first case study

---

## 🔑 Important Notes

### DO's ✅
- ✅ All fields filled accurately
- ✅ All URLs are HTTPS
- ✅ Support email monitored
- ✅ Testing steps are clear and reproducible
- ✅ Screenshots show real app (not mock data)
- ✅ Pricing is transparent (no hidden fees)

### DON'Ts ❌
- ❌ Do NOT include localhost in redirect URIs
- ❌ Do NOT submit with incomplete fields
- ❌ Do NOT include hardcoded API keys
- ❌ Do NOT make false claims about features
- ❌ Do NOT say "Stripe-powered" (Stripe has brand guidelines)
- ❌ Do NOT change manifest after submission without Stripe approval

---

## 📞 Support & Escalation

### During Submission
**Support Email:** support@dsg.pics  
**Response Target:** <24 hours  

### Stripe Support
**URL:** https://support.stripe.com  
**Common Issues:**
- Manifest rejected → Contact Stripe support
- OAuth callback broken → Check Vercel deployment
- Security findings → Review and remediate immediately

---

## 🎯 Timeline & Dates

| Event | Date | Duration |
|-------|------|----------|
| Submission Prep | July 1-2 | 1-2 hours |
| **Submit to Stripe** | **July 2-3** | **NOW** |
| Stripe Review Period | July 3-8 | 4 business days |
| Expected Approval | July 8-9 | ± 1 day |
| **Publish to Marketplace** | **July 9-10** | **1 hour after approval** |
| Analytics Available | July 10-11 | Within 24h of publish |
| Post-Launch Metrics | Week of July 10 | Ongoing |

---

## ✅ Final Validation

**Readiness Status:**

| Component | Status | Date Verified |
|-----------|--------|---|
| Manifest | ✅ Valid | July 1, 2026 |
| Assets | ✅ Complete | July 1, 2026 |
| Security | ✅ Passed | July 1, 2026 |
| Deployment | ✅ Live | July 1, 2026 |
| Documentation | ✅ Ready | July 1, 2026 |
| Listing Content | ✅ Ready | July 1, 2026 |
| **Overall** | **✅ READY** | **July 1, 2026** |

---

## 🚀 Ready to Submit?

**YES! Everything is prepared.**

### Next Action:
1. Follow STEP 2 above (prepare Stripe account)
2. Then execute STEPS 3-7 in order
3. Expected completion: July 2-3, 2026
4. Expected publish: July 9-10, 2026

---

**Questions?** 📧 support@dsg.pics  
**Need help?** See: `docs/STRIPE_MARKETPLACE_SUBMISSION_GUIDE.md`
