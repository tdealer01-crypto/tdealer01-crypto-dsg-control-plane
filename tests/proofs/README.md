# DSG Proof Test Lanes

This directory contains TypeScript proof-oriented tests for live product code.

## TypeScript lane

Files such as `billing-invariants.test.ts` and `quota-invariants.test.ts` run through Vitest and may use `z3-solver` WASM to verify behavioral invariants against the current TypeScript implementation.

Use this lane to catch implementation drift in the billing and entitlement code that ships with the app.

## Python lane — canonical mathematical proof path

The canonical design-time proof lane is:

```bash
npm run proof:install
npm run proof:revenue
```

That path runs the Python Z3 proof scripts under `tools/proofs/`, including `tools/proofs/prove_revenue_ready.py`.

## Claim boundary

Passing these proof tests does not mean the deployed SaaS is fully formally verified. It means the selected revenue and policy invariants checked by these scripts hold for the encoded model or implementation surface.

Do not claim production-ready billing until the P0 revenue-hardening checks pass in CI and Stripe test-mode delivery confirms the outbox behavior.
