# Finance Governance Billing and Deployment Playbook

Updated: 2026-04-11
Owner: Product / Platform / Billing
Status: Execution playbook

---

## Scope

This playbook defines how DSG Finance Governance Control Plane should be deployed and monetized as a real enterprise SaaS product.

It is written against the current project reality:
- Vercel project exists for `tdealer01-crypto-dsg-control-plane`
- Stripe account is connected under `dsg.pics`

---

## 1. Deployment baseline

### Hosting model

Use the existing Vercel project as the primary web application deployment target.

Recommended environment split:
- development
- preview
- production

This matches Vercel's production / preview / development environment model and allows safe testing before promotion to production.

### Environment variable rule

Keep environment variables separated by target environment.
At minimum:
- production secrets only in production
- preview-safe values in preview
- local dev values in development

### Release rule

Every material change to pricing, auth, approval routing, export, or billing must go through:
1. preview deployment
2. route testing
3. log inspection
4. promotion to production only after validation

---

## 2. Billing baseline

### Stripe products and packaging

Use Stripe Billing as the billing system of record for plans, subscriptions, trials, invoices, and customer self-service management.

### Recommended packaging

#### Starter
- self-serve entry
- limited workflow volume
- basic audit history
- CSV export
- no SSO

#### Growth
- multi-step approvals
- exception workflows
- higher volume
- reporting
- API access

#### Enterprise
- SSO / SCIM
- advanced SoD controls
- evidence bundle export
- custom retention
- pilot and rollout support

### Pricing model rule

Price against governance value and approval scope, not generic AI usage language.

---

## 3. Stripe integration choices

### Recommended subscription flow

Use Stripe Checkout for initial subscription signup and use the Customer Portal for self-service subscription management.

Why:
- Stripe recommends Checkout for hosted subscription signup flows
- Customer Portal reduces custom billing UI work
- Webhooks provide the lifecycle signals needed to provision and de-provision product access

### Minimum Stripe lifecycle events to handle

- `checkout.session.completed`
- `invoice.paid`
- `invoice.payment_failed`

### Additional lifecycle events to consider

- subscription updates
- cancellations
- pauses / resumes for enterprise support scenarios

### Trial strategy

Use trial periods for Starter/Growth self-serve and a longer pilot motion for Enterprise.
Stripe supports trial periods in subscription checkout flows.

### Customer management

Use Stripe Customer objects as billing identities, but keep org and access entitlements controlled by the DSG backend.

### Governance rule

Billing status must never be the only access-control source.
Billing state must be mapped into org and seat entitlement logic inside the control-plane backend.

---

## 4. Provisioning rules

### On successful checkout

When Stripe signals checkout completion:
- create or associate the billing customer with the org
- store Stripe customer and subscription identifiers
- provision the correct plan and feature gates
- log provisioning event

### On invoice paid

- continue service for the billing period
- refresh plan state if needed
- confirm entitlements remain active

### On invoice payment failed

- mark org as billing-risk state
- notify billing admin
- direct the customer to the Stripe Customer Portal
- do not silently continue unrestricted premium access indefinitely

### On cancellation or pause

- record state change in product billing state
- preserve audit history
- adjust entitlements according to plan rules

---

## 5. Customer portal policy

Enable Stripe Customer Portal for:
- payment method update
- invoice visibility
- subscription management where appropriate

Keep enterprise exceptions in mind:
- some enterprise plans should route to sales/support instead of allowing every downgrade action self-serve

---

## 6. Deployment process

### Preview validation checklist

Before promotion to production, validate:
- login / signup
- onboarding
- pricing page
- checkout initiation
- post-checkout success/cancel URLs
- billing webhook processing
- approval workflow routes
- audit export route visibility

### Production promotion rule

Use preview deployments for validation and only promote after:
- smoke checks pass
- logs look clean
- billing and auth flows are confirmed
- no critical UI regressions in pricing / onboarding / approval queue

---

## 7. Monitoring and logs

### Must monitor

- auth failures
- billing checkout failures
- webhook failures
- approval route failures
- export failures
- cross-org authorization failures

### Minimum observability signals

- deployment success/failure
- checkout success/error
- webhook processing latency and retry behavior
- export job status
- org billing state transitions

---

## 8. Security and operational rules

- Never expose secret billing keys to the client
- Keep webhook signing secret only on the server
- Keep billing identifiers org-scoped in persistence
- Audit every provisioning and de-provisioning action
- Never let a preview environment mutate production billing unintentionally
- Ensure success and cancel URLs map to the correct deployment target

---

## 9. Enterprise launch rule

The product is not ready for paid rollout until all of the following are true:
- pricing page matches actual packaging
- checkout can create subscriptions successfully
- portal access works for billing admins
- webhook processing updates org billing state reliably
- preview-to-production deploy process is stable
- support knows how to handle failed payments, paused subscriptions, and enterprise plan changes

---

## 10. Immediate next implementation tasks

1. Align pricing copy to finance governance plans
2. Verify `/api/billing/checkout` plan mapping against intended packaging
3. Document webhook-to-entitlement mapping
4. Add billing risk and suspended state UX
5. Add portal entry point for billing admins
6. Add deployment smoke checklist to release routine
