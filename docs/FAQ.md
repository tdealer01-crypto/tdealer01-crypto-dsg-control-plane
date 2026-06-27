# DSG ONE Stripe App - Frequently Asked Questions

**Version**: 1.0.0  
**Last Updated**: 2026-06-07  
**Support Email**: t.dealer01@dsg.pics

---

## Getting Started

### Q: How do I get started with DSG ONE Stripe App?

**A:** Getting started is quick and easy:

1. **Install the app** from Stripe Marketplace
   - Go to your Stripe Dashboard
   - Click Apps → Discover Apps
   - Search for "DSG Governance Gate"
   - Click Install and authorize

2. **Create your first policy**
   - Go to the DSG ONE Control Plane
   - Click Stripe → Policies → Create Policy
   - Define a simple rule (e.g., high-value charges)
   - Choose REVIEW or BLOCK action

3. **Test in sandbox**
   - Switch Stripe to Test Mode
   - Create test transactions
   - Check the Audit Trail to verify

4. **Go live**
   - When confident, enable governance gating
   - Switch Stripe to Live Mode
   - Monitor the audit trail

See our **[USER_SETUP_GUIDE.md](USER_SETUP_GUIDE.md)** for detailed step-by-step instructions.

---

### Q: Do I need technical knowledge to use DSG ONE?

**A:** No! The app is designed for non-technical users:

- **No coding required** - Use the visual policy builder
- **No API integration needed** - Works directly in Stripe Dashboard
- **No installation required** - One-click Stripe Marketplace install
- **Intuitive interface** - Straightforward policy creation

You do need:
- Access to your Stripe Dashboard
- Basic understanding of your governance needs
- Team members who can approve reviews

---

### Q: How much does DSG ONE cost?

**A:** Pricing is available on our website or by contacting us.

Current information:
- **Pricing Model**: Based on transaction volume or fixed plans
- **Free Trial**: Limited free tier available (check with sales)
- **Contact**: Email t.dealer01@dsg.pics for pricing details

Pricing typically includes:
- Unlimited policies
- Unlimited audit trail storage (7 years)
- Team member access (varies by plan)
- Email support

---

## How It Works

### Q: How does the governance gating work?

**A:** Here's the flow:

```
1. Transaction occurs in Stripe
   ↓
2. DSG ONE policies are evaluated (<500ms)
   ↓
3. Decision is made:
   - ALLOW: Transaction proceeds immediately
   - REVIEW: Transaction queued for manual approval
   - BLOCK: Transaction rejected with explanation
   ↓
4. Decision logged in audit trail with proof hash
   ↓
5. Team can approve/reject if REVIEW
```

**Key points**:
- Evaluation happens in real-time
- Same transaction always gets same decision (deterministic)
- Every decision is recorded permanently
- No delays or slow-downs to Stripe operations

---

### Q: Is the gating real-time or asynchronous?

**A:** It depends on the gating method:

**For Custom UI Actions** (Stripe Dashboard integration):
- Real-time, synchronous
- Decision made before operation executes
- User sees result immediately

**For Webhooks** (Post-event monitoring):
- Real-time evaluation (within <500ms)
- Operation proceeds
- Decision logged asynchronously
- Can be reversed if violation found (e.g., auto-refund)

Most transactions use custom UI (real-time).

---

### Q: Can I block transactions in real-time?

**A:** Yes, absolutely.

**How it works**:
1. Create a BLOCK policy (e.g., "Block charges over $100,000")
2. When a matching transaction occurs:
   - DSG ONE evaluates it (<500ms)
   - Decision: BLOCK
   - Transaction is rejected
   - User sees error message
   - Operation never executes in Stripe

**Examples of real-time blocks**:
- Amount thresholds
- Rate limits
- Time-based restrictions
- Blacklist enforcement

---

### Q: What's the difference between ALLOW, REVIEW, and BLOCK?

**A:** Each decision has a different effect:

| Decision | Effect | User Experience | Approval Needed |
|----------|--------|-----------------|-----------------|
| **ALLOW** | Proceeds immediately | Transaction completes | No |
| **REVIEW** | Waits for approval | Queued, then approved/rejected | Yes |
| **BLOCK** | Rejected immediately | Error shown to user | No |

**Examples**:

```
ALLOW:
Policy: "Trusted customers auto-approve"
Result: Charge from trusted customer → Immediate success

REVIEW:
Policy: "High-value charges need approval"
Result: Charge for $7,500 → Waits in approval queue → Team approves → Proceeds

BLOCK:
Policy: "Block charges over $100,000"
Result: Charge for $150,000 → Immediately rejected → Error to user
```

---

### Q: What if my policy blocks a legitimate transaction?

**A:** No problem - you can handle it in several ways:

**Option 1: Adjust the policy**
- Edit the policy threshold
- Increase the amount limit or rate limit
- Future similar transactions won't be blocked

**Option 2: Add to whitelist**
- Create a whitelist policy (Priority 1)
- Add the customer/pattern
- That customer auto-allows going forward

**Option 3: Manual override**
- Find the blocked transaction in Audit Trail
- Click "Override Block"
- Get approval from team
- If approved, proceed with transaction

**Option 4: Review and adjust**
- Check why the block happened
- Decide if the block was correct
- If incorrect, adjust policy
- Monitor similar transactions

The goal is to learn from the block and improve your policies.

---

## Policies

### Q: How many policies should I have?

**A:** Start small and grow:

**Beginners** (Week 1):
- 1-3 basic policies
- Focus on high-value amounts
- Keep conditions simple

**Growing** (Month 1):
- 5-10 policies
- Add rate limits
- Include whitelists for known patterns

**Advanced** (Month 3+):
- 10-20 policies
- Complex conditions
- Tiered governance by risk level

**Best practices**:
- Fewer, simpler policies are better than many complex ones
- Start with REVIEW, not BLOCK
- Adjust based on audit trail analysis
- Regular review and cleanup

---

### Q: Can I change a policy after it's live?

**A:** Yes, you can change policies anytime.

**What happens**:
1. You edit the policy
2. Policy version increments
3. Future transactions use new version
4. Past transactions keep their original version (immutable)
5. Audit trail shows which version applied to each transaction

**Changes take effect immediately** - no need to redeploy or wait.

---

### Q: What happens if I delete a policy?

**A:** Deleting policies is soft-delete:

- Policy is disabled (not evaluated)
- History remains in audit trail (cannot be deleted)
- All past decisions preserved
- Can be re-enabled anytime
- Audit trail shows policy was disabled on [date]

**You cannot permanently erase** a policy's history (by design, for compliance).

---

### Q: Can I have policies for specific customers or vendors?

**A:** Yes, using custom conditions:

```
Policy: "Whitelist Trusted Vendor"
Condition: customer_id IN ['cus_xxx', 'cus_yyy']
Action: ALLOW
Priority: 1
```

**Effect**: Those customers skip review and auto-allow.

You can also:
- Create blacklist (block certain customers)
- Have different thresholds per customer type
- Tier approval by customer tier (VIP vs standard)

---

## Approvals & Reviews

### Q: How do team members approve transactions?

**A:** Approvals are simple:

1. **Queue notification**:
   - Pending reviews appear in dashboard
   - Team member can see list

2. **Review details**:
   - Click transaction to see full context
   - View the policy that triggered review
   - Check amount and customer

3. **Make decision**:
   - Click "Approve" → Transaction proceeds
   - Click "Reject" → Transaction fails
   - Add optional notes explaining decision

4. **Audit logging**:
   - Decision recorded
   - Who approved and when logged
   - Cannot be altered (immutable)

---

### Q: Can I automate approvals for certain patterns?

**A:** Yes, there are a few approaches:

**Approach 1: Whitelist policy**
```
Policy: Trusted customers auto-allow (Priority 1)
Condition: customer_id IN [whitelist]
Action: ALLOW
Result: Those customers skip REVIEW entirely
```

**Approach 2: Adjust policy thresholds**
```
Old policy: Amount > $5,000 → REVIEW
New policy: Amount > $10,000 → REVIEW
Result: More transactions auto-approve
```

**Approach 3: Time-based auto-approve** (advanced)
- Set up role-based auto-approval
- Certain users auto-approve based on conditions
- Contact support for setup

**Best practice**: Start with manual review, then automate after seeing patterns.

---

### Q: What's the SLA for approvals?

**A:** DSG ONE handles decisions instantly:

- **Policy evaluation**: <500ms (deterministic decision)
- **Logging**: Immediate (immutable audit trail)
- **Review queue**: Real-time display to team

**Your team's approval time** depends on:
- How quickly you respond to notifications
- Staffing and availability
- Urgency of the transaction

We recommend:
- Assign backup approvers
- Set team alerts for high-value reviews
- Monitor queue regularly

---

## Data & Security

### Q: How is my data secured?

**A:** Multiple layers of security:

**In Transit**:
- All connections use HTTPS
- TLS 1.3 encryption
- Certificate pinning (optional)

**At Rest**:
- Supabase PostgreSQL database
- AES-256 encryption
- Automated backups
- Encryption keys managed securely

**Access Control**:
- Row-level security (RLS) by organization
- User role-based permissions
- OAuth for identity verification
- Session tokens with expiration

**Secrets**:
- OAuth tokens encrypted in database
- API keys never logged
- Environment variables protected

**Audit**:
- All access logged
- User attribution on changes
- Compliance-ready audit trail

---

### Q: What data do you store about transactions?

**A:** We store only what's needed for governance:

**We Store**:
- Transaction amount and currency
- Customer ID (reference, not name)
- Operation type (charge, refund, etc.)
- Decision made and reason
- Policy applied
- Proof hash and timestamp
- Approval status

**We Do NOT Store**:
- Full credit card numbers
- Customer names or emails
- Billing addresses
- Passwords or secrets
- Unencrypted sensitive data

**Why minimal data**: Reduces privacy risk while providing full governance.

---

### Q: How long is data retained?

**A:** 7-year retention by default:

| Data | Retention | Why |
|------|-----------|-----|
| Audit Trail | 7 years | Tax/compliance requirement |
| Decision Proofs | 7 years | Legal evidence |
| Policy History | 7 years | Governance audit |
| Cached Data | 5 minutes | Temporary only |

**Why 7 years**:
- IRS audit statute (tax records)
- PCI DSS compliance requirement
- Industry standard for payments
- Covers litigation discovery

You can request longer retention by contacting support.

---

### Q: Is my data GDPR compliant?

**A:** Yes, we follow GDPR principles:

**Data Minimization**: We collect only what's needed for governance

**Right to Access**: Customers can request their transaction data
- Go to Audit Trail
- Filter by customer ID
- Export and share with customer

**Right to Deletion**: We cannot delete audit trails (legal requirement), but:
- Audit trails contain minimal personal data
- Can provide customer export instead
- Explain 7-year legal retention

**Data Processing**: GDPR-compliant processing terms available

For detailed GDPR information, see [AUDIT_TRAIL_GUIDE.md](AUDIT_TRAIL_GUIDE.md).

---

## Troubleshooting

### Q: Why is my policy not working?

**A:** Check these common issues:

1. **Policy not enabled**:
   - Go to Policies → Check toggle is ON

2. **Governance gating not enabled**:
   - Stripe → Settings → "Governance Gating Enabled" should be ON

3. **Wrong priority**:
   - Higher priority policies match first
   - Check if another policy is matching first

4. **Condition mismatch**:
   - Test a transaction that should match
   - Check Audit Trail to see if policy applied

5. **Webhook not working**:
   - Stripe → Settings → Click "Test Webhook"
   - Should show "Successful"

See [USER_SETUP_GUIDE.md](USER_SETUP_GUIDE.md) troubleshooting section for more.

---

### Q: Why are legitimate transactions being blocked?

**A:** Likely causes:

1. **Policy threshold too low**:
   - Increase amount limit
   - Loosen rate limit window
   - Example: Change from $5,000 to $10,000

2. **Policy too broad**:
   - Add exceptions using whitelist
   - Use custom conditions to narrow scope

3. **Multiple policies matching**:
   - Check policy priorities
   - Adjust so correct policy applies

4. **Time-based policy**:
   - Check timezone settings
   - Verify business hours

**Solution**: Adjust policy after reviewing audit trail, then retest.

---

### Q: The app isn't appearing in my Stripe Dashboard

**A:** Try these steps:

1. Hard refresh browser (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)
2. Clear browser cookies for both stripe.com and control plane domain
3. Go to Stripe Dashboard → Apps → Installed Apps
4. Check if "DSG Governance Gate" is listed
5. If not, reinstall from Marketplace
6. Verify you have admin permissions in Stripe

If still not working, contact support@dsg.pics.

---

### Q: How do I uninstall the app?

**A:** Uninstalling is simple:

1. Go to Stripe Dashboard → Apps → Installed Apps
2. Find "DSG Governance Gate"
3. Click the gear icon → Remove
4. Confirm removal
5. Access is revoked immediately

**What happens**:
- Gating stops immediately
- Audit trail data remains (cannot be deleted)
- All past decisions stay in audit trail
- You can reinstall anytime

---

## Advanced Topics

### Q: Can I integrate DSG ONE with my custom system?

**A:** Yes, in multiple ways:

**Option 1: API Integration** (for developers)
- Use our REST API for policy management
- Programmatically create/update policies
- Fetch audit trail data
- See [API_REFERENCE_TIER2.md](../packages/stripe-app/docs/API.md)

**Option 2: Webhooks**
- Receive webhooks for policy decisions
- Integrate with your systems
- Custom notifications

**Option 3: Data Export**
- Export audit trail as CSV or JSON
- Import into your analytics platform
- Build custom dashboards

**Option 4: Managed Agents** (advanced)
- Use DSG ONE with other Anthropic tools
- Multi-step governance workflows
- Contact sales for enterprise features

---

### Q: Can I use DSG ONE with multiple Stripe accounts?

**A:** Yes, fully supported:

1. Connect multiple Stripe accounts:
   - Install app in each Stripe account
   - Each gets separate OAuth token

2. Manage separately:
   - Each account has its own policies
   - Separate audit trails
   - Different approval workflows

3. Organization view:
   - Dashboard shows all connected accounts
   - View aggregate statistics (if available)
   - Manage team members per account

---

### Q: How can I verify audit integrity?

**A:** Each decision includes a proof hash:

**Proof Hash Properties**:
- SHA-256 cryptographic fingerprint
- Proves decision is deterministic
- Cannot be forged or altered
- Can be verified independently

**To verify**:
1. Export audit data (JSON format)
2. Get proof hashes
3. Share with third-party auditor
4. Auditor can cryptographically verify integrity

See [AUDIT_TRAIL_GUIDE.md](AUDIT_TRAIL_GUIDE.md) for details.

---

### Q: Can I export audit logs for compliance?

**A:** Yes, multiple formats available:

**CSV Export**:
- Spreadsheet-friendly
- Good for Excel/Sheets analysis
- Easy to share

**JSON Export**:
- Machine-readable
- Complete data
- Good for systems integration

**PDF Audit Report**:
- Professional formatting
- Executive summary
- Suitable for sharing with auditors

**Scheduled Exports**:
- Automatic daily/weekly/monthly
- Emailed to you
- Build compliance archive

See [AUDIT_TRAIL_GUIDE.md](AUDIT_TRAIL_GUIDE.md) for details.

---

## Support & Resources

### Q: How do I get support?

**A:** Multiple support options:

**Email Support**:
- Email: t.dealer01@dsg.pics
- Response time: 24-48 hours
- Best for: General questions, account issues, bugs

**Documentation**:
- **[USER_SETUP_GUIDE.md](USER_SETUP_GUIDE.md)** - Installation and getting started
- **[POLICY_BUILDER_GUIDE.md](POLICY_BUILDER_GUIDE.md)** - Creating and managing policies
- **[AUDIT_TRAIL_GUIDE.md](AUDIT_TRAIL_GUIDE.md)** - Audit trails and compliance
- **[API Reference](../packages/stripe-app/docs/API.md)** - Developer API docs

**In-App Help**:
- Hover over fields for tooltips
- Click "?" icons for explanations
- Links to relevant docs

---

### Q: What's your uptime SLA?

**A:** Detailed SLA information:

**Current Status**:
- Infrastructure: Vercel (99.9% SLA)
- Database: Supabase (99.9% SLA)
- Combined availability: Target 99.9%

**For Enterprise**: Higher SLA available

**Check Status**: We maintain a status page for current incidents

Contact sales for enterprise SLA agreements.

---

### Q: Can you add a feature I need?

**A:** We'd love to hear feature requests!

**How to request**:
1. Email t.dealer01@dsg.pics with:
   - Feature description
   - Why you need it
   - How often you'd use it
   - Business impact

2. Include:
   - Use case details
   - Competitors offering similar features
   - Priority level for your business

**What helps**:
- Specific examples
- Business justification
- Timeline needs

---

### Q: What's your roadmap?

**A:** High-level roadmap (subject to change):

**Near-term** (Next 3 months):
- Enhanced dashboard analytics
- More policy rule types
- Webhook integrations
- Role-based access control improvements

**Medium-term** (3-6 months):
- AI-powered policy recommendations
- Advanced fraud detection
- Multi-currency optimization
- Mobile app

**Long-term** (6-12 months):
- Multi-gateway support (beyond Stripe)
- Advanced ML-based governance
- Enterprise features

For detailed roadmap, ask in support email.

---

## Quick Reference

### Common Tasks

**Create a policy**: Stripe → Policies → Create Policy

**View audit trail**: Stripe → Audit Trail

**Approve a transaction**: Pending Reviews → Click transaction → Approve

**Export audit data**: Audit Trail → Select filters → Export

**Test a policy**: Switch to Test Mode → Create test transaction → Check Audit Trail

**Edit a policy**: Policies → Click policy → Edit → Save

**Manage team**: Organization → Members → Add/remove members

**Enable gating**: Stripe → Settings → Toggle "Governance Gating Enabled"

---

### Key Resources

| Resource | Purpose | Location |
|----------|---------|----------|
| User Setup Guide | Installation and getting started | [USER_SETUP_GUIDE.md](USER_SETUP_GUIDE.md) |
| Policy Builder Guide | Creating policies | [POLICY_BUILDER_GUIDE.md](POLICY_BUILDER_GUIDE.md) |
| Audit Trail Guide | Audits and compliance | [AUDIT_TRAIL_GUIDE.md](AUDIT_TRAIL_GUIDE.md) |
| API Reference | Developer documentation | [API.md](../packages/stripe-app/docs/API.md) |
| Email Support | Questions and issues | t.dealer01@dsg.pics |

---

## Getting Help

**Still have questions?** Email t.dealer01@dsg.pics anytime.

We'll respond within 24-48 hours with help on:
- Installation and setup
- Policy configuration
- Troubleshooting issues
- Feature requests
- Compliance questions

---

**Last Updated**: 2026-06-07  
**Version**: 1.0.0

**Note**: This FAQ covers common questions. For detailed information on any topic, please refer to the corresponding guide document listed above.
