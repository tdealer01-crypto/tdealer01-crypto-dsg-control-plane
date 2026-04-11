# Finance Governance Marketplace Launch Checklist

Updated: 2026-04-11
Owner: Product / GTM / Platform / Support
Status: Launch checklist

---

## Purpose

This checklist defines the minimum conditions required to present DSG Finance Governance Control Plane as a real market-facing product instead of an internal foundation or prototype.

---

## 1. Product scope

- [ ] Beachhead use case is fixed to one finance workflow
- [ ] Product category name is stable
- [ ] One-line value proposition is stable
- [ ] Buyer pain points are reflected in copy
- [ ] MVP boundary is documented
- [ ] Non-goals are documented

---

## 2. Product experience

- [ ] Landing page explains the product in under 30 seconds
- [ ] Pricing page matches actual packaging
- [ ] Signup / login flow works for new and existing orgs
- [ ] Onboarding flow gets a new org to first workflow setup
- [ ] Approval queue exists
- [ ] Case detail page exists
- [ ] Audit view exists
- [ ] Export flow exists
- [ ] Admin console exists

---

## 3. UX state completeness

- [ ] Loading states are implemented
- [ ] Empty states are implemented
- [ ] Error states are implemented
- [ ] Permission-denied states are implemented
- [ ] Billing-blocked states are implemented
- [ ] Retry states for transient failures are implemented
- [ ] Suspended org states are implemented

---

## 4. Governance controls

- [ ] Maker-checker is enforced
- [ ] Self-approval is blocked
- [ ] Role-based access is enforced
- [ ] Policy version is visible on governed cases
- [ ] Override requires explicit reason
- [ ] Duplicate or replayed submissions are handled
- [ ] Cross-org access is blocked

---

## 5. Auditability

- [ ] Every approval action is logged
- [ ] Actor, role, timestamp, reason, and state transition are captured
- [ ] Export actions are logged
- [ ] Evidence bundle generation works
- [ ] Evidence bundle includes policy snapshot and approval chain
- [ ] Audit view supports filtering and export

---

## 6. Billing and packaging

- [ ] Starter / Growth / Enterprise plans are finalized
- [ ] Checkout flow works
- [ ] Customer Portal path exists
- [ ] Trial behavior is defined
- [ ] Enterprise pilot path is defined
- [ ] Billing failure state is reflected in product UX
- [ ] Plan entitlements are mapped to org/product access

---

## 7. Trust surface

- [ ] Terms of Service page exists
- [ ] Privacy Policy page exists
- [ ] Security Overview page exists
- [ ] Support / contact page exists
- [ ] Enterprise trust summary exists
- [ ] Data retention language exists

---

## 8. Enterprise readiness

- [ ] Org workspace isolation is confirmed
- [ ] SSO path is documented or implemented
- [ ] SCIM path is documented or implemented
- [ ] Group-to-role mapping strategy is defined
- [ ] Audit export authorization is enforced
- [ ] Pilot support process exists

---

## 9. Release readiness

- [ ] Preview deployment validation is part of the workflow
- [ ] Production deploy checklist exists
- [ ] Billing webhooks are monitored
- [ ] Auth failures are monitored
- [ ] Approval workflow failures are monitored
- [ ] Export failures are monitored

---

## 10. Go-to-market readiness

- [ ] Sales can explain the buyer, pain, and value clearly
- [ ] Product screenshots reflect real workflows
- [ ] Demo script uses the beachhead finance workflow
- [ ] Pilot success criteria are defined
- [ ] A launch truth statement is documented

---

## Final release gate

Do not call the product marketplace-ready until:

- one finance workflow works end-to-end,
- billing is operational,
- audit export works,
- trust pages exist,
- and the app behaves like a real enterprise product under both happy-path and failure-path conditions.
