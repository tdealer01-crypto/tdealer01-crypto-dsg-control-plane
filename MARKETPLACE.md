# DSG Control Plane — GitHub Marketplace Listing

**Production AI governance + execution platform for regulated workflows**

Live: https://tdealer01-crypto-dsg-control-plane.vercel.app

---

## Product Overview

**DSG Control Plane** is a production-grade AI governance and execution platform designed for regulated industries and enterprise teams. It provides deterministic policy gating, cryptographic audit trails, and real-time compliance monitoring for AI agents and automated workflows.

### Category

DevTools · AI/ML · Governance · Compliance

---

## Core Features

### 🤖 Trinity AI Multi-Agent System
- 5-agent orchestration: Mind, Hand, Eye, Nerve, Spine
- Deterministic governance constraints enforced before every execution
- Job discovery from GitHub bounties and Immunefi
- Reputation tier system: Bronze → Silver → Gold → Platinum
- `planHash`, `proofHash`, `auditHash` per execution (SHA-256)

### 💳 Finance Governance & Payment Controls
- AI-enforced payment approval gates
- Multi-step approval workflows
- Finance compliance audit trails
- Real-time fraud prevention signals

### 📋 AI Compliance (ISO 42001, NIST AI RMF)
- ISO 42001 AI management system controls
- NIST AI RMF framework mapping
- Automated compliance evidence collection
- Exportable compliance evidence packs

### 🇪🇺 EU AI Act Risk-Based Governance
- Risk classification by AI system category
- Prohibited use-case blocking
- High-risk system documentation templates
- Conformity assessment scaffolding

### 🎯 Delivery Proof (AI Code Proof Reports)
- Automated proof scan for AI-generated code
- Shareable report with cryptographic lineage
- Production readiness scoring
- Self-serve upgrade CTA integrated

### 💰 Stripe Integration for Revenue Capture
- Automated revenue event tracking
- Subscription management across all tiers
- Quota-based usage billing
- Webhook event persistence
- Real-time billing KPI dashboard

### 📊 Real-time Monitoring & Audit Trails
- Live execution monitoring dashboard
- Complete audit trail with replay capability
- Per-org billing isolation
- CCVS compliance evidence chain

---

## Pricing Tiers

| Tier | Price | Description |
|------|-------|-------------|
| **Free** | $0/month | Trial tier — 1 Delivery Proof scan/month, 50 DSG Gate evals/month |
| **Pro** | $49/month | Delivery Proof scans — unlimited scans, priority support |
| **Business** | $199/month | Unlimited scans + full governance features + compliance exports |
| **Enterprise** | Custom | Unlimited everything + SLA + dedicated support + custom integrations |
| **MCP Subscription** | ฿490/month | Developer tools — MCP protocol access, CLI tools, API quota |
| **API Quota Upgrades** | Variable | Additional DSG Gate evaluations beyond free tier |

### Free Trial

- **14-day free trial** on all paid tiers
- No credit card required to start
- Full feature access during trial
- Automatic downgrade to Free if not converted

---

## Getting Started (5 Minutes)

### Prerequisites
- GitHub account
- Vercel account (for deployment)
- Supabase project (for persistence)

### Quick Setup

1. **Install from GitHub Marketplace** — Click "Install" on this listing
2. **Connect your repository** — Grant access to your target repo
3. **Configure environment variables** — Set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `STRIPE_SECRET_KEY`
4. **Deploy to Vercel** — One-click deployment from the dashboard
5. **Access your governance dashboard** — Visit `/dashboard` to begin

### No Migration Required

- Works with any existing repository
- No schema changes required for basic features
- Supabase migrations run automatically on first deploy
- Stripe webhooks auto-configured

### Live on Vercel

Production deployment: https://tdealer01-crypto-dsg-control-plane.vercel.app

All pages and API endpoints are live and verified:

| Endpoint | Status |
|----------|--------|
| `GET /api/health` | ✅ Live |
| `GET /api/agent/status` | ✅ Live |
| `GET /api/readiness` | ✅ Live |
| `POST /api/spine/execute` | ✅ Live |
| `GET /api/delivery-proof/pricing` | ✅ Live |
| `GET /api/dsg/v1/pricing` | ✅ Live |

---

## Technical Specifications

| Spec | Detail |
|------|--------|
| **Runtime** | Next.js 15 App Router, TypeScript |
| **Database** | Supabase (PostgreSQL + RLS) |
| **Auth** | Supabase SSR + JWT |
| **Payments** | Stripe (Checkout, Webhooks, Meter Events) |
| **Deployment** | Vercel (Edge + Serverless) |
| **Testing** | Vitest — 2501 tests passing |
| **Security** | CodeQL + Gitleaks scanned |

---

## Support

- **Documentation**: [/docs](/docs)
- **Issues**: [GitHub Issues](https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane/issues)
- **Discussions**: [GitHub Discussions](https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane/discussions)
- **Email**: Support via GitHub Discussions

---

## Privacy & Compliance

- GDPR-aware data handling (per-org isolation)
- RLS enforced at database level
- No PII stored beyond authentication requirements
- Audit trail data retained per configured policy
- SOC 2 roadmap in progress

---

## License

See [LICENSE](./LICENSE) for terms.
