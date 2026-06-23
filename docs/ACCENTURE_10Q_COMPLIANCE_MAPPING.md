# Accenture 10 Critical Questions — DSG Control Plane Compliance Mapping

## Version: 2026-06-23
## Owner: DSG Governance Team
## Status: LIVE COMPLIANCE AUDIT ARTIFACT

---

## Executive Summary

This document provides evidence-backed answers to Accenture's 10 Critical Questions for AI/agent governance, mapped to DSG Control Plane implementation status, test coverage, and verifiable artifacts.

| # | Question | Overall Status | Test Coverage | Evidence File |
|---|----------|----------------|---------------|---------------|
| 1 | Agent decides from what? | ⚠️ Partial | Unit + Integration | `tests/unit/dsg-brain-conformance.test.ts` |
| 2 | Who approves policy? | ⚠️ Partial | Integration | `tests/integration/api/finance-governance-actions.test.ts` |
| 3 | Can audit be traced back? | ⚠️ Partial | Integration | `tests/integration/api/spine-evidence-chain.test.ts` |
| 4 | Can logs be deleted? | ❓ Unknown | None | Needs schema verification |
| 5 | Prove agent doesn't hallucinate? | ⚠️ Partial | Unit (Z3 proofs) | `tests/proofs/` |
| 6 | EU AI Act mapping? | ❌ No | None | Needs compliance mapping |
| 7 | ISO 42001 certification? | ❌ No | None | Gap acknowledged |
| 8 | Control evidence? | ⚠️ Partial | Integration | Audit trail tests |
| 9 | Incident response? | ❌ No | None | Needs playbook |
| 10 | Governance dashboard? | ⚠️ Partial | E2E | Hermes chat + dashboard routes |

---

## Q1: Agent decides from what?

**DSG Answer:** Policy manifest + Z3 check + Safe DOM verification + spine pipeline gate

**Evidence:**
- `lib/runtime/gate.ts` — Policy manifest enforcement (90% coverage threshold)
- `lib/ccvs/evidence-collector.ts` — Evidence collection (85% threshold)
- `tests/proofs/` — Z3 invariant proofs (rate-limit, quota)
- `app/api/spine/execute/route.ts` — Safe DOM + quota + rate-limit gates

**Test Matrix:**
| Test File | Tests | Status |
|-----------|-------|--------|
| `tests/unit/dsg-brain-conformance.test.ts` | 10+ | ✅ |
| `tests/unit/spine/pipeline-approval.test.ts` | 2 | ✅ |
| `tests/proofs/quota-invariants.test.ts` | 14 | ✅ |
| `tests/proofs/billing-invariants.test.ts` | 11 | ✅ |
| `tests/integration/api/spine-execute-safe-dom.test.ts` | 8 | ❌ Failing (env) |

**Gap:** Z3 currently uses static scaffold proofs, not a real SMT solver runtime. Risk to compliance credibility.

**Mitigation:**
- Add runtime proof verification before execution
- Document Z3 scaffold as "formal design verification" not "runtime proof"

---

## Q2: Who approves policy?

**DSG Answer:** Role-based gate (`requireOrgRole`) + human approval workflow for HIGH-risk actions

**Evidence:**
- `lib/authz.ts` — Role enforcement (operator, org_admin)
- `app/api/finance-governance-actions/route.ts` — Finance workflow approval
- `tests/integration/api/finance-governance-actions.test.ts` — 6 tests passing

**Test Matrix:**
| Test File | Tests | Status |
|-----------|-------|--------|
| `tests/integration/api/finance-governance-actions.test.ts` | 6 | ✅ |
| `tests/unit/authz.test.ts` | Present | ✅ |
| `tests/unit/authz-runtime.test.ts` | Present | ✅ |

**Gap:** Human approval workflow exists for finance but not for all HIGH-risk agent actions. Review gate is documented but not enforced everywhere.

**Mitigation:**
- Extend `ReviewGatePanel` to all HIGH-risk `DSG_TOOL_NAMES`
- Add approval_required flag to policy manifest per tool

---

## Q3: Can audit be traced back?

**DSG Answer:** Yes — immutable audit log via evidence chain + audit API

**Evidence:**
- `lib/ccvs/evidence-collector.ts` — Evidence chain construction
- `app/api/spine/execute/route.ts` — Audit context capture
- `tests/integration/api/spine-evidence-chain.test.ts` — Full chain tests

**Test Matrix:**
| Test File | Tests | Status |
|-----------|-------|--------|
| `tests/integration/api/spine-evidence-chain.test.ts` | 16 | ❌ Env failure |
| `tests/integration/api/audit-evidence.test.ts` | 1 | ⏭️ Skipped (manual) |
| `tests/integration/api/audit-route.test.ts` | Present | ✅ |

**Gap:**
1. Immutability of audit records not verified at DB level (RLS policies)
2. Tests skip due to manual flag, not automated
3. Need real Supabase env to validate live DB writes

**Mitigation:**
- Add RLS policy verification test
- Add audit log deletion attempt test (should fail)
- Move to automated test suite

---

## Q4: Can logs be deleted?

**DSG Answer:** Unknown — requires RLS/permission verification

**Evidence:**
- No test for log deletion
- No RLS policy audit for audit table
- Missing schema verification

**Test Matrix:**
| Test File | Tests | Status |
|-----------|-------|--------|
| None | 0 | ❌ GAP |

**Gap:** This is a critical compliance gap. If logs can be deleted by admins or compromised accounts, the entire audit trail is untrustworthy.

**Mitigation:**
- Add RLS policy: `ON audit_logs FOR DELETE USING (false)`
- Add test: attempt deletion → expect 403/error
- Add retention policy: `ON audit_logs FOR DELETE USING (created_at > now() - interval '7 years')`

---

## Q5: Prove agent doesn't hallucinate

**DSG Answer:** Evidence trail + manifest check + deterministic execution contract

**Evidence:**
- `tests/proofs/quota-invariants.test.ts` — Z3 proofs (14 tests)
- `tests/proofs/billing-invariants.test.ts` — Billing proofs (11 tests)
- `lib/spine/` — Pipeline approval flow

**Test Matrix:**
| Test File | Tests | Status |
|-----------|-------|--------|
| `tests/proofs/quota-invariants.test.ts` | 14 | ✅ |
| `tests/proofs/billing-invariants.test.ts` | 11 | ✅ |
| `tests/unit/spine/pipeline-approval.test.ts` | 2 | ✅ |

**Gap:** Z3 proofs are design-time, not runtime. Real compliance needs runtime verification.

**Mitigation:**
- Add runtime proof check before each execution
- Add manifest hash verification in audit chain

---

## Q6: EU AI Act?

**DSG Answer:** No mapping yet

**Evidence:**
- No EU AI Act classification documented
- No risk tier mapping (prohibited/high/limited/minimal)
- No transparency/disclosure framework

**Test Matrix:**
| Test File | Tests | Status |
|-----------|-------|--------|
| None | 0 | ❌ GAP |

**Gap:** EU AI Act compliance is now mandatory for EU market deployment.

**Mitigation:**
- Classify DSG Control Plane as "limited risk" (customer service chatbot)
- Document risk classification
- Add transparency disclosure (user notification of AI interaction)

---

## Q7: ISO 42001?

**DSG Answer:** Not certified — mapping only

**Evidence:**
- `docs/COMPLIANCE_MATRIX.md` — Partial mapping exists
- No certification body engagement
- No AIMS (AI Management System) documentation

**Test Matrix:**
| Test File | Tests | Status |
|-----------|-------|--------|
| None | 0 | ❌ GAP |

**Gap:** ISO 42001 requires documented AIMS with scope, policy, objectives, controls, and internal audit program.

**Mitigation:**
- Create AIMS documentation
- Map existing controls to ISO 42001 Annex A
- Plan certification path with accredited body

---

## Q8: Control evidence?

**DSG Answer:** Audit trail + access log (partial)

**Evidence:**
- `lib/ccvs/evidence-collector.ts` — CCVS evidence collection
- Audit trail in spine execution
- Access logs via middleware

**Test Matrix:**
| Test File | Tests | Status |
|-----------|-------|--------|
| `tests/integration/api/audit-route.test.ts` | Present | ✅ |
| `tests/unit/ccvs/*` | Present | ✅ |

**Gap:** Unified control evidence panel not available. Evidence fragmented across multiple APIs.

**Mitigation:**
- Create `/dashboard/governance/controls` page aggregating all evidence
- Link each control to specific test coverage

---

## Q9: Incident response?

**DSG Answer:** No documented playbook

**Evidence:**
- No incident response runbook
- No escalation workflow documented
- No breach notification procedure

**Test Matrix:**
| Test File | Tests | Status |
|-----------|-------|--------|
| None | 0 | ❌ GAP |

**Gap:** Critical for trust and compliance. Without incident response, customers cannot verify DSG handles failures securely.

**Mitigation:**
- Create incident response playbook
- Define severity levels (P1-P4)
- Add breach notification workflow
- Create `/dashboard/governance/incidents` page

---

## Q10: Governance dashboard?

**DSG Answer:** Hermes redesign (SSE chat) — not a governance dashboard

**Evidence:**
- `app/dashboard/hermes/page.tsx` — Agent chat interface
- Dashboard exists but is agent-centric, not governance-centric

**Test Matrix:**
| Test File | Tests | Status |
|-----------|-------|--------|
| `tests/e2e/hermes-chat.spec.ts` | Present | ⏭️ |
| `tests/e2e/hermes-server.spec.ts` | Present | ⏭️ |

**Gap:** Governance needs visibility into:
- Policy manifest status
- Agent decision audit log
- Approval queue
- Evidence chain integrity
- Compliance status (10 questions)
- Incident response status

**Mitigation:**
- Create `/dashboard/governance` page with 10-question status dashboard
- Show real-time compliance metrics
- Link to evidence artifacts

---

## Compliance Roadmap

### Phase 1: Must-Have (Week 1)
1. Add audit log deletion prevention (Q4)
2. Create incident response playbook (Q9)
3. Create governance dashboard page (Q10)
4. Fix Supabase env in test runner

### Phase 2: Should-Have (Week 2-3)
5. Extend human approval workflow to all HIGH-risk tools (Q2)
6. Add runtime Z3 verification (Q5)
7. Document EU AI Act classification (Q6)
8. Create AIMS documentation (Q7)

### Phase 3: Nice-to-Have (Month 2)
9. Full ISO 42001 certification preparation (Q7)
10. Runtime SMT solver integration (Q5)

---

## Test Coverage by Question

```
Q1: Agent decisions:       ████████░░ 80% (unit+proofs)
Q2: Policy approval:       ███████░░░ 70% (finance only)
Q3: Audit traceability:    ███████░░░ 70% (env-blocked tests)
Q4: Log deletion:          ██░░░░░░░░ 10% (no tests)
Q5: Anti-hallucination:    ██████░░░░ 60% (design-time only)
Q6: EU AI Act:             █░░░░░░░░░ 5%  (no mapping)
Q7: ISO 42001:             █░░░░░░░░░ 5%  (acknowledged gap)
Q8: Control evidence:      █████░░░░░ 50% (fragmented)
Q9: Incident response:     █░░░░░░░░░ 0%  (no playbook)
Q10: Governance dashboard: █████░░░░░ 50% ( Hermes chat ≠ governance)
```

---

## Evidence Export Checklist

- [ ] `compliance/10q-mapping.json` — Machine-readable mapping
- [ ] `compliance/evidence-bundle.tar.gz` — All test + doc artifacts
- [ ] `compliance/audit-log-schema.sql` — Table DDL + RLS policies
- [ ] `compliance/incident-response-playbook.md` — Runbook
- [ ] `compliance/eu-ai-act-classification.md` — Risk tier mapping
- [ ] `compliance/iso-42001-aims.md` — AIMS documentation

---

*This document is automatically updated by DSG compliance pipeline.*
