# DSG Governance Gate — Testing Scenarios for Stripe App Review

## Overview
This document provides detailed testing scenarios and expected outputs for Stripe App Marketplace reviewers. Each scenario covers a key feature or workflow.

## Test Environment Setup

### Pre-Test Preparation
1. Have both Stripe test account and DSG platform test account ready
2. Disable 2FA in both accounts for review (will re-enable post-approval)
3. Ensure reviewer has admin access to both platforms
4. Clear browser cache before starting tests
5. Use Chrome/Firefox (not Safari) for consistent CSP behavior

### Test Account Credentials
**Provided in Secure Channel to Stripe Review Team:**
- Stripe Sandbox Account: support@dsg.pics / [PASSWORD]
- DSG Admin Account: test@dsg.pics / [PASSWORD]
- API Key: pk_test_[KEY] for public operations
- Secret Key: sk_test_[KEY] for admin operations (NOT in public URLs)

---

## Scenario 1: Installation & OAuth Flow ✅

### Goal
Verify that the app installs correctly and OAuth authentication completes successfully.

### Steps
1. Open https://marketplace.stripe.com/apps/dsg-governance-gate
2. Click "Install" button
3. Log in to Stripe sandbox account (support@dsg.pics)
4. Review requested permissions:
   - Account information (read-only)
   - Charges and Refunds (read-only)
   - External access (for audit logging)
5. Click "Authorize"
6. Verify redirect to https://tdealer01-crypto-dsg-control-plane.vercel.app/dashboard/stripe-app

### Expected Output
- ✅ OAuth dialog displays all 3 permissions with clear justifications
- ✅ User authorizes and is redirected to post-install dashboard
- ✅ DSG app has Stripe credentials stored securely (not in logs)
- ✅ No hardcoded API keys visible
- ✅ Dashboard shows "Stripe Connected" status
- ✅ Timestamp reflects current time (installation just completed)

### Troubleshooting
- **Issue**: "OAuth redirect failed" → Check allowed_redirect_uris in manifest
- **Issue**: "Stripe not connected" → Verify OAuth credentials exchange succeeded
- **Issue**: "Page not found at redirect URL" → Ensure post-install dashboard endpoint is live

---

## Scenario 2: Payment Detail View Integration 📊

### Goal
Verify that policy decisions display correctly in payment detail views.

### Prerequisite
- Complete Scenario 1 (OAuth setup)
- Have at least 3 test charges in Stripe sandbox

### Steps

#### Test Charge 1: Small Amount (Should Be ALLOWED)
1. Go to Stripe Dashboard → Payments
2. Find or create charge with amount: $5.00
3. Click to open charge detail view
4. Scroll down to app panel
5. Verify "DSG Governance Gate" app panel is visible
6. Observe policy decision badge

**Expected Output:**
- ✅ App panel displays with app name "DSG Governance Gate"
- ✅ Policy decision badge shows: **ALLOW** (green badge)
- ✅ Reason text: "Amount below policy threshold"
- ✅ Policy Version: "v2.1.1" (example)
- ✅ Proof Reference: Hash shown (e.g., `0x7f3d...`)
- ✅ Evaluation Timestamp: Within last 30 seconds
- ✅ Audit Trail Link: Click opens audit entry

#### Test Charge 2: Medium Amount (Should Be REVIEW)
1. Find or create charge with amount: $50,000.00
2. Open charge detail view
3. Observe policy decision

**Expected Output:**
- ✅ Policy decision badge shows: **REVIEW** (yellow badge)
- ✅ Reason text: "Amount exceeds review threshold"
- ✅ Policy Version and Proof Reference shown
- ✅ Evaluation Timestamp accurate

#### Test Charge 3: Large Amount (Should Be BLOCKED)
1. Find or create charge with amount: $1,000,000.00
2. Open charge detail view
3. Observe policy decision

**Expected Output:**
- ✅ Policy decision badge shows: **BLOCK** (red badge)
- ✅ Reason text: "Amount exceeds policy limit"
- ✅ Complete audit trail with timestamp

### Visual Verification
- Badge colors are distinct: ALLOW (green), REVIEW (yellow), BLOCK (red)
- Text is readable with sufficient contrast
- No overflow or layout issues
- Icons/graphics load correctly

---

## Scenario 3: Safe Failure Mode (Resilience) 🛡️

### Goal
Verify that the app defaults to REVIEW when governance service is unavailable.

### Setup
1. Install app (Scenario 1)
2. Contact DSG support to temporarily disable governance API
   - OR use test mode: add `?fallback=true` to post-install URL

### Steps
1. Go to Stripe Dashboard → Payments
2. Open any charge detail view
3. Observe app panel behavior with API disabled
4. Create new charge while API is disabled
5. Open that new charge's detail view

**Expected Output:**
- ✅ App panel displays (not blank or errored)
- ✅ Policy decision shows: **REVIEW** (yellow badge)
- ✅ Reason text: "Governance service unreachable — defaulting to safe review mode"
- ✅ Error message is clear but non-alarming
- ✅ No transaction data is lost
- ✅ Once API is restored, decisions return to normal (ALLOW/BLOCK as appropriate)

### Safety Principle Verification
- ❌ NOT showing ALLOW when API fails
- ❌ NOT blocking all transactions
- ✅ Showing REVIEW (requires human attention)

---

## Scenario 4: Audit Trail & Compliance Evidence 📋

### Goal
Verify that all policy decisions are logged with complete audit trail for compliance.

### Steps
1. Open payment detail view (from Scenario 2)
2. Locate "Audit Trail" link in DSG app panel
3. Click to expand/navigate to audit trail
4. Observe audit entry details

**Expected Output - Audit Entry Contains:**
- ✅ Unique Audit ID: e.g., `audit_f47d92x`
- ✅ Timestamp: ISO 8601 format, e.g., "2026-07-04T14:32:15Z"
- ✅ Stripe Charge ID: e.g., "ch_test_xyz"
- ✅ Amount: e.g., "$50.00"
- ✅ Policy Decision: ALLOW | REVIEW | BLOCK
- ✅ Policy Version: e.g., "v2.1.1"
- ✅ Proof Hash: Deterministic hash of policy + inputs
- ✅ Evaluator: "DSG Governance Gate"
- ✅ Status: "Verified" or "Pending" (if not yet confirmed)

### Compliance Export Verification
1. Navigate to audit trail list view (multiple entries)
2. Find "Export as CSV" or "Download Compliance Report" option
3. Export audit logs from past 24 hours
4. Verify CSV includes all required columns
5. Open in spreadsheet application
6. Confirm data integrity (no corruption)

**Expected CSV Columns:**
```
audit_id,timestamp,charge_id,amount,decision,policy_version,proof_hash,evaluator,status
audit_f47d92x,2026-07-04T14:32:15Z,ch_test_xyz,50.00,REVIEW,v2.1.1,0x7f3d...,DSG,Verified
```

---

## Scenario 5: Permission Enforcement 🔐

### Goal
Verify that the app only accesses data it has permission for.

### Prerequisite
- Complete Scenario 1 (OAuth setup)
- Access to Stripe API logs or monitoring

### Scenario 5A: Read-Only Account Access
1. Monitor API calls during app usage
2. Verify the app only reads account info, not modifies it
3. Check: No `PUT`, `POST` (for updates), or `DELETE` calls to account endpoints

**Expected Output:**
- ✅ Only `GET` requests for account information
- ✅ No balance modifications
- ✅ No account settings changes
- ✅ Read-only confirmed in logs

### Scenario 5B: Charge/Refund Access
1. Create a test refund in Stripe
2. Open the refunded charge in Dashboard
3. Verify app panel shows governance decision for the refund

**Expected Output:**
- ✅ App has access to refund details
- ✅ Policy decision applies to refund
- ✅ Audit trail includes refund evaluation
- ✅ No ability to create/cancel refunds

### Scenario 5C: External Data Sharing
1. Verify app only sends data to:
   - https://tdealer01-crypto-dsg-control-plane.vercel.app/api/
   - https://dsg-stripe-app.vercel.app/api/
   - https://api.dsg.pics/v1/
2. Monitor CSP violations in browser console
3. Confirm no data leaks to other domains

**Expected Output:**
- ✅ CSP Content-Security-Policy headers configured
- ✅ No CSP violations in browser console
- ✅ All external calls go to authorized DSG endpoints
- ✅ No tracking pixels or third-party analytics

---

## Scenario 6: Error Handling & Edge Cases ⚠️

### Test Case 6A: Missing Charge Details
1. Go to a charge with minimal info
2. Observe app panel behavior

**Expected Output:**
- ✅ App still displays (no white screen)
- ✅ Shows "Loading..." or reasonable placeholder
- ✅ No JavaScript errors in console

### Test Case 6B: Network Latency
1. Throttle network to "Slow 3G" (Chrome DevTools)
2. Open payment detail view with app panel
3. Observe loading behavior

**Expected Output:**
- ✅ Loading indicator shown
- ✅ Does not freeze UI
- ✅ Eventually loads policy decision
- ✅ Does not timeout abruptly

### Test Case 6C: Permissions Revoked
1. Complete OAuth setup (Scenario 1)
2. In Stripe Account Settings, revoke app permissions
3. Try to use app (e.g., open payment detail)
4. Observe error handling

**Expected Output:**
- ✅ Clear error message: "Authorization needed"
- ✅ Provides option to "Reconnect" or "Reinstall"
- ✅ No sensitive data exposed
- ✅ App gracefully degrades

---

## Scenario 7: Multiple Policy Versions 📌

### Goal
Verify that app correctly displays and tracks policy versions.

### Setup
1. Have DSG admin account ready
2. Have test charges from different time periods

### Steps
1. Create charge #1 on Day 1 with Policy v2.0.0
2. Create charge #2 on Day 2 with Policy v2.1.0 (updated)
3. Create charge #3 on Day 3 with Policy v2.1.1 (patch)
4. View all three charges' detail pages

**Expected Output:**
- ✅ Charge #1 shows Policy Version: "v2.0.0"
- ✅ Charge #2 shows Policy Version: "v2.1.0"
- ✅ Charge #3 shows Policy Version: "v2.1.1"
- ✅ Each decision is evaluated against its original policy version
- ✅ Proof hash changes when policy version changes (deterministic!)

---

## Scenario 8: Settings & Configuration 🛠️

### Goal
Verify that authorized users can configure app settings.

### Prerequisites
- Admin access to DSG platform
- Stripe admin privileges

### Steps
1. Open DSG Dashboard: https://tdealer01-crypto-dsg-control-plane.vercel.app/dashboard/stripe-app
2. Look for "Settings" or "Configuration" tab
3. Observe configurable options:
   - Amount thresholds (ALLOW/REVIEW/BLOCK limits)
   - Time windows (daily/monthly governance limits)
   - Customer allowlists (VIP customers with auto-ALLOW)
4. Update a threshold (e.g., change REVIEW threshold from $50K to $75K)
5. Click "Save"
6. Navigate back to Stripe payment detail view
7. Create new charge to test new threshold

**Expected Output:**
- ✅ Configuration page loads and displays current settings
- ✅ Save button works without errors
- ✅ New policies take effect immediately
- ✅ Previous audit trail remains unchanged
- ✅ New decisions use updated policy

### Settings Validation
- ✅ Required fields marked clearly
- ✅ Save confirmation message shown
- ✅ No unsaved changes lost if user navigates away
- ✅ Settings persist across browser sessions

---

## Scenario 9: Multi-User Access 👥

### Goal
Verify that multiple users from same organization see consistent app behavior.

### Prerequisites
- Team member account (with read-only access)
- Admin account (with full access)

### Setup
1. Create test charge under admin account
2. Add team member to Stripe account
3. Have team member log in

### Steps
1. Team member: Open payment detail for test charge
2. Observe policy decision in DSG app panel
3. Admin: Open same charge detail
4. Observe policy decision

**Expected Output:**
- ✅ Both users see identical policy decision
- ✅ Both see same timestamp
- ✅ Both see same proof hash
- ✅ Audit trail is consistent
- ✅ Team member cannot modify policies (read-only)
- ✅ Admin can modify policies

---

## Scenario 10: Performance & Scalability 📈

### Goal
Verify that app performs well with high volume of charges.

### Steps
1. Create 100+ test charges via Stripe API
2. Rapidly open multiple payment detail views (5+ simultaneously)
3. Monitor browser performance and Stripe Dashboard responsiveness
4. Check server-side response times

**Expected Output:**
- ✅ App panel loads within 2 seconds per view
- ✅ No timeouts or dropped requests
- ✅ UI remains responsive (no frozen buttons)
- ✅ Server responds to all requests (no 503 errors)
- ✅ Memory usage remains stable

### Load Test Via API
```bash
# Generate 100 test charges
for i in {1..100}; do
  curl https://api.stripe.com/v1/charges \
    -u sk_test_[KEY]: \
    -d amount=$((RANDOM % 10000 + 1000)) \
    -d currency=usd \
    -d source=tok_visa
done

# Monitor DSG API response times
time curl https://tdealer01-crypto-dsg-control-plane.vercel.app/api/charges
```

---

## Test Completion Checklist

After running all scenarios:

- [ ] Scenario 1: Installation ✅
- [ ] Scenario 2: Payment Views ✅
- [ ] Scenario 3: Failure Mode ✅
- [ ] Scenario 4: Audit Trail ✅
- [ ] Scenario 5: Permissions ✅
- [ ] Scenario 6: Error Handling ✅
- [ ] Scenario 7: Policy Versions ✅
- [ ] Scenario 8: Configuration ✅
- [ ] Scenario 9: Multi-User ✅
- [ ] Scenario 10: Performance ✅

**All scenarios passed?**
- YES → Approve for marketplace publication ✅
- NO → List issues and request fixes

---

## Troubleshooting Reference

| Issue | Cause | Fix |
|-------|-------|-----|
| "App not found" on install | App not uploaded to Stripe | Run `stripe apps upload` |
| OAuth redirect fails | Invalid redirect_uri | Check manifest allowed_redirect_uris |
| Policy decision won't load | API unreachable | Check DSG API endpoints are live |
| CSP violations in console | External request blocked | Verify CSP connect-src URLs |
| Permissions error | OAuth scope mismatch | Re-authorize with updated scopes |
| Settings don't persist | Browser cache issue | Clear cookies and retry |

---

**Last Updated**: 2026-07-04
**Test Status**: 🟡 PENDING EXECUTION
**Expected Duration**: 2-3 hours for full test run
