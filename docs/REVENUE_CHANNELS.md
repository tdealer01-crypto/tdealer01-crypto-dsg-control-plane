# Revenue Channels — DSG Control Plane / ProofGate

Complete analysis of current and potential revenue streams for the AI governance platform.

---

## 1. Current Revenue Channels (Active)

### 1.1 Subscription Tiers

**Three-tier subscription model** based on execution volume and features:

| Tier | Price | Executions/mo | Rate Limit | Agents | Key Features |
|------|-------|---------------|-----------|--------|--------------|
| **Pro** | $99/mo | 10,000 | 60 req/min | 10 | Governance, PDF export |
| **Business** | $299/mo | 100,000 | 300 req/min | 50 | Audit ledger, advanced reporting |
| **Enterprise** | $799/mo | 1,000,000 | Unlimited | Unlimited | SLA, dedicated support |

**Implementation:**
- Located: `app/dashboard/billing/page.tsx`
- Checkout: `app/api/billing/checkout/route.ts`
- Stripe integration: Full payment processing + webhooks
- Trial period: 14 days (Pro/Business), 30 days (Enterprise)

**Status:** ✅ Live with Stripe checkout flow

---

### 1.2 Skills Bundles (Add-ons)

**Modular feature packages** that enhance base plans:

| Bundle | Monthly | Yearly | Features |
|--------|---------|--------|----------|
| **Finance Governance Pack** | $199 | $1,791 | Payment gates, billing controls, revenue verification |
| **Dev Automation Pack** | $99 | $891 | CI/CD gates, deployment controls, code analysis |
| **Compliance & Legal Pack** | $249 | $2,241 | ISO/NIST compliance, audit trails, evidence export |
| **Operations Pack** | $149 | $1,341 | Team management, webhook automation, monitoring |
| **Enterprise Bundle** | $599 | $5,391 | All features above + custom implementation |

**Implementation:**
- Defined: `app/api/billing/checkout/route.ts` → `SKILLS_BUNDLE_CONFIG`
- Checkout: POST `/api/billing/checkout` with `plan: 'finance_skills'` etc.
- Pricing: Inline Stripe `price_data` (no pre-created price IDs required)
- Billing intervals: monthly & yearly

**Status:** ✅ Implemented, ready to sell

---

### 1.3 Usage-Based Metering (API Billing)

**Pay-as-you-go for overages** beyond plan limits:

- **Meter type:** Executions (gate evaluations)
- **Usage tracking:** Supabase meter tables
- **Overage pricing:** Configurable per execution
- **Billing cycle:** Monthly meter reset per workspace

**Implementation:**
- Migrations: `supabase/migrations/20260523000000_billing_meter_outbox.sql`
- Monitoring: `supabase/migrations/20260613000001_billing_meter_outbox_rls_and_monitoring.sql`
- Rate limiting: `lib/security/rate-limit.ts` integrated with quota enforcement

**Status:** ✅ Meter infrastructure in place, overage pricing not yet configured

---

### 1.4 Stripe Connect Integration

**Marketplace capability** — let customers integrate Stripe accounts:

- **Use case:** White-label payments, embedded checkout
- **Customer setup:** Stripe Connect OAuth flow
- **Location:** `app/dashboard/stripe-app/connect/page.tsx`
- **Routes:**
  - `POST /api/stripe/connect/install` — OAuth link
  - `POST /api/stripe/disconnect` — Deauthorize

**Status:** 🟡 Infrastructure ready, not yet monetized

---

### 1.5 API Key Management

**Granular access control** for API usage:

- **Scope system:** Custom permission sets per key
- **Rate limits:** Key-level rate limiting
- **Expiry:** Optional key expiration dates
- **Dashboard:** `/dashboard/api-keys`
- **Routes:**
  - `GET/POST /api/api-keys` — List and create
  - `DELETE /api/api-keys/[id]` — Revoke keys

**Monetization opportunity:**
- Premium: Unlimited API keys (vs. limited on free tier)
- Enterprise: Custom key scopes and rate limits
- SLA: Dedicated API infrastructure

**Status:** ✅ Implemented, quota enforcement ready

---

## 2. Potential Revenue Channels (Not Yet Implemented)

### 2.1 Enterprise Support Tiers

**Professional services packages:**

| Package | Price | Includes |
|---------|-------|----------|
| **Implementation** | $5,000 - $25,000 | Custom gate setup, policy configuration, team training |
| **Premium Support** | $2,000/mo | 24/7 support, <1hr response time, dedicated engineer |
| **Managed Services** | $10,000/mo | Full policy management, compliance monitoring, audit prep |
| **Custom Development** | TBD | New gates/policies, integrations, custom features |

**Implementation effort:** Low — mostly service/contract based

---

### 2.2 Compliance & Audit Services

**Help customers meet regulatory requirements:**

- **ISO 42001 audit prep** — $3,000 - $10,000 per engagement
- **NIST AI RMF compliance** — $5,000 - $15,000 per audit
- **SOC 2 Type II audit** — Evidence collection + facilitation
- **Custom compliance reports** — $1,000 per report

**Current infrastructure:**
- `lib/ccvs/` — Compliance/evidence collection framework
- `/compliance-evidence-pack` — Evidence export UI
- `npm run ccvs:pipeline` — Automated evidence chain

**Implementation effort:** Medium — needs compliance consultant partnership

---

### 2.3 Agent Execution as a Service

**Fully managed AI execution with governance:**

| Tier | Monthly Agents | Monthly Executions | Price |
|------|----------------|--------------------|-------|
| **Starter** | 1 | 5,000 | $199/mo |
| **Growth** | 5 | 50,000 | $499/mo |
| **Enterprise** | Unlimited | 1,000,000 | Custom |

**Features:**
- Pre-configured agents (Hermes, DSG Brain)
- Managed execution layer
- Full audit trail included
- Custom agent development available

**Current infrastructure:**
- `lib/dsg/brain/` — Controlled executor framework
- `lib/runtime/` — Execution pipeline
- `/api/execute` — Stable execution entry point

**Implementation effort:** Medium — needs agent service MVP

---

### 2.4 Policy Marketplace

**Sell pre-built governance policies:**

- **Policy templates:** $99 - $499 each
  - Finance approval gates
  - Data access policies
  - Deployment gates
  - Compliance checks
  
- **Custom policy design:** $2,000 - $10,000 per policy

- **Policy bundles:** Industry-specific (FinTech, Healthcare, Legal)

**Current infrastructure:**
- Policy versioning system
- `/api/policies` — CRUD endpoints
- Policy proof/verification

**Implementation effort:** Medium — needs policy design tooling

---

### 2.5 Advanced Reporting & Analytics

**Premium insight packages:**

- **Executive Dashboard:** Real-time governance metrics
- **Compliance Reports:** Automated monthly/quarterly reports
- **Risk Analytics:** Anomaly detection, risk scoring
- **Cost Optimization:** Billing analytics + recommendations
- **Custom Analytics:** $1,000 - $5,000 per custom dashboard

**Current infrastructure:**
- PostHog integration (`lib/posthog-client.ts`)
- Usage tracking (`lib/usage/quota.ts`)
- Billing outbox (`migrations/*/billing_meter_outbox.sql`)

**Implementation effort:** Low - mostly UI/dashboard work

---

### 2.6 Webhook Delivery Guarantees

**Premium webhook features:**

| Feature | Base | Premium |
|---------|------|---------|
| Webhook events | 100/day limit | Unlimited |
| Retry strategy | 3 retries, 1hr | 10 retries, 24hrs |
| Event signature | HMAC-SHA256 | HMAC-SHA256 + IP whitelist |
| SLA | None | 99.9% delivery |
| Price | Included | +$99/mo |

**Current infrastructure:**
- Webhook management: `/dashboard/webhooks`
- Config routes: `/api/webhooks-config`
- Stripe webhook handling: `/api/webhooks/stripe`

**Implementation effort:** Low - mostly infrastructure + monitoring

---

### 2.7 Certifications & Training

**Help customers master the platform:**

- **Official certification:** $299 per exam
- **Instructor-led training:** $2,000 per workshop (up to 20 people)
- **Video courses:** $99 - $499 per course
- **Documentation/books:** $49 per digital guide

**Current infrastructure:**
- Full API documentation exists
- `/api/health` and `/api/readiness` endpoints
- Example projects in `/examples`

**Implementation effort:** Medium - needs content creation

---

### 2.8 Data Residency & Compliance Regions

**Premium deployment options:**

- **EU-Only deployment:** +$499/mo (GDPR compliance)
- **Custom VPC deployment:** +$2,000/mo (FinTech/Healthcare)
- **Air-gapped deployment:** +$5,000/mo (Government/Defense)
- **Multi-region HA:** +$1,000/mo (99.99% uptime SLA)

**Current infrastructure:**
- Vercel deployment (US)
- Supabase (configurable regions)
- Custom region support possible

**Implementation effort:** Medium to High - requires infrastructure setup

---

## 3. Feature Monetization Roadmap

### Q3 2026 (Next 3 months)
- ✅ Solidify subscription tiers (Pro/Business/Enterprise)
- ✅ Activate overage pricing for metered usage
- 🟡 Launch first Skills Bundle (Finance Governance)
- 🟡 Add advanced reporting dashboard

### Q4 2026
- Premium support tiers ($2,000/mo)
- Agent execution as a service MVP
- Webhook delivery SLA guarantees
- Compliance audit service partnerships

### Q1 2027
- Policy marketplace launch
- ISO 42001 compliance package
- Video training courses
- Custom development services catalog

### Q2 2027+
- Advanced analytics/AI risk scoring
- Multi-region deployment options
- Industry-specific policy bundles
- Managed services (full outsourcing)

---

## 4. Revenue Projections

### Conservative Scenario (Year 1)
- 100 Pro tier ($99/mo each) = $118,800
- 20 Business tier ($299/mo) = $71,760
- 5 Enterprise tier ($799/mo) = $47,940
- **Total: $238,500**

### Growth Scenario (Year 1)
- 500 Pro = $594,000
- 100 Business = $358,800
- 20 Enterprise = $191,760
- Skills Bundle add-ons (20% attach rate) = $100,000
- **Total: $1,244,560**

### Enterprise Scenario (Year 1+)
- Subscription base = $1.2M
- Support services = $300K
- Compliance services = $150K
- Custom policies = $200K
- Managed services = $500K+
- **Total: $2.35M+**

---

## 5. Implementation Checklist

### Immediate (Ready to sell)
- [x] Subscription tier checkout
- [x] Skills bundles pricing
- [x] Stripe integration
- [ ] Activate overage pricing
- [ ] Email/SMS notifications for upgrades

### Short-term (1-2 weeks)
- [ ] Premium support package landing page
- [ ] API key rate limit documentation
- [ ] Enterprise feature comparison matrix
- [ ] Webhook event rate increase pricing

### Medium-term (1-2 months)
- [ ] Compliance audit service integration
- [ ] Advanced analytics dashboard
- [ ] Policy marketplace MVP
- [ ] Multi-region deployment pricing

### Long-term (3-6 months)
- [ ] Managed agents service
- [ ] Industry-specific bundles
- [ ] Training certification program
- [ ] Custom development services portal

---

## 6. Key Metrics to Track

**Dashboard integration with PostHog:**

- MRR (Monthly Recurring Revenue)
- Churn rate by tier
- Skills bundle attach rate
- Support ticket volume
- Overage usage trends
- Customer LTV by segment
- CAC (Customer Acquisition Cost)

**Recommended implementation:**
```bash
npm run ccvs:pipeline  # Evidence collection
# Monitor revenue metrics in PostHog dashboard
```

---

## 7. Pricing Optimization

### A/B Testing Opportunities
1. $99 vs $149 Pro tier
2. Monthly vs annual discount (15% vs 20%)
3. Skills bundle bundling (5% combo discount)
4. Free trial length impact

### Discount Strategy
- Non-profit: 50% discount
- Open-source projects: 25% discount
- Resellers: 30% margin
- Annual prepay: 20% discount

---

## Related Files

- **Billing checkout:** `app/api/billing/checkout/route.ts`
- **Dashboard:** `app/dashboard/billing/page.tsx`
- **Revenue API:** `app/api/revenue/[action]/route.ts`
- **Pricing pages:** `app/pricing/`
- **Usage tracking:** `lib/usage/quota.ts`
- **Skills bundles:** `app/api/billing/checkout/route.ts` (SKILLS_BUNDLE_CONFIG)

---

## Next Steps

1. **Review this guide** with product/business team
2. **Prioritize channels** by effort vs. revenue potential
3. **Create task list** for highest-priority implementation
4. **Set up metrics tracking** in PostHog
5. **Launch promotional campaign** for current tiers

---

**Status:** 📊 Live with 3 tiers, 5 bundles, Stripe integration  
**Last Updated:** 2026-06-29  
**Maintained by:** DSG Product Team
