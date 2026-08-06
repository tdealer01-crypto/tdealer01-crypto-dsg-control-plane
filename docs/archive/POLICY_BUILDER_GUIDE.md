# DSG ONE Stripe App - Policy Builder Guide

**Version**: 1.0.0  
**Last Updated**: 2026-06-07  
**Support Email**: t.dealer01@dsg.pics

---

## Table of Contents

1. [Policy Concept Explanation](#policy-concept-explanation)
2. [Creating Your First Policy](#creating-your-first-policy)
3. [Rule Types](#rule-types)
4. [Amount Thresholds](#amount-thresholds)
5. [Rate Limits](#rate-limits)
6. [Approval Requirements](#approval-requirements)
7. [Time-Based Restrictions](#time-based-restrictions)
8. [Policy Versioning](#policy-versioning)
9. [Testing Policies in Sandbox Mode](#testing-policies-in-sandbox-mode)
10. [Deploying Policies to Production](#deploying-policies-to-production)
11. [Policy Examples](#policy-examples)
12. [Advanced Policy Patterns](#advanced-policy-patterns)
13. [Policy Troubleshooting](#policy-troubleshooting)

---

## Policy Concept Explanation

### What is a Policy?

A **policy** is a set of rules that define governance decisions for Stripe operations. Each policy specifies:

- **What to check**: A condition (e.g., transaction amount)
- **When to apply**: Under what circumstances the rule matches
- **What to do**: The action to take (ALLOW, REVIEW, or BLOCK)
- **Priority**: Which policies are evaluated first

### Why Policies Matter

Policies transform your governance strategy into executable rules:

```
Manual Process (Without Policies)
─────────────────────────────────────
Transaction arrives
  ↓
Human reviews it (slow, inconsistent)
  ↓
Decision made (could vary based on mood, fatigue)
  ↓
Action taken (sometimes hours of delay)


Automated Process (With Policies)
─────────────────────────────────────
Transaction arrives
  ↓
Policies evaluated (<500ms, deterministic)
  ↓
Decision made (consistent, auditable)
  ↓
Action taken immediately or routed to review
```

### Key Policy Properties

#### Deterministic
Same transaction always produces the same decision:

```
Transaction: $7,500 charge from customer ABC
Day 1: Policy evaluation → REVIEW
Day 2: Same transaction → REVIEW (always consistent)
```

#### Immutable Audit Trail
Every policy decision is recorded permanently:

```
Policy applied on June 1
  ↓
Transaction evaluated
  ↓
Decision recorded with proof hash
  ↓
Cannot be modified or deleted
  ↓
Available for 7 years for audit
```

#### Priority-Based Evaluation
Policies checked in order, first match wins:

```
Policy 1 (Priority 1): Check for blacklist → No match
Policy 2 (Priority 2): Check amount > $5,000 → MATCH! Apply REVIEW
Policy 3 (Priority 3): Not evaluated (already matched)
```

#### Version Tracking
Each policy update increments its version:

```
Policy Version 1: Amount > $5,000 → REVIEW
  (Applied to all transactions during this period)
  ↓
Update threshold to $10,000
  ↓
Policy Version 2: Amount > $10,000 → REVIEW
  (New transactions use version 2)
  (Audit trail shows which version applied)
```

---

## Creating Your First Policy

### Step 1: Navigate to Policy Builder

1. Open DSG ONE Control Plane
2. Click **Stripe** in the left sidebar
3. Click **Policies**
4. Click **"Create Policy"** button (top right)

### Step 2: Enter Basic Information

| Field | Example |
|-------|---------|
| **Policy Name** | "High-Value Charge Review" |
| **Description** | "Charges over $5,000 USD require manual review" |

**Tips**:
- Use clear, descriptive names (avoid generic "Policy 1")
- Descriptions help your team understand the purpose
- Include the threshold or criteria in the description

### Step 3: Select Rule Type

Choose the type of condition to check:

- **Amount Threshold**: Check transaction amount
- **Rate Limit**: Check frequency of operations
- **Approval Required**: Require approval for specific operations
- **Time-Based**: Check time of operation (day, hour, etc.)
- **Custom**: Advanced custom conditions

For your first policy, start with **Amount Threshold**.

### Step 4: Define the Condition

**For Amount Threshold:**
```
Field: amount_cents
Operator: Greater than (>)
Value: 500000 (equals $5,000)
```

This checks if the transaction amount is greater than $5,000.

### Step 5: Choose the Action

| Action | What It Does | Use When |
|--------|------------|----------|
| **ALLOW** | Transaction proceeds immediately | You want to auto-approve this pattern |
| **REVIEW** | Transaction queued for manual approval | You want your team to make the decision |
| **BLOCK** | Transaction is rejected | You want to prevent this pattern |

For a high-value review policy, choose **REVIEW**.

### Step 6: Set Priority

- **Priority 1**: Highest (checked first, applies to critical rules)
- **Priority 5**: Medium (standard rules)
- **Priority 10**: Lowest (catch-all rules)

**Example priority scheme**:
```
Priority 1: Blacklist (most critical)
Priority 2: Rate limits (fraud prevention)
Priority 3: High-value review (oversight)
Priority 4: Trusted whitelist (auto-approve)
Priority 5: Catch-all default behavior
```

For your first high-value review policy, set **Priority 3**.

### Step 7: Create the Policy

1. Click **"Create Policy"**
2. Policy is created and immediately enabled
3. All new transactions will be evaluated against it
4. A confirmation message appears
5. You're redirected to the policies list

### Your First Policy is Live!

The policy is now active:
- New transactions matching the condition will be affected
- Each decision is logged in the audit trail
- You can edit or disable it anytime

---

## Rule Types

### 1. Amount Threshold

Evaluate based on transaction amount.

**When to Use**:
- High-value operations need approval
- Prevent unusually large transactions
- Tier-based handling by amount

**Configuration**:

```
Field: amount_cents
Operator: (see below)
Value: Amount in cents
```

**Operators**:

| Operator | Example | Matches |
|----------|---------|---------|
| **Equals (=)** | 10000 | Exactly $100 |
| **Greater than (>)** | 500000 | More than $5,000 |
| **Less than (<)** | 100000 | Less than $1,000 |
| **Greater or equal (≥)** | 500000 | $5,000 or more |
| **Less or equal (≤)** | 100000 | $1,000 or less |
| **Not equal (≠)** | 200000 | Everything except $2,000 |

**Examples**:

```
Example 1: Review large purchases
Field: amount_cents
Operator: >
Value: 1000000
Effect: All charges over $10,000 → REVIEW

Example 2: Block micropayments
Field: amount_cents
Operator: <
Value: 50
Effect: All charges under $0.50 → BLOCK

Example 3: Auto-approve standard size
Field: amount_cents
Operator: ≥ and ≤
Value: 100000 - 500000
Effect: Charges between $1,000-$5,000 → ALLOW
```

**Tip**: Always use cents (not dollars) for the value.

### 2. Rate Limit

Control frequency of operations by customer, account, or time window.

**When to Use**:
- Prevent transaction flooding from one customer
- Limit total throughput per hour/day
- Fraud detection (unusual patterns)

**Configuration**:

```
Metric: Which to count (charges from customer_id, payouts from account_id, etc.)
Threshold: Number of operations
Window: Time period (5 min, 1 hour, 1 day)
```

**Examples**:

```
Example 1: Customer rate limit
Metric: Number of charges from same customer_id
Threshold: 10
Window: 1 hour
Effect: 11th charge in an hour from same customer → BLOCK

Example 2: Daily payout limit
Metric: Number of payout operations
Threshold: 50
Window: 1 day (calendar day)
Effect: 51st payout on a day → BLOCK

Example 3: Account-wide rate limit
Metric: Total charges across all customers
Threshold: 1000
Window: 1 hour
Effect: 1001st charge in an hour → REVIEW
```

**Configuration Notes**:
- Windows are sliding (last 1 hour = last 60 minutes from now)
- Rate counting includes both successful and failed operations
- Block is enforced even if previous operations haven't settled

### 3. Approval Required

Require approval for specific operation types or conditions.

**When to Use**:
- All operations of a type need human approval (e.g., all refunds)
- Specific patterns need escalation
- Compliance requirements

**Configuration**:

```
Operation: charge, refund, payout, payment_intent, etc.
Condition: (optional) Additional criteria
```

**Examples**:

```
Example 1: All refunds require approval
Operation: refund.create
Action: REVIEW
Effect: Every refund is queued for manual approval

Example 2: Large refunds require approval
Operation: refund.create
Condition: amount > $1,000
Action: REVIEW
Effect: Refunds over $1,000 → REVIEW (smaller refunds auto-allow)

Example 3: All payouts require approval
Operation: payout.created
Action: REVIEW
Effect: Every payout is reviewed before execution
```

### 4. Time-Based Restrictions

Control when operations are allowed based on time of day or day of week.

**When to Use**:
- Prevent operations outside business hours
- Restrict high-risk times
- Mandatory approval windows
- Compliance with trading hours

**Configuration**:

```
Time Zone: Your timezone (e.g., UTC, US/Eastern)
Days: Which days apply (all, weekdays, weekends, specific days)
Hours: Which hours apply (e.g., 9 AM - 5 PM)
Action: What to do outside allowed times
```

**Examples**:

```
Example 1: Business hours only
Days: Weekdays only (Mon-Fri)
Hours: 9 AM - 5 PM (UTC)
Action: BLOCK
Effect: Any operation outside 9-5 Mon-Fri → BLOCK

Example 2: After-hours review
Days: All days
Hours: 6 PM - 8 AM (outside hours)
Action: REVIEW
Effect: Operations between 6 PM and 8 AM → REVIEW

Example 3: Weekend freeze
Days: Saturday and Sunday
Hours: All day
Action: BLOCK
Effect: No operations on weekends

Example 4: Monthly compliance window
Days: 1st-5th of each month
Hours: All day
Action: BLOCK
Effect: Certain operations only allowed during compliance window
```

**Time Zone Examples**:
- `UTC` - Coordinated Universal Time
- `US/Eastern` - Eastern Time (New York)
- `US/Central` - Central Time
- `US/Mountain` - Mountain Time
- `US/Pacific` - Pacific Time
- `Europe/London` - GMT/BST
- `Asia/Tokyo` - Japan Standard Time

---

## Amount Thresholds

Deep dive into amount-based policies.

### Basic Amount Policy

```
Policy Name: "Review Charges Over $5,000"
Rule Type: Amount Threshold
Field: amount_cents
Operator: >
Value: 500000
Action: REVIEW
Priority: 3
```

**What It Does**:
- Every charge for more than $5,000 is sent to your review queue
- Charges of $5,000 or less auto-allow
- Each decision recorded with proof hash

### Tiered Amount Policy

Sometimes you want different actions for different amounts:

```
Policy 1 (Priority 1):
- Name: "Block Microtransactions"
- Amount < 50 cents
- Action: BLOCK

Policy 2 (Priority 2):
- Name: "Review Large Transactions"
- Amount > $10,000
- Action: REVIEW

Policy 3 (Priority 3):
- Name: "Standard Amounts Auto-Allow"
- Amount between $0.50 - $10,000
- Action: ALLOW
```

**Processing**:
```
Transaction: $0.25 → Matches Policy 1 → BLOCK
Transaction: $500 → Matches Policy 3 → ALLOW
Transaction: $15,000 → Matches Policy 2 → REVIEW
```

### Currency-Specific Amounts

Handle different currencies:

```
Policy 1 (USD):
- Amount > 500000 (cents) → REVIEW
- For USD transactions

Policy 2 (EUR):
- Amount > 450000 (cents) → REVIEW
- For EUR transactions (lower threshold due to exchange rate)
```

### Seasonal Amount Adjustments

Temporarily adjust thresholds for peak seasons:

```
Regular Policy:
- Amount > $5,000 → REVIEW

Peak Season (Dec 1-25):
- Create temporary policy (Priority 1)
- Amount > $10,000 → REVIEW
- Disable on Jan 1
```

---

## Rate Limits

Control operation frequency.

### Simple Customer Rate Limit

```
Policy Name: "Rate Limit Per Customer"
Rule Type: Rate Limit
Metric: Charges from same customer
Threshold: 10
Window: 1 hour
Action: BLOCK
Priority: 2
```

**Effect**:
```
Hour 1:
  Charge 1 from customer → ALLOW
  Charge 2 from customer → ALLOW
  ...
  Charge 10 from customer → ALLOW
  Charge 11 from customer → BLOCK (rate limit hit)

Hour 2 (new hour):
  Charge 1 (new hour) → ALLOW (window reset)
```

### Account-Wide Throughput Limit

```
Policy Name: "Account Throughput Limit"
Rule Type: Rate Limit
Metric: Total charges (all customers)
Threshold: 500
Window: 1 hour
Action: BLOCK
Priority: 1
```

**Effect**: Prevent more than 500 charges per hour from entire account.

### Day-Based Rate Limit

```
Policy Name: "Daily Payout Limit"
Rule Type: Rate Limit
Metric: Number of payout operations
Threshold: 25
Window: 1 calendar day
Action: BLOCK
Priority: 2
```

**Effect**: No more than 25 payouts per calendar day.

### Combining Rate Limits

Use multiple policies with different windows:

```
Policy 1 (Priority 1): Per-minute limit
- Threshold: 5 per minute
- Action: BLOCK
- Catch botched/automated attacks

Policy 2 (Priority 2): Per-hour limit
- Threshold: 50 per hour
- Action: REVIEW
- Catch unusual patterns

Policy 3 (Priority 3): Per-day limit
- Threshold: 500 per day
- Action: REVIEW
- Monitor total volume
```

---

## Approval Requirements

Require manual approval for specific operations.

### Simple Approval Policy

```
Policy Name: "Refunds Require Approval"
Rule Type: Approval Required
Operation: refund.create
Action: REVIEW
Priority: 2
```

**Effect**: Every refund must be manually approved before proceeding.

### Conditional Approval

```
Policy Name: "Large Refunds Require Approval"
Rule Type: Approval Required
Operation: refund.create
Condition: amount > 500000 (cents)
Action: REVIEW
Priority: 2
```

**Effect**:
- Refunds under $5,000 → Auto-allow
- Refunds $5,000 and over → Require approval

### Approval by Operation Type

Create approval policies for specific operations:

```
Policy 1: Refunds
Operation: refund.create
Action: REVIEW

Policy 2: Disputes
Operation: charge.dispute.created
Action: REVIEW

Policy 3: Payouts
Operation: payout.created
Action: REVIEW
```

---

## Time-Based Restrictions

Control operations by time of day and day of week.

### Business Hours Policy

```
Policy Name: "Business Hours Only"
Rule Type: Time-Based
Days: Weekdays (Mon-Fri)
Hours: 9 AM - 5 PM
Time Zone: US/Eastern
Outside Allowed Time: BLOCK
Priority: 1
```

**Effect**:
```
Monday 2 PM: Transaction allowed
Monday 7 PM: BLOCK (outside hours)
Saturday: BLOCK (weekend)
```

### After-Hours Review Policy

```
Policy Name: "After-Hours Review"
Rule Type: Time-Based
Days: All days
Hours: 6 PM - 8 AM
Time Zone: UTC
Action: REVIEW
Priority: 2
```

**Effect**: Any operation between 6 PM - 8 AM UTC is reviewed.

### Weekend Freeze

```
Policy Name: "Weekend Freeze"
Rule Type: Time-Based
Days: Saturday and Sunday
Hours: All day
Action: BLOCK
Priority: 1
```

**Effect**: No operations allowed on weekends.

### Specific Day Restrictions

```
Policy Name: "Month-End Review"
Rule Type: Time-Based
Days: 25th-last day of month
Action: REVIEW
Priority: 2
```

**Effect**: Operations on month-end days require approval.

---

## Policy Versioning

Understand how policies evolve over time.

### What is a Policy Version?

Each time you edit a policy, its version increments:

```
Initial Creation: Version 1
First Edit: Version 2
Second Edit: Version 3
...
```

### Why Versioning Matters

**Audit Trail Tracking**:
- Every decision records which policy version applied
- You can see exactly which rules were in effect
- Helps with compliance and historical analysis

**Example**:
```
June 1: Create policy (Version 1)
  Amount > $5,000 → REVIEW
  100 transactions evaluated with Version 1

June 15: Update policy (Version 2)
  Amount > $10,000 → REVIEW
  (Changed threshold from $5,000 to $10,000)
  50 transactions evaluated with Version 2

Audit Trail Shows:
  Transactions 1-100: Evaluated with Version 1
  Transactions 101-150: Evaluated with Version 2
```

### Viewing Policy History

1. Go to Stripe → Policies
2. Click on a policy
3. Click **"History"** tab
4. See all versions with:
   - When it was created/modified
   - What changed in each version
   - Who made the change
   - Which transactions used that version

### Reverting to Previous Version

If a policy change causes problems:

1. Go to Policies
2. Click the problematic policy
3. Click **"History"**
4. Click **"Revert to Version X"** (the previous working version)
5. Confirm the revert
6. New version created with original settings
7. Previous transactions remain with their original version record

---

## Testing Policies in Sandbox Mode

Always test policies before deploying to production.

### Enable Stripe Test Mode

1. Open Stripe Dashboard
2. Click the toggle in top right: **View Test Data**
3. Switch to **Test Mode**
4. Test mode badge appears at the top

### Test Mode Benefits

- Create test charges without real money
- Test policies with realistic data
- No impact on live account
- Data is separate from live mode

### Creating Test Transactions

#### Test Charge

```
Stripe Dashboard (Test Mode)
  → Charges
  → Create a test charge
  
Details:
  Amount: $7,500
  Currency: USD
  Customer: (optional)
  Description: "Test high-value charge"
```

#### Expected Results

If you have a policy:
```
"Review charges over $5,000"
Action: REVIEW
```

Then:
```
1. Create $7,500 test charge
2. Charge created and evaluation happens
3. Go to Audit Trail
4. Should see the charge logged as REVIEW decision
5. Charge appears in Pending Reviews queue
6. You can practice approving it
```

### Test Scenarios

#### Scenario 1: Amount Threshold

```
Policy: Review charges > $5,000

Tests:
1. Create $1,000 charge
   → Should see ALLOW in audit trail
2. Create $5,000 charge
   → Should see ALLOW (not greater than)
3. Create $5,001 charge
   → Should see REVIEW
4. Create $10,000 charge
   → Should see REVIEW
```

#### Scenario 2: Rate Limit

```
Policy: Block > 5 charges per customer in 1 hour

Tests:
1. Create charges 1-5 from customer ABC
   → All should ALLOW
2. Create charge 6 from customer ABC
   → Should BLOCK
3. Wait 1 hour
4. Create charge 7 from customer ABC (new hour)
   → Should ALLOW (window reset)
```

#### Scenario 3: Time-Based

```
Policy: Business hours only (9-5 Mon-Fri, US/Eastern)

Tests:
1. At 2 PM Monday
   → Create charge
   → Should ALLOW
2. At 7 PM Monday
   → Create charge
   → Should BLOCK
3. Saturday
   → Create charge
   → Should BLOCK
```

### Verifying Test Results

1. Go to Stripe → Audit Trail
2. Set date range to today
3. Look for your test transactions
4. Click each to verify:
   - Decision matches expected
   - Proof hash is present
   - Policy version is correct
   - Timestamp is accurate

### Iterating on Policies

If test results don't match expectations:

1. Review the policy settings
2. Check the condition/threshold
3. Edit the policy
4. Create another test transaction
5. Verify in audit trail again
6. Repeat until correct

### Running Regression Tests

Before deploying to production, test all policies:

```
Test Plan:
□ Policy 1: Test each condition
  □ Case A: Matches, should ALLOW
  □ Case B: Matches, should REVIEW
  □ Case C: Doesn't match, should proceed to next

□ Policy 2: Test each condition
  □ ...

□ All policies combined: Test interaction
  □ Case 1: Matches Policy 1 → stops (Priority 1 wins)
  □ Case 2: Doesn't match Policy 1, matches Policy 2 → Policy 2 applies
  □ Case 3: Matches multiple policies → Highest priority wins
```

---

## Deploying Policies to Production

Move from test mode to live transactions.

### Pre-Deployment Checklist

- [ ] All policies created and tested in sandbox
- [ ] All policy conditions verified correct
- [ ] Team trained on approval workflow
- [ ] Audit trail configured for logging
- [ ] Fallback plan in case of issues documented

### Deployment Steps

#### Step 1: Enable Governance Gating

1. Go to Stripe → Settings
2. Toggle **"Governance Gating Enabled"** to ON
3. Click **"Save"**
4. System confirms gating is active

#### Step 2: Switch to Live Mode

1. Go to Stripe Dashboard
2. Click the **View Test Data** toggle at top
3. Switch to **Live Mode**
4. Badge changes to show live mode

#### Step 3: Start with Low-Risk Policies First

Deploy policies gradually:

```
Week 1: Enable only whitelist policies (ALLOW)
  → Build confidence in system

Week 2: Enable low-value review policies
  → Review policies for amounts < $500

Week 3: Enable medium-value review policies
  → Review policies for amounts $500-$5,000

Week 4: Enable high-value review policies
  → Review policies for amounts > $5,000

Month 2: Enable blocking policies
  → Rate limits, fraud prevention
```

#### Step 4: Monitor Closely

During first week in production:

1. Check **Audit Trail** daily
2. Review all REVIEW decisions
3. Watch for false positives (legitimate blocked transactions)
4. Adjust policies if needed
5. Track team's approval workflow

### Handling Issues in Production

If policies are causing problems:

#### Issue: Too Many False Positives (Legitimate transactions blocked)

**Solution**:
1. Go to Policies
2. Identify the problematic policy
3. Click **"Edit"**
4. Adjust threshold (e.g., increase amount limit)
5. Save - change takes effect immediately
6. Previous transactions keep their original decision (immutable)

**Example**:
```
Policy causing issue: "Review charges > $5,000"
Problem: Many legitimate business customers have $5,000+ charges
Solution: Increase to $10,000 threshold
```

#### Issue: Policies Not Being Enforced

**Solutions**:
1. Verify gating is enabled: Stripe → Settings
2. Test webhook: Click "Test Webhook" button
3. Check policy is enabled: Go to Policies, verify toggle is ON
4. Confirm transactions should match policy

#### Issue: Approval Queue Overloaded

**Solutions**:
1. Adjust policies to reduce REVIEW decisions:
   - Increase amount thresholds
   - Loosen rate limit thresholds
   - Add whitelist policies for known-good customers
2. Hire/delegate approvers
3. Set up automated approvals for trusted patterns

### Rolling Back Policies

If you need to undo a policy change:

1. Go to Stripe → Policies
2. Find the policy
3. Click **"History"**
4. Click **"Revert to Version X"** (previous version)
5. Confirm revert
6. New version created with old settings

**Note**: All transactions keep their original decision - this doesn't change past decisions.

---

## Policy Examples

### Example 1: High-Value Charge Approval

**Business Need**: Charges over $5,000 need manager approval

```
Policy Name: "High-Value Charge Approval"
Description: "Charges over $5,000 USD require manager review"

Rule Type: Amount Threshold
Field: amount_cents
Operator: >
Value: 500000

Action: REVIEW
Priority: 2

Enabled: Yes
```

**Result**:
- Charges up to $4,999.99 → Auto-allow
- Charges $5,000 and up → Approval queue

---

### Example 2: Payout Freeze After Hours

**Business Need**: No payouts between 6 PM and 8 AM

```
Policy Name: "After-Hours Payout Freeze"
Description: "Block payouts between 6 PM and 8 AM"

Rule Type: Time-Based
Days: All days
Hours: 6 PM - 8 AM UTC
Time Zone: UTC

Action: BLOCK
Priority: 1

Enabled: Yes
```

**Result**:
- Payouts 8 AM - 6 PM → Allowed
- Payouts 6 PM - 8 AM → Blocked

---

### Example 3: Rate Limit on Refunds

**Business Need**: Prevent refund abuse - no more than 10 refunds per customer per day

```
Policy Name: "Daily Refund Rate Limit"
Description: "Block if customer requests >10 refunds per day"

Rule Type: Rate Limit
Metric: Refunds from same customer
Threshold: 10
Window: 1 calendar day

Action: BLOCK
Priority: 2

Enabled: Yes
```

**Result**:
- Refunds 1-10 from customer on a day → Allowed
- Refund 11+ from customer on a day → Blocked

---

### Example 4: Trusted Vendor Whitelist

**Business Need**: Auto-approve charges from known vendors

```
Policy Name: "Trusted Vendors Auto-Allow"
Description: "Skip review for charges from trusted vendors"

Rule Type: Custom
Condition: customer_id IN ['cus_stripe_id_1', 'cus_stripe_id_2', ...]

Action: ALLOW
Priority: 1

Enabled: Yes
```

**Result**:
- Charges from trusted customers → Immediate approval
- Other charges → Follow remaining policies

---

### Example 5: Fraud Pattern - Rate Limit

**Business Need**: Block unusual transaction patterns (fraud prevention)

```
Policy Name: "Fraud Prevention - Rate Limit"
Description: "Block if >100 charges in 1 hour (unusual pattern)"

Rule Type: Rate Limit
Metric: Total charges (all customers)
Threshold: 100
Window: 1 hour

Action: BLOCK
Priority: 1

Enabled: Yes
```

**Result**:
- Normal hourly volume (0-100 charges) → Allowed
- Unusual spike (>100 charges/hour) → Blocked

---

### Example 6: Refund Review for Large Amounts

**Business Need**: Refunds over $1,000 need approval

```
Policy Name: "Large Refund Approval"
Description: "Refunds over $1,000 require manager approval"

Rule Type: Approval Required
Operation: refund.create
Condition: amount > 100000 (cents)

Action: REVIEW
Priority: 2

Enabled: Yes
```

**Result**:
- Refunds under $1,000 → Auto-approve
- Refunds $1,000+ → Approval queue

---

### Example 7: Compliance Window - Month-End Only

**Business Need**: Certain operations only allowed during first 5 days of month

```
Policy Name: "Compliance Window Restriction"
Description: "Operation X only allowed on 1st-5th of each month"

Rule Type: Time-Based
Days: 1st-5th of each calendar month
Hours: All day

Action: ALLOW (outside allowed days: BLOCK)
Priority: 1

Enabled: Yes
```

**Result**:
- Days 1-5 of month → Allowed
- Days 6-end of month → Blocked

---

### Example 8: Multi-Level Approval by Amount

**Business Need**: Tiered approval based on amount

```
Policy 1 (Priority 1):
Name: "Micro-Charge Auto-Allow"
Amount: < 5000 (cents/$50)
Action: ALLOW

Policy 2 (Priority 2):
Name: "Standard-Charge Auto-Allow"
Amount: 5000-500000 (cents/$50-$5,000)
Action: ALLOW

Policy 3 (Priority 3):
Name: "Large-Charge Manager Review"
Amount: 500000-5000000 (cents/$5,000-$50,000)
Action: REVIEW

Policy 4 (Priority 4):
Name: "Enterprise-Charge Director Review"
Amount: > 5000000 (cents/>$50,000)
Action: REVIEW
```

**Result**: Different approval paths based on amount.

---

## Advanced Policy Patterns

### Pattern 1: Tiered Governance

Different rules at different times:

```
Policy 1 (Priority 1):
- Time-based: Business hours (9-5 Mon-Fri)
- Amount > $10,000 → REVIEW

Policy 2 (Priority 2):
- Time-based: After-hours (5 PM-9 AM)
- Amount > $5,000 → REVIEW
(Lower threshold outside business hours due to no support staff)
```

### Pattern 2: Graduated Risk Response

Escalate response for increasing risk:

```
Policy 1: Initial Rate Limit
- > 50 charges/hour → REVIEW (alert)

Policy 2: Escalated Rate Limit
- > 100 charges/hour → BLOCK (prevent)

Policy 3: Critical Rate Limit
- > 500 charges/hour → BLOCK + Alert (emergency)
```

### Pattern 3: Whitelist Override

Allow exceptions to blocking rules:

```
Policy 1 (Priority 1):
- Whitelist: customer_id IN [trusted_list]
- Action: ALLOW
(Bypass all other rules)

Policy 2 (Priority 2):
- Amount > $100,000 → BLOCK
(But Policy 1 already allowed known customers)
```

### Pattern 4: Conditional Escalation

Different actions for different conditions:

```
Policy 1:
- Amount $1,000-$5,000: ALLOW
- Amount $5,000-$50,000: REVIEW
- Amount > $50,000: BLOCK
(Implemented as three separate policies with conditions)
```

---

## Policy Troubleshooting

### Issue: Policy Not Being Applied

**Symptoms**: Transactions matching policy aren't being evaluated

**Causes & Solutions**:

1. **Policy not enabled**:
   - Go to Policies list
   - Check if the policy toggle is ON
   - Enable if disabled

2. **Governance gating not enabled**:
   - Go to Stripe → Settings
   - Check "Governance Gating Enabled" is ON
   - Enable if off

3. **Webhook not working**:
   - Go to Stripe → Settings
   - Click "Test Webhook"
   - Should show "Successful"
   - If failing, check connection and retry

4. **Wrong priority**:
   - Check if a higher-priority policy matches first
   - Adjust priorities so correct policy evaluates first

5. **Condition mismatch**:
   - Example: Policy checks amount in cents but threshold is wrong
   - Test a transaction that should match
   - Check audit trail to see if policy applied

### Issue: Too Many False Positives

**Symptoms**: Legitimate transactions being blocked/reviewed excessively

**Solutions**:

1. **Adjust threshold**:
   - Increase amount thresholds
   - Loosen rate limit windows

2. **Add whitelist**:
   - Create whitelist policy (Priority 1)
   - Add known-good customers
   - Whitelist auto-allows and skips other checks

3. **Add time exclusion**:
   - Business hours: Higher thresholds
   - After-hours: Lower thresholds

### Issue: Policy Changes Not Taking Effect

**Symptoms**: Updated policy not affecting new transactions

**Causes & Solutions**:

1. **Changes didn't save**:
   - Go to policy
   - Click "Edit"
   - Verify all changes
   - Click "Save"
   - Confirm save success message

2. **Cache not cleared** (rare):
   - Cache should auto-clear on edit
   - If not, wait 5 minutes
   - Then test with new transaction

3. **Testing in wrong environment**:
   - Testing in Test Mode, policy in Live Mode
   - Switch to correct mode in Stripe Dashboard

### Issue: Cannot Delete or Disable All Policies

**Symptoms**: At least one policy always active

**Reason**: System requires at least one active policy

**Solution**: Keep one simple policy active (or change action to ALLOW)

### Issue: Approval Queue Not Clearing

**Symptoms**: REVIEW decisions not being resolved

**Solutions**:

1. **Assign approvers**:
   - Go to Organization → Members
   - Make sure team members have approver role

2. **Simplify policies**:
   - Too many REVIEW policies creates queue backup
   - Convert some to ALLOW for known-good patterns
   - Increase amount thresholds

3. **Automated approvals** (advanced):
   - Set up role-based auto-approval for certain policies
   - Contact support for implementation

---

## Next Steps

1. **Create Your First Policy**
   - Pick a simple use case (amount threshold)
   - Follow the step-by-step guide
   - Test in sandbox mode

2. **Test Thoroughly**
   - Create test transactions
   - Verify decisions in audit trail
   - Practice approving reviews

3. **Gradually Deploy**
   - Start with low-risk policies
   - Monitor for false positives
   - Add more policies over time

4. **Optimize Based on Data**
   - Review audit trail weekly
   - Look for patterns
   - Adjust policies based on actual traffic

5. **Build Your Policy Library**
   - Document each policy and its purpose
   - Share with team
   - Version control (use description field)

---

**Need Help?** Email t.dealer01@dsg.pics with your policy questions.

**Last Updated**: 2026-06-07  
**Version**: 1.0.0
