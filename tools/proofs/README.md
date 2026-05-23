# DSG Revenue-Ready Formal Proof Gate

This folder contains a lightweight Z3 proof gate for the revenue-ready release path.

The proof does not replace unit, integration, E2E, or live database tests. It proves that forbidden product states are unsatisfiable before runtime tests verify the concrete implementation.

## Install

```bash
python -m pip install -r tools/proofs/requirements.txt
```

## Run

```bash
npm run proof:revenue
```

or directly:

```bash
python tools/proofs/prove_revenue_ready.py
```

## Contract coverage

The proof gate currently covers:

- execution requires a user, organization, active credential, available quota, and audit evidence
- over-quota states must block execution and expose an upgrade path
- verified paid checkout must create entitlement
- paid entitlement cannot remain on the free plan
- high/critical governed-agent risk cannot be allowed
- side effects require allow decision and audit evidence
- blocked/reviewed decisions cannot create external side effects
- every governed-agent path must return a user-visible result

## Release rule

A release is `NO-GO` if this proof runner fails, even if regular tests pass.
