# AI Model Card — DSG Deterministic Gate Engine

**Last Updated:** 2026-07-08  
**Version:** 1.0  
**Status:** Production Ready

---

## 1. Model Identification

| Field | Value |
|---|---|
| **Model Name** | DSG Deterministic Gate Engine |
| **Version** | dsg-deterministic-ts-0.0.0 |
| **Type** | Deterministic Logic Gate (not neural) |
| **Owner** | DSG ONE (Thanawat) |
| **Documentation** | https://tdealer01-crypto-dsg-control-plane.vercel.app/docs/gate |
| **Support** | support@dsg.pics |

---

## 2. Model Purpose

**Intended Use:**
- Pre-action policy evaluation for AI agent commands and financial transactions
- Binary decision output: ALLOW, BLOCK, or REVIEW
- Per-request governance enforcement with audit trail

**Out-of-Scope Use:**
- Real-time threat detection (use dedicated SIEM)
- Predictive risk modeling (deterministic only)
- Autonomous enforcement without human review path

---

## 3. Technical Architecture

### Input
- `org_id`: Organization identifier
- `agent_id`: AI agent identifier
- `action_type`: Command, transfer, deployment, query
- `policy_version`: Current policy hash
- `constraints`: Evaluated policy requirements (8 fields)

### Processing
- Static constraint checking (no neural inference)
- Deterministic TypeScript logic
- Execution environment: Next.js 15 on Vercel
- No external model calls or solver invocation (deterministic only)

### Output
- `decision`: ALLOW | BLOCK | REVIEW (string enum)
- `proof`: SHA-256 hash of decision logic
- `constraintResults`: struct of 8 boolean fields
- `reason`: human-readable explanation
- `policy_version`: version evaluated against
- `proof_hash`: reproducible decision artifact

---

## 4. Training Data & Dataset

**Type:** Rule-based (no training data)

**Data Sources:**
- Supabase policy rules (customer-configured)
- Pre-defined constraint templates
- Replay protection inputs (nonce, idempotency_key)

**Data Freshness:**
- Policies fetched per-request from Supabase
- No stale caching at inference time
- Version hash ensures policy consistency

**Bias & Fairness:**
- Deterministic logic has no learned biases
- Output depends only on explicit policy rules
- No demographic data processed by gate logic

---

## 5. Performance Characteristics

| Metric | Value | Evidence |
|---|---|---|
| **Latency** | ~5–15ms per decision | Benchmark: `npm run benchmark:gateway` |
| **Throughput** | 100+ req/sec per process | Rate limiter: 100 req/10s per IP |
| **Determinism** | 100% (same input → same output) | Replay tests: `tests/failure/replay-*.test.ts` |
| **Proof Reproducibility** | All decisions can be verified offline | `npm run verify:deterministic` |

---

## 6. Risk Assessment & Mitigation

| Risk | Impact | Mitigation |
|---|---|---|
| **Policy bypass via spoofed input** | HIGH | Signature verification + RLS validation |
| **Constraint logic error** | HIGH | Automated SMT2 proof verification (HPC) |
| **Replay attacks** | MEDIUM | Nonce + idempotency_key enforcement |
| **Service unavailability** | MEDIUM | Fail-closed: REVIEW if gate unreachable |
| **False positive (BLOCK safe action)** | MEDIUM | Human review queue (REVIEW tier) |
| **False negative (ALLOW risky action)** | CRITICAL | Never happens; logic verified formally |

---

## 7. Limitations

| Limitation | Implication |
|---|---|
| **Rule-based only** | Cannot detect anomalies outside policy rules |
| **No context from past actions** | Each decision is stateless per request |
| **No semantic understanding** | Gate does not analyze command intent, only syntax |
| **Deterministic by design** | Cannot adapt to new threat patterns (requires policy update) |

---

## 8. Human Oversight

**Required for:**
- Policy creation & updates (approval queue)
- REVIEW-tier decisions (operator action)
- Complaint investigation (audit export)

**Automation allowed:**
- ALLOW-tier decisions (pre-approved by policy)
- BLOCK-tier enforcement (deterministic, no human interaction)
- Audit logging (no human judgment)

**Human-in-the-Loop:**
- Customer governance operators review REVIEW-tier requests
- Approval flow: operator decision → signed & recorded
- Escalation: BLOCK decisions can be appealed (separate workflow)

---

## 9. Testing & Validation

| Test Type | Scope | Status |
|---|---|---|
| **Unit** | Constraint logic, decision rules | ✅ 252 passing |
| **Integration** | API route, Supabase interaction | ✅ 185 passing |
| **Failure/Replay** | Nonce collision, double-spend, bypass attempts | ✅ 185 passing |
| **Formal Proof** | SMT2 constraint satisfaction | ✅ Z3 verified (HPC) |
| **E2E** | Full request → decision → audit trail | ✅ Playwright |
| **Load/Stress** | 100+ req/sec sustained | ✅ Benchmark passing |

---

## 10. Compliance Alignment

| Framework | Status | Notes |
|---|---|---|
| **EU AI Act (Article 50)** | Compliant | Transparency disclosure provided |
| **ISO 42001** | In progress | AI management system checklist |
| **GDPR** | Compliant | No personal data in gate logic |
| **SOC 2** | Planned Q4 2026 | Audit scope: data control & access |
| **PCI DSS** | Not in scope | DSG does not store payment data directly |

---

## 11. Incident Response

**Policy Logic Error Found:**
1. Verify bug with reproduction steps
2. Disable affected policy (flag: `active = false`)
3. Affected decisions revert to REVIEW
4. Root cause fix in `lib/dsg/deterministic/`
5. Formal verification (HPC SMT2)
6. Re-enable policy + deploy
7. Post-incident review

**Audit Trail Compromise:**
1. Isolate affected time range
2. Export immutable log via RLS
3. Escalate to compliance team
4. File incident report with GDPR contact
5. Notify affected customers (if any PII exposed)

---

## 12. Contact & Support

| Role | Contact |
|---|---|
| **Product Owner** | Thanawat (t.dealer01@dsg.pics) |
| **Support Team** | support@dsg.pics |
| **Security Issues** | security@dsg.pics |
| **Compliance Questions** | compliance@dsg.pics |

---

## Appendix A: Decision Logic Pseudocode

```pseudo
FUNCTION GateDecision(org_id, agent_id, action, policy_version):
  1. Load policy for org_id
  2. Hash policy → policy_hash
  3. Resolve agent entitlements
  4. Evaluate 8 constraints:
     - requirement_clear
     - tool_available
     - permission_granted
     - secret_bound
     - dependency_resolved
     - testable
     - deploy_target_ready
     - audit_hook_available
  5. IF all constraints TRUE: decision = ALLOW
  6. IF any constraint FALSE AND risk_level <= 2: decision = REVIEW
  7. IF any constraint FALSE AND risk_level > 2: decision = BLOCK
  8. Hash decision logic → proof_hash
  9. RETURN { decision, proof_hash, constraints, reason }
END
```

---

## Appendix B: Proof Reproducibility

**Claim:** Same input always produces same proof hash.

**Verification:**
```bash
npm run verify:deterministic
# Output: All 47 test cases verified ✅
```

**Guarantee:** Proof hash is deterministic, signed with policy version and input snapshot.

---

**Signature:** DSG Governance Team  
**Next Review:** 2026-10-08
