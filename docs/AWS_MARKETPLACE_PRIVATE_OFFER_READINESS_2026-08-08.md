# DSG ONE — AWS Marketplace / Private Offer Readiness

**Assessment date:** 2026-08-08  
**Repository assessed:** `tdealer01-crypto/tdealer01-crypto-dsg-control-plane` (`main`)  
**Decision:** **NO-GO for a paid AWS Marketplace launch/private offer today.**  
**Reason:** DSG ONE has a real authenticated SaaS API, org entitlements, usage recording, and Stripe metering, but the repository does not currently implement the AWS Marketplace buyer-registration, entitlement, agreement-event, and AWS metering contracts required for a new SaaS listing.

This document separates verified repository evidence from external AWS requirements. Unknown seller-account, tax, banking, KYC, and legal-entity status is intentionally not marked PASS.

---

## 1. What already exists

| Area | Status | Repository evidence | Assessment |
|---|---|---|---|
| Authenticated SaaS API | PASS | `app/api/dsg/v1/gates/evaluate/route.ts`, `lib/dsg/auth/require-dsg-auth.ts` | Bearer API-key callers are resolved to an org; route applies org-scoped rate limiting. |
| API key issuance model | PASS (code) | `tests/unit/api/api-keys-route.test.ts` | API keys support `gates:evaluate` and `proofs:prove` scopes. Live seller/customer provisioning is not assessed here. |
| DSG entitlement/quota model | PASS (code) | `lib/dsg/gate-entitlement.ts` | Uses `dsg_gate_entitlements` and `dsg_gate_usage`; paid tiers already exist in the internal model. |
| Usage event recording | PASS (code) | `lib/dsg/gate-entitlement.ts` | Gate evaluations are inserted into usage storage and revenue events are recorded. |
| Stripe metering/outbox | PASS for Stripe path | `lib/billing/metered.ts` | Durable outbox + idempotent Stripe meter event delivery exists. This is not AWS Marketplace metering. |
| Deterministic gate/proof endpoints | PASS (code) | `/api/dsg/v1/gates/evaluate`, `/api/dsg/v1/proofs/prove` | Suitable product surface for a request-based SaaS dimension. |
| Existing AWS Marketplace integration | BLOCKER | Repository search for `ResolveCustomer`, `GetEntitlements`, `BatchMeterUsage`, Marketplace Entitlement/Metering SDK clients returned no implementation. | Required AWS Marketplace integration code is absent. |
| Existing AWS Marketplace webhook guide | REPLACE | `docs/AWS-MARKETPLACE-WEBHOOK-SETUP.md` | The guide describes a generic Seller Central webhook/lead payload. That is not the current SaaS fulfillment contract required by AWS Marketplace. |

### Repository truth issue found

`lib/dsg/gate-entitlement.ts` still contains comments describing an earlier “Phase 1 / in-memory” state, while the implementation below those comments already reads/writes Supabase and can call Stripe metering. The code is more advanced than the comments. Fix the comments before using the file as due-diligence evidence.

---

## 2. Current AWS requirements that matter to DSG ONE

Official AWS Marketplace documentation reviewed on 2026-08-08:

- Seller eligibility: https://docs.aws.amazon.com/marketplace/latest/userguide/seller-eligibility.html
- SaaS product guidelines: https://docs.aws.amazon.com/marketplace/latest/userguide/saas-guidelines.html
- Creating SaaS products: https://docs.aws.amazon.com/marketplace/latest/userguide/saas-create-product.html
- SaaS customer onboarding: https://docs.aws.amazon.com/marketplace/latest/userguide/saas-product-customer-setup.html
- SaaS contract integration: https://docs.aws.amazon.com/marketplace/latest/userguide/saas-integrate-contract.html
- SaaS contract + consumption integration: https://docs.aws.amazon.com/marketplace/latest/userguide/saas-integrate-contract-with-pay.html
- Entitlement checks: https://docs.aws.amazon.com/marketplace/latest/userguide/checking-entitlements.html
- Private offers: https://docs.aws.amazon.com/marketplace/latest/userguide/creating-private-offer.html

### Mandatory fulfillment path for a new SaaS product

For a contract or contract-with-consumption product, AWS currently requires a flow equivalent to:

```text
AWS Marketplace purchase
  -> HTTP POST to DSG registration URL with x-amzn-marketplace-token
  -> DSG calls ResolveCustomer
  -> DSG persists CustomerAWSAccountId / CustomerIdentifier / LicenseArn / ProductCode
  -> DSG calls GetEntitlements
  -> DSG links AWS agreement/customer to a DSG org
  -> DSG grants only entitled access
  -> entitlement/agreement changes arrive through AWS event infrastructure
  -> DSG re-checks entitlement and updates/revokes access
  -> if consumption pricing is enabled, DSG meters usage through AWS Marketplace Metering
```

AWS states that new SaaS products from **2026-06-01** must support its updated integration requirements for concurrent agreements. Any new DSG implementation must be designed against the current agreement/customer identifiers rather than an older single-agreement assumption.

---

## 3. Private-offer readiness

### Current verdict: BLOCKED

A private offer is not the first step. AWS requires the seller to have at least one active public listing before issuing private offers. Therefore the sequence is:

```text
seller registration
-> limited SaaS product
-> AWS integration + testing
-> public active listing
-> private offer capability
```

A “private-offer only, no public product” strategy does not meet the current documented prerequisite.

### Seller-account prerequisites — UNKNOWN, must be verified outside the repository

The codebase cannot prove:

- paid-seller registration status
- tax interview status
- bank/disbursement verification
- KYC status where applicable
- legal entity/residency jurisdiction eligibility
- active public listing status

AWS's current paid-seller eligibility list is jurisdiction-specific. If the intended seller/legal entity is not in an eligible jurisdiction, that is a business blocker independent of code. Do not mark this PASS until verified in AWS Marketplace Management Portal.

---

## 4. Billing model decision

### Recommended model for DSG ONE: SaaS Contract with consumption

Why it fits the current DSG shape:

- DSG already has subscription tiers.
- Gate usage is already counted per evaluation.
- Existing Stripe code demonstrates an internal usage-event/outbox pattern that can be adapted to a second billing provider.
- Private offers can negotiate contract terms while retaining usage-based dimensions for overage.

This is a recommendation, not a completed AWS configuration.

### Critical rule: Stripe and AWS Marketplace billing must be mutually exclusive per customer agreement

AWS SaaS guidelines state that Marketplace SaaS customers must be billed entirely through listed AWS Marketplace dimensions and that the SaaS seller cannot collect customer payment information for that SaaS purchase.

Therefore the data model needs an explicit billing source, for example:

```text
billing_provider = stripe | aws_marketplace
```

For `aws_marketplace` customers:

- do not create/charge a Stripe subscription for the Marketplace product
- do not send DSG usage to Stripe Meter Events
- validate access using AWS entitlement/agreement state
- report applicable consumption to AWS Marketplace Metering

This prevents double billing and keeps the entitlement source deterministic.

---

## 5. Required implementation gaps

### P0 — launch blockers

1. **Marketplace registration/fulfillment endpoint**
   - Accept AWS POST containing `x-amzn-marketplace-token`.
   - Call `ResolveCustomer` server-side.
   - Never trust a buyer-supplied customer/account identifier without token resolution.
   - Link the resolved AWS buyer/agreement to exactly one DSG org using an idempotent transaction.

2. **AWS entitlement adapter**
   - Call `GetEntitlements` (or the current agreement-aware equivalent required for the selected listing model).
   - Persist the AWS entitlement/agreement state.
   - Enforce entitlement before DSG paid features are granted.
   - Fail closed when entitlement cannot be verified.

3. **Concurrent-agreement-safe data model**
   - Do not key Marketplace state only by `org_id` or one customer identifier.
   - Store product code + AWS account/customer identity + license/agreement identity + dimension + status.
   - Add unique constraints for idempotent onboarding/event processing.

4. **AWS subscription/agreement event handling**
   - Implement the current EventBridge/SQS-based change path for new listings.
   - Re-check entitlement on license/agreement update.
   - Revoke or downgrade DSG access deterministically when entitlement ends.
   - Implement idempotent event processing and audit evidence.

5. **AWS Marketplace metering adapter** — required if using consumption
   - Create a provider-neutral usage outbox or a dedicated AWS outbox.
   - Send the AWS-required metering record instead of a Stripe meter event for AWS customers.
   - Preserve idempotency and retry evidence.
   - Handle final metering windows on cancellation where required by the selected model.

6. **Billing-provider isolation**
   - Make Stripe and AWS Marketplace mutually exclusive for the same purchased product/agreement.
   - Add tests proving an AWS Marketplace org can never be billed through the Stripe metering path.

### P1 — Marketplace review requirements

7. **AWS registration landing page**
   - Buyer email input.
   - New account creation and existing-account login/link path.
   - Subscription/contract status visible to the customer.
   - Support contact path.
   - Clear first-use next step.

8. **Marketplace product assets**
   - logo in the required public asset location
   - EULA PDF URL
   - registration URL
   - support URLs/emails
   - product metadata
   - architecture diagram for AWS review

9. **Security/data-handling review**
   - customer data collection/storage/usage/sharing/retention/backup documentation
   - encryption in transit/at rest
   - tenant isolation
   - security incident reporting process
   - security-relevant audit logging retained/protected as required by AWS guidelines

10. **AWS test evidence**
   - successful buyer onboarding
   - entitlement-present path
   - no-entitlement path
   - unsubscribe/cancel/update path
   - concurrent agreement path
   - metering success + retry/idempotency path if consumption is enabled

---

## 6. Existing document that should not be used as proof

`docs/AWS-MARKETPLACE-WEBHOOK-SETUP.md` should be treated as **historical / not sufficient for SaaS fulfillment**.

Why:

- It describes a generic lead webhook and guessed payload fields.
- Current AWS SaaS onboarding is based on a Marketplace registration POST token followed by `ResolveCustomer`.
- Contract access requires entitlement verification.
- New listing event handling is moving to/currently documented with Amazon EventBridge rather than a custom Seller Central webhook flow.

Do not submit that document to AWS as evidence that DSG ONE is Marketplace-integrated.

---

## 7. Suggested implementation architecture

Keep the existing Stripe path and add an AWS provider boundary instead of rewriting billing globally.

```text
DSG Gate Evaluation
       |
       v
canonical usage event
       |
       v
billing provider resolver
  |                 |
  | stripe          | aws_marketplace
  v                 v
Stripe outbox    AWS MP outbox
Stripe Meter     AWS Metering API

Access control:
Stripe customer -> DSG subscription/entitlement
AWS customer    -> AWS agreement/entitlement adapter
```

Suggested modules:

```text
lib/billing/provider.ts
lib/billing/aws-marketplace/client.ts
lib/billing/aws-marketplace/entitlement.ts
lib/billing/aws-marketplace/metering.ts
lib/billing/aws-marketplace/events.ts
app/api/aws-marketplace/register/route.ts
app/api/aws-marketplace/events/route.ts   # only if the selected delivery architecture terminates events here
```

Do not reuse `stripe_customer_id` as an AWS buyer identifier.

---

## 8. Minimum acceptance tests before GO

A Marketplace implementation is not ready until automated/integration evidence proves all of these:

```text
[ ] registration token is resolved by AWS, not trusted from request fields
[ ] resolved AWS identity is linked idempotently to a DSG org
[ ] entitled agreement grants the correct DSG tier/dimension
[ ] missing/expired entitlement denies paid access
[ ] duplicate registration/event delivery does not duplicate orgs or billing
[ ] concurrent agreements for one AWS account do not overwrite each other
[ ] AWS customer never enters Stripe charge/meter path
[ ] Stripe customer never enters AWS Marketplace meter path
[ ] AWS metering retry is idempotent
[ ] cancellation/update revokes or changes access correctly
[ ] customer can see Marketplace subscription/usage status
[ ] audit evidence identifies agreement, product, dimension, event, decision, and result
```

---

## 9. Go/No-Go table

| Gate | Current status |
|---|---|
| Production DSG API surface | **PASS in repository** |
| API-key integration surface | **PASS in repository** |
| Internal entitlement/usage model | **PASS in repository** |
| Stripe billing path | **PASS in repository; not applicable to AWS buyers** |
| AWS ResolveCustomer | **BLOCKER — not found** |
| AWS entitlement integration | **BLOCKER — not found** |
| Concurrent Agreements support | **BLOCKER — not found** |
| AWS agreement/event processing | **BLOCKER — not found** |
| AWS metering | **BLOCKER if consumption model — not found** |
| AWS registration landing flow | **BLOCKER — not verified/implemented as Marketplace fulfillment** |
| Seller registration/tax/bank/KYC | **UNKNOWN — external verification required** |
| Active public AWS Marketplace listing | **UNKNOWN / required before private offers** |
| Private-offer readiness | **NO-GO** |

---

## 10. User-facing next milestone

The shortest useful path is not “configure a private offer” yet. It is:

1. Verify seller eligibility/registration in AWS Marketplace Management Portal.
2. Create a **limited** SaaS product and obtain its Product Code/event configuration.
3. Implement registration + entitlement + agreement-event handling.
4. Add AWS Marketplace metering only if selecting contract-with-consumption.
5. Run AWS integration tests with the limited listing.
6. Request public visibility.
7. After the public listing is active, use private offers for negotiated enterprise deals.

That sequence reduces dead-end work and creates testable evidence at each stage.
