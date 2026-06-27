# DSG ONE — Go-to-Market Strategy & Business Opportunity Roadmap

**Prepared:** 2026-06-03  
**Status:** Ready for 1st customer acquisition  
**Verified evidence date:** 2026-06-03 (deployment tests, 1027 tests, 0 typecheck errors)

---

## Executive Summary

DSG ONE is a **pre-execution control and evidence layer for AI agents**. Core value proposition:

> **"Gate AI agents BEFORE they act. Not after the damage."**

Current state: **~85% feature-complete**, **production-connected** ✅ (live and responding), **audit-ready** for 3 Tier-1 products.

**Revenue opportunity (12 months):** $50K–200K MRR if Tier 1 products ship and acquire 5–10 pilot customers.

---

## Market Context

### Why DSG NOW?

1. **AI agent adoption exploding** — Claude Code, OpenHands, Aider, Kimi, GitHub Copilot all writing production code
2. **Governance gap widening** — enterprises want to control agents BEFORE they deploy, not after
3. **Regulatory pressure building** — EU AI Act (Aug 2026), ISO 42001, NIST AI RMF all require audit trails + human oversight
4. **Zero competitors with pre-execution gate + audit trail combo** — Vanta/Sonar do observability, not prevention

### Target Customer Profile (ICP)

| Segment | Company Size | Primary Buyer | Pain Point | Budget |
|---------|--------------|---------------|-----------|--------|
| **Tier A: Dev teams** | 50–500 eng | Engineering manager | "AI changes my code without approval" | $500–5K/mo |
| **Tier B: Enterprises** | 500+ | Security/CISO | "Need compliance proof for EU AI Act" | $10K–50K+/mo |
| **Tier C: SaaS platforms** | Any | Product manager | "Need AI governance in our product" | $1K–10K/mo |

### Addressable Market (TAM)

- **Dev teams w/ AI agents:** ~500K companies (small/mid-market)
- **EU AI Act compliance orgs:** ~50K enterprises in scope
- **SaaS platforms adding agents:** ~10K B2B SaaS companies

**Conservative wedge:** 50–100 customers in 12 months (dev + compliance), $100–300K ARR.

---

## Tier 1 Products (Ship Now — Next 2 Weeks)

### 1.1 GitHub Coding Agent Governance

**What:** Control Claude Code, OpenHands, Aider before they modify repo files.

**Status:** 90% complete
- ✅ Core execution handler (`/api/spine/execute`)
- ✅ Policy engine + gate logic (deterministic, no external solver)
- ✅ 1027 tests including adversarial/replay
- ✅ Audit trail + evidence hash lineage
- ⚠️ GitHub App integration not yet live

**MVP Scope:**
1. Propose CLI option: `claude code --dsg-gate`
2. Before each file edit → call `/api/spine/execute` with proposal
3. Return ALLOW/BLOCK decision + proof
4. Log to GitHub PR comment (audit trail)
5. Integrate with GitHub Actions (detect agent tool calls)

**Go-to-market:**
- **Target:** Developers worried about AI code changes
- **Pitch:** "AI agent proposes a change. You see it first. Full audit trail. No hidden mods."
- **Use case:** Protect critical files (lib/, migrations/, types/), enforce code review
- **Distribution:** 
  - GitHub Marketplace action: `dsg-secure-deploy-gate-action` (already listed)
  - npm package: `@dsg-platform/agent-governance` (new)
  - GitHub App: `DSG Agent Gate` (new)

**Pricing:**
- Freemium: 10 gates/month free
- Pro: $99/mo (unlimited gates, Slack/email notifications)
- Enterprise: custom (advanced policy editor, SSO)

**Revenue:** $20–50K/mo expected (200–500 dev teams)

**Success metric:** 100 active gate evaluations/day by month 3

---

### 1.2 Compliance Proof / Audit Report API

**What:** Export governance evidence as audit-ready reports (EU AI Act, ISO 42001, NIST RMF).

**Status:** 85% complete
- ✅ Evidence collector + CCVS matrix implemented
- ✅ Hash chain + lineage present
- ✅ Audit trail JSON ready
- ⚠️ Export schema needs UI polish + sample reports

**MVP Scope:**
1. `POST /api/compliance-export` — request audit pack for date range
2. Response: JSON with all evidence + hashes + lineage
3. Render as HTML report (styling + legal footer)
4. Shareable link (Supabase-backed report storage)
5. API for automated compliance submission

**Go-to-market:**
- **Target:** Compliance, legal, risk teams
- **Pitch:** "Generate audit-ready compliance evidence automatically. Support EU AI Act, ISO 42001, NIST."
- **Use case:** Export proof for audit, regulatory review, customer due diligence
- **Distribution:**
  - Web UI: `/compliance-evidence-pack`
  - REST API: `/api/compliance-export`
  - Zapier/Make.com integration (future)

**Pricing:**
- Freemium: 1 export/month
- Standard: $199/mo (10 exports, premium formatting)
- Enterprise: custom (unlimited, white-label, custom frameworks)

**Revenue:** $20–50K/mo expected (20–50 enterprises at $500–2K/mo each)

**Success metric:** 50+ unique exports/month by month 3

---

### 1.3 Deterministic Policy Gate SDK

**What:** REST API + npm SDK to evaluate policies before AI/agent execution.

**Status:** 90% complete
- ✅ `/api/dsg/v1/gates/evaluate` working (16 KB payload, 60 req/min)
- ✅ Policy manifest, proof endpoint present
- ✅ TypeScript static verification working (no external Z3)
- ⚠️ npm SDK not published; TypeScript types incomplete

**MVP Scope:**
1. Publish npm package: `@dsg-platform/gates`
2. Provide TypeScript types for request/response
3. Example: Next.js middleware integration, Express middleware
4. GitHub integration: auto-gate PRs that touch sensitive paths
5. MCP server integration (gates as MCP tool)

**Go-to-market:**
- **Target:** Platform teams, SaaS builders, API-driven workflows
- **Pitch:** "Stateless deterministic gate. No external solver. Works on edge."
- **Use case:** MCP server gate, Vercel function guard, API middleware
- **Distribution:**
  - npm: `@dsg-platform/gates`
  - GitHub App: `DSG Policy Gate Action`
  - MCP server tool (in Hermes Agent Control Center)

**Pricing:**
- Freemium: 100 gates/day free
- Pro: $299/mo (unlimited, webhooks, analytics)
- Enterprise: custom (dedicated policy, SLA)

**Revenue:** $10–30K/mo expected (100–200 dev teams, 10–20 platforms)

**Success metric:** 50K gate evaluations/month by month 3

---

## Tier 2 Products (Ship 1–2 Weeks After Tier 1)

### 2.1 Enterprise Agent Approval Center (Dashboard)

**What:** Dashboard for org admins to approve/reject agent actions before execution.

**Status:** 70% complete
- ✅ Database schema (agent ledger, approval workflow)
- ✅ Real-time approval routing
- ⚠️ UI/UX approval flow needs final design + E2E testing

**MVP:** Approval queue showing pending agent actions (who, what, when, risk score). Approve/reject/request changes. Real-time Slack/email notification.

**Revenue:** $5–20/user/month (per-seat SaaS model)

**Timeline:** 1–2 weeks build + 1 week customer testing

---

### 2.2 Vercel / GitHub Production Readiness Gate

**What:** Pre-deploy check — verify repo health, CI, migrations, secrets before green-lighting.

**Status:** 60% complete
- ✅ `/api/readiness` + `/api/health` core checks present
- ✅ DB migration validation logic exists
- ⚠️ GitHub Actions + Vercel webhook not yet live

**MVP:** GitHub App that checks before merge (CI pass, migrations applied, typecheck pass, no hardcoded secrets).

**Revenue:** $20–50/month per repo (freemium 10/month free)

**Timeline:** 1–2 weeks build

---

## Tier 3 Products (Build 2–4 Weeks After Tier 1)

### 3.1 Hermes Controlled Executor (LLM Planning)

**What:** AI plans workflow → DSG approves → executor runs with credential leases → conformance validation.

**Status:** 50% complete (scaffold present)
- ⚠️ `proposePlan()` is placeholder (no live Claude API integration yet)
- ⚠️ Credential rotation, external vaulting not hardened
- ⚠️ Shell executor limited to allowlisted commands

**MVP scope:** Integrate Claude API for plan generation. Test credential leasing. Hardened secret handling.

**Revenue:** $0.10–1.00 per execution + $500–5K/mo enterprise seat

**Timeline:** 2–4 weeks full implementation

---

### 3.2 Android DSG Agent

**What:** Lightweight local-first agent (scheduler, skills, Telegram gateway, local API port 8642).

**Status:** 40% complete (separate codebase)
- ✅ Kotlin framework, local API, scheduler present
- ⚠️ Integration with control plane needs hardening
- ⚠️ Local API CORS permissive (not internet-hardened)

**Revenue:** Mobile app + premium skills ($4.99–9.99/mo)

**Timeline:** 2–4 weeks harden security + E2E testing

---

## Implementation Roadmap (Next 8 Weeks)

### Week 1–2: Launch Tier 1 (All 3 Products)

| Product | Owner | Task | Status |
|---------|-------|------|--------|
| GitHub Agent Governance | Eng | Publish npm SDK + GitHub App + docs | start |
| Compliance Proof API | Eng + design | Polish export schema, create sample reports, UI | start |
| Policy Gate SDK | Eng | Publish npm, TypeScript types, MCP integration | start |
| Marketing | PMM | 1-pager per product, pricing page, landing page | start |
| Demo | PMM | 1 live demo video (agent → gate → report) | start |

### Week 3–4: Customer Acquisition (Tier 1)

| Activity | Owner | Target | Status |
|----------|-------|--------|--------|
| Pilot customers (3) | PMM | dev teams + compliance team | start |
| Case studies (1) | PMM + cust | publish 1 customer story | start |
| Launch Marketplace (GitHub) | Eng | list all 3 products in GitHub Marketplace | start |
| Community outreach | PMM | ProductHunt, HN, Twitter thread | start |

### Week 5–6: Gather Feedback + Tier 2 Launch

| Product | Owner | Task | Status |
|---------|-------|------|--------|
| Tier 1 improvements | Eng | bug fixes, feature requests from pilots | ongoing |
| Admin Dashboard (Tier 2.1) | Eng | build approval queue UI + E2E tests | start |
| Readiness Gate (Tier 2.2) | Eng | GitHub Actions integration + Vercel webhook | start |

### Week 7–8: Tier 2 Launch + Tier 3 Planning

| Product | Owner | Task | Status |
|---------|-------|------|--------|
| Tier 2 launch | PMM | case studies, pricing, onboarding docs | start |
| Hermes LLM integration | Eng | Claude API `messages` for planning | design |
| Android hardening | Eng | security audit + credential sync | design |

---

## Revenue Model & Pricing

### Tier 1 Products (SaaS Usage-Based + Freemium)

| Product | Freemium | Pro/Standard | Enterprise | Projected ARR |
|---------|----------|-------------|-----------|--------------|
| GitHub Agent Governance | 10 gates/mo free | $99/mo | custom | $20–50K/mo |
| Compliance Proof API | 1 export/mo free | $199/mo | custom | $20–50K/mo |
| Policy Gate SDK | 100 gates/day | $299/mo | custom | $10–30K/mo |
| **Total Tier 1** | — | — | — | **$50–130K/mo** |

### Tier 2–3 Products (After PMF)

| Product | Model | Projected |
|---------|-------|-----------|
| Admin Dashboard | $5–20/user/month | $10–30K/mo |
| Readiness Gate | $20–50/repo/mo | $10–20K/mo |
| Hermes Executor | $0.10–1.00/exec + $500–5K/mo | $20–50K/mo |
| **Total Tier 2–3** | — | **$40–100K/mo** |

**Conservative 12-month target: $50K–200K MRR ($600K–2.4M ARR)**

---

## Customer Acquisition Strategy

### Phase 1 (Weeks 1–4): Seed Pilot Customers

**Target:** 3 pilot customers (1 dev team, 1 compliance team, 1 platform)

**Approach:**
- Direct outreach to top 20 companies using Claude Code
- Email: "Free pilot program — control AI agents in your GitHub repos"
- Offer: Free Tier 1 products for 3 months + weekly calls
- Goal: 2 customer success stories + testimonials

**Channels:**
- GitHub discussions (AI governance channels)
- ProductHunt (front page post)
- Twitter/X (thread about AI governance)
- Direct email to dev leaders

### Phase 2 (Weeks 5–8): Community + Marketplace

**Channels:**
- GitHub Marketplace listings (all 3 products)
- npm registry (`@dsg-platform/*`)
- Product Hunt (follow-up "Show HN")
- Hacker News (GitHub Marketplace launch story)
- Slack communities (AI, DevOps, compliance channels)

**Content:**
- Blog: "Why AI agents need gatekeeping" (SEO target: "AI governance", "AI control plane")
- Docs: Getting started guides (5 min to first gate evaluation)
- Video: 2-min demo (agent proposes change → DSG gates it → audit report)

### Phase 3 (Weeks 9–12): Enterprise Sales

**After 3 customers:** Build case studies + pricing page.

**Sales approach:**
- Target: Security/CISO teams at 50–500 person companies
- Pitch: "EU AI Act compliance proof + agent control in one platform"
- Sales cycle: 2–4 weeks (because product is ready, not a demo)

---

## Marketing Positioning

### For Dev Teams (Tier 1.1)
**Headline:** "AI agents shouldn't change your code without approval."  
**Proof:** "Gate every edit. See exactly what Claude Code proposes before it lands."  
**CTA:** "Try free GitHub App"

### For Compliance Teams (Tier 1.2)
**Headline:** "EU AI Act evidence. Automatically."  
**Proof:** "Export audit-ready compliance pack. Support all major frameworks."  
**CTA:** "See sample report"

### For Platform Builders (Tier 1.3)
**Headline:** "Stateless, edge-ready policy gates for AI."  
**Proof:** "No external solver. Fast. Works in Vercel Functions, MCP, edge compute."  
**CTA:** "npm install @dsg-platform/gates"

### Brand Tagline
> **"DSG ONE: Gate AI before it acts."**

---

## Key Success Metrics

| Metric | Target (Month 3) | Target (Month 6) | Target (Month 12) |
|--------|------------------|------------------|-------------------|
| **GitHub Agent Governance** | 100 active orgs | 500 orgs | 2K orgs |
| **Compliance Proof API** | 50 exports/mo | 500/mo | 2K/mo |
| **Policy Gate SDK** | 50K evals/mo | 500K/mo | 2M/mo |
| **Tier 1 MRR** | $10K | $50K | $130K |
| **Tier 2–3 MRR** | $2K | $15K | $70K |
| **Total ARR** | $144K | $780K | $2.4M |
| **Customer count** | 15 | 50 | 150+ |

---

## Risks & Mitigation

| Risk | Mitigation |
|------|-----------|
| GitHub competition (GitHub Copilot gates) | Move fast on Tier 1, build moat via compliance + Hermes |
| Low product-market fit | Pilot with 3 customers first; iterate before full GTM |
| Pricing resistance | Freemium model + usage-based removes friction |
| Complex sales (enterprise) | Start with dev-friendly products to build brand; enterprise follows |
| Security concerns (credential broker) | Don't claim production-grade secret rotation until hardened; upgrade after Series A |

---

## Next Steps (Today)

1. ✅ **Fix docs** — remove Z3 runtime claims, add production-connected clarification (done)
2. ✅ **Verify deployment** — confirm health/readiness/agent-status live (done, all pass 2026-06-03)
3. **Create 3 product landing pages** (Vercel `/products/*` routes)
4. **Publish npm SDK** for Policy Gate (`@dsg-platform/gates`)
5. **GitHub App** for Agent Governance
6. **Reach out to 3 pilot customers** (by EOW)
7. **ProductHunt post** (launch as soon as npm SDK ready)

---

## Success Criteria for Launch

Before claiming "ready to sell":

- [ ] 3 Tier 1 products documented + working
- [ ] npm `@dsg-platform/*` packages published
- [ ] GitHub App live in Marketplace
- [ ] 1st customer live and using (proving PMF)
- [ ] Case study + pricing page published
- [ ] $1K+ MRR from real customers

---

**GTM Owner:** Product/marketing  
**Engineering Lead:** Eng team (Tier 1 products)  
**Launch Target:** EOW June 10, 2026 (1 week from today)

