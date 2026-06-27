# One-Pager: CISO / Compliance (Enterprise)
**Strategic Segment | 4–8 Week Sales Cycle | Evidence-Driven Buyer**

---

## Hook
> "EU AI Act (Aug 2026) mandates **provable AI governance** — not logging, not monitoring, but *preventive controls with deterministic evidence*. DSG ONE is the only control plane that gates AI actions *before* execution and emits SHA-256 audit chains mapped to Annex IV."

---

## Pain (Regulatory-Driven)
- **EU AI Act Art. 12/14:** High-risk AI systems require logging, human oversight, accuracy/robustness evidence
- **ISO 42001 / NIST AI RMF:** Governance framework demands *demonstrable* controls
- **Board pressure:** "Show me the agent can't exfiltrate data / double-spend / self-modify"
- **Current tools:** Observability = post-mortem. No preventive gate + evidence chain.

---

## Solution (Verified Capabilities)
| Requirement | DSG ONE Evidence (Verified) |
|-------------|------------------------------|
| **Pre-execution control** | `POST /api/dsg/v1/gates/evaluate` — stateless deterministic gate |
| **Tamper-evident audit trail** | SHA-256 chain: requestHash → decisionHash → recordHash → bundleHash |
| **Human oversight** | STABILIZE decision → requires human approval before execution |
| **Accuracy/robustness proof** | 8 Z3 SMT theorems (5 core + 3 DeFi, UNSAT = invariants hold) |
| **Transparency/logging** | Full execution trace with decision, reason, proof hash, latency |
| **Annex IV mapping** | `/api/compliance-evidence-pack/annex4` — live mapping |
| **CCVS Evidence Chain** | `/api/ccvs/compliance-status` — L1–L5 live status |
| **Risk classification** | Pipeline trace with per-plugin decision + proof |

---

## Proof You Can Review Today
| Artifact | URL | Use Case |
|----------|-----|----------|
| **Compliance Evidence Pack** | `/api/compliance-evidence-pack` | Procurement checklist |
| **EU AI Act Annex IV** | `/api/compliance-evidence-pack/annex4` | Regulatory submission |
| **CCVS L1–L5 Status** | `/api/ccvs/compliance-status` | Board reporting |
| **Evidence Chain** | `/api/ccvs/evidence-chain` | Auditor deep-dive |
| **Delivery Proof** | `/delivery-proof/report/{id}` | Vendor assessment |

---

## Offer
| Plan | Monthly | Enterprise Features |
|------|---------|---------------------|
| **Enterprise** | $999+ | SSO/SCIM, advanced SoD, evidence bundle export, governance onboarding, custom SLA |
| **Skill Pack: Compliance** | $249 | Annex IV mapping, evidence chain, drift detection, auditor portal |

---

## Pilot Proposal (30 Days)
1. **Evidence Pack Review** (Week 1) — We walk through Annex IV mapping with your compliance team
2. **Gate Configuration** (Week 1–2) — Map your AI agent policies to DSG gate rules
3. **Live Execution** (Week 2–4) — Run production agents through DSG gate
4. **Evidence Handoff** (Week 4) — You receive complete CCVS evidence chain + Annex IV mapping
5. **Decision** — Continue or export evidence for regulator submission

---

## CTA
> "Review our Compliance Evidence Pack against your EU AI Act checklist. If gaps exist, we'll show you exactly which gate rules close them."

---

## Truth Boundary (Critical — Do Not Overclaim)
| ✅ Verified / Audit-Ready | ❌ Not Claimed |
|---------------------------|----------------|
| Pre-execution deterministic gate | "Certified / Third-party audited" |
| SHA-256 evidence chain (WORM by construction) | "WORM-certified HSM/blockchain storage" |
| 8 Z3 theorems (5 core + 3 DeFi) — formally UNSAT | "Mathematically proven secure" |
| Annex IV mapping live & reviewable | "ISO 42001 / NIST AI RMF certified" |
| Cardholder data protected (no PII in proof) | "PCI DSS Level 1" |
| 2173 tests, mutation score 72.08% | "Zero defects" |

**Required language:** *"Pre-audit evidence mapping / audit-ready / production-connected"*  
**Forbidden:** *"Certified / production-ready / tamper-proof / third-party validated"*

---

## Competitive Positioning
| Vendor | Gap for CISO |
|--------|-------------|
| Vanta/Drata (compliance automation) | Post-hoc evidence collection, no *preventive* gate |
| Datadog/Splunk (observability) | Sees *after* AI acts — no blocking |
| API Gateways (Kong/Apigee) | No AI-specific policy engine, no deterministic proof |
| **DSG ONE** | **Only solution with *pre-execution gate* + *deterministic audit chain* + *Annex IV mapping*** |

---

## Next Step
**Schedule Evidence Pack Review** (60 min) → We map your Annex IV requirements to gate rules → You get gap analysis → 30-day pilot decision.