# Legal Position Paper: Immutable Audit Logs & GDPR Right to Erasure

**Document:** GDPR Art. 17 vs. Immutable Audit Ledger — Conflict Resolution
**Version:** v1.0 | **Date:** 2026-06-24 | **Status:** Defensible Position (Accenture Review Ready)
**Owner:** DSG ONE Compliance & Governance

---

## 1. The Conflict

DSG ONE maintains an immutable audit ledger (`finance_governance_audit_ledger`) using SHA-256 hash chains and append-only database triggers. This records every governance action — approvals, rejections, escalations — with cryptographic integrity proofs. GDPR Article 17 grants data subjects the "right to erasure," requiring controllers to delete personal data upon request. These obligations are in direct tension: immutability forbids deletion; GDPR demands it.

## 2. Regulatory Basis for Immutability

EU AI Act (Regulation (EU) 2024/1689) **Article 12** requires high-risk AI system providers to maintain audit trails with appropriate traceability. Logs must be retained for a period appropriate to the system's purpose — at minimum six months, longer for regulated financial use cases. DSG ONE operates in the EU financial services domain, squarely within this scope.

Critically, **GDPR Article 17(3)(b)** exempts erasure when processing is necessary for compliance with a legal obligation. The EU AI Act constitutes such an obligation, providing the legal basis to retain audit records notwithstanding an erasure request.

## 3. Resolution Approach

DSG ONE resolves this through three layers:

**a) Pseudonymization.** Direct identifiers are replaced with stable pseudonymous actor IDs in the audit ledger. The `actor` field references an internal subject ID, not a natural person. The mapping table (`subject_identity_mapping`) is stored separately and is the only table subject to erasure requests.

**b) Data Separation.** Two distinct data planes: the **Audit Plane** (append-only, hash-chained, pseudonymous only) and the **Identity Plane** (contains PII, subject to erasure). Deleting an Identity Plane record severs the link to the natural person without altering the audit trail.

**c) Art. 17(3)(b) Exemption.** Upon receiving an erasure request, DSG ONE invokes the legal-obligation exemption for the audit ledger and processes erasure on the Identity Plane only, notifying the subject accordingly.

## 4. What DSG ONE Currently Does

- Append-only trigger on `finance_governance_audit_ledger` prevents UPDATE/DELETE at the database level.
- SHA-256 hash chain (`request_hash`, `record_hash`) ensures tamper evidence across the ledger.
- Actor pseudonymization is partially implemented — the `actor` field uses internal IDs, but some legacy workflow tables may still contain direct PII.
- WORM storage policy defines two-layer immutability (Supabase append-only + S3 Object Lock).
- No automated Identity Plane erasure workflow currently exists.

## 5. What Could Be Improved

| Gap | Risk | Recommended Action |
|---|---|---|
| Legacy tables may contain direct PII (emails) | Art. 17 exposure on tables that should be exempt | Migrate to pseudonymous actor IDs; backfill existing rows |
| No documented erasure request procedure | Inconsistent DSAR response; regulatory exposure | Publish a DSAR playbook defining the Art. 17(3)(b) exemption workflow |
| No DPIA for the audit ledger | Cannot demonstrate proportionality under Art. 35 | Conduct DPIA covering pseudonymization adequacy and retention |
| No programmatic retention enforcement | Indefinite retention exceeds Art. 5(1)(e) necessity standard | Implement time-bound retention (recommended: 3 years for financial governance) |
| No ROPA entry for audit ledger | Art. 30 compliance gap | Add ROPA entry documenting legal basis, purpose, retention, and exemption claim |

---

*This position is consistent with EDPB Guidelines 07/2020 on the interplay between erasure rights and legal retention obligations.*
