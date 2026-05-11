# Enterprise Enforcement Contract

This document defines the expected fail-closed contract for DSG authorization and entitlement decisions.

## Boundary

- This is a contract, not proof that RBAC or billing enforcement is complete.
- No Stripe, Supabase, marketplace entitlement, or production billing integration is added here.
- Marketplace readiness remains REVIEW/BLOCKED until runtime enforcement tests and owner approvals exist.

## Authorization

`decideDsgAuthorization` in `lib/dsg/security/authorization-contract.ts` fails closed when subject, org, org match, or policy evidence is missing.

Required before PASS:

- Server-side use on critical read/write routes.
- Allowed and denied role tests.
- Cross-org denial tests.
- Audit event proof for privileged actions.

## Entitlement

`decideDsgEntitlement` in `lib/dsg/billing/entitlement-contract.ts` fails closed when plan, policy, feature access, quota, or billing evidence is missing.

Required before PASS:

- Plan/seat/quota source of truth.
- Feature denial tests.
- Quota exceeded tests.
- Upgrade path proof.
- Marketplace or billing provider evidence.
