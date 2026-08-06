# DSG ONE — Frequently Asked Questions

## Product & Features

### Q: What is DSG ONE?
**A:** DSG ONE is the control plane for AI operations. It monitors every AI action, verifies decisions against your policies, audits everything with tamper-proof proof, and helps you optimize costs. Every AI decision has an owner—DSG ONE proves it.

### Q: How is DSG ONE different from just logging?
**A:** Logging tells you what happened. DSG ONE tells you **why it happened**, **who approved it**, and **proves it followed policy**. With DSG ONE, you can audit regulatory questions like "did this decision follow our policy?" and "who approved this risky action?"

### Q: What integrations does DSG ONE support?
**A:** Pre-integrated with:
- Stripe (charges, refunds, payment events)
- OpenAI (API calls)
- Anthropic Claude (requests/responses)
- GitHub (actions, PR events)
- Slack (messages, commands)
- MCP (protocol calls)
- OpenRouter (multi-model routing)

We're building extensible REST API support for any custom integration.

### Q: Can I write policies in Thai?
**A:** Yes. DSG ONE supports both Thai and English policies. Example: "ห้ามโอนเกิน 50,000" (no transfers over ฿50K).

### Q: How fast is DSG ONE?
**A:** Policy gates execute in ~11ms per request (average). Audit recording adds <5ms. No LLM round-trip needed for decisions.

### Q: Does DSG ONE work with multiple AI providers?
**A:** Yes. You can set up policies that apply to OpenAI, Anthropic, GitHub, Stripe, and any integrated service. One control plane for all of them.

---

## Pricing & Plans

### Q: How much does DSG ONE cost?
**A:** $99/workspace/month. Everything is included—unlimited policies, unlimited audit logs, unlimited replay, unlimited integrations, unlimited approvals, unlimited dashboards, unlimited exports.

### Q: Is there a free tier?
**A:** Yes. DSG ONE Free is $0/month with 5 audit logs and limited replay. Perfect for trying DSG ONE risk-free. Upgrade to DSG ONE ($99/month) when you need unlimited everything.

### Q: What happens if I exceed usage limits?
**A:** DSG ONE Free caps at 5 audit logs/month. If you need more, upgrade to DSG ONE for unlimited. Optionally, usage-based overage billing is available for extreme cases (10K+ operations/month, rare).

### Q: Can I try DSG ONE before paying?
**A:** Yes. Install for free on Stripe Marketplace. Use DSG ONE Free ($0) to explore features. Upgrade to DSG ONE ($99/month) when ready.

### Q: Is pricing per-user or per-workspace?
**A:** Per-workspace. One $99/month per workspace covers unlimited users, unlimited policies, unlimited everything.

---

## Setup & Getting Started

### Q: How do I get started?
**A:** 
1. Install DSG ONE from Stripe Marketplace (takes 30 seconds)
2. Create your first policy ("Only allow transfers under ฿50K")
3. Watch decisions in your dashboard
4. Export audit trail for compliance
5. Upgrade to DSG ONE ($99/month) for unlimited

### Q: How do I set up a policy?
**A:** Policies are written in natural language. Example:
```
If transaction_amount > 50000 AND approver_role != "admin":
  Decision: REVIEW (require human approval)
Else:
  Decision: ALLOW
```

Our policy templates support common use cases (payment gating, approval workflows, fraud detection, etc.).

### Q: How long does it take to integrate DSG ONE?
**A:** 
- Stripe: ~5 minutes (one-click install)
- OpenAI: ~10 minutes (configure API endpoint)
- Custom API: ~30 minutes (webhook setup)

No code changes required for pre-integrated services.

### Q: Can I test policies before deploying them?
**A:** Yes. All policies have a "Test" mode where you can run decisions without recording them to the audit trail. Use this to verify policies before going live.

---

## Security & Compliance

### Q: Is my data encrypted?
**A:** Yes. All data in transit uses TLS 1.3. Data at rest is encrypted in Supabase (AES-256). Audit logs are immutable (SHA-256 hash-chained).

### Q: How long are audit logs kept?
**A:** Indefinitely. Audit logs are stored in Supabase with retention policies matching your org's compliance requirements. Export anytime for audits.

### Q: Can auditors verify my audit logs?
**A:** Yes. Every decision in DSG ONE has:
- **Tamper-proof hash** (SHA-256) to prove records haven't been altered
- **Replay capability** to re-run decisions with the same output
- **Compliance export** (JSON, CSV, PDF) for regulatory reviews

This satisfies CCVS L1-L5 compliance requirements and EU AI Act Annex IV mapping.

### Q: What about GDPR/CCPA/PDPA compliance?
**A:** DSG ONE supports data export and deletion workflows required by GDPR, CCPA, and PDPA. Policies can be configured to respect regional requirements.

### Q: Is DSG ONE SOC 2 certified?
**A:** DSG ONE follows SOC 2 Type II principles. We're pursuing third-party certification. See `/public/compliance` for current status.

### Q: Can I export audit logs for compliance audits?
**A:** Yes. Export in JSON, CSV, or PDF formats. Includes policy version, decision reason, approval trail, and tamper-proof hashes.

---

## Integrations & API

### Q: Does DSG ONE work with my existing AI stack?
**A:** Likely yes. We're pre-integrated with major providers (OpenAI, Anthropic, GitHub, Stripe, etc.). For others, you can use our REST API webhook to gate any service.

### Q: Can I use DSG ONE with multiple OpenAI API keys?
**A:** Yes. DSG ONE can manage keys for multiple OpenAI orgs/accounts. Each key can have separate policies.

### Q: What happens if DSG ONE is unavailable?
**A:** By design, DSG ONE **never auto-allows** during outages. Unavailable decisions default to REVIEW status (require human approval). This is the "fail-safe" principle.

### Q: Can I build custom integrations?
**A:** Yes. DSG ONE exposes REST APIs for policy gates, decision logging, and evidence export. See our API documentation for webhook setup.

### Q: Does DSG ONE work with MCP (Model Context Protocol)?
**A:** Yes. DSG ONE can gate MCP protocol calls. Any MCP server can be routed through policy verification.

---

## Compliance & Audits

### Q: What compliance standards does DSG ONE support?
**A:** 
- CCVS L1-L5 (compliance evidence matrix)
- EU AI Act Annex IV (high-risk AI documentation)
- SOC 2 Type II (control audit trail)
- GDPR/CCPA/PDPA (data export/deletion)
- PCI-DSS (for Stripe merchants)

### Q: Can I use DSG ONE for regulatory proof?
**A:** Yes. Export tamper-proof audit trails in compliance-ready format (CCVS matrix, EU AI Act mappings). Use for regulatory responses and audits.

### Q: How do I prove to regulators that my AI decisions followed policy?
**A:** DSG ONE provides:
1. **Policy version** tied to each decision
2. **Tamper-proof proof** (SHA-256 hash chain)
3. **Replay capability** to re-run decisions exactly
4. **Approval trail** showing who authorized it
5. **Compliance export** formatted for auditors

This proves your AI was governed, verified, and audited.

### Q: What if a regulator asks "did this AI decision follow your policy?"
**A:** DSG ONE lets you:
1. Export the decision from the audit trail
2. Show the policy version that was active
3. Replay the decision to prove it produces the same output
4. Show the tamper-proof hash proving the record is unchanged
5. Export full compliance evidence

You can answer this question with proof.

---

## Account & Billing

### Q: How do I add team members?
**A:** Invite via the DSG ONE dashboard. Team members inherit workspace permissions (Admin/Operator/Viewer roles). Custom roles available for Enterprise.

### Q: How do I change my password?
**A:** Use the account settings page in the dashboard. Password reset via email.

### Q: Can I cancel anytime?
**A:** Yes. Cancel at any time. No long-term contracts. If you cancel mid-month, you're charged a pro-rated refund for unused time.

### Q: What payment methods do you accept?
**A:** Credit/debit card (Visa, Mastercard, Amex) via Stripe. Invoice billing available for Enterprise customers.

### Q: Can I export my data if I leave DSG ONE?
**A:** Yes. Export all audit logs, policies, and evidence at any time. Full data portability.

### Q: What happens to my data after I cancel?
**A:** Your audit logs are retained for 30 days after cancellation, then deleted. You can export everything before cancellation.

---

## Troubleshooting

### Q: Why did a decision show REVIEW instead of ALLOW?
**A:** REVIEW means DSG ONE detected risk or ambiguity and wants human approval. This is by design. Review the decision in the dashboard to understand why.

### Q: Can I force a decision if DSG ONE says BLOCK?
**A:** No. BLOCK decisions cannot be overridden. This is the fail-safe principle. If you need to override, adjust your policy and replay the decision.

### Q: Why is my audit log showing "UNSUPPORTED"?
**A:** UNSUPPORTED means DSG ONE couldn't evaluate the policy (missing data, parsing error, etc.). This defaults to REVIEW (safe) or BLOCK (safer). Check the decision details.

### Q: How do I debug a policy that's not working?
**A:** Use the "Test" mode in the policy editor. Run test cases to see decision outputs. Export detailed decision traces.

### Q: My OpenAI integration isn't working. What do I do?
**A:** Check:
1. API key is valid and has correct permissions
2. Policy is not blocking all requests (adjust test mode)
3. Ensure the OpenAI endpoint is reachable (check status page)

Contact support@dsg.pics with your workspace ID for faster help.

---

## Support & Documentation

### Q: How do I get help?
**A:** 
- Email: support@dsg.pics
- Docs: https://dsg.pics/docs
- Status page: https://status.dsg.pics
- Response time: <24 hours for support emails

### Q: Is there a Slack community?
**A:** Yes. Join our community Slack (invite link in docs).

### Q: Do you offer training or onboarding?
**A:** Yes. We offer 1-hour onboarding calls for Enterprise customers. See /public/support for booking.

### Q: Where can I report a security issue?
**A:** Email security@dsg.pics with details. We respond within 24 hours.

---

## Advanced Questions

### Q: Can I use DSG ONE for machine learning model governance?
**A:** Yes. DSG ONE can gate decisions made by ML models. Policy verification ensures model outputs follow business rules.

### Q: Can I track ROI from DSG ONE?
**A:** Yes. Export analytics showing:
- # of blocked/reviewed/allowed decisions
- Chargeback reduction rate (if using Stripe)
- Time saved on manual audits
- Compliance audit preparation time

### Q: Does DSG ONE support multi-org setups?
**A:** Yes. Enterprise plans support multiple workspaces, each with separate policies and audit trails.

### Q: Can I integrate DSG ONE with my incident response process?
**A:** Yes. Policies can trigger webhooks to alert your incident response team (PagerDuty, Slack, etc.) when risky decisions need review.

---

## Anything Else?

**Not finding your answer?** Email support@dsg.pics or check docs at https://dsg.pics/docs
