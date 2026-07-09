# CCVS Compliance & Evidence Chain

## Overview

DSG automatically generates CCVS L1-L5 compliance artifacts for every decision.

**CCVS Levels:**
- **L1:** Execution Decision (What was decided?)
- **L2:** Policy Applied (Which policy controls this?)
- **L3:** Formal Proof (Mathematical proof of correctness)
- **L4:** Evidence Audit Trail (Complete history)
- **L5:** Cryptographic Non-repudiation (Tamper-proof signature)

---

## L1: Execution Decision

**Records:** What happened

```json
{
  "decision_id": "exec-2026-07-09-001",
  "timestamp": "2026-07-09T22:30:45Z",
  "action": "ASSIGN",
  "object": {
    "type": "Task",
    "id": "payment-task-1",
    "properties": {
      "amount": 500000,
      "currency": "USD",
      "risk_level": "high"
    }
  },
  "target": {
    "type": "Agent",
    "id": "agent-3",
    "properties": {
      "name": "Verified Payment Agent",
      "verification_status": "verified",
      "clearance_level": 3
    }
  },
  "outcome": "EXECUTED",
  "actor": "system",
  "reason": "Policy compliance verified"
}
```

---

## L2: Policy Applied

**Records:** Which policy, which rule, which version

```json
{
  "policy_id": "payment-assignment-v2.1",
  "policy_name": "High-Risk Payment Assignment Policy",
  "policy_version": "2.1",
  "policy_created_at": "2026-01-15T00:00:00Z",
  "policy_updated_at": "2026-06-30T12:00:00Z",
  
  "rule_applied": {
    "id": "rule-high-risk-verification",
    "text": "High-risk payments (amount > 100000 OR risk_level = 'high') must be assigned to agents with verified identity status",
    "severity": "critical"
  },
  
  "rule_conditions": {
    "payment_risk": "high",
    "required_verification": "verified",
    "verification_confirmed": true,
    "condition_met": true
  },
  
  "policy_audit_trail": [
    {
      "version": "1.0",
      "date": "2026-01-15",
      "approved_by": "compliance-officer-1",
      "comment": "Initial policy"
    },
    {
      "version": "2.1",
      "date": "2026-06-30",
      "approved_by": "compliance-officer-2",
      "comment": "Lowered threshold from 500000 to 100000 for high-risk"
    }
  ]
}
```

---

## L3: Formal Proof

**Records:** Mathematical verification

```json
{
  "proof_id": "proof-2026-07-09-001",
  "proof_type": "z3_sat_verification",
  
  "problem_formulation": {
    "solver_type": "z3",
    "solver_version": "4.8.12",
    "problem_hash": "abc123...",  // Fingerprint of QUBO/SMT
    "variables_count": 15,
    "constraints_count": 8
  },
  
  "verification_result": {
    "status": "sat",
    "is_valid": true,
    "solve_time_ms": 145,
    "solver_seed": 42
  },
  
  "proof_details": {
    "constraints_verified": [
      "Each task assigned to exactly one agent: PASS",
      "No agent exceeds capacity: PASS",
      "High-risk to verified agents only: PASS",
      "Agent availability constraint: PASS"
    ],
    "solution_assignment": {
      "task-payment-1": "agent-3"
    }
  },
  
  "proof_hash": "def456...",  // SHA256(proof)
  "proof_timestamp": "2026-07-09T22:30:45.123Z"
}
```

---

## L4: Evidence Audit Trail

**Records:** Complete history with immutable chain

```json
{
  "evidence_chain_id": "chain-2026-07-09-001",
  "chain_type": "merkle",
  
  "entries": [
    {
      "sequence": 1,
      "entry_id": "entry-001",
      "parent_hash": null,
      "decision_id": "exec-2026-07-09-001",
      "policy_id": "payment-assignment-v2.1",
      "proof_hash": "def456...",
      "timestamp": "2026-07-09T22:30:45.123Z",
      "entry_hash": "111aaa..."  // Hash of this entry
    },
    {
      "sequence": 2,
      "entry_id": "entry-002",
      "parent_hash": "111aaa...",  // Links to previous
      "decision_id": "exec-2026-07-09-002",
      "policy_id": "payment-assignment-v2.1",
      "proof_hash": "ghi789...",
      "timestamp": "2026-07-09T22:31:02.456Z",
      "entry_hash": "222bbb..."  // Hash of this entry
    }
  ],
  
  "chain_integrity": {
    "total_entries": 2,
    "chain_hash": "222bbb...",  // Hash of last entry
    "chain_verified": true,
    "tampering_detected": false
  }
}
```

**Merkle Chain Verification:**
```
Entry 1 hash = SHA256(decision_1 + policy_1 + proof_1 + timestamp_1)
Entry 2 hash = SHA256(decision_2 + policy_2 + proof_2 + timestamp_2 + Entry_1_hash)
Entry 3 hash = SHA256(decision_3 + policy_3 + proof_3 + timestamp_3 + Entry_2_hash)

Any tampering → chain breaks → detected immediately
```

---

## L5: Cryptographic Non-repudiation

**Records:** Tamper-proof signature

```json
{
  "signature_id": "sig-2026-07-09-001",
  "signature_type": "sha256_hmac",
  
  "signed_data": {
    "execution_decision": "exec-2026-07-09-001",
    "policy_applied": "payment-assignment-v2.1",
    "proof": "def456...",
    "chain_hash": "222bbb...",
    "timestamp": "2026-07-09T22:30:45.123Z"
  },
  
  "signature": "sig_3f4a7b2c91e8f5d6a9b2c3f4a7b2c91e8f5d6a9b2c3f4a7b2c91e8f5d6a9b",
  
  "signer_identity": {
    "type": "system",
    "key_id": "key-dsg-prod-001",
    "certificate_hash": "cert_abc123..."
  },
  
  "verification": {
    "signature_valid": true,
    "signer_trusted": true,
    "timestamp_trusted": true
  }
}
```

---

## Complete Evidence Export

### JSON Export
```bash
curl https://api.dsg.pics/compliance/export \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"decision_ids": ["exec-2026-07-09-001"], "format": "json"}' \
  > evidence-2026-07-09.json
```

Result: L1-L5 complete chain in structured JSON

### Markdown Report
```bash
curl https://api.dsg.pics/compliance/export \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"decision_ids": ["exec-2026-07-09-001"], "format": "markdown"}' \
  > evidence-2026-07-09.md
```

Result: Readable audit report (suitable for auditors)

### SIEM/Splunk Integration
```bash
# Stream evidence to SIEM
curl -X POST https://splunk.company.com/hec \
  -H "Authorization: Splunk $SPLUNK_HEC_TOKEN" \
  -d '{"event": {...compliance evidence...}}'
```

---

## Audit Workflow

### 1. Auditor Requests Evidence
```bash
GET /api/compliance/audit?start=2026-07-01&end=2026-07-31&policy_id=payment-assignment
```

Returns: All 2000+ decisions + proofs for that month

### 2. Auditor Verifies Chain
```bash
# Check Merkle chain integrity
npm run verify:merkle-chain \
  --start 2026-07-01 \
  --end 2026-07-31

Output:
✓ Chain integrity verified (2000 entries)
✓ No tampering detected
✓ All proofs valid
✓ Policy version history consistent
```

### 3. Auditor Generates Report
```bash
npm run compliance:report \
  --start 2026-07-01 \
  --end 2026-07-31 \
  --format pdf

Output: compliance-report-2026-07.pdf
```

---

## Common Audit Questions

### Q: Can decisions be changed after the fact?
**A:** No. Merkle chain prevents tampering. Any modification breaks the chain (detected immediately).

### Q: What if someone hacks the database?
**A:** 
- Evidence hashes immutable (SHA-256)
- Merkle chain validates integrity
- Transactions logged to separate audit table
- All changes signed cryptographically

### Q: How far back can we audit?
**A:** All evidence stored indefinitely. Queryable back years.

### Q: What if Z3 version changes? Will proofs still verify?
**A:** Proofs include `solver_version`. Can replay with exact version. If version differs, it's noted (not an error, but tracked for reproducibility).

### Q: Can regulators verify independently?
**A:** Yes! Proof generation is deterministic. They can:
1. Get raw data (input + policy)
2. Run Z3 with same version
3. Reproduce the exact proof hash

---

## Regulatory Compliance

### SOC 2 Type II
- ✅ Evidence trail (L1-L5)
- ✅ Cryptographic audit (L5)
- ✅ Change control (L2 policy versioning)
- ✅ Segregation of duties (agent capabilities)

### HIPAA (if processing PHI)
- ✅ Access logs (who accessed what)
- ✅ Audit trails (immutable chain)
- ✅ Encryption (SHA-256 hashing)
- ⚠️ Requires additional configuration (data minimization)

### GDPR (if EU residents)
- ✅ Right to audit (evidence export)
- ✅ Data retention (queryable history)
- ⚠️ Right to be forgotten (requires anonymization process)

### PCI-DSS (if payment data)
- ✅ Audit trails (L1-L5)
- ✅ Tamper detection (Merkle chain)
- ✅ Access control (agent verification)
- ✅ Cryptography (SHA-256 proofs)

---

## Implementation Notes

- Evidence stored in `public.dsg_evidence` table
- Merkle chain stored in `public.dsg_merkle_chain`
- Signatures stored in `public.dsg_signatures`
- All tables have immutable constraints (no UPDATE)
- Automatic retention policy: 7 years by default

See [SECURITY.md](./SECURITY.md) for access control details.
