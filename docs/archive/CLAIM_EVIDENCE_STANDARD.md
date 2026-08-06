# Claim Evidence Standard — DSG ONE / ProofGate

**Version:** 1.0  
**Reference Date:** 2026-06  
**Status:** Active Source of Truth

---

## Overview

This document is the authoritative mapping between DSG compliance claims, evidence requirements, and verification artifacts. Every claim made in documentation, marketing, RFP responses, or audit scope must be backed by explicit evidence artifacts following this standard.

### Core Definitions

**Claim:** An assertion about DSG capability, compliance, security, or governance. Examples: "ISO-42001 AI governance controls are implemented," "runtime audit trail is immutable," "no critical vulnerabilities present."

**Evidence:** Tangible proof artifacts that support or refute a claim. Examples: test coverage reports, signed provenance bundles, audit logs, vulnerability scans, mutation analysis results.

**Evidence Type:** Category of proof organized by CCVS severity level (L1–L5). Levels map to confidence and independence:

- **L1 (Unit):** Isolated component tests, code static analysis, direct verification of single unit.
- **L2 (Integration):** Multi-component tests, API endpoint verification, real database interaction.
- **L3 (Adversarial):** Negative tests, boundary/edge cases, malicious input handling, replay scenarios.
- **L4 (Mutation/Proof):** Mutation testing scores, formal property proofs, coverage gaps exposed by mutation.
- **L5 (Provenance/Oversight):** Build attestation, cryptographic signatures, human audit trail, external certification.

**Artifact:** File, output, or record that embodies evidence. Examples: `coverage.json`, `mutations.json`, `SBOM.json`, signed attestation, Supabase audit log row, GitHub Actions workflow log.

**Pass Criteria:** Objective threshold that evidence must meet to satisfy the claim. Examples: "≥85% branch coverage," "0 critical vulnerabilities," "Cosign signature valid."

---

## Claim Definition Table

| Claim ID | Requirement | Evidence Types | Artifact Types | Pass Criteria | Responsible File/Endpoint | Reference |
|---|---|---|---|---|---|---|
| **ISO-42001-A.6-PLANNING** | AI system scope, intended use, and AI risk categorization are documented and maintained | unit_tests, sbom, audit_chain | schema.sql, docs/*.md, governance_log.json | Scope documented in CLAUDE.md, risk matrix present in docs/, audit entry recorded | `lib/dsg/*`, `docs/REPO_TRUTH.md` | ISO/IEC 42001:2023 A.6 |
| **ISO-42001-A.11-HUMAN-OVERSIGHT** | Human review and override procedures for high-risk AI actions are defined and tested | integration_tests, adversarial_tests, audit_chain | test_*.ts, audit_log.json, policy_matrix.json | Integration test count ≥ 5, adversarial test count ≥ 3, audit trail includes override events | `/api/execute`, `/api/policies`, `app/dashboard/**` | ISO/IEC 42001:2023 A.11 |
| **NIST-GOVERN-01** | AI governance structure, policies, and oversight roles are in place and documented | unit_tests, audit_chain, provenance | AGENTS.md, CLAUDE.md, workflow logs, commit attestation | AGENTS.md reviewed and current, commit signed, governance role matrix in docs/ | `AGENTS.md`, `.github/workflows/` | NIST AI RMF Gov-1.1 |
| **NIST-MEASURE-01** | System monitoring, performance metrics, and drift detection are active and logged | integration_tests, mutation_tests, audit_chain | monitor_*.ts, drift_log.json, mutation.json | Monitor test passes, drift detection config in place, mutation score ≥ 75%, audit log append-only | `lib/ccvs/`, `scripts/` | NIST AI RMF Measure-1.1 |
| **EU-AI-ACT-ANNEX-IV-SECTION-2** | Technical documentation includes risk management, data provenance, and testing evidence | unit_tests, integration_tests, adversarial_tests, sbom | docs/TECHNICAL_SPEC.md, coverage.json, test_results.json, SBOM.json | Technical doc ≥ 50 pages, coverage ≥ 80%, test count ≥ 100, SBOM valid CycloneDX | `docs/`, `lib/spine/` | EU AI Act Annex IV §2 |
| **SUPPLY-CHAIN-01** | Build artifacts are signed and provenance is verified end-to-end | provenance, sbom, audit_chain | attestation.jsonl, SBOM.json, github_attestation.json, signed_digest.txt | Cosign signature valid (OIDC or key), SBOM present & hash verified, GitHub attestation chain unbroken | `.github/workflows/`, `scripts/verify-provenance.sh` | SLSA Framework L3+ |
| **SECURITY-HARDENING** | No critical or high-risk vulnerabilities present; npm audit passes at configured level | unit_tests, sbom, audit_chain | npm_audit.json, coverage.json, dependency_tree.json, sec_scan_log.json | npm audit critical = 0, high ≤ 2, coverage ≥ 85%, no vulnerable transitive deps | `package.json`, `npm ci` | OWASP Top 10 |
| **RUNTIME-INTEGRITY** | Audit trail is immutable (append-only), runtime execution commits are verified, and replay is prevented | integration_tests, adversarial_tests, audit_chain | audit_log.json, runtime_commit.json, chain_hash.json, execution_proof.json | Audit table RLS enforced, commit hash chain unbroken, no deletes allowed, ≥3 integration tests pass | `/api/execute`, `/api/audit`, `lib/runtime/` | NIST AI RMF Govern-2.2 |

---

## Evidence Types & Artifact Schema

### L1: Unit Tests

**Purpose:** Verify individual functions, classes, and discrete logic paths.

**Typical Artifacts:**
- `tests/unit/**/*.test.ts` — Vitest unit test files
- `coverage.json` — Coverage report (v1 or Istanbul format)
- `coverage-summary.json` — Summary of coverage by file/line/branch/function

**Pass Criteria Examples:**
```
coverage.lines ≥ 85%
coverage.branches ≥ 80%
coverage.functions ≥ 85%
test.pass_count > 0 AND test.fail_count = 0
```

**Command to Generate:**
```bash
npm run test:coverage
```

**Example Coverage Report Entry:**
```json
{
  "total": {
    "lines": { "total": 1500, "covered": 1275, "skipped": 0, "pct": 85.0 },
    "statements": { "total": 1500, "covered": 1275, "skipped": 0, "pct": 85.0 },
    "functions": { "total": 200, "covered": 170, "skipped": 0, "pct": 85.0 },
    "branches": { "total": 400, "covered": 320, "skipped": 0, "pct": 80.0 }
  }
}
```

---

### L2: Integration Tests

**Purpose:** Verify multi-component interaction, API contracts, and real database scenarios.

**Typical Artifacts:**
- `tests/integration/**/*.test.ts` — Vitest integration test files
- `test-results/*.json` — Playwright or Vitest JSON results
- `integration_results.json` — Endpoint coverage, error handling, data consistency

**Pass Criteria Examples:**
```
integration.test_count ≥ 20
integration.pass_rate = 100%
endpoint_coverage ≥ 80% (covered endpoints / total endpoints)
error_handling_tests_pass = true
```

**Command to Generate:**
```bash
npm run test:integration
```

**Example Integration Report:**
```json
{
  "endpoints_tested": [
    {
      "method": "POST",
      "path": "/api/execute",
      "status_code": 200,
      "tests_passed": 5,
      "error_handling_verified": true
    }
  ],
  "total_tests": 25,
  "passed": 25,
  "failed": 0,
  "pass_rate": 1.0
}
```

---

### L3: Adversarial Tests

**Purpose:** Verify edge cases, boundary conditions, malicious inputs, and security-sensitive scenarios.

**Typical Artifacts:**
- `tests/failure/**/*.test.ts` — Negative/adversarial test files
- `tests/adversarial/**/*.test.ts` — Boundary and replay tests
- `adversarial_results.json` — Results of adversarial runs

**Pass Criteria Examples:**
```
adversarial.test_count ≥ 15
adversarial.pass_rate = 100%
malicious_input_blocked = true
replay_prevention_verified = true
boundary_cases_covered ≥ 10
```

**Command to Generate:**
```bash
npm run test:failure
```

**Example Adversarial Report:**
```json
{
  "tests": [
    {
      "name": "reject_oversized_request_body",
      "status": "pass",
      "input": { "size_bytes": 50000000 },
      "expected": "413 Payload Too Large",
      "actual": "413 Payload Too Large"
    },
    {
      "name": "prevent_audit_log_replay",
      "status": "pass",
      "scenario": "duplicate_execution_id",
      "blocked": true
    }
  ],
  "total": 18,
  "passed": 18
}
```

---

### L4: Mutation Testing

**Purpose:** Verify test suite effectiveness by injecting faults and checking if tests catch them.

**Typical Artifacts:**
- `mutations.json` — Stryker or equivalent mutation testing results
- `mutation_report.json` — Score, killed/survived mutations, hot spots
- `mutation_coverage.json` — By-file mutation effectiveness

**Pass Criteria Examples:**
```
mutation.score ≥ 80%
mutation.killed_ratio ≥ 0.80
mutation.survived_count ≤ 50
hotspots_identified ≥ 3
```

**Command to Generate:**
```bash
npm run test:mutation:ci
```

**Example Mutation Report:**
```json
{
  "metrics": {
    "mutations.created": 250,
    "mutations.killed": 210,
    "mutations.survived": 40,
    "mutations.timeout": 0,
    "mutations.no_coverage": 0
  },
  "score": 84.0,
  "noCoverage": 0,
  "survived": [
    { "location": "lib/spine/execute.ts:123", "operator": "BinaryOperator", "replacement": ">=" }
  ]
}
```

---

### L5a: SBOM (Software Bill of Materials)

**Purpose:** Track all dependencies and versions for supply chain security and compliance.

**Typical Artifacts:**
- `sbom.json` or `sbom.xml` — CycloneDX or SPDX format
- `package-lock.json` — npm lockfile (pinned versions)
- `dependency_scan.json` — Vulnerability counts by severity

**Pass Criteria Examples:**
```
sbom.format = "CycloneDX" (1.4+) OR "SPDX" (2.2+)
sbom.component_count ≥ total_packages
vulnerability.critical = 0
vulnerability.high ≤ 2
vulnerability.medium ≤ 5
sbom_hash = computed_hash (no tampering)
```

**Command to Generate:**
```bash
npm list --all > dependency_tree.txt
npm audit --json > npm_audit.json
```

**Example SBOM (CycloneDX):**
```json
{
  "bomFormat": "CycloneDX",
  "specVersion": "1.4",
  "version": 1,
  "components": [
    {
      "type": "library",
      "name": "next",
      "version": "15.0.0",
      "purl": "pkg:npm/next@15.0.0",
      "licenses": [{ "license": { "name": "MIT" } }]
    }
  ],
  "vulnerabilities": [
    {
      "ref": "pkg:npm/next@15.0.0",
      "severity": "low",
      "vulnerability": "CVE-2024-XXXXX"
    }
  ]
}
```

---

### L5b: Provenance & Cryptographic Signature

**Purpose:** Prove authenticity and integrity of build artifacts and commits.

**Typical Artifacts:**
- `attestation.jsonl` — GitHub Actions build attestation (SLSA provenance)
- `cosign.sig` — Cosign signature bundle
- `github_attestation.json` — Linked from Actions artifacts
- `commit_attestation.json` — Signed commit metadata

**Pass Criteria Examples:**
```
cosign_signature.valid = true
cosign_identity.provider = "https://token.actions.githubusercontent.com"
slsa_provenance.buildType = "https://github.com/actions/runner@v2"
attestation_chain.unbroken = true (hash → parent hash → ...)
commit.signed = true (GPG or signing key)
```

**Command to Generate (Example):**
```bash
cosign sign-blob --key cosign.key sbom.json > sbom.sig
cosign verify-blob --key cosign.pub --signature sbom.sig sbom.json
```

**Example Provenance Attestation:**
```json
{
  "_type": "https://in-toto.io/Statement/v0.1",
  "predicateType": "https://slsa.dev/provenance/v0.2",
  "subject": [
    {
      "name": "app.tar.gz",
      "digest": { "sha256": "abcd1234..." }
    }
  ],
  "predicate": {
    "builder": {
      "id": "https://github.com/actions/runner@v2"
    },
    "buildType": "https://github.com/actions/runner@v2",
    "invocation": {
      "configSource": {
        "uri": "git+https://github.com/dsg/control-plane@main",
        "digest": { "sha256": "commit_sha..." }
      }
    },
    "materials": [
      { "uri": "git+https://github.com/dsg/control-plane", "digest": { "sha256": "..." } }
    ]
  }
}
```

---

### L5c: Audit Chain & Immutable Logs

**Purpose:** Record and verify immutability of runtime decisions, approvals, and policy changes.

**Typical Artifacts:**
- `audit_log.json` or rows from `supabase.audit_events` table
- `runtime_commit.json` — Execution decision + hash chain
- `chain_hash.json` — Hash lineage verification
- `policy_change_log.json` — When and by whom policies changed

**Pass Criteria Examples:**
```
audit_table.rls_enforced = true (no anonymous deletes)
audit_entry.has_timestamp = true AND is_append_only = true
chain_hash[i].parent_hash = chain_hash[i-1].hash (unbroken)
no_delete_operations = true (audit log never shrinks)
compliance_event_count ≥ expected_count
```

**Example Audit Log Entry:**
```json
{
  "id": "aud_uuid",
  "timestamp": "2026-06-12T14:30:00Z",
  "org_id": "org_123",
  "agent_id": "agent_456",
  "event_type": "execution_approved",
  "actor_id": "user_789",
  "resource": "/api/execute",
  "action": "POST",
  "decision": "APPROVED",
  "policy_version": "1.2.3",
  "proof_hash": "sha256:proof...",
  "execution_hash": "sha256:exec...",
  "parent_hash": "sha256:prev_audit...",
  "evidence_json": { "coverage": 0.85, "mutation_score": 0.82 },
  "immutable": true
}
```

---

### L5d: Monitoring & Drift Detection

**Purpose:** Detect runtime anomalies, model drift, and deviations from expected behavior.

**Typical Artifacts:**
- `drift_log.json` — Detected drift events with severity
- `monitor_metrics.json` — Performance/behavior baseline vs. current
- `anomaly_alerts.json` — Triggered alerts and resolution
- `runtime_dashboard.json` — Real-time metric snapshots

**Pass Criteria Examples:**
```
monitoring.enabled = true
drift_detection.active = true
alert_response_time ≤ 30_minutes
drift_undetected_window ≤ 1_hour
false_positive_rate ≤ 0.05
```

**Example Drift Alert:**
```json
{
  "alert_id": "drift_uuid",
  "timestamp": "2026-06-12T14:35:00Z",
  "severity": "medium",
  "metric": "execution_decision_variance",
  "baseline": 0.92,
  "current": 0.78,
  "delta": -0.14,
  "threshold": 0.15,
  "triggered": true,
  "action": "REVIEW_REQUIRED",
  "audit_logged": true
}
```

---

## Claims Status & Flow

### Claim Verification Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ Claim Assertion (e.g., "ISO-42001-A.6-PLANNING complete")      │
└──────────────────────┬──────────────────────────────────────────┘
                       │
         ┌─────────────┴──────────────┐
         ↓                            ↓
    [Evidence              [Evidence Not Found]
     Found?]                    │
         │                      ↓
         ↓              Status: PENDING
    [Artifact          (Schedule artifact
     Generated]         generation)
         │
         ↓
    [Pass Criteria
     Met?]
         │
    ┌────┴────┐
    ↓         ↓
  PASS      FAIL
    │         │
    ↓         ↓
 GREEN    RED (Known Limit)
           or BLOCK
```

### Status Labels

- **GREEN:** All pass criteria met; claim is supported.
- **YELLOW / PENDING:** Evidence generation scheduled or in progress.
- **RED / BLOCKED:** Pass criteria not met; claim is unsupported.
- **KNOWN LIMIT:** Claim explicitly deferred (e.g., external Z3 solver not yet integrated).

---

## Example Claim Walkthrough

### Claim: RUNTIME-INTEGRITY

**Requirement:**  
Audit trail is immutable (append-only), runtime execution commits are verified, and replay is prevented.

**Evidence Plan:**
1. **L2 Integration Tests:** Create 3+ tests that verify audit log append-only behavior, commit hash chain, and replay rejection.
2. **L3 Adversarial Tests:** Attempt to delete audit log row (should fail), attempt replay with same execution ID (should be rejected).
3. **L5 Audit Chain:** Query live Supabase `audit_events` table and verify RLS policy blocks DELETE.

**Artifacts to Generate:**
```bash
npm run test:integration -- tests/integration/audit-trail.test.ts
npm run test:failure -- tests/failure/replay-prevention.test.ts
# Manual audit verification:
supabase query 'SELECT * FROM audit_events ORDER BY created_at DESC LIMIT 5;'
supabase query 'SELECT policy_name FROM pg_policies WHERE tablename = "audit_events";'
```

**Expected Artifacts:**
- `test-results/integration_audit_trail.json`
- `test-results/failure_replay_prevention.json`
- `audit_rls_policy.sql` (from Supabase schema)
- `audit_chain_verification.json` (manual hash verification output)

**Pass Criteria:**
```
integration_tests.passed = 3
adversarial_tests.passed = 3
audit_table.has_delete_policy = false (RLS blocks deletes)
chain_hash[0..n].unbroken = true
replay_prevention_verified = true
```

**Status:** 
- If all pass: **GREEN** — RUNTIME-INTEGRITY claim is supported.
- If integration tests fail: **RED** — Remediate and re-run.
- If Supabase RLS policy missing: **BLOCKED** — Add RLS migration and reapply.

---

## Integration with CCVS Pipeline

The **Compliance, Coverage, Verification, Scoring (CCVS)** pipeline operationalizes this standard:

```bash
npm run ccvs:pipeline
  → collects all L1–L5 artifacts
  → validates against this standard
  → scores each claim (RED / YELLOW / GREEN)
  → outputs compliance_matrix.json
  → gates: NO-GO if critical claims are RED
```

**CCVS Matrix Output Structure:**
```json
{
  "version": "1.0",
  "generated_at": "2026-06-12T14:40:00Z",
  "claims": [
    {
      "claim_id": "ISO-42001-A.6-PLANNING",
      "status": "GREEN",
      "evidence_artifacts": [
        { "type": "audit_chain", "path": "docs/REPO_TRUTH.md", "verified": true }
      ],
      "pass_criteria_met": true,
      "audit_trail": [
        { "timestamp": "2026-06-12T14:35:00Z", "actor": "ci-bot", "action": "verified" }
      ]
    }
  ],
  "overall_status": "GO",
  "known_limits": [
    { "claim_id": "EU-AI-ACT-ANNEX-IV-SECTION-2", "reason": "external_audit_pending" }
  ]
}
```

---

## Responsible Parties & Touchpoints

| Claim ID | Owner | Review Frequency | Approval Gate |
|---|---|---|---|
| ISO-42001-A.6-PLANNING | Compliance Lead | Quarterly | PRs to AGENTS.md, CLAUDE.md |
| ISO-42001-A.11-HUMAN-OVERSIGHT | Engineering Lead | Per major release | Integration test suite must pass |
| NIST-GOVERN-01 | Security Lead | Monthly | Commit signature + AGENTS.md review |
| NIST-MEASURE-01 | Data/Ops | Continuous | Drift detection script runs hourly |
| EU-AI-ACT-ANNEX-IV-SECTION-2 | Product Compliance | Quarterly | External audit feedback cycle |
| SUPPLY-CHAIN-01 | DevOps | Per build | GitHub Actions attestation must be valid |
| SECURITY-HARDENING | Security Lead | Per dependency update | npm audit critical = 0 gate |
| RUNTIME-INTEGRITY | Engineering Lead | Per commit to spine | Audit chain hash verification |

---

## Version History

| Version | Date | Changes |
|---|---|---|
| 1.0 | 2026-06 | Initial release; 8 core claims, L1–L5 evidence framework, CCVS integration, responsible parties |

---

## References

- **ISO/IEC 42001:2023** — AI Management Systems
- **NIST AI Risk Management Framework** — AI RMF 1.0
- **EU AI Act** — Annex IV, Article 11–16
- **SLSA Framework** — Supply Chain Levels for Software Artifacts
- **OWASP Top 10** — Application Security
- **CycloneDX / SPDX** — Software Bill of Materials standards

---

## Notes for Users

1. **Every claim must have current, fresh evidence.** Do not rely on stale artifacts or test runs from previous deployments.
2. **Evidence is cumulative.** A passing test today does not auto-satisfy a claim next month if the code changes; rerun verification.
3. **Blocked claims must be explicitly documented** (known limits section) before shipping or making compliance statements.
4. **Artifacts must be immutable** once collected for audit purposes. Use cryptographic hashing and timestamps.
5. **This standard evolves.** As regulations change or new evidence types become relevant, update this file and tag with a new version.

---

**End of CLAIM_EVIDENCE_STANDARD.md v1.0**
