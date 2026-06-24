# DSG ONE — Product Hunt Launch Kit

> พร้อม paste เลย — ทุกช่องที่ PH ต้องการ

---

## 📌 Basic Info

**Name:** DSG ONE

**Tagline (60 chars max):**
> Governed AI execution — policy gate every agent action

**Website:** https://tdealer01-crypto-dsg-control-plane.vercel.app

**Topics (pick 5):**
- Artificial Intelligence
- Developer Tools
- Open Source
- SaaS
- Security

---

## 📝 Description (260 chars)

```
DSG ONE is an AI runtime control plane. Every agent action goes through a policy gate (ALLOW/BLOCK/REVIEW) before execution. Full audit chain, Hermes chat dashboard, marketplace, and Stripe billing — deploy in one click.
```

---

## 🖼️ Gallery Assets (copy for each screenshot)

### Screenshot 1 — Hermes Agent Dashboard
**Caption:** Real-time AI agent dashboard with streaming chat, tool calling, and audit log

### Screenshot 2 — Policy Gate Decision
**Caption:** Every action gets ALLOW / BLOCK / REVIEW — with reason, actor, and SHA-256 audit block

### Screenshot 3 — Marketplace
**Caption:** Submit products to the DSG ONE marketplace with validation, image upload, and instant listing

### Screenshot 4 — Audit Chain
**Caption:** Tamper-evident SHA-256 audit blocks — every action chains to the previous hash

### Screenshot 5 — Health Dashboard
**Caption:** Production health: core ✅ DB ✅ rate limiter ✅ — real-time readiness checks

---

## 💬 First Comment (Maker Comment)

```
Hey Product Hunt! 👋

I built DSG ONE because AI agents making autonomous decisions felt like running code with no tests and no logs.

The core idea: every agent action passes through a **policy gate** before it executes.
- ALLOW → runs immediately
- REVIEW → waits for human operator approval
- BLOCK → rejected with reason logged

Everything is chained in SHA-256 audit blocks — like a mini blockchain for your AI actions.

**What's live today:**
✅ Hermes dashboard — streaming chat with Claude, tool calling, session memory
✅ Policy gate — ALLOW / BLOCK / REVIEW on every execution
✅ Audit chain — SHA-256 linked blocks, verifiable chain
✅ Marketplace — submit & discover AI products
✅ Stripe billing — quota enforcement, usage metering
✅ GitHub App — gate every PR automatically

**Deploy to Vercel in one click** — all env vars are documented.

Happy to answer any questions. What governance problem are you dealing with? 🙏
```

---

## 🐦 X / Twitter Launch Thread

**Tweet 1 (main):**
```
Just launched DSG ONE on Product Hunt 🚀

AI agents without governance = chaos.

DSG ONE puts a policy gate in front of every agent action:
→ ALLOW, BLOCK, or send to REVIEW

SHA-256 audit chain + Hermes dashboard + one-click Vercel deploy

PH link 👇 [link]
```

**Tweet 2:**
```
The hardest part of running AI agents in production isn't the model.

It's answering: "What did it do? Why? Who approved it?"

DSG ONE solves this with tamper-evident audit blocks — every action hashes to the previous one.

Like git blame, but for AI decisions.
```

**Tweet 3:**
```
3 things that work out of the box with DSG ONE:

1. Install GitHub App → every PR gets a governance check automatically
2. Click "Deploy to Vercel" → live in 5 min
3. Open Hermes → stream AI chat with full audit trail

No config files. No YAML. Just works.

Try it → [link]
```

---

## 💼 HackerNews — Show HN Post

**Title:**
```
Show HN: DSG ONE – Open-source AI runtime governance with policy gate and audit chain
```

**Body:**
```
Hi HN,

I built DSG ONE after realizing that most AI agent frameworks focus on what the agent CAN do, but not on controlling WHAT it actually does in production.

DSG ONE adds a governance layer between user intent and agent execution:

1. Every action is classified (deploy / edit_code / run_test / answer)
2. It goes through a preflight check (risk level, actor role, org plan)
3. Decision: ALLOW → runs | REVIEW → waits for human | BLOCK → logged and rejected
4. The result is written to a SHA-256 audit chain (each block hashes to the previous)

**What's live:**
- Hermes dashboard: streaming chat with Claude, tool calling, session memory
- Policy gate: configurable per org, per role
- Audit chain: verifiable, non-editable after write
- Marketplace: product listing with Stripe checkout
- GitHub App: governance check on every PR

**Stack:** Next.js 15, Supabase, Anthropic Claude, Vercel, Stripe

**One-click deploy:** https://vercel.com/new/clone?repository-url=https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane

**Repo:** https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane

The audit chain is the part I'm most interested in feedback on. Current design: server-side SHA-256, each block includes index + timestamp + action + actor + data + previousHash. Not distributed, but tamper-evident within the system boundary. Thoughts on what real enterprise users would need here?
```

---

## 📦 Vercel Marketplace Template Submission

**Template Name:** DSG ONE Control Plane

**Short description:**
```
Governed AI runtime with policy gate, SHA-256 audit chain, Hermes agent dashboard, marketplace, and Stripe billing
```

**Category:** AI & Machine Learning

**Required env vars:**
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY
NEXTAUTH_SECRET
STRIPE_SECRET_KEY (optional)
STRIPE_PUBLISHABLE_KEY (optional)
```

**Demo URL:** https://tdealer01-crypto-dsg-control-plane.vercel.app

**GitHub repo:** https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane

---

## 📋 AI Directory Submissions (paste into each site)

### Futurepedia / There.com / TopAI.tools

**Name:** DSG ONE
**Category:** AI Agents / Developer Tools / Enterprise AI
**Pricing:** Free tier + paid plans
**Description:**
```
DSG ONE is an open-source AI runtime control plane. It puts a policy gate in front of every AI agent action — ALLOW, BLOCK, or send to human review. Includes SHA-256 audit chain, Hermes streaming chat dashboard, marketplace, GitHub App integration, and Stripe billing. One-click deploy to Vercel.
```
**Website:** https://tdealer01-crypto-dsg-control-plane.vercel.app
**Tags:** AI governance, agent framework, audit trail, policy gate, enterprise AI

---

*Generated: 2026-06-20 | Update evidence section before launch*
