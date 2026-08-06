# DSG ONE Stripe App - User Setup Guide

**Version**: 1.0.0  
**Last Updated**: 2026-06-07  
**Support Email**: t.dealer01@dsg.pics

---

## Table of Contents

1. [What is DSG ONE Stripe App](#what-is-dsg-one-stripe-app)
2. [Key Features](#key-features)
3. [Installation from Stripe App Marketplace](#installation-from-stripe-app-marketplace)
4. [OAuth Account Linking](#oauth-account-linking)
5. [Dashboard Overview](#dashboard-overview)
6. [Setting Up Policies](#setting-up-policies)
7. [Understanding Policy Decisions](#understanding-policy-decisions)
8. [Handling Blocked Transactions](#handling-blocked-transactions)
9. [Viewing Audit Trails](#viewing-audit-trails)
10. [Exporting Audit Reports](#exporting-audit-reports)
11. [Troubleshooting Installation](#troubleshooting-installation)
12. [Getting Support](#getting-support)

---

## What is DSG ONE Stripe App

**DSG ONE Stripe App** is an AI-powered governance and compliance solution that integrates directly with your Stripe account. It provides real-time policy-based gating for payment operations, ensuring that every transaction is evaluated against your governance rules before it executes.

### The Problem It Solves

- **Manual Review Burden**: High-value or unusual transactions require manual oversight, slowing down your operations
- **Compliance Risk**: Without systematic governance, transactions can slip through that violate your policies
- **Audit Gaps**: Traditional payment processing lacks comprehensive, immutable audit trails
- **No Real-Time Control**: Most compliance tools are reactive, not preventive

### How It Works

1. **You define policies** - Set rules for transaction amounts, rates, approval requirements
2. **App evaluates transactions** - Every transaction is checked against your policies in real-time
3. **Deterministic decisions** - Transactions are ALLOWED, sent to REVIEW, or BLOCKED based on policies
4. **Immutable audit trail** - Complete record of every decision with cryptographic proof
5. **Review and approve** - High-risk transactions route to your team for manual approval

---

## Key Features

### Pre-Execution Gating
- Policies are evaluated BEFORE transactions execute
- Decisions made in <500ms to not slow down operations
- Deterministic: same inputs always produce the same decision

### Policy-Based Control
- Define rules for amounts, rates, approval requirements, and time windows
- Set priorities so critical rules are evaluated first
- Enable/disable policies without deleting history

### Governance Decisions
- **ALLOW**: Transaction proceeds immediately without manual review
- **REVIEW**: Transaction waits for manual approval from your team
- **BLOCK**: Transaction is rejected with explanation to the user

### Immutable Audit Trail
- Every decision logged with timestamp and cryptographic proof
- Full transaction context stored for compliance
- 7-year retention for regulatory requirements
- Cannot be modified (only append-only history)

### Integrated Dashboard
- View and manage policies without leaving Stripe Dashboard
- Track pending reviews and high-risk operations
- Export audit logs for compliance reports
- Real-time decision analytics

---

## Installation from Stripe App Marketplace

### Prerequisites

Before you start, make sure you have:

1. **Active Stripe Account**
   - Admin or developer access to Stripe Dashboard
   - Verified business identity
   - No recent violations or account issues

2. **Active DSG ONE Account**
   - Account at https://tdealer01-crypto-dsg-control-plane.vercel.app
   - Admin or governance configuration rights
   - Access to your organization/workspace

3. **Modern Web Browser**
   - Chrome, Firefox, Safari, or Edge (latest versions)
   - JavaScript and cookies enabled

### Step-by-Step Installation

#### Step 1: Locate the App in Stripe Marketplace

1. Log in to your Stripe Dashboard: https://dashboard.stripe.com
2. From the left sidebar, select **Apps**
3. Click **"Discover apps"** or search for **"DSG Governance Gate"**
4. Click on the DSG ONE app card to view details

#### Step 2: Review Required Permissions

The app displays the permissions it needs:

| Permission | What It Does |
|-----------|-------------|
| **Read Charges** | View charge operations to evaluate policies |
| **Write Charges** | Apply governance decisions (approve/block charges) |
| **Read Payment Intents** | Monitor payment intent flows |
| **Read Payouts** | Track fund movements for audit |
| **Read Refunds** | Monitor refund operations |

**Important**: The app never:
- Reads full credit card numbers or customer PII beyond policy requirements
- Modifies payment method data
- Initiates transactions on its own
- Only records decisions and maintains audit trails

#### Step 3: Click Install

1. Click the **"Install"** button on the app card
2. Review the permissions dialog carefully
3. Click **"Authorize"** to grant access
4. Stripe will redirect you to the DSG ONE onboarding page

---

## OAuth Account Linking

After clicking Install, the OAuth authorization process happens automatically.

### What Happens During OAuth

1. **You approve permissions** - You authorize DSG ONE to access your Stripe account
2. **Stripe issues token** - Stripe provides a secure access token
3. **Token encrypted** - The token is immediately encrypted and stored securely
4. **You're redirected** - You're taken to the DSG ONE Control Plane

### The Authorization Flow (Detailed)

```
┌─ You click "Install" in Stripe ─────────────┐
│                                              │
├─ Stripe shows permissions dialog ───────────┤
│  (You review what the app can access)       │
│                                              │
├─ You click "Authorize" ────────────────────┤
│                                              │
├─ OAuth code exchanged for token ──────────┤
│  (Happens securely in the background)      │
│                                              │
├─ Token stored encrypted ──────────────────┤
│  (In Supabase with AES-256 encryption)     │
│                                              │
└─ Redirect to DSG ONE Onboarding ──────────┘
  https://tdealer01-crypto-dsg-control-plane.vercel.app/stripe/onboarding
```

### Verify Account Linkage

1. Go to DSG ONE Control Plane: https://tdealer01-crypto-dsg-control-plane.vercel.app
2. Navigate to **Stripe** → **Connected Accounts**
3. You should see your Stripe account listed with:
   - Account ID (acct_xxx)
   - Connection date and time
   - Status: **Connected** (green indicator)

### If You Don't See Your Account

- Hard refresh your browser (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows/Linux)
- Clear cookies for both Stripe and DSG ONE domains
- Try authorizing again from the Stripe Marketplace
- If still having issues, see [Troubleshooting Installation](#troubleshooting-installation)

---

## Dashboard Overview

The DSG ONE Control Plane dashboard is your central hub for Stripe governance.

### Main Navigation

**Stripe Section** in the left sidebar:

- **Overview** - Quick stats on decisions (ALLOW, REVIEW, BLOCK)
- **Policies** - Create and manage governance rules
- **Audit Trail** - View history of all decisions
- **Pending Reviews** - Operations awaiting your approval
- **Settings** - Configure gating behavior and fail-safe modes

### Dashboard Widgets

#### Decision Summary (Home Page)

Shows metrics for today and the past 7 days:

- **Total Transactions Evaluated**: How many operations were assessed
- **Allowed**: Percentage of transactions that proceeded immediately
- **Blocked**: Percentage rejected by policies
- **Reviews Pending**: Count of transactions awaiting manual approval

#### Pending Reviews Queue

Lists operations that matched a REVIEW policy:

- Click any operation to see details
- View the policy that triggered the review
- Approve or reject the operation
- Add notes to document your decision

#### Recent Audit Entries

Shows the latest operations evaluated:

- Operation type (charge, refund, payout)
- Amount and currency
- Decision (ALLOW, REVIEW, BLOCK)
- Applied policy name
- Proof hash (for verification)
- Timestamp

---

## Setting Up Policies

### What is a Policy?

A **policy** is a rule that defines when transactions are allowed, reviewed, or blocked. Policies give you fine-grained control over operations.

### Basic Policy Concepts

- **Name**: Human-readable name for the policy
- **Description**: What the policy does and why
- **Rule**: The condition to check (e.g., amount > $5,000)
- **Action**: What to do if rule matches (ALLOW, REVIEW, or BLOCK)
- **Priority**: Evaluation order (1 = highest, 10 = lowest)
- **Enabled**: Whether policy is active or paused

### How Policies Are Evaluated

Policies are checked **in priority order**, and the **first match wins**:

```
Transaction arrives
     ↓
Check Policy #1 (highest priority) - Does it match?
     ↓ NO
Check Policy #2 - Does it match?
     ↓ NO
Check Policy #3 - Does it match?
     ↓ YES → Apply this policy's action (ALLOW/REVIEW/BLOCK)
     ↓
Decision made, stop checking remaining policies
```

### Creating Your First Policy

#### Step 1: Navigate to Policies

1. In DSG ONE Control Plane, click **Stripe** → **Policies**
2. Click **"Create Policy"** button

#### Step 2: Fill in Policy Details

| Field | What to Enter |
|-------|--------------|
| **Policy Name** | Short, descriptive name (e.g., "High-Value Charge Review") |
| **Description** | Explain what this policy does and why |
| **Rule Type** | Choose: Amount Threshold, Rate Limit, Approval Required, or Custom |
| **Condition** | Specify the threshold or pattern |
| **Action** | Choose: ALLOW, REVIEW, or BLOCK |
| **Priority** | 1 (checked first) to 10 (checked last) |

#### Step 3: Create the Policy

1. Click **"Create Policy"**
2. Policy takes effect immediately
3. All future transactions will be evaluated against it

### Policy Examples

#### Example 1: High-Value Charge Review

```
Policy Name: "High-Value Charge Review"
Description: "Charges over $5,000 require manual approval"
Rule Type: Amount Threshold
Condition: amount_cents > 500000 (in cents)
Action: REVIEW
Priority: 1
```

**Effect**: Any charge for $5,000 or more will be sent to your review queue.

#### Example 2: Rate Limit Protection

```
Policy Name: "Rate Limit Protection"
Description: "Block more than 10 charges per hour from same customer"
Rule Type: Rate Limit
Condition: >10 charges from same customer_id in 60 minutes
Action: BLOCK
Priority: 2
```

**Effect**: The 11th charge in an hour from the same customer will be blocked.

#### Example 3: Trusted Vendor Whitelist

```
Policy Name: "Trusted Vendor Whitelist"
Description: "Auto-approve charges from known vendors"
Rule Type: Custom
Condition: customer_id IN ['cus_xxx', 'cus_yyy', ...]
Action: ALLOW
Priority: 3
```

**Effect**: Charges from whitelisted customers skip review and auto-proceed.

#### Example 4: After-Hours Payout Freeze

```
Policy Name: "After-Hours Payout Freeze"
Description: "Block payouts between 6 PM and 8 AM"
Rule Type: Time-Based Restriction
Condition: payout operation AND time between 18:00-08:00 UTC
Action: BLOCK
Priority: 1
```

**Effect**: Payouts initiated outside business hours are blocked.

### Editing Policies

1. Go to **Stripe** → **Policies**
2. Find the policy in the list
3. Click **"Edit"** to modify
4. Update any field
5. Click **"Save Changes"**
6. Policy version increments, invalidating old decisions

### Disabling and Enabling Policies

Sometimes you want to temporarily pause a policy without deleting it:

1. In the policies list, find the policy
2. Toggle the **"Enabled"** switch off to pause
3. Toggle back on to re-enable

**Note**: Disabled policies are not evaluated, but their history remains in the audit trail.

### Testing Policies in Sandbox

Before deploying to production, test your policies:

1. Create policy with test amounts/patterns
2. Go to **Stripe Test Mode** (toggle in Dashboard)
3. Create test charges matching your policy conditions
4. Verify the policy decision in the **Audit Trail**
5. Adjust policy if needed
6. Enable in production when confident

---

## Understanding Policy Decisions

Every transaction receives one of three deterministic decisions:

### ALLOW Decision

**Meaning**: The transaction is approved and proceeds immediately.

**When It Happens**:
- No policy rule matched the transaction
- A matching policy has action set to ALLOW
- Transaction meets all whitelist criteria

**User Experience**:
- Transaction proceeds in Stripe Dashboard
- No additional approval steps needed
- Decision recorded in audit trail with proof

**Example**:
- Transaction amount: $500
- Policy: "Block charges over $5,000"
- Result: ALLOW (amount is under threshold)

### REVIEW Decision

**Meaning**: The transaction requires manual review by your team before proceeding.

**When It Happens**:
- A matching policy has action set to REVIEW
- Transaction requires approval-required policy match
- High-risk operation flagged

**User Experience**:
- Transaction enters a review queue
- Appears in **Pending Reviews** on the dashboard
- Your team can see details and approve/reject
- Approval workflow can be automated with role-based access

**Example**:
- Transaction amount: $7,500
- Policy: "Amounts over $5,000 require review"
- Result: REVIEW (sent to approval queue)

**Workflow**:
```
1. Transaction attempted in Stripe
2. Policy evaluation returns REVIEW
3. Transaction added to pending reviews queue
4. Team member sees notification
5. Reviewer clicks "Approve" or "Reject"
6. If approved, transaction proceeds
7. If rejected, transaction fails with reason
8. Audit trail records the entire workflow
```

### BLOCK Decision

**Meaning**: The transaction is denied and will not proceed.

**When It Happens**:
- A matching policy has action set to BLOCK
- Transaction violates a blocking rule
- Rate limit exceeded
- Operation outside allowed time window

**User Experience**:
- Operation is immediately rejected in Stripe
- Error message explains the block reason
- Customer may see error (depending on context)
- Decision recorded in audit trail

**Example**:
- Customer: John's Pizza Shop (cus_abc123)
- Transactions in last hour: 15 charges
- Policy: "Block more than 10 charges/hour per customer"
- Result: BLOCK (rate limit exceeded)

### Decision Proof

Each decision includes a **proof hash** - a unique fingerprint showing:
- Which policy was applied
- What the decision was
- When it was made
- The transaction context

**Properties**:
- **Deterministic**: Same transaction always produces same hash
- **Immutable**: Cannot be forged or altered
- **Verifiable**: Can be audited and verified independently
- **Linked**: Forms a chain of proof throughout your audit trail

### Decision Priority

When multiple policies could match, the **highest priority policy wins**:

```
Transaction: Charge $7,500 from customer in blacklist

Policy 1 (Priority 1): "Block blacklisted customers" → BLOCK
Policy 2 (Priority 2): "Review charges over $5,000" → REVIEW

Result: BLOCK (Policy 1 has highest priority, matched first)
```

---

## Handling Blocked Transactions

When a transaction is blocked by a policy, here's what happens:

### Understanding Why a Transaction Was Blocked

1. Go to **Stripe** → **Audit Trail**
2. Find the blocked transaction
3. Click to view details
4. You'll see:
   - **Policy Name**: Which rule blocked it
   - **Reason**: Specific reason for the block
   - **Context**: Transaction details (amount, customer, etc.)
   - **Proof Hash**: Unique fingerprint of the decision

### Common Block Reasons

| Reason | What It Means | How to Fix |
|--------|-------------|-----------|
| "Rate limit exceeded" | Too many transactions in time window | Wait for time window to elapse, or adjust policy |
| "Amount exceeds limit" | Transaction over your policy threshold | Increase policy threshold or approve manually |
| "Outside allowed hours" | Operation during restricted time | Adjust time window policy or retry during business hours |
| "Blocked entity" | Customer/vendor on blocklist | Remove from blocklist or investigate reason |
| "Policy violation" | Matches a blocking rule | Contact support if policy is incorrect |

### Manual Override (if Needed)

For transactions that were blocked but should proceed:

1. Go to **Stripe** → **Audit Trail**
2. Find the blocked transaction
3. Click **"Review Override"** (if available)
4. Add notes explaining why override is needed
5. Submit for approval (based on your team's permissions)
6. Approver reviews and approves/denies
7. If approved, transaction can proceed in Stripe manually

**Important**: Overrides are logged separately in the audit trail for compliance.

### Adjusting Policies to Prevent Future Blocks

If legitimate transactions are being blocked:

1. Review the blocked transaction details
2. Go to **Stripe** → **Policies**
3. Find the blocking policy
4. Click **"Edit"**
5. Adjust the threshold or condition
6. Click **"Save Changes"**
7. Test with similar transactions to verify

---

## Viewing Audit Trails

The audit trail is your complete record of all transactions evaluated by policies.

### Accessing the Audit Trail

1. Go to DSG ONE Control Plane
2. Click **Stripe** → **Audit Trail**
3. You'll see a list of all operations evaluated

### Audit Trail Data Fields

Each audit entry shows:

| Field | What It Shows |
|-------|--------------|
| **Timestamp** | When the transaction was evaluated (UTC) |
| **Operation Type** | Type of operation (charge, refund, payout, etc.) |
| **Amount** | Transaction amount and currency |
| **Customer** | Customer ID or name (if available) |
| **Decision** | ALLOW, REVIEW, or BLOCK |
| **Policy** | Name of the policy that applied |
| **Status** | Current status (completed, pending review, approved, rejected) |
| **Proof Hash** | Unique fingerprint of the decision |

### Filtering and Searching

#### By Decision

```
Filter: Decision = ALLOW
Results: All transactions that auto-proceeded
```

```
Filter: Decision = REVIEW
Results: All transactions awaiting approval
```

```
Filter: Decision = BLOCK
Results: All blocked transactions
```

#### By Date Range

```
Filter: Date = Last 7 days
Results: Transactions from the past week
```

```
Filter: Date = Custom range
Specify: Start date and end date
```

#### By Operation Type

```
Filter: Operation Type = charge
Results: Only charge operations
```

Available types: charge, refund, payout, payment_intent, dispute

#### By Policy

```
Filter: Policy = "High-Value Review"
Results: All transactions evaluated by that policy
```

#### By Amount

```
Filter: Amount > $5,000
Results: All transactions over $5,000
```

#### Combined Filters

You can combine filters:

```
Decision = REVIEW
Date = Last 30 days
Amount > $1,000
Policy = "High-Value Review"

Results: Pending high-value transactions in the last month
```

### Searching by Transaction ID

Use the search box to find specific transactions:

```
Search: ch_1234567890 (Stripe charge ID)
Results: That specific transaction's record
```

### Viewing Operation Details

Click any audit entry to see:

- Full transaction context
- Applied policy details
- Decision and reason
- Proof hash and chain
- Approval status (if REVIEW)
- Notes from reviewers
- Timeline of actions

---

## Exporting Audit Reports

Export audit trails for compliance, reporting, and external audits.

### Exporting to CSV

**Steps**:
1. Go to **Stripe** → **Audit Trail**
2. Apply filters if needed (date range, decision type, etc.)
3. Click **"Export"** → **"CSV"**
4. File downloads to your computer
5. Open in Excel, Sheets, or any spreadsheet tool

**Included Fields**:
- Timestamp, Operation Type, Amount, Customer
- Decision, Policy Name, Status, Proof Hash
- Notes, Reviewed By, Approval Timestamp

### Exporting to JSON

**Steps**:
1. Go to **Stripe** → **Audit Trail**
2. Apply filters if needed
3. Click **"Export"** → **"JSON"**
4. File downloads with full transaction details

**Advantages**:
- Complete data including context and metadata
- Machine-readable format
- Can be imported into other systems
- Includes full proof information

### Exporting for External Audits

**For Auditors**:
1. Go to **Stripe** → **Audit Trail**
2. Set date range to audit period
3. Click **"Export"** → **"Audit Report"**
4. File includes:
   - Executive summary
   - All decisions with proof chain
   - Policy version history
   - User actions and approvals
   - Compliance statement

**Audit Report Contents**:
- Cover page with organization info and date range
- Summary of all decisions (counts by type)
- Detailed ledger of transactions
- Policy versions used during period
- User access logs
- Proof chain verification

### Scheduling Regular Exports

Set up automatic exports:

1. Go to **Stripe** → **Settings** → **Exports**
2. Click **"Schedule Export"**
3. Choose:
   - **Frequency**: Daily, Weekly, Monthly
   - **Format**: CSV or JSON
   - **Delivery**: Email address for export
4. Click **"Save"**

**Benefits**:
- Regular compliance documentation
- Backup of audit records
- Easy historical comparison
- Automated compliance workflow

### Data Retention Policies

Understand how long data is kept:

| Data Type | Retention | Notes |
|-----------|-----------|-------|
| **Audit Trail** | 7 years | Required for regulatory compliance |
| **Decision Proofs** | 7 years | Immutable, cannot be deleted |
| **Policy Versions** | 7 years | History preserved even if deleted |
| **Cached Decisions** | 5 minutes | Not stored permanently |
| **Session Data** | Until logout | Cleared from browser |

---

## Troubleshooting Installation

### Issue: "App Not Appearing in Installed Apps List"

**Cause**: Installation didn't complete or cache issue

**Solutions**:
1. Hard refresh your browser:
   - Mac: Cmd + Shift + R
   - Windows/Linux: Ctrl + Shift + R
2. Go to Stripe Dashboard → Apps → Installed Apps
3. Look for "DSG Governance Gate"
4. If still not visible, try reinstalling from the Marketplace

### Issue: "Cannot Connect Stripe Account"

**Cause**: OAuth authorization failed or token issue

**Solutions**:
1. Clear browser cookies:
   - Open Settings → Privacy
   - Clear cookies for stripe.com and tdealer01-crypto-dsg-control-plane.vercel.app
2. Log out of both Stripe and DSG ONE
3. Log back into Stripe first
4. Try installing the app again
5. Complete the full OAuth flow

### Issue: "Authorization Failed: Invalid Scope"

**Cause**: Stripe permissions changed or account limitation

**Solutions**:
1. Verify your Stripe account has full API access:
   - Stripe Dashboard → Settings → API Keys
   - Ensure your role has developer permissions
2. If you're a team member (not owner), ask account owner to install
3. Try accessing from an incognito/private browsing window
4. Contact Stripe support if your account has restrictions

### Issue: "Policies Not Evaluating Transactions"

**Cause**: Governance gating not enabled or webhook issue

**Solutions**:
1. Check if gating is enabled:
   - DSG ONE → Stripe → Settings
   - Toggle **"Governance Gating Enabled"** should be ON
2. Test webhook connectivity:
   - Click **"Test Webhook"** button
   - Should show "Webhook delivered successfully"
3. Check policy priorities:
   - Go to **Policies**
   - Verify at least one policy is enabled
   - Check that priorities are set (1-10)
4. Test with a simple transaction:
   - Create a test charge in Stripe Test Mode
   - Check **Audit Trail** to see if it was logged
   - If no log entry, webhook may not be working

### Issue: "Error: Account Not Connected"

**Cause**: Stripe account wasn't properly linked during OAuth

**Solutions**:
1. Go to DSG ONE → Stripe → Connected Accounts
2. Check if your Stripe account is listed
3. If not listed:
   - Go back to Stripe Marketplace
   - Uninstall the app (if listed in Installed Apps)
   - Reinstall from scratch
4. After reinstalling, click **"Complete Setup"** to finish onboarding

### Issue: "Getting 401 Unauthorized Errors"

**Cause**: Session token expired or permissions changed

**Solutions**:
1. Log out from DSG ONE:
   - Click profile icon → Log Out
2. Log back in:
   - Enter your email and password
3. Try operation again
4. If persists:
   - Verify you have correct permissions in your organization
   - Ask your organization admin to grant governance rights

### Issue: "Cannot Create or Edit Policies"

**Cause**: Insufficient permissions or account connection issue

**Solutions**:
1. Verify you have admin or governance rights:
   - Ask your organization admin to check your role
2. Verify Stripe account is connected:
   - Stripe → Connected Accounts
   - Should show "Connected" status
3. Clear browser cache:
   - DevTools → Application → Clear All
   - Refresh page
4. Try in a different browser to rule out browser issues

### Issue: "Webhook Signature Invalid"

**Cause**: Webhook secret doesn't match Stripe's configuration

**Solutions**:
1. Get the correct webhook secret:
   - Stripe Dashboard → Webhooks
   - Find your DSG endpoint
   - Click to reveal Signing Secret
2. Update in DSG ONE:
   - Stripe → Settings → Webhooks
   - Paste the correct secret
3. Test webhook again:
   - Click **"Test Webhook"** button
   - Should show successful delivery

### Issue: "Slow Performance or Timeouts"

**Cause**: Policy evaluation latency or database issues

**Solutions**:
1. Check number of policies:
   - Too many policies can slow evaluation
   - Keep active policies to <100
   - Archive or delete unused policies
2. Simplify policy conditions:
   - Complex conditions take longer to evaluate
   - Use simpler operators where possible
3. Check Stripe → Settings → Diagnostics:
   - Look for "Database response time"
   - If >1000ms, contact support

### Issue: "Lost Connection After Installation"

**Cause**: Session timeout or redirect issue

**Solutions**:
1. Go directly to the onboarding URL:
   - https://tdealer01-crypto-dsg-control-plane.vercel.app/stripe/onboarding
2. Click **"Complete Setup"**
3. Follow the remaining steps
4. If page won't load, check internet connection
5. Try in a different browser if issue persists

---

## Getting Support

We're here to help if you run into issues.

### Support Channels

#### Email Support
- **Email**: t.dealer01@dsg.pics
- **Response Time**: 24-48 hours for non-urgent issues
- **Use When**: Installation problems, technical errors, general questions

**What to Include in Email**:
- Brief description of the issue
- Your Stripe account ID (acct_xxx)
- Steps you've taken to troubleshoot
- Screenshots if relevant
- Error messages (copy/paste exactly)

#### Documentation
- **Setup Guide**: `/docs/SETUP.md`
- **Technical Architecture**: `/docs/ARCHITECTURE.md`
- **API Reference**: `/docs/API.md`
- **FAQ**: `FAQ.md`

#### Emergency Issues
For critical production issues:
1. Document the issue and impact
2. Note your Stripe account ID
3. Email support with "URGENT:" in subject line

### Common Support Scenarios

#### "I need to uninstall the app"

1. Go to Stripe Dashboard → Apps → Installed Apps
2. Find "DSG Governance Gate"
3. Click the gear icon → Remove
4. Confirm removal
5. Access will be revoked immediately
6. All audit trail data remains (cannot be deleted)

#### "I need to change my policies"

1. Go to DSG ONE → Stripe → Policies
2. Edit existing policies or create new ones
3. Changes take effect immediately
4. All transactions from that point use new policies

#### "I need to review old transactions"

1. Go to Stripe → Audit Trail
2. Set date range to desired period
3. Filter as needed
4. Click on any transaction for full details
5. Export for external review if needed

#### "I need to add team members"

1. Go to DSG ONE → Organization Settings → Members
2. Click "Invite Team Member"
3. Enter their email
4. Set their role (Viewer, Editor, Admin)
5. Send invitation
6. They'll receive email with link to join

#### "How do I know if the app is working?"

1. Go to Stripe → Audit Trail
2. Should see recent transactions
3. All decisions logged with timestamps
4. Click "Test Webhook" in Settings to verify connectivity

### Feature Requests

Have an idea for a new policy rule type or feature? Let us know:

1. Email t.dealer01@dsg.pics with:
   - Feature description
   - Why it would help your business
   - How often you'd use it
   - Any competitors offering similar functionality

2. Your feedback helps shape the product roadmap

### Training and Onboarding

For team training on the app:

1. Share this guide with your team
2. Walk through the Dashboard Overview section
3. Have them create a test policy together
4. Run through a test transaction end-to-end
5. Practice approving/rejecting reviews
6. Review audit trail together

### Feedback

We value your feedback. After using the app for a week or two:

1. Email us at t.dealer01@dsg.pics with:
   - What's working well
   - What could be better
   - Any bugs or weird behavior
   - Overall satisfaction score (1-10)

2. Share concrete examples if possible
3. Your feedback helps improve the product

---

## Next Steps

After completing this setup guide:

1. **Create Your First Policy**
   - Start simple (e.g., amount threshold)
   - Test in sandbox mode
   - Expand as you get comfortable

2. **Test End-to-End**
   - Create a test charge
   - Watch it get evaluated
   - See it in the audit trail
   - Practice approving a review

3. **Set Up Your Team**
   - Invite team members
   - Assign roles and permissions
   - Train on the approval workflow

4. **Monitor and Optimize**
   - Review audit logs weekly
   - Adjust policies based on patterns
   - Track decision metrics
   - Look for opportunities to automate

5. **Go Live**
   - When confident, enable gating on production
   - Start with low-risk policies
   - Gradually increase coverage

---

**Need Help?** Email t.dealer01@dsg.pics anytime.

**Last Updated**: 2026-06-07  
**Version**: 1.0.0
