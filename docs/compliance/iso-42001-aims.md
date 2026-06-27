# ISO 42001 AI Management System (AIMS)

**Scope**: DSG Control Plane — AI governance and execution platform for regulated workflows.

**Owner**: DSG Control Plane engineering team.

**Exclusions**: Third-party LLM providers (OpenRouter) and infrastructure (Vercel, Supabase) are out of scope. Their certifications are tracked separately.

---

## 1. AI Policy

DSG Control Plane operates under the following principles:
- Every AI action is logged with immutable evidence (audit chain).
- High-risk actions require human approval before execution.
- Org data isolation is enforced by RLS; org_id is derived from authenticated identity, never from client input.
- Z3 invariant proofs are enforced for quota and billing correctness.

Policy documents:
- `policies/` — Markdoc policy configs per agent
- `lib/dsg/policy-manifest.ts` — manifest builder
- `supabase/migrations/` — RLS hardening

**Approved by**: engineering lead (pending formal management review)

---

## 2. Risk Management

| Risk | Likelihood | Impact | Treatment |
|------|------------|--------|-----------|
| Hallucinated agent action | Medium | High | Evidence chain + human approval gate |
| Log tampering | Low | High | Append-only audit + RLS + record_hash unique |
| Auth bypass | Low | High | Org derivation from auth.uid(), RLS on every table |
| LLM prompt injection | Medium | Medium | Safe DOM verification, manifest check |

Risk register: see `/api/ccvs/compliance-status`

---

## 3. Objectives and Planning

- Maintain type-check clean and integration suite green for all non-environment-blocked paths.
- Retain 100% real SMT runtime verification for quota/billing before deployment.
- Keep CORS + Stripe webhook tests green before every release.

---

## 4. Competence and Awareness

- DSG Control Plane team trained on RLS policies, evidence-chain schema, and approval workflows.
- Customer-facing transparency: `/compliance/evidence` and `/compliance/eu-ai-act` pages disclose AI use.

---

## 5. Operating and Controlling AI

- Agent actions flow through `POST /api/agent/chat` → gate evaluation → spine pipeline.
- All decisions emit `gateway_monitor_events` and `dsg_governance_decision_events`.
- Finance actions require submit/approve/reject/escalate via `POST /api/finance-governance/submit`.

---

## 6. Performance Evaluation

- Benchmark suite: `npm run benchmark:full`
- CCVS evidence pipeline: `npm run ccvs:pipeline`
- Finance governance actions: `tests/integration/api/finance-governance-actions.test.ts`

Metrics reviewed monthly.

---

## 7. Continual Improvement

- Compliance gaps tracked in `docs/ACCENTURE_10Q_COMPLIANCE_MAPPING.md`.
- Known limitations documented in README.

---

*Last reviewed: 2026-06-23*
