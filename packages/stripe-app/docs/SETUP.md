# DSG Governance Gate - Setup & Installation Guide

**Version**: 1.1.3  
**Last Updated**: 2026-06-11  
**Support**: support@dsg.pics

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Installation (Connect from the DSG Platform)](#installation-connect-from-the-dsg-platform)
4. [Account Connection](#account-connection)
5. [Configuration](#configuration)
6. [First Time Setup](#first-time-setup)
7. [Testing the Integration](#testing-the-integration)
8. [Troubleshooting](#troubleshooting)
9. [Support](#support)

---

## Overview

**DSG Governance Gate** is a Stripe App that provides pre-execution governance gates for your Stripe operations.

### Key Features

- **Policy-Based Gating**: Define rules for charges, payments, and payouts
- **Deterministic Decisions**: ALLOW, BLOCK, or REVIEW operations based on policies
- **Audit Trail**: Recorded decision log for gated operations
- **Risk-Based Approval**: Route high-risk operations to manual review
- **Dashboard Integration**: Seamless integration with Stripe Dashboard

### What This App Does

1. Intercepts Stripe operations (charges, payments, refunds, payouts)
2. Evaluates them against your governance policies
3. Makes deterministic decisions (ALLOW / REVIEW / BLOCK)
4. Records evidence of each decision in an audit trail
5. Enforces decisions in real-time

### What This App Does NOT Do

- Modify payment amounts
- Change customer information
- Create or delete payment methods
- Execute settlements independently
- Replace Stripe's primary payment flow

---

## Prerequisites

Before installing, you need:

1. **Active Stripe Account**
   - Sign up at: https://stripe.com
   - Access to Stripe Dashboard
   - Admin or developer permissions

2. **Active DSG Control Plane Account**
   - Access to: https://tdealer01-crypto-dsg-control-plane.vercel.app
   - User account with governance configuration rights

3. **Supported Stripe Accounts**
   - US-based business account
   - Verified identity
   - No recent violations

4. **Browser Requirements**
   - Chrome, Firefox, Safari, Edge (latest versions)
   - JavaScript enabled
   - Cookies enabled

---

## Installation (Connect from the DSG Platform)

Installation starts from the DSG platform, not from the Stripe App Marketplace. If you found the app on the marketplace listing, clicking **"Install from partner"** will route you to the DSG platform login first — then you connect Stripe from inside the DSG dashboard.

### Step 1: Sign in to the DSG Platform

1. Go to https://tdealer01-crypto-dsg-control-plane.vercel.app
2. Sign in, or create an account if you don't have one yet

### Step 2: Open the Stripe App page

1. In the DSG dashboard, navigate to **Dashboard → DSG Stripe App** (`/dashboard/stripe-app`)
2. Find **"Step 1 — Connect your Stripe account"**

### Step 3: Click "Connect Stripe Account"

1. Click the **"Connect Stripe Account"** button
2. You will be redirected to Stripe's Live mode authorization page (`https://marketplace.stripe.com/oauth/v2/authorize`)

### Step 4: Review Permissions and Authorize

The app requests the following permissions:

| Permission | Purpose |
|-----------|---------|
| **Read Charges** | Evaluate governance policies on charge operations |
| **Write Charges** | Apply governance decisions (approve/block charges) |
| **Read Payment Intents** | Monitor payment intent flows for compliance |
| **Read Payouts** | Track fund movements for the decision audit log |

**Note**: This app:
- Never reads customer PII beyond what's necessary for policy evaluation
- Never modifies payment method data
- Never initiates transactions
- Only records decisions and audit logs

1. Review the permissions dialog
2. Click **"Authorize"**

### Step 5: Installation Complete

- You are redirected back to the DSG platform OAuth callback page
- The app is now installed in your Stripe account
- You can see it in Stripe Dashboard → Apps → Installed Apps

---

## Account Connection

### Verify Account Linkage

1. Go to DSG Control Plane dashboard
2. Navigate to **Stripe → Connected Accounts**
3. You should see your Stripe account listed with:
   - Account ID (acct_xxx)
   - Connection date
   - Status: **Connected**

### Revoke Access (if needed)

1. Go to Stripe Dashboard → Apps → Installed Apps
2. Find **DSG Governance Gate**
3. Click **"Remove"** to uninstall
4. Access will be revoked immediately

---

## Configuration

### Enable the App

1. In DSG Control Plane dashboard
2. Navigate to **Stripe → Settings**
3. Toggle **"Governance Gating Enabled"** to ON
4. Click **"Save"**

### Create Your First Policy

A **policy** defines rules for when operations are allowed, reviewed, or blocked.

#### Example 1: Amount Threshold Policy

```
Policy Name: "High-Value Charge Review"
Rule: If charge amount > $5,000 USD
Action: REVIEW (manual approval required)
```

#### Example 2: Rate Limit Policy

```
Policy Name: "Rate Limit Protection"
Rule: If >10 charges in 1 hour from same customer
Action: BLOCK (prevent duplicate transactions)
```

#### Example 3: Whitelist Policy

```
Policy Name: "Trusted Vendor Whitelist"
Rule: If charge for customer in whitelist
Action: ALLOW (skip review)
```

### How to Create a Policy

1. In DSG Control Plane, go to **Stripe → Policies → Create Policy**
2. Fill in:
   - **Policy Name**: Human-readable name
   - **Description**: What this policy does
   - **Rule Type**: Amount, Rate, Pattern, or Custom
   - **Condition**: The specific threshold or pattern
   - **Action**: ALLOW / REVIEW / BLOCK
   - **Priority**: 1 (highest) to 10 (lowest)
3. Click **"Create Policy"**
4. Policy takes effect immediately

### Policy Priority

Policies are evaluated in order of priority:
- **Priority 1**: Checked first (use for critical rules)
- **Priority 10**: Checked last (use for catch-all rules)

**First match wins**: Once a policy matches, other policies are skipped.

---

## First Time Setup

### 1. Verify Connection (5 minutes)

```bash
# In DSG Control Plane, run a test
POST /api/stripe-app/test
{
  "stripe_account_id": "acct_xxx"
}

# Expected response:
# ✓ Account connected
# ✓ API access confirmed
# ✓ Webhook endpoint ready
```

### 2. Create Test Policy (5 minutes)

1. Go to **Stripe → Policies**
2. Click **"Create Policy"**
3. Enter:
   - Name: "Test Policy"
   - Rule: Amount > 1000 (cents = $10)
   - Action: REVIEW
   - Priority: 1
4. Click **"Create"**

### 3. Test a Transaction (5 minutes)

1. Go to **Stripe Dashboard**
2. Create a test charge for exactly $10.00
3. The charge should enter REVIEW state
4. Go to **DSG Control Plane → Audit Trail**
5. You should see the transaction logged with:
   - Policy: "Test Policy"
   - Decision: REVIEW
   - Proof hash: [deterministic hash]

### 4. Review and Approve (5 minutes)

1. In DSG Control Plane, find the pending transaction
2. Click **"Review Decision"**
3. Click **"Approve"** or **"Reject"**
4. The charge status in Stripe updates

### 5. Check Audit Trail (5 minutes)

Go to **Stripe → Audit Trail** and verify:
- Each operation is logged
- Decisions are recorded
- Hashes are deterministic (same inputs = same hash)

---

## Testing the Integration

### Test Case 1: Amount Threshold

**Setup**:
1. Create policy: "Block high values" (amount > $50)

**Execute**:
1. Create charge for $75
2. Observe: Charge goes to REVIEW

**Verify**:
1. Check audit trail shows decision
2. Check proof hash is consistent

### Test Case 2: Rate Limiting

**Setup**:
1. Create policy: "Rate limit" (>5 charges in 5 minutes)

**Execute**:
1. Create 6 charges rapidly
2. Observe: 6th charge blocked

**Verify**:
1. Audit trail shows BLOCK decision
2. Proof links to policy

### Test Case 3: Whitelist

**Setup**:
1. Create policy: "Whitelisted customers" (customer in list)
2. Add customer to whitelist

**Execute**:
1. Create charge from whitelisted customer
2. Observe: Charge allowed immediately

**Verify**:
1. Audit trail shows ALLOW decision
2. No manual review required

---

## Troubleshooting

### Issue: "App Not Appearing in Dashboard"

**Cause**: Installation not complete or browser cache issue

**Solution**:
1. Hard refresh your browser (Cmd+Shift+R or Ctrl+Shift+R)
2. Go to Stripe Dashboard → Apps → Installed Apps
3. Verify "DSG Governance Gate" is listed
4. If not listed, reinstall from Marketplace

### Issue: "Cannot Create Policies"

**Cause**: Account not connected or missing permissions

**Solution**:
1. Verify Stripe account is connected in DSG Control Plane
2. Check that you have admin permissions in Stripe
3. Try re-authorizing: Settings → Stripe → Reconnect Account
4. Clear browser cookies for DSG Control Plane domain

### Issue: "Policies Not Applied to Operations"

**Cause**: Governance gating not enabled or webhook not working

**Solution**:
1. In DSG Control Plane, go to **Stripe → Settings**
2. Verify **"Governance Gating Enabled"** toggle is ON
3. Click **"Test Webhook"** to verify webhook connectivity
4. Check webhook delivery logs (Stripe Dashboard → Webhooks)

### Issue: "Audit Trail Not Recording"

**Cause**: Database sync issue or policy evaluation error

**Solution**:
1. Go to **Stripe → Settings → Diagnostics**
2. Click **"Check Connection"**
3. Verify "Database sync: OK"
4. If failing, contact support@dsg.pics

### Issue: "OAuth Authorization Failed"

**Cause**: Redirect URI mismatch or invalid credentials

**Solution**:
1. Check Stripe app settings match:
   - `https://tdealer01-crypto-dsg-control-plane.vercel.app/stripe/oauth/callback`
   - `https://dsg-stripe-app.vercel.app/api/stripe-app/oauth/callback`
2. Verify Stripe client ID and secret are correct
3. Clear browser cookies and try again

### Issue: "Getting 401 Unauthorized Errors"

**Cause**: Bearer token missing or expired

**Solution**:
1. Log out from DSG Control Plane
2. Log back in
3. Try operation again
4. If persists, check that user has correct role permissions

### Issue: "Webhook Signature Invalid"

**Cause**: Webhook secret doesn't match Stripe's secret

**Solution**:
1. Get correct webhook secret:
   - Stripe Dashboard → Webhooks → [Your Endpoint] → Signing Secret
2. Update in production environment variables:
   - Vercel → Settings → Environment Variables → STRIPE_WEBHOOK_SECRET
3. Redeploy application
4. Test webhook again

---

## Data Privacy & Security

### What Data Is Stored

**DSG Control Plane stores**:
- Stripe account ID (for identification)
- Operation details needed for policy evaluation
- Decision and reason
- Deterministic proof hash
- Timestamp of decision

**DSG Control Plane does NOT store**:
- Full credit card numbers
- Customer private data
- Secret keys or tokens
- Unencrypted Stripe secrets

### Data Retention

- **Audit Trail**: 7 years (for regulatory compliance)
- **Cached Policies**: 5 minutes
- **Session Data**: Until logout (cleared from browser)

### Encryption in Transit

- All communication to Stripe and DSG uses HTTPS
- TLS 1.3 minimum
- CSP headers prevent unauthorized requests

### Encryption at Rest

- Supabase PostgreSQL uses AES-256 encryption
- Sensitive fields encrypted in database
- Keys managed by Supabase

---

## Support & Documentation

### Getting Help

- **Email**: t.dealer01@dsg.pics
- **Discord**: [Link to community]
- **Documentation**: [Link to full docs]

### Additional Resources

- [API Reference](./API.md) - Endpoint documentation
- [Architecture Guide](./ARCHITECTURE.md) - Technical details
- [Deployment Guide](./DEPLOYMENT.md) - For developers

### Feedback

We'd love to hear from you! Share feedback or feature requests:
- Email: t.dealer01@dsg.pics
- GitHub Issues: [Link to repo]

---

## Next Steps

After completing this setup:

1. **Create More Policies**: Build your complete governance ruleset
2. **Test Thoroughly**: Run test transactions through all policies
3. **Enable Monitoring**: Set up alerts for blocked/review operations
4. **Train Team**: Teach operators how to review flagged transactions
5. **Go Live**: Enable governance gating on production transactions

---

**Version**: 1.0.0  
**Last Updated**: 2025-06-06  
**Status**: Production Ready
