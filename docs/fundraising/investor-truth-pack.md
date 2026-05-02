# DSG ONE Investor Truth Pack

Last reviewed: 2026-05-02

## Product identity

```text
DSG ONE — AI Runtime Control Plane
```

## Investor-safe positioning

DSG ONE is a live AI runtime control plane that converts policy, approval, deterministic proof, and audit evidence into enforceable runtime decisions for high-risk AI and enterprise actions.

## Current production evidence

```text
GET  /api/dsg/v1/policies/manifest  HTTP/2 200
POST /api/dsg/v1/gates/evaluate     ok=true, gateStatus=PASS, proofStatus=PASS
```

Observed proof fields:

```text
proofHash
inputHash
constraintSetHash
policyVersion
solver metadata
structured constraints
replayProtection.nonce
replayProtection.idempotencyKey
replayProtection.requestHash
```

## Market entry segments

```text
Enterprise AI governance
AI compliance consulting
DevSecOps and CI/CD governance
Financial workflow governance
```

## What can be claimed

```text
live deterministic proof/gate scaffold
policy manifest
proofHash / inputHash / constraintSetHash
replay-protection evidence
GitHub Marketplace CI/CD deployment gate
compliance-enabling governance workflow
```

## What must not be claimed yet

```text
external Z3 solver invoked in production
enterprise-ready proof system
third-party certified evidence system
JWT/JWKS auth complete
WORM evidence storage complete
real Ed25519/ECDSA signing complete
guaranteed compliance
```

## Next hardening milestones

```text
JWT/JWKS auth guard for deterministic APIs
append-only / WORM evidence storage
real Ed25519/ECDSA evidence signing
external solver adapter with solver version proof
customer pilot case studies
independent security or compliance review
```
