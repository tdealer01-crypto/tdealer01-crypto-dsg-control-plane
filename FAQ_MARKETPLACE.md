# FAQ — DSG Control Plane Marketplace

Frequently asked questions for customers who discover DSG Control Plane on GitHub Marketplace or Stripe App Marketplace.

---

## Getting Started

### How do I get started?

1. Click **"Install"** on the GitHub Marketplace listing
2. Grant access to your GitHub account or organization
3. Deploy to Vercel using the one-click deployment button
4. Connect your Supabase project (or create a new one)
5. Set your Stripe API keys in Vercel environment variables
6. Visit `/dashboard` to begin using the governance platform

The full setup takes approximately 5 minutes. No migration required.

See [GITHUB_MARKETPLACE_SETUP.md](./GITHUB_MARKETPLACE_SETUP.md) for a detailed step-by-step guide.

---

### Are there any setup fees?

No. There are no setup fees, onboarding fees, or one-time charges. You pay only the monthly subscription fee for your chosen tier. The Free tier is always $0 with no credit card required.

---

### How does the free trial work?

All paid tiers (Pro, Business) include a **14-day free trial**:

- Full access to all features in your chosen tier
- No credit card required during the trial
- At the end of the trial, you are prompted to add payment details
- If you do not add payment details, your account automatically downgrades to Free
- Trial data (executions, audit trails, proof reports) is retained when you upgrade

---

## Pricing

### What's included in each pricing tier?

| Feature | Free | Pro | Business | Enterprise |
|---------|------|-----|----------|------------|
| Delivery Proof scans | 1/month | Unlimited | Unlimited | Unlimited |
| DSG Gate evaluations | 50/month | 5,000/month | Unlimited | Unlimited |
| Governance dashboard | ✅ | ✅ | ✅ | ✅ |
| Audit trail retention | 30 days | 1 year | 1 year | Custom |
| Compliance exports | ❌ | ❌ | ✅ | ✅ |
| Trinity multi-agent | ✅ (read-only) | ✅ | ✅ | ✅ |
| Finance governance | ✅ | ✅ | ✅ | ✅ |
| Stripe integration | ✅ | ✅ | ✅ | ✅ |
| Support | Community | Priority email | Priority email | Dedicated |
| SLA | ❌ | ❌ | ❌ | ✅ |
| Custom integrations | ❌ | ❌ | ❌ | ✅ |

**MCP Subscription** (฿490/month): Developer tools — MCP protocol access, CLI tools, and API quota increase. Available independently of the above tiers.

---

### Can I upgrade or downgrade my plan?

Yes, anytime.

- **Upgrades**: Take effect immediately. You are charged a prorated amount for the remainder of the current billing period.
- **Downgrades**: Take effect at the end of the current billing period. You retain access to the higher tier until that date.
- **Free tier**: Always available as a fallback. Downgrading to Free is instant.

To change your plan, go to **Dashboard → Billing** and click **"Change plan"**.

---

### Can I cancel anytime?

Yes. You can cancel your subscription at any time from **Dashboard → Billing → Cancel subscription**.

- Cancellation takes effect at the end of the current billing period
- You retain access until the billing period ends
- Your data (executions, audit trails) is retained for 30 days after cancellation
- After 30 days, inactive account data is deleted per our data retention policy

---

### What is the refund policy?

We offer a **30-day money-back guarantee** for new paid subscriptions:

- Request a refund within 30 days of your first paid charge
- Refunds are issued to the original payment method within 5–10 business days
- After 30 days, refunds are issued at our discretion for valid technical issues
- MCP Subscription refunds follow the same 30-day policy

To request a refund, open a [GitHub Issue](https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane/issues) labeled `billing-refund`.

---

### How do billing cycles work?

- Billing is monthly, on the anniversary of your subscription start date
- Invoices are issued by Stripe and sent to your billing email
- Failed payments trigger a retry schedule (3 attempts over 7 days)
- If all retries fail, your subscription is suspended and you are notified
- All invoices are accessible in **Dashboard → Billing → Invoice history**

---

## Security & Data

### Is my data secure?

Yes. Key security measures:

- **Database**: Row Level Security (RLS) enforced — each org can only access its own data
- **Authentication**: Supabase JWT + session management
- **Secrets**: Stripe API keys and webhook secrets never stored in client state or browser
- **Webhooks**: All Stripe webhook payloads verified with `stripe-signature` before processing
- **Transport**: HTTPS enforced on all endpoints (Vercel enforces TLS)
- **Audit trail**: Every execution and billing event logged with cryptographic hashes
- **Code scanning**: CodeQL and Gitleaks scanned on every PR

---

### What data does DSG Control Plane store?

We store the following on your behalf in your Supabase project:

- User authentication records (email, hashed password via Supabase Auth)
- Execution records (agent ID, job metadata, governance decision, proof hashes)
- Audit trail events (timestamps, actions, outcomes — no raw payload content)
- Revenue events (Stripe event ID, type, amount, subscription status)
- Delivery Proof scan results (scan metadata and report ID — not raw source code)

We do **not** store:
- Raw source code from Delivery Proof scans beyond the scan metadata
- Credit card numbers or raw payment data (handled entirely by Stripe)
- Stripe secret keys (stored only in your Vercel environment variables)

---

### Is DSG Control Plane GDPR compliant?

DSG Control Plane is designed with GDPR principles in mind:

- Per-org data isolation via RLS
- Data retention configurable per deployment
- User data deletion supported via Supabase Auth admin API
- Data processing performed within your own Supabase project (your data stays in your database)

For regulated industries with specific GDPR requirements, contact us via GitHub Discussions to discuss data processing agreements.

---

## Technical Questions

### What's the difference between DSG Gate and Delivery Proof?

| Feature | DSG Gate | Delivery Proof |
|---------|----------|----------------|
| Purpose | Runtime AI operation governance | AI code quality proof reports |
| Trigger | Every AI agent execution | On-demand scan of a production URL |
| Output | ALLOW / BLOCK / REVIEW decision | Shareable proof report with scoring |
| Pricing | 50 evals/month free, paid tiers for more | 1 scan/month free, paid for more |
| Use case | Prevent unauthorized AI actions | Prove AI code quality to stakeholders |

---

### Does DSG Control Plane work with any AI model or agent?

Yes. DSG Control Plane is model-agnostic. It works as a governance layer between your application and any AI model or agent. The governance decisions (ALLOW/BLOCK/REVIEW) are based on deterministic policy rules, not model-specific behavior.

Supported integration patterns:
- Direct API call to `POST /api/spine/execute` before any AI action
- Webhook-based governance for async workflows
- Trinity multi-agent system for structured AI job execution

---

### What support is available?

| Tier | Support Channel | Response Time |
|------|----------------|---------------|
| Free | [GitHub Discussions](https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane/discussions) | Best effort |
| Pro | Priority email + Discussions | 24 hours |
| Business | Priority email + Discussions | 12 hours |
| Enterprise | Dedicated support + SLA | Per contract |

For billing issues on any tier, open a GitHub Issue labeled `billing` for faster routing.

---

### Where can I find the API documentation?

- API reference: `/docs` on your deployed instance
- Pricing API: `GET /api/delivery-proof/pricing` and `GET /api/dsg/v1/pricing`
- Health check: `GET /api/health`
- Agent status: `GET /api/agent/status`

Full endpoint list available in [README.md](./README.md).

---

## Still Have Questions?

- **GitHub Discussions**: [Ask the community](https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane/discussions)
- **GitHub Issues**: [Report a bug or request a feature](https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane/issues)
- **Documentation**: [MARKETPLACE.md](./MARKETPLACE.md)
