# DSG Governance Gate — Stripe Marketplace Listing

## App Name
DSG Governance Gate

## Short Description (200 chars)
Real-time governance and compliance decisions directly on your Stripe payment details. Policy evaluation, audit trails, and safe failure modes for enterprise-grade risk control.

## Long Description
DSG Governance Gate brings automated risk governance and compliance infrastructure directly into your Stripe dashboard. Every payment, payout, and refund is evaluated against your organization's policies in real-time, providing ALLOW, BLOCK, or REVIEW decisions with full audit trail visibility.

The app integrates the DSG (Deterministic Service Gateway) control plane with your Stripe account, evaluating policy decisions on charge events, payout events, and refund events. Each decision includes policy version tracking, proof references, and precise verification timestamps for regulatory compliance.

Key capabilities include configurable policy thresholds (amount limits, time windows, customer allowlists), fail-safe modes that default to REVIEW when the governance service is unreachable, and a complete audit trail that links every Stripe event to its governance decision for compliance reviews and regulatory reporting.

The app is designed for fintech companies, payment platforms, and enterprises that need deterministic, auditable governance over their Stripe operations. It supports EU AI Act, ISO 42001, and NIST AI RMF compliance frameworks, making it suitable for organizations operating under strict regulatory requirements.

## Value Proposition
Transform your Stripe payments from passive transactions into actively governed, auditable operations. DSG Governance Gate gives you deterministic policy enforcement with mathematical proof — not probabilistic risk scoring. Every decision is reproducible, every audit trail is complete, and every failure defaults to safety.

## Key Features
1. **Real-Time Policy Evaluation** — View ALLOW, BLOCK, or REVIEW decisions directly on payment details, with policy version and proof reference tracking.
2. **Governance Audit Trail** — Every policy decision is timestamped and versioned, providing a complete audit trail for compliance reviews and regulatory reporting.
3. **Safe Failure Mode** — If the governance service is unreachable, the app defaults to REVIEW status — never auto-allowing transactions during service interruptions.
4. **Configurable Policy Thresholds** — Set amount limits, time windows, and customer allowlists per Stripe account.
5. **Multi-Framework Compliance** — Supports EU AI Act, ISO 42001, and NIST AI RMF compliance framework reporting.

## Use Cases
1. **Fintech Payment Governance** — Enforce amount thresholds and time-window restrictions on charges, payouts, and refunds for regulatory compliance.
2. **Enterprise Risk Management** — Maintain deterministic audit trails linking every Stripe event to its governance decision for internal and external audits.
3. **Regulated Industries** — Organizations operating under EU AI Act, ISO 42001, or NIST AI RMF requirements can demonstrate reproducible, proof-backed governance decisions.

## Pricing
- **Free Tier**: Up to 1,000 governed events per month, basic policy configuration, standard audit trail.
- **Enterprise**: Unlimited governed events, custom policy engine, dedicated support, SLA guarantees. Contact support@dsg.pics for pricing.

## Support
- **Email**: support@dsg.pics
- **Documentation**: https://dsg.pics/docs/stripe-app
- **Website**: https://dsg.pics

## Privacy Policy
URL: https://dsg.pics/privacy (placeholder — publish before submission)

## Terms of Service
URL: https://dsg.pics/terms (placeholder — publish before submission)

## Stripe App Manifest Verification

### Required Fields Check
| Field | Status | Value |
|-------|--------|-------|
| id | OK | pics.dsg.governance |
| name | OK | DSG Governance Gate |
| version | OK | 2.6.1 |
| icon | OK | ./icon.png |
| description | OK | Present (316 chars) |
| shortDescription | OK | Present (62 chars) |
| documentationUrl | OK | https://dsg.pics/docs/stripe-app |
| websiteUrl | OK | https://dsg.pics |
| supportEmail | OK | support@dsg.pics |
| ui_extension.views | WARNING | Empty array — no views registered |
| permissions | OK | 3 permissions (account_information, charges_refunds, external_access) |
| features | OK | 3 features with imageUrls |
| distribution_type | OK | public |
| stripe_api_access_type | OK | oauth |
| sandbox_install_compatible | OK | true |

### Issues to Fix Before Submission
1. **ui_extension.views is empty** — Must register at least one view (e.g., `payment.detail` or `customer.detail`) for the app to display in the Stripe Dashboard.
2. **Privacy Policy URL** — Must be a live, accessible URL before Stripe review.
3. **Terms of Service URL** — Must be a live, accessible URL before Stripe review.
4. **Feature imageUrls** — CDN URLs (cdn.dsg.pics) must be live and return valid PNG images.
