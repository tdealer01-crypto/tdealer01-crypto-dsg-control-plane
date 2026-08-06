# DSG ONE Stripe App - Audit Trail Guide

**Version**: 1.0.0  
**Last Updated**: 2026-06-07  
**Support Email**: t.dealer01@dsg.pics

---

## Table of Contents

1. [What Gets Logged](#what-gets-logged)
2. [How to Access Audit Trails](#how-to-access-audit-trails)
3. [Audit Trail Data Fields](#audit-trail-data-fields)
4. [Filtering and Searching Audits](#filtering-and-searching-audits)
5. [Exporting Audit Logs](#exporting-audit-logs)
6. [Data Retention Policies](#data-retention-policies)
7. [GDPR Right-to-Access Requests](#gdpr-right-to-access-requests)
8. [Audit Integrity Verification](#audit-integrity-verification)
9. [Using Audit Trails for Compliance](#using-audit-trails-for-compliance)
10. [Audit Trail Best Practices](#audit-trail-best-practices)

---

## What Gets Logged

### Every Operation Is Logged

DSG ONE logs **every** Stripe operation that is evaluated by policies.

### Complete Operation Record

For each operation, the following is recorded:

#### Basic Information
- **Timestamp**: Exact time of evaluation (UTC, with milliseconds)
- **Operation Type**: What action was attempted (charge, refund, payout, etc.)
- **Operation ID**: Stripe unique identifier
- **Account ID**: Which Stripe account this belongs to

#### Transaction Context
- **Amount**: Transaction amount in cents
- **Currency**: 3-letter code (USD, EUR, GBP, etc.)
- **Customer ID**: Stripe customer identifier (if applicable)
- **Description**: What the transaction is for
- **Metadata**: Custom data attached to the transaction

#### Policy & Decision
- **Policy Applied**: Which rule was matched
- **Policy Version**: Which version of the policy
- **Decision**: ALLOW, REVIEW, or BLOCK
- **Reason**: Human-readable explanation
- **Decision ID**: Unique identifier for this decision

#### Proof & Integrity
- **Proof Hash**: Deterministic SHA-256 hash
- **Proof Timestamp**: When the proof was generated
- **Hash Chain**: Links to previous decisions (optional)

#### Approval Workflow (if applicable)
- **Status**: pending, approved, rejected, or completed
- **Assigned To**: Which team member is reviewing (if REVIEW)
- **Approved/Rejected By**: Who made the final decision
- **Approval Timestamp**: When decision was made
- **Approval Notes**: Why they approved/rejected

### What Is NOT Logged

For security and privacy, DSG ONE **never** logs:

- Full credit card numbers
- Customer names or email addresses
- Full billing addresses
- Passwords or authentication tokens
- Unencrypted secrets or API keys
- More than the minimum context needed for policy evaluation

---

## How to Access Audit Trails

### Navigate to Audit Trail

1. Open DSG ONE Control Plane
2. Click **Stripe** in the left sidebar
3. Click **Audit Trail**
4. You'll see a list of recent operations

### Default View

The default audit trail shows:

- **Last 7 days** of operations
- **All decision types** (ALLOW, REVIEW, BLOCK)
- **All operation types** (charge, refund, payout, etc.)
- **Most recent first** (reverse chronological)
- **50 operations per page** (paginated)

### Accessing Different Accounts

If you manage multiple Stripe accounts:

1. At the top of Audit Trail, select **Account**
2. Choose the Stripe account you want
3. Audit trail filtered to that account only

### Mobile Access

Access audit trails from mobile browsers:

1. Go to https://tdealer01-crypto-dsg-control-plane.vercel.app on your phone
2. Navigate to Stripe → Audit Trail
3. Same filters and search available
4. Optimized for mobile viewing

---

## Audit Trail Data Fields

### Understanding Each Field

#### Timestamp
- **Format**: ISO 8601 (e.g., 2026-06-07T14:30:45.123Z)
- **Timezone**: Always UTC
- **Precision**: Milliseconds
- **Purpose**: Track exact time of evaluation

Example:
```
2026-06-07T14:30:45.123Z = June 7, 2026 at 2:30:45 PM and 123 milliseconds UTC
```

#### Operation Type
- **Values**: charge.create, charge.refund, payout.create, payment_intent.created, etc.
- **Purpose**: Know what action was being performed
- **Examples**:
  - `charge.create` - Creating a new charge
  - `charge.refund` - Refunding an existing charge
  - `payout.create` - Creating a payout
  - `payment_intent.succeeded` - Payment intent completed

#### Decision
- **ALLOW**: Operation proceeds immediately
- **REVIEW**: Requires manual approval
- **BLOCK**: Operation is rejected

#### Policy Name
- **What It Is**: The name you gave the policy
- **Example**: "High-Value Charge Review"
- **Purpose**: Know which rule caused this decision

#### Policy Version
- **What It Is**: Which version of the policy applied
- **Why It Matters**: Policies change over time; version tracks which version was in effect
- **Example**: Version 1, Version 2, etc.

#### Proof Hash
- **Format**: SHA-256 hash (64 character hex string)
- **Example**: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`
- **Purpose**: 
  - Unique fingerprint of the decision
  - Proves this decision was made deterministically
  - Can be verified independently
  - Cannot be forged or altered

#### Reason
- **What It Is**: Human-readable explanation
- **Examples**:
  - "Operation within policy limits"
  - "Amount exceeds threshold"
  - "High-value operation requires review"
  - "Rate limit exceeded"

#### Status
- **pending**: Waiting for approval (REVIEW decisions only)
- **approved**: Approved by team member
- **rejected**: Rejected by team member
- **completed**: Decision executed (for ALLOW/BLOCK)

#### Amount & Currency
- **Amount**: In cents (smallest currency unit)
- **Currency**: 3-letter code
- **Examples**:
  - 10000 USD = $100
  - 50000 EUR = €500
  - 1000 GBP = £10

---

## Filtering and Searching Audits

### Filter by Decision Type

**ALLOW Decisions**: All auto-approved operations

```
Go to Audit Trail
Click Filter: Decision
Select: ALLOW
Results: All transactions that auto-proceeded
```

**REVIEW Decisions**: All operations awaiting approval

```
Filter: Decision = REVIEW
Results: Shows pending and resolved reviews
```

**BLOCK Decisions**: All rejected operations

```
Filter: Decision = BLOCK
Results: Shows what was blocked and why
```

### Filter by Date Range

**Last 24 Hours**:
```
Filter: Date
Select: Last 24 Hours
Results: Operations from past day
```

**Last 30 Days**:
```
Filter: Date
Select: Last 30 Days
Results: Operations from past month
```

**Custom Date Range**:
```
Filter: Date
Select: Custom
Enter: Start date and end date
Example: June 1, 2026 to June 7, 2026
```

**Specific Date**:
```
Filter: Date
Select: Specific Date
Enter: June 7, 2026
Results: All operations on that date
```

### Filter by Operation Type

**By Charge**:
```
Filter: Operation Type
Select: charge
Results: All charge operations only
```

**By Refund**:
```
Filter: Operation Type
Select: refund
Results: All refund operations only
```

**By Payout**:
```
Filter: Operation Type
Select: payout
Results: All payout operations only
```

Available types:
- charge.create
- charge.refund
- payout.create
- payment_intent.created
- payment_intent.succeeded
- refund.create

### Filter by Policy

**By Policy Name**:
```
Filter: Policy
Select: "High-Value Charge Review"
Results: All transactions evaluated by that policy
```

**By Policy Status**:
```
Filter: Policy Status
Select: Active
Results: Transactions from active policies only
```

### Filter by Amount

**Amount Greater Than**:
```
Filter: Amount
Operator: >
Value: $5,000
Results: All transactions over $5,000
```

**Amount Less Than**:
```
Filter: Amount
Operator: <
Value: $1,000
Results: All transactions under $1,000
```

**Amount Range**:
```
Filter: Amount
Operator: between
Values: $1,000 - $5,000
Results: Transactions in that range
```

### Combining Multiple Filters

Apply multiple filters at once:

```
Filter 1: Decision = REVIEW
Filter 2: Date = Last 7 days
Filter 3: Amount > $5,000
Filter 4: Policy = "High-Value Charge Review"

Results: Pending high-value transactions from the past week
         evaluated by the high-value policy
```

### Search by Transaction ID

**Search by Stripe ID**:
```
Search box: ch_1234567890
Results: That specific charge
```

**Search by Customer ID**:
```
Search box: cus_abc123
Results: All transactions for that customer
```

**Search by Operation ID**:
```
Search box: op_xyz789
Results: That specific operation record
```

### Search by Free Text

**Search Description**:
```
Search box: "Order #12345"
Results: Transactions with that description
```

**Search Notes** (for approved/rejected reviews):
```
Search box: "Approved for bulk purchase"
Results: Reviews with those notes
```

### Saved Filters

Save common filter combinations:

1. Set up filters you use often
2. Click **"Save Filter"**
3. Give it a name (e.g., "Weekly High-Value Review")
4. Filter appears in sidebar for quick access

### Export Filtered Results

Export only what you need:

1. Set up filters
2. Click **"Export"**
3. Choose format (CSV, JSON, PDF)
4. File includes only filtered results

---

## Exporting Audit Logs

### Export to CSV

**Steps**:
1. Go to Stripe → Audit Trail
2. Apply filters if needed
3. Click **"Export"** → **"CSV"**
4. File downloads to your computer

**CSV Contents**:
```
timestamp,operation_type,amount,currency,customer_id,decision,policy_name,reason,status,proof_hash
2026-06-07T14:30:45.123Z,charge.create,10000,USD,cus_123,REVIEW,High-Value Review,"Amount exceeds threshold",pending,e3b0c44...
2026-06-07T13:25:12.456Z,charge.create,5000,USD,cus_456,ALLOW,Standard Charge,"Operation within policy limits",completed,f4b1d55...
```

**Open in Excel**:
1. Download CSV file
2. Open Excel or Sheets
3. File → Import
4. Paste CSV contents
5. Data formatted in columns

### Export to JSON

**Steps**:
1. Go to Stripe → Audit Trail
2. Apply filters if needed
3. Click **"Export"** → **"JSON"**
4. File downloads with full data

**JSON Contents**:
```json
{
  "audit_trail": [
    {
      "id": "op_123",
      "timestamp": "2026-06-07T14:30:45.123Z",
      "operation_type": "charge.create",
      "amount_cents": 10000,
      "currency": "USD",
      "customer_id": "cus_123",
      "decision": "REVIEW",
      "reason": "Amount exceeds threshold",
      "policy_id": "pol_456",
      "policy_name": "High-Value Review",
      "policy_version": 2,
      "proof": {
        "hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        "timestamp": "2026-06-07T14:30:45.123Z"
      },
      "status": "pending"
    }
  ],
  "export_timestamp": "2026-06-07T15:00:00.000Z",
  "total_records": 150
}
```

**Advantages**:
- Complete data including all fields
- Machine-readable format
- Can import into other systems
- Includes full proof information
- Smaller file size than PDF

### Export to PDF (Audit Report)

**Steps**:
1. Go to Stripe → Audit Trail
2. Apply filters if needed
3. Click **"Export"** → **"Audit Report (PDF)"**
4. Report generates and downloads

**PDF Contains**:
- Cover page with organization info
- Executive summary (decision counts)
- Detailed table of all operations
- Policy versions used in period
- Integrity verification section
- Compliance statement
- Index for finding entries

### Bulk Export (Admin Only)

Export all data for a period:

1. Go to Stripe → Settings → Admin Export
2. Select date range
3. Select format (CSV, JSON, or full ZIP)
4. Click **"Generate Export"**
5. Email sent with download link

**ZIP Package Includes**:
- CSV export
- JSON export
- Policy history
- User audit log (who did what)
- Integrity verification hashes

### Scheduled Exports

Set up automatic exports:

1. Go to Stripe → Settings → Exports
2. Click **"Schedule Export"**
3. Choose:
   - Frequency: Daily, Weekly, Monthly
   - Format: CSV, JSON, or PDF
   - Email recipient(s)
   - Filters (optional): Only export certain decisions, policies, etc.
4. Click **"Save Schedule"**
5. Exports run automatically and email to you

### Example Export Use Cases

#### For Finance Team
```
Export CSV of ALLOW decisions for the month
Use: Reconcile with billing and revenue
Update: Monthly financial records
```

#### For Compliance Team
```
Export PDF Audit Report for the quarter
Use: External audit preparation
Share: With third-party auditors
```

#### For Engineering Integration
```
Export JSON daily
Use: Feed into analytics pipeline
Integrate: With data warehouse
Analyze: Patterns and trends
```

#### For Incident Investigation
```
Export JSON filtered by date and customer
Use: Investigate specific incident
Share: With incident response team
Document: Root cause analysis
```

---

## Data Retention Policies

### How Long Data Is Kept

| Data | Retention | Why |
|------|-----------|-----|
| **Audit Trail** | 7 years | Regulatory/compliance requirement |
| **Decision Proofs** | 7 years | Legal evidence of decisions |
| **Policy Versions** | 7 years | History preserved for audit |
| **Approval Records** | 7 years | Who approved what, when |
| **Cached Data** | 5 minutes | Temporary only |
| **Session Data** | Until logout | Cleared on logout |

### 7-Year Retention Rationale

7 years is chosen because:

- **Tax Audit Statute**: IRS can audit up to 7 years back
- **Financial Regulations**: PCI DSS requires 7-year retention
- **Industry Standard**: Payment processor requirement
- **Legal Hold**: Covers most litigation discovery periods

### Immutable Records

Audit trail records:
- **Cannot be deleted** - Only soft-delete (hidden but preserved)
- **Cannot be modified** - Only append-only history
- **Cannot be hidden** - Available to authorized users and auditors

This is by design for compliance and integrity.

### Accessing Old Records

Access records from 5+ years ago:

1. Go to Audit Trail
2. Use date filter for the specific period
3. Older records available with same query speed
4. Export old data same as recent data

### Data Archival

For longer retention beyond 7 years:

1. Export data (CSV, JSON, or PDF)
2. Store in your document management system
3. Can be verified with proof hashes if needed

---

## GDPR Right-to-Access Requests

### Customer Data Access Requests

If a customer asks "What data do you have about me?":

1. Go to Audit Trail
2. Filter: Customer ID = [their customer_id]
3. All their operations listed
4. Export to CSV or PDF
5. Share with customer (redact if needed)

### Personal Data in Audit Trails

Audit trails contain **minimal personal data**:
- Customer ID (reference, not name)
- Transaction amounts (not PII)
- Operation type (not personal)
- Policy decisions (not personal)

### Data Subject Rights (GDPR)

#### Right to Access
Customer can request: "Show me all data you have about me"

**How to respond**:
1. Use audit trail filters by customer_id
2. Export data for that customer
3. Include all decisions and timestamps
4. Send to customer

#### Right to Deletion
Customer can request: "Delete my data"

**Important**: 
- Audit trails **cannot** be deleted (required for compliance)
- Policy decision records **must** be kept
- You can offer customer a read-only export instead

**Response to customer**:
```
"We retain audit logs for 7 years per financial regulation.
However, we can provide you with a full export of your transactions.
For questions, please contact privacy@dsg.pics"
```

#### Right to Data Portability
Customer can request: "Give me my data in standard format"

**How to respond**:
1. Go to Audit Trail
2. Filter by customer_id
3. Export to CSV or JSON
4. Send to customer

#### Right to Rectification
Customer says: "That decision is wrong"

**How to respond**:
1. Review the operation in audit trail
2. Check policy and decision logic
3. If policy was wrong:
   - Update policy
   - Document change
   - Audit trail shows old decision and new decision
4. If policy was correct:
   - Explain the decision logic
   - Note: Decision itself cannot be changed (immutable)

### Privacy Impact Assessment

For GDPR compliance:

1. Audit trails contain minimal data needed for governance
2. Data retention is required by law (not optional)
3. Access controls limit who can view
4. Encryption protects data in transit and at rest
5. No personal data is shared with third parties

---

## Audit Integrity Verification

### What is Proof Integrity?

Every decision includes a proof hash - a cryptographic fingerprint that proves:

- The decision was made deterministically
- The decision hasn't been altered
- The decision can be verified independently
- The decision is part of an immutable chain

### How Proof Hashes Work

**Hash Generation**:
```
Hash = SHA-256(policy_id + policy_version + context + timestamp)

Example:
policy_id = pol_123
policy_version = 2
context = {"amount": 10000, "currency": "USD", ...}
timestamp = 2026-06-07T14:30:45.123Z

Result: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
```

**Properties**:
- **Deterministic**: Same inputs always produce same hash
- **Unique**: Different inputs produce different hashes
- **One-way**: Cannot reverse hash back to original
- **Tamper-proof**: Changing any input changes entire hash

### Verifying Audit Integrity

#### Visual Verification
1. Go to Audit Trail
2. Click on any operation
3. See the proof hash
4. Hash shown in operation detail

#### Exporting for Verification
1. Export audit data (CSV or JSON)
2. Proof hashes included in export
3. Can be verified by third parties
4. Auditors can cryptographically verify

#### Integrity Check Process
For each transaction:
1. Get the transaction details from audit trail
2. Get the proof hash
3. Use hash verification tool (if provided)
4. Verify hash matches the decision
5. Confirms decision wasn't altered

### Chain of Custody

Audit trail forms a chain of decisions:

```
Decision 1 (timestamp: 14:30:45)
  hash: e3b0c44...
  ↓
Decision 2 (timestamp: 14:31:12)
  hash: f4b1d55...
  parent_hash: e3b0c44... (links to previous)
  ↓
Decision 3 (timestamp: 14:32:00)
  hash: a1c2d3e...
  parent_hash: f4b1d55... (links to previous)
```

This chain proves:
- Chronological order
- No decisions deleted from middle
- No decisions inserted
- Complete audit trail

### Third-Party Audit Support

For external auditors:

1. Export full audit trail (JSON format)
2. Proof hashes included
3. Auditors can verify:
   - Hash integrity
   - Decision order
   - Policy versions
   - User actions
4. Request: "Provide proof hash verification"
5. We provide verification tool/service

---

## Using Audit Trails for Compliance

### Compliance Scenarios

#### Scenario 1: Financial Audit

**Auditor Asks**: "Show me all transactions over $10,000"

**Steps**:
1. Go to Audit Trail
2. Filter: Amount > $10,000
3. Filter: Date = audit period
4. Export to CSV or PDF
5. Share with auditor
6. Auditor reviews decisions, proof hashes

#### Scenario 2: Regulatory Inquiry

**Regulator Asks**: "Why did you block transaction XYZ?"

**Steps**:
1. Go to Audit Trail
2. Search: Operation ID = XYZ
3. Click to view details
4. Show:
   - Policy applied
   - Reason for block
   - Proof hash
   - Timestamp
5. Provide to regulator

#### Scenario 3: Customer Dispute

**Customer Says**: "Why was my transaction blocked?"

**Steps**:
1. Go to Audit Trail
2. Search: Customer ID or Operation ID
3. View decision details
4. Share the audit entry with customer:
   - Policy that applied
   - Reason for decision
   - Timestamp
5. Customer understands the decision

#### Scenario 4: Fraud Investigation

**Team Asks**: "Did we catch this fraudster?"

**Steps**:
1. Go to Audit Trail
2. Filter: Customer ID = [suspected fraudster]
3. See all transactions evaluated
4. See decisions (ALLOW, REVIEW, BLOCK)
5. Identify pattern
6. Review if they were blocked
7. Document findings

### Pre-Audit Preparation

Prepare audit materials:

1. **3 months before audit**:
   - Set up audit trail export schedule
   - Monthly exports to email

2. **1 month before audit**:
   - Export full year of audit data
   - Verify export integrity
   - Store in secure location

3. **1 week before audit**:
   - Generate audit report (PDF)
   - Prepare summary stats
   - Brief team on findings

4. **During audit**:
   - Provide access to audit trail
   - Answer questions about policies
   - Show proof verification

---

## Audit Trail Best Practices

### 1. Regular Review

**Weekly**:
- Review REVIEW decisions from past week
- Check for false positives (blocked legitimate transactions)
- Identify patterns

**Monthly**:
- Review BLOCK decisions
- Analyze by policy
- Look for improvement opportunities

**Quarterly**:
- Generate compliance report
- Share with leadership
- Discuss policy adjustments

### 2. Export and Archive

**Monthly**:
- Export full month of audit data
- Store in document management system
- Keep for 7+ years

**Quarterly**:
- Generate compliance audit report
- Share with stakeholders
- File with compliance records

### 3. Team Transparency

**Keep team informed**:
- Share audit trail stats weekly
- Celebrate patterns (e.g., "We blocked 5 fraud attempts this week")
- Address false positives quickly
- Adjust policies based on data

### 4. Policy Optimization

**Use audit data to improve policies**:
- Identify policies with high false positives
- Adjust thresholds based on actual traffic
- Add whitelist policies for known-good patterns
- Remove policies that never match

**Example**:
```
Audit analysis shows:
- High-Value Review policy: 500 REVIEW decisions
- But 90% approved by team
- Suggests threshold too low
- Increase threshold from $5,000 to $10,000
- Result: Fewer false positives, team happier
```

### 5. Security of Audit Data

**Protect audit trails**:
- Only share with authorized users
- Redact if sharing externally
- Use secure export methods
- Encrypt downloaded files
- Delete exports after use (if not needed)

### 6. Integration with Systems

**Send audit data to other systems**:
- Export JSON daily
- Feed into analytics platform
- Create dashboards
- Monitor trends over time
- Alert on anomalies

---

## Next Steps

1. **Review Your First Audit Trail**
   - Go to Audit Trail
   - Look at recent transactions
   - Click one to see full details
   - Get familiar with the interface

2. **Set Up Filters**
   - Create saved filters for common queries
   - Example: "Weekly High-Value Reviews"
   - Example: "Monthly Blocked Transactions"

3. **Schedule Exports**
   - Set up monthly export schedule
   - Choose format (CSV, PDF, JSON)
   - Send to your email
   - Start building archive

4. **Review Compliance Requirements**
   - Check your regulatory requirements
   - Understand your retention period
   - Plan archival strategy
   - Document compliance in writing

5. **Train Your Team**
   - Show team how to access audit trail
   - Train on filters and searches
   - Teach how to use for support
   - Include in onboarding

---

**Need Help?** Email t.dealer01@dsg.pics with your audit questions.

**Last Updated**: 2026-06-07  
**Version**: 1.0.0
