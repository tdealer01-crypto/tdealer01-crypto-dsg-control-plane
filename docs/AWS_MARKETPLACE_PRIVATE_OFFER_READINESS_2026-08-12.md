# DSG ONE — AWS Marketplace / Private Offer Readiness

**Assessment date:** 2026-08-12  
**Repository assessed:** `tdealer01-crypto/tdealer01-crypto-dsg-control-plane` (`main`)  
**Decision:** **NO-GO for paid AWS Marketplace launch/private offer today.**

This document separates repository evidence from AWS-side prerequisites. It does not mark seller registration, tax, banking, KYC, legal-entity eligibility, listing status, or live AWS integration as PASS unless directly verified.

## 1. Current repository evidence

| Area | Status | Evidence / boundary |
|---|---|---|
| Authenticated DSG gate API | PASS (code) | `POST /api/dsg/v1/gates/evaluate` uses `requireDsgAuth`, org-scoped rate limiting, entitlement checks, deterministic evaluation, audit logging, and usage recording. |
| Authenticated DSG proof API | PASS (code) | `POST /api/dsg/v1/proofs/prove` uses `requireDsgAuth`, entitlement checks, replay-protection inputs, deterministic proof generation, and usage recording. |
| Internal entitlement/usage model | PASS (code) | DSG has an internal entitlement and usage path. This is not AWS Marketplace entitlement. |
| Stripe billing path | PASS as a separate provider path | Existing Stripe logic must not be treated as AWS Marketplace fulfillment. |
| AWS `ResolveCustomer` implementation | BLOCKER | No current repository implementation was found in the 2026-08-12 code search. |
| AWS `GetEntitlements` integration | BLOCKER | No current repository implementation was found in the 2026-08-12 code search. |
| AWS Marketplace metering integration | BLOCKER for consumption pricing | No current `BatchMeterUsage` / equivalent Marketplace metering implementation was found in the 2026-08-12 code search. |
| Concurrent-agreement-safe Marketplace model | BLOCKER | No verified implementation currently establishes agreement/license-aware AWS buyer state. |

## 2. Current AWS requirements that matter

Official AWS Marketplace documentation checked on 2026-08-12 states:

- New SaaS products must support the updated Concurrent Agreements integration requirements starting June 1, 2026.
- SaaS onboarding uses a seller-managed registration landing page that receives `x-amzn-marketplace-token`, then resolves the customer through AWS Marketplace rather than trusting buyer-supplied identity fields.
- SaaS contract products use AWS Marketplace Entitlement Service (`GetEntitlements`) to verify purchased capacity.
- Sellers must have at least one active public listing before they are eligible to issue private offers.

Reference pages:

- https://docs.aws.amazon.com/marketplace/latest/userguide/saas-product-customer-setup.html
- https://docs.aws.amazon.com/marketplace/latest/userguide/saas-integrate-contract.html
- https://docs.aws.amazon.com/marketplace/latest/userguide/checking-entitlements.html
- https://docs.aws.amazon.com/marketplace/latest/userguide/creating-private-offer.html

## 3. Required DSG architecture

Do not merge AWS buyers into the Stripe identity or metering path. Add an explicit provider boundary:

```text
DSG canonical entitlement / usage decision
                 |
                 v
          billing_provider
          /              \
      stripe         aws_marketplace
        |                 |
        v                 v
 Stripe outbox      AWS MP adapter
 Stripe Meter       entitlement / metering
```

Recommended identity boundary:

```text
billing_provider = stripe | aws_marketplace
```

For `aws_marketplace` customers:

- do not create or charge a Stripe subscription for the Marketplace purchase;
- do not send Marketplace usage into Stripe Meter Events;
- resolve and persist AWS buyer/product/agreement identity idempotently;
- verify entitlement before granting paid DSG access;
- fail closed if entitlement cannot be verified;
- send consumption usage only through the AWS Marketplace metering path when the selected listing model requires it.

## 4. P0 implementation blockers

1. **Marketplace registration endpoint**
   - accept the AWS registration token;
   - call `ResolveCustomer` server-side;
   - never trust buyer-supplied AWS account/customer identifiers without resolution;
   - link resolved AWS identity to exactly one DSG workspace/org idempotently.

2. **AWS entitlement adapter**
   - call `GetEntitlements` for contract entitlement state;
   - persist the relevant product, account/customer, license/agreement, dimension, status, and expiry data;
   - deny paid access when entitlement is absent, expired, or unverifiable.

3. **Concurrent-agreement-safe data model**
   - do not key Marketplace state only by `org_id`;
   - preserve AWS product and agreement/license identity;
   - add unique constraints for idempotent registration and event processing.

4. **Agreement / entitlement change processing**
   - ingest the current AWS event mechanism selected for the listing;
   - re-check entitlement on changes;
   - deterministically downgrade or revoke access when entitlement ends;
   - retain audit evidence for every transition.

5. **Marketplace metering adapter** — if using consumption
   - use a provider-neutral or AWS-specific durable outbox;
   - preserve idempotency/retry evidence;
   - never double-send the same DSG usage to Stripe and AWS Marketplace.

6. **Provider-isolation tests**
   - prove an AWS Marketplace org cannot enter the Stripe billing path;
   - prove a Stripe org cannot enter the AWS Marketplace metering path.

## 5. Minimum GO evidence

```text
[ ] registration token resolved by AWS
[ ] resolved AWS identity linked idempotently to one DSG org
[ ] entitled agreement grants the expected DSG entitlement
[ ] missing/expired entitlement denies paid access
[ ] duplicate registration/event delivery is idempotent
[ ] concurrent agreements do not overwrite each other
[ ] AWS Marketplace customer never enters Stripe charge/meter path
[ ] Stripe customer never enters AWS Marketplace meter path
[ ] AWS metering retry is idempotent when consumption is enabled
[ ] cancellation/update changes DSG access deterministically
[ ] customer can see Marketplace subscription/entitlement status
[ ] audit evidence identifies product/agreement/event/decision/result
[ ] seller registration/tax/bank/KYC/legal-entity state verified outside the repo
[ ] at least one active public listing exists before private-offer GO
```

## 6. Current conclusion

The shortest valid path is:

```text
verify seller eligibility/account
→ create limited SaaS product
→ implement registration + entitlement + agreement-safe state
→ add AWS metering only if the pricing model needs consumption
→ run AWS integration tests
→ obtain active public listing
→ enable private offers
```

Until those items are evidenced, the correct status remains **NO-GO**, not “Marketplace integrated” or “private-offer ready.”
