# CCVS Evidence Severity Levels

Version: 1.0.0  
Date: 2026-05-28

## Overview

Every CCVS evidence envelope carries a `severity_level` field (1–5).  
Compliance claims for regulated contexts require minimum L4.

| Level | Label | Evidence Type(s) | Description | Minimum for |
|-------|-------|-----------------|-------------|-------------|
| L1 | Basic unit evidence | `unit` | Individual function / module test results with coverage metrics | Internal quality gates |
| L2 | Integration evidence | `integration` | API, workflow, cross-module test results | Feature readiness |
| L3 | Adversarial evidence | `adversarial`, `replay`, `sbom` | Tamper tests, replay rejection, SBOM integrity | Security review |
| L4 | Cryptographic evidence | `mutation`, `oversight` | Mutation testing score ≥90%, Z3 formal proofs | Compliance claims |
| L5 | Independently reproducible | `provenance` | SLSA provenance, reproducible build, Sigstore bundle | Regulatory assertion |

## Claim Eligibility Rules

A claim is **defensible** only when:

1. Every mapped control has a `pass` evidence envelope at L ≥ `min_severity_level`.
2. Every `evidence_hash` starts with `sha256:` (no placeholder values).
3. The `mutation_required` controls have `mutation_score ≥ 90` in their metrics.
4. No envelope has `tests_failed > 0`.
5. The compliance matrix `claim_pass_eligible` is `true`.

## Mutation Testing Requirements

Controls marked `mutation_required: true` in the catalog must have a corresponding
L4 mutation evidence envelope before a compliance assertion can be made.

Critical paths requiring mutation testing:

| Path | Control | Minimum Mutation Score |
|------|---------|----------------------|
| Policy engine | CTRL-POLICY-ENGINE | 90% |
| Proof validation | CTRL-PROOF-VALIDITY | 90% |
| Human gate | CTRL-HUMAN-GATE | 90% |
| Immutable audit | CTRL-IMMUTABLE-AUDIT | 90% |
| Replay rejection | CTRL-REPLAY-REJECTION | 90% |
| Risk gate | CTRL-RISK-GATE | 90% |

## Drift Invalidation Rules

When `drift-detector` finds any of these changes, the listed attestations are invalidated
and all affected controls revert to `not_verified` until evidence is regenerated:

| Change | Invalidated |
|--------|-------------|
| `policy_version` | all_compliance_attestations, all_evidence_envelopes |
| `hash_algorithm` | all_integrity_hashes |
| `deployment_config_hash` | deployment_provenance, sbom_attestation |
| `schema_version` | all_evidence_envelopes |
