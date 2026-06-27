# One-Pager: Finance Ops (CFO / Finance Manager)
**Quick-Win Segment | 2–4 Week Sales Cycle | Self-Service Buyer**

---

## Hook
> "Your payment approvals run through email and spreadsheets. When audit asks *who approved what and why*, you rebuild the story from memory. DSG ONE gates every payment **before** it executes — with auditable proof."

---

## Pain (Verified in Market)
- **Audit prep:** ~10 hrs/month manual evidence gathering
- **Double-spend risk:** Automation/agents can trigger duplicate payments
- **No accountability:** No immutable record of *who* approved *what* and *why*
- **Exception handling:** Urgent payments bypass controls silently

---

## Solution (Verified in Code)
| Capability | Endpoint | What It Does |
|------------|----------|--------------|
| Pre-execution gate | `POST /api/execute` | Checks policy, quota, replay protection *before* action |
| Maker-checker enforcement | `lib/gateway/approval-queue.ts` | Requires 2-person approval for high-risk actions |
| Exception handling | `lib/gateway/exception-posture.ts` | Controlled escalation with full audit trail |
| Audit export (JSON/CSV) | `/dashboard/export` | Secret-masked, ready for auditors |
| Decision Explainer | `/dashboard/executions` | Human-readable ALLOW/STABILIZE/BLOCK + reason |

---

## Proof You Can Show Today
1. **Live demo:** `https://tdealer01-crypto-dsg-control-plane.vercel.app/demo`
2. **Delivery Proof scan** (5 checks): `/api/delivery-proof/scan`
3. **Decision Explainer** — see governance decision in plain language
4. **Audit export sample** — download JSON/CSV with masked secrets

---

## Offer
| Plan | Monthly | Includes |
|------|---------|----------|
| **Skill Pack: Finance Governance** | $199 | Maker-checker, exception handling, audit export, approval dashboards |
| **Pro** | $99 | 10K executions, 60 req/min, 10 agents, PDF export |
| **Business** | $299 | 100K exec, 300 req/min, 50 agents, audit ledger |

---

## Pilot Proposal (14 Days)
1. Pick **one** payment approval workflow (e.g., vendor invoices >$10K)
2. We configure gate policy together (30 min call)
3. Run 14 days → you get audit-ready export of all decisions
4. Compare: manual prep time vs. DSG ONE auto-export

**Zero integration risk** — runs alongside existing process, no migration needed.

---

## CTA
> "Run a 14-day pilot on one workflow. If audit prep doesn't drop by 80%, walk away."

---

## Truth Boundary (Critical — Do Not Overclaim)
| ✅ Verified | ❌ Not Claimed |
|-------------|----------------|
| Gate executes before action | "Prevents all fraud" |
| SHA-256 audit chain (WORM by construction) | "WORM-certified storage" |
| Quota enforcement with 402 response | "Usage-based metered billing" |
| Audit export with secret masking | "Third-party certified" |
| EU AI Act Annex IV mapping live | "ISO 42001 certified" |

**Say:** *"audit-ready / pre-audit evidence mapping"*  
**Never say:** *"certified / production-ready / tamper-proof storage"*

---

## Competitive Differentiation
| Tool | Gap |
|------|-----|
| Spreadsheet + Email | No audit trail, no prevention |
| ERP workflow | No AI agent governance, rigid |
| Observability (Datadog) | Sees *after* payment executes |
| **DSG ONE** | **Gates *before* + immutable proof** |

---

## Next Step
**Book 15-min pilot scoping call** → We map your one workflow → You get audit export template → Pilot starts same week.