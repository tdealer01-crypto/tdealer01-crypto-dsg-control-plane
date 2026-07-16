# DSG ONE Pitch Deck Outline

> **Source:** AI_MARKET_ANALYSIS_2026.md + verified codebase
> **Truth Boundary:** Product capabilities = verified from code; TAM/MRR/CAC = projections only
> **Status:** Production-connected (not production-ready/certified per evidence-first policy)

---

## Slide 1: Title
**DSG ONE** — Deterministic Security Gateway  
*Govern AI agent actions before they reach production*  
Block before the AI agent acts — not after the damage is done.

---

## Slide 2: The Problem (Verified)
| Pain Point | Evidence |
|------------|----------|
| AI agents execute actions *before* human review | `POST /api/spine/execute` runs *after* gate decision, not before |
| No tamper-evident audit trail for agent actions | WORM hash chain: requestHash → decisionHash → recordHash → bundleHash |
| Observability tools only see *after* damage | Pre-execution gate at `/api/dsg/v1/gates/evaluate` (stateless, edge-ready) |
| Audit prep takes ~10 hrs/month manually | Automated JSON/CSV export with secret masking |
| EU AI Act / ISO 42001 require *provable* controls | Annex IV mapping live at `/api/compliance-evidence-pack/annex4` |

---

## Slide 3: Solution — What DSG ONE Actually Does (Verified)
```
AI Agent → [DSG Gate: policy + replay + quota + evidence] → Execute / Block / Stabilize
              ↓
        SHA-256 Audit Chain (WORM by construction)
              ↓
        Decision Explainer (ALLOW/STABILIZE/BLOCK + human reason)
              ↓
        Exportable Evidence (Delivery Proof, Compliance Pack, Audit Trail)
```

**Key differentiator:** Prevention *before* execution + deterministic proof (Z3 SMT-verified)

---

## Slide 4: Verified Capabilities (Not Claims)
| Capability | Endpoint | Status |
|------------|----------|--------|
| Agent provisioning + API key (`dsg_live_...`) | `POST /api/agents` | ✅ Live |
| Governed execution with decision + proof | `POST /api/execute` | ✅ Live |
| Stateless deterministic gate (edge-ready) | `POST /api/dsg/v1/gates/evaluate` | ✅ Live |
| Delivery Proof scan (5 checks) | `/api/delivery-proof/scan` | ✅ Live |
| Compliance Evidence Pack + Annex IV | `/api/compliance-evidence-pack/annex4` | ✅ Live |
| CCVS Evidence Chain (L1–L5) | `/api/ccvs/compliance-status` | ✅ Live |
| Audit export JSON/CSV (secret masking) | `/dashboard/export` | ✅ Live |
| Quota enforcement (402 on exceeded) | `lib/usage/quota.ts` | ✅ Live |
| Flat-tier subscription (Pro $99, Biz $299, Ent $999) | `lib/stripe-products.ts` | ✅ Live |
| 2173 tests passing, mutation score 72.08% | CI pipeline | ✅ Verified |

---

## Slide 5: What We DON'T Claim (Truth Boundary)
| ❌ Not Claimed | ✅ What We Say |
|----------------|----------------|
| "Production-ready" | "Production-connected" |
| "Certified / Third-party audited" | "Audit-ready / Pre-audit evidence mapping" |
| "WORM-certified storage" | "SHA-256 hash chain, tamper-evident by construction" |
| "Usage-based metered billing active" | "Flat-tier quota; metering code wired into execution but Stripe meter env not yet configured" |
| "SDK one-liner connect" | "SDK ready, not yet published to npm" |
| "SLA 99.9%" | "No SLA claimed" |

---

## Slide 6: Three Go-to-Market Spears
```
                    ┌─────────────────┐
                    │ Proof-led       │
                    │ Marketing       │
                    │ (Shareable      │
                    │  Delivery Proof)│
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ Finance Ops   │    │ CISO /        │    │ Dev Teams     │
│ Quick-win     │    │ Compliance    │    │ Developer-led │
│ (CFO/Mgr)     │    │ (Enterprise)  │    │ (Freemium)    │
│ $199–999/mo   │    │ $999+/mo      │    │ $99/mo        │
│ 2–4 wk cycle  │    │ 4–8 wk cycle  │    │ Bottom-up     │
│ Decision: own │    │ Evidence Pack │    │ SDK + GH App  │
└───────────────┘    └───────────────┘    └───────────────┘
```

---

## Slide 7: Land-and-Expand Model
1. **Land** → Delivery Proof Report (free/one-time) → friction-free proof of value
2. **Convert** → Trial → Pro ($99) → Business ($299) → Enterprise ($999) — quota is natural expansion axis
3. **Expand** → Skill packs per persona (Finance $199, Compliance $249, Dev $99, Ops $149, Bundle $599)

---

## Slide 8: Growth Loop (Built In, Not Bolted On)
```
Customer runs Delivery Proof
        ↓
Gets shareable public link: /delivery-proof/report/{run_id}
        ↓
Shares with: Client (Agency) / Board (Compliance) / Teammates (Ops)
        ↓
Each viewer sees: Decision Explainer + Audit Trail + Compliance Mapping
        ↓
"Who built this?" → DSG ONE → Viral acquisition
```

---

## Slide 9: Competitive Positioning
| Vendor Type | Focus | Gap |
|-------------|-------|-----|
| **Observability (Datadog, etc.)** | Post-action metrics/logs | Sees damage *after* |
| **Orchestration (LangChain, etc.)** | Agent workflow builder | No governance layer |
| **API Gateways (Kong, etc.)** | Traffic management | No AI-specific policy engine |
| **DSG ONE** | **Pre-execution gate + deterministic audit** | **Blue ocean** |

**Message:** *"You see before the AI acts. Audit trail complete."*

---

## Slide 10: Priority Roadmap (Action Priorities)
| # | Action | Timeline | Blocked By |
|---|--------|----------|------------|
| 1 | **Publish SDK to npm + GitHub App** | Week 1 | — |
| 2 | **Configure Stripe meter env + test meter emission** | Week 2 | SDK |
| 3 | **3 Finance Ops pilots → case studies** | Weeks 2–6 | — |
| 4 | **Optimize Delivery Proof sharing** | Week 2 | — |
| 5 | **CISO/Enterprise pipeline** | Weeks 4–12 | Case studies |

---

## Slide 11: Ask / Next Steps
- **SDK/GitHub App review** → Ready for `npm publish` + GitHub App creation
- **Pilot partners** → 3 Finance Ops teams for 14-day trial
- **Content** → Case study template from pilot data
- **Scale** → Developer-led funnel once SDK live

---

## Appendix: Verified Endpoints (For Technical Buyers)
```
POST   /api/agents                    → Create agent, returns dsg_live_ key
POST   /api/execute                   → Governed execution (spine)
POST   /api/dsg/v1/gates/evaluate     → Stateless gate (edge-ready)
GET    /api/usage                     → Quota info
GET    /api/delivery-proof/scan       → 5-check delivery proof
GET    /api/compliance-evidence-pack  → Compliance pack
GET    /api/compliance-evidence-pack/annex4 → EU AI Act Annex IV
GET    /api/ccvs/compliance-status    → CCVS L1–L5 status
GET    /api/ccvs/evidence-chain       → SHA-256 evidence chain
```