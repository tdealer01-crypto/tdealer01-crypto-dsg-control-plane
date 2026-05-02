# DSG Automation Flow Release Note

## Purpose

This note records the DSG-native automation flow added for the public product surface and controller API.

The intended flow is:

```text
Agent action -> policy -> evidence -> approval -> proof -> audit -> execute/block
```

## What is implemented

- Public product page: `/automation`
- Public navigation link: `Automation -> /automation`
- Controller API route: `POST /api/dsg/v1/controller/evaluate`
- Controller library: `lib/dsg/controller/*`
- Unit tests: `tests/unit/dsg/automation-controller.test.ts`

## Claim boundary

This release note does not claim:

- copied Vanta content
- Vanta testimonials, customer logos, or metrics
- certification or guaranteed compliance
- external Z3 production invocation
- production-ready deployment completion
- WORM storage completion
- cryptographic-signature completion

## Safety rules

- Unsupported or blocked evidence must not become a passing consumer-facing decision.
- High-risk actions that require approval must not pass without approval context.
- The controller must reuse the repository deterministic gate scaffold rather than fabricate proof.
- Deployment truth must come from Vercel Ready state plus runbook-aligned smoke checks, not from committed source alone.

## Deployment note

If production returns 404 for `/automation`, verify whether Vercel deployed the latest `main` commit. A canceled deployment caused by unverified commits means the route exists in GitHub but is not live in production.
