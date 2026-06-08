# DSG ONE / ProofGate — 5-Email Onboarding Sequence

Welcome to DSG Governance Gate. This document outlines a 5-email welcome series to guide new customers from signup through their first month of success.

---

## Email 1: Welcome & 5-Minute Setup (Sent Immediately After Signup)

**Subject:** Welcome to DSG Governance Gate — Ready in 5 minutes ✓

**From:** onboarding@dsg.one or similar

**To:** Customer email address

---

### Email Body

```
Hi [Customer Name],

Welcome to DSG Governance Gate! You're about to transform how you govern AI agents, 
approval workflows, and transaction safety.

In 5 minutes, you'll have your first governance policy running. Here's what to expect:

WHAT YOU GET TODAY
✓ Instant OAuth connection to your Stripe account
✓ Pre-built policy templates (fraud detection, approval gates, spending limits)
✓ 30-day free trial — no card required (already provided)
✓ Real-time audit trail and compliance evidence
✓ Dashboard access with 1-click alerts

YOUR NEXT STEP (Right Now)
1. Log in to your dashboard: https://tdealer01-crypto-dsg-control-plane.vercel.app
2. Click "Connect Stripe" (OAuth prompt)
3. Approve Governance Gate app in your Stripe account
4. Deploy first policy (we'll auto-suggest 3 quick wins)
5. You're live! Transactions are gated in real-time.

TYPICAL TIME: 5 minutes
SETUP SUPPORT: If anything stalls, reply to this email or visit https://help.dsg.one/support

WHAT'S NEXT
→ Day 3: Integration deep-dive tutorial (the API details, webhooks, testing)
→ Day 7: First policy customization guide
→ Day 14: Team training and role-based access
→ Day 21: Success metrics and ROI review

QUICK WINS (To Enable Right Now)
• Policy 1: Block transactions > $10,000 until manual approval
• Policy 2: Flag high-risk agent actions for compliance review
• Policy 3: Enforce 24-hour dispute window for high-value payments

Need help? Reply to this email, or visit our Getting Started Guide:
https://tdealer01-crypto-dsg-control-plane.vercel.app/docs/getting-started

You're all set. Let's go!

— The DSG Team
```

**CTA Button 1:** "Login & Start Setup"  
**CTA Button 2:** "View Getting Started Guide"

**Footer Links:**
- Dashboard: https://tdealer01-crypto-dsg-control-plane.vercel.app
- Docs: https://tdealer01-crypto-dsg-control-plane.vercel.app/docs
- Support: https://help.dsg.one/support
- Feedback: hello@dsg.one

---

## Email 2: Integration Tutorial & Testing (Sent Day 3)

**Subject:** Day 3: Ready for the deep dive? Here's your integration guide.

**From:** onboarding@dsg.one

**To:** Customer email address

---

### Email Body

```
Hi [Customer Name],

Great job getting set up! By now, you should see your first policy live 
(check your dashboard under "Active Policies").

Today's mission: Understand how governance works under the hood.
Time investment: 30 minutes
Outcome: Confidence in your webhook flow and real-time decision-making

YOUR INTEGRATION BLUEPRINT
We've prepared a step-by-step guide covering:

1. OAuth architecture (how Stripe <> DSG tokens work)
2. Webhook listener setup (where governance decisions arrive)
3. Transaction flow (from payment attempt → policy check → decision → audit trail)
4. Testing framework (how to safely test before production)
5. Troubleshooting checklist (common issues & instant fixes)

READ THE FULL GUIDE HERE:
https://tdealer01-crypto-dsg-control-plane.vercel.app/docs/integration-tutorial

STEP-BY-STEP CHECKLIST
☐ Review OAuth connection status (Dashboard → Settings → Integrations)
☐ View sample webhook event (Dashboard → Logs → Recent Events)
☐ Run test transaction (Dashboard → Test Mode → Create Test Payment)
☐ Confirm policy execution (check Decision + Reason in the logs)
☐ Verify audit trail entry (Dashboard → Compliance → Audit Log)

TEST MODE (Safe to experiment)
Your account is in Test Mode by default. Test transactions don't charge cards.
→ Enable Test Mode: Dashboard → Settings → Environment
→ Create test payment: Dashboard → Test Mode → New Transaction
→ Observe policy decision in real-time logs

NEXT: Once you've run a test, reply to this email with:
• Policy name (e.g., "Block > $10K")
• Test transaction amount
• Policy decision (ALLOWED / BLOCKED / REVIEW)

We'll confirm your flow is working perfectly.

MOVING FORWARD
• Day 7: Customize your first policy to your exact business rules
• Day 14: Invite your team and set up role-based access
• Day 21: Analyze your success metrics and ROI

Questions? Reply here or visit our full Integration Tutorial:
https://tdealer01-crypto-dsg-control-plane.vercel.app/docs/integration-tutorial

You're building something powerful.

— The DSG Team
```

**CTA Button 1:** "View Integration Tutorial"  
**CTA Button 2:** "Create Test Transaction"

**Resources Attached/Linked:**
- Integration Tutorial: https://tdealer01-crypto-dsg-control-plane.vercel.app/docs/integration-tutorial
- Webhook Event Reference: https://tdealer01-crypto-dsg-control-plane.vercel.app/docs/api-reference
- Test Mode Guide: https://tdealer01-crypto-dsg-control-plane.vercel.app/docs/testing

---

## Email 3: Policy Customization & First Win (Sent Day 7)

**Subject:** Day 7: Your first custom policy is 10 minutes away

**From:** onboarding@dsg.one

**To:** Customer email address

---

### Email Body

```
Hi [Customer Name],

By now, you've tested governance and seen your policies in action. Time to claim 
your first major win: a policy tailored to your exact business.

In 10 minutes, you'll have a custom policy that reflects your risk appetite, 
spending rules, and compliance requirements.

YOUR MISSION: ONE CUSTOM POLICY
Pick one scenario from below:

SCENARIO 1: High-Value Transaction Gate
"Block any transaction > $[X] until a manager approves it"
→ Perfect for: Protecting cash runway, compliance, authorization controls
→ Set up here: https://tdealer01-crypto-dsg-control-plane.vercel.app/policies/new

SCENARIO 2: Agent Spend Limit
"An agent can only spend $[X] per day before escalation"
→ Perfect for: AI agent safety, budget guardrails, anomaly detection
→ Set up here: https://tdealer01-crypto-dsg-control-plane.vercel.app/policies/new

SCENARIO 3: High-Risk Action Flag
"Flag disputes, refunds, and reversals for immediate review"
→ Perfect for: Fraud prevention, compliance monitoring, audit trails
→ Set up here: https://tdealer01-crypto-dsg-control-plane.vercel.app/policies/new

QUICK SETUP (5 Steps)
1. Go to Dashboard → Policies → New Policy
2. Name your policy (e.g., "Daily Agent Spend Limit")
3. Choose your condition (transaction amount, agent ID, action type, etc.)
4. Set your threshold (e.g., "> $5,000")
5. Choose your action (ALLOW, BLOCK, or REVIEW)
→ **DEPLOY** — It's live immediately.

VERIFY IT WORKS
1. Check Logs → Recent Decisions
2. You should see your policy in the execution trace
3. Try a test transaction that hits your condition
4. Confirm the policy decision appears in the audit log

WIN #1 COMPLETE ✓
Once deployed, your first custom policy is protecting your business in real-time.

NEXT STEPS (Coming Soon)
→ Day 14: Invite your team and set up fine-grained access control
→ Day 21: Measure impact with our ROI dashboard
→ Beyond: Advanced policies, webhooks, and API integrations

Questions? Reply here. I'm standing by to confirm your policy is running.

— The DSG Team

P.S. What policy did you choose? I'd love to hear how it's protecting your business.
```

**CTA Button 1:** "Create New Policy"  
**CTA Button 2:** "View Policy Templates"

**Resources Attached/Linked:**
- Policy Editor: https://tdealer01-crypto-dsg-control-plane.vercel.app/policies/new
- Policy Template Library: https://tdealer01-crypto-dsg-control-plane.vercel.app/templates
- Policy Setup Guide: https://tdealer01-crypto-dsg-control-plane.vercel.app/docs/policy-setup

---

## Email 4: Team Training & Access Control (Sent Day 14)

**Subject:** Day 14: Bring your team on board (Role-Based Access)

**From:** onboarding@dsg.one

**To:** Customer email address

---

### Email Body

```
Hi [Customer Name],

You've been running governance solo. Time to scale: invite your team.

Today, you'll set up role-based access so your team members can:
• View audit trails and compliance evidence
• Approve governance decisions in the REVIEW queue
• Manage policies (with your permission)
• Receive real-time alerts

TEAM ROLES (Choose What They Can Do)
We support 4 role levels:

VIEWER
→ Read-only access to audit logs and policy decisions
→ Perfect for: Compliance officers, auditors
→ Can: View logs, export audit trails, generate compliance reports

APPROVER
→ Can approve pending REVIEW decisions in real-time
→ Can view policies and logs
→ Perfect for: Operations managers, risk teams
→ Can: Approve transactions, view decisions, comment on audit events

ADMIN
→ Full access to policies, team management, settings
→ Perfect for: Operations leads, governance architects
→ Can: Create/edit policies, manage team members, configure webhooks

OWNER
→ Your current role — full platform control

SET UP YOUR TEAM (5 Minutes)
1. Go to Settings → Team Management
2. Click "Invite Team Member"
3. Enter their email address
4. Choose their role (VIEWER, APPROVER, ADMIN)
5. Send invite
→ They'll receive an email and can start working immediately.

EXAMPLE TEAM SETUP
• Sarah (Ops Manager): APPROVER role — she reviews high-value transactions
• Jason (Compliance): VIEWER role — he audits and exports evidence
• Maya (Engineering): ADMIN role — she customizes policies for new integrations
• You: OWNER — full control

ENABLE REAL-TIME ALERTS
Team members can receive Slack/email notifications when:
• A decision requires approval (REVIEW status)
• A policy is triggered
• Anomalies are detected
→ Settings → Notifications → Choose channels

NEXT STEPS (Week 3+)
→ Day 21: Measure success with ROI and KPI dashboards
→ Week 4: Advanced policies, custom webhooks, API integration
→ Ongoing: Monthly compliance reviews and governance audits

Ready to onboard your team?
https://tdealer01-crypto-dsg-control-plane.vercel.app/settings/team

Questions? Reply here — I'll walk you through team setup.

— The DSG Team

P.S. How many team members are you planning to invite? Let me know so we can 
make sure everyone has the right access.
```

**CTA Button 1:** "Go to Team Management"  
**CTA Button 2:** "View Role Documentation"

**Resources Attached/Linked:**
- Team Management: https://tdealer01-crypto-dsg-control-plane.vercel.app/settings/team
- Role Documentation: https://tdealer01-crypto-dsg-control-plane.vercel.app/docs/roles-and-permissions
- Slack Integration: https://tdealer01-crypto-dsg-control-plane.vercel.app/docs/notifications

---

## Email 5: Success Metrics & ROI Review (Sent Day 21)

**Subject:** Day 21: See the impact — Your governance ROI dashboard

**From:** onboarding@dsg.one

**To:** Customer email address

---

### Email Body

```
Hi [Customer Name],

You've been running DSG Governance Gate for three weeks. Time to measure the win.

This email gives you:
• Your success metrics (policies deployed, decisions made, time saved)
• ROI calculator (compliance cost reduction, approval efficiency gains)
• Monthly review checklist (keep governance on track)
• Next-phase roadmap (where governance can grow)

YOUR CURRENT METRICS (From Your Dashboard)
[ Dashboard data to be auto-populated ]
• Policies Active: [#]
• Decisions Made: [#]
• Average Decision Time: [#]ms
• Blocked/Reviewed Transactions: [#]
• Audit Log Entries: [#]
• Team Members: [#]
• Uptime: [#]%

CALCULATE YOUR ROI
We've built a simple ROI calculator to show you the business impact:

BEFORE (Manual governance):
→ Manual review time: ~[#] hours/month
→ Approval delay cost: ~$[#]/month
→ Compliance evidence collection: ~[#] hours/month
→ Total manual overhead: ~$[#]/month

AFTER (DSG Governance):
→ Automated review time: ~[#] hours/month (99% faster)
→ Approval delay: ~[#] minutes average
→ Compliance evidence: Automatic & auditable
→ Total platform cost: $[#]/month

YOUR SAVINGS: ~$[#]/month in efficiency + compliance confidence

VIEW YOUR FULL DASHBOARD HERE:
https://tdealer01-crypto-dsg-control-plane.vercel.app/dashboard/metrics

MONTHLY REVIEW CHECKLIST (Do This Each Month)
☐ Review active policies and audit logs (Settings → Compliance)
☐ Check team member access and invite new team members if needed
☐ Export audit trail for compliance (Compliance → Download Evidence Pack)
☐ Review KPIs against your goals (Dashboard → Metrics)
☐ Adjust policies based on business changes (Policies → Edit)
☐ Schedule monthly governance review with your team

NEXT PHASE: Scale Governance (Month 2+)
Now that you've mastered the basics:

ADVANCED POLICIES
→ Multi-condition rules (e.g., "If amount > $X AND agent_risk > Y, then BLOCK")
→ Custom actions (e.g., "Create a Stripe dispute", "Notify compliance team")
→ Policy versioning and rollback
→ A/B testing policies
→ Read more: https://tdealer01-crypto-dsg-control-plane.vercel.app/docs/advanced-policies

INTEGRATIONS
→ Webhook customization (send governance decisions to your systems)
→ Slack + email alerts with richer context
→ Custom API endpoints for policy evaluation
→ Third-party audit tool connectors
→ Read more: https://tdealer01-crypto-dsg-control-plane.vercel.app/docs/integrations

COMPLIANCE & AUDIT
→ Monthly automated compliance reports
→ Real-time audit trail export (CCVS format)
→ Custom KPI dashboards
→ Evidence chain verification
→ Read more: https://tdealer01-crypto-dsg-control-plane.vercel.app/docs/compliance

YOUR SUCCESS STORY
We'd love to feature your governance journey in our customer spotlight series.
If you're open to sharing how DSG is protecting your business, reply to this email.

WHAT'S NEXT?
1. Review your metrics dashboard above
2. Schedule a 30-minute follow-up call with our team (optional): 
   https://calendly.com/dsg-onboarding
3. Explore advanced policies and integrations
4. Plan your Month 2 governance roadmap

You're now in the governance game. Let's grow from here.

— The DSG Team

P.S. Questions or feedback? I'm here to help. Reply to this email or visit our 
support portal: https://help.dsg.one
```

**CTA Button 1:** "View Metrics Dashboard"  
**CTA Button 2:** "Schedule Follow-Up Call"

**Resources Attached/Linked:**
- Metrics Dashboard: https://tdealer01-crypto-dsg-control-plane.vercel.app/dashboard/metrics
- ROI Calculator: https://tdealer01-crypto-dsg-control-plane.vercel.app/tools/roi-calculator
- Advanced Policies: https://tdealer01-crypto-dsg-control-plane.vercel.app/docs/advanced-policies
- Integrations: https://tdealer01-crypto-dsg-control-plane.vercel.app/docs/integrations
- Calendly: https://calendly.com/dsg-onboarding

---

## Email Sequence Rules

### Timing
- **Email 1:** Immediately after signup
- **Email 2:** Day 3 (72 hours after signup)
- **Email 3:** Day 7 (168 hours after signup)
- **Email 4:** Day 14 (336 hours after signup)
- **Email 5:** Day 21 (504 hours after signup)

### Personalization
- Replace `[Customer Name]` with actual customer first name
- Auto-populate metrics in Email 5 from live dashboard data
- Use customer's chosen policy names in confirmations

### Engagement Tracking
- Track email opens and clicks
- If customer hasn't deployed first policy by Email 2, send a gentle nudge
- If customer hasn't created a custom policy by Email 4, offer a 1:1 call

### Do Not Send Rules
- Skip Email 2 if customer deployed a policy within 24 hours of signup
- Skip Email 3 if customer has already created a custom policy
- Skip Email 4 if customer has no team members to invite
- Skip Email 5 if customer is in trial expiration period — send upsell instead

### Optional: Post-Onboarding Nurture (Month 2+)
- Monthly compliance checklist email
- Feature spotlight emails (new policy types, advanced features)
- Customer success stories and case studies
- Quarterly business review invitation

---

## Success Metrics for This Sequence

Track these KPIs to optimize the onboarding experience:

| Metric | Target | Goal |
|--------|--------|------|
| Email 1 Open Rate | >50% | High awareness |
| Email 1 → Dashboard Login | >70% | Strong conversion |
| First Policy Deployed | >80% within 24h | Quick activation |
| Email 3 Completion (Custom Policy) | >60% | Policy customization |
| Team Member Invited | >40% | Team scaling |
| Day 21 Retention | >85% | Long-term value |

---

## Support Escalation During Onboarding

If a customer reports issues:
1. **Email 1-2**: Offer Getting Started Guide link + support email reply
2. **Email 3**: Offer 1:1 policy setup call (15 min, no charge)
3. **Email 4**: Offer team access walk-through (15 min call)
4. **Email 5**: Offer 30-min success review call + ROI planning

---

## Customization by Customer Segment

### For Enterprise Customers
- Add Email 0.5: "Enterprise Onboarding" (audit readiness, compliance mapping)
- Add Email 2.5: "SSO & Advanced Team Management"
- Add Email 5.5: "Compliance Certification Path"

### For Crypto/Payment Processors
- Emphasize transaction volume and compliance evidence in Email 1
- Add policy template for "High-Risk Transaction Review"
- Highlight audit trail in Email 5

### For AI Agent Builders
- Emphasize agent action governance in Email 1
- Add policy template for "Agent Spend Limits"
- Highlight deterministic decision-making in Email 3

---

## Next Steps

1. Configure email service (SendGrid, Mailchimp, etc.)
2. Set up automation triggers for each email
3. Create email templates matching your brand
4. Test the sequence with a test customer account
5. Monitor engagement and optimize timing
6. Add personalization data from Supabase customer records
