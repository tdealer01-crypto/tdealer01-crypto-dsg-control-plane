# 🔐 DSG: Deterministic Execution & Governance

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Build](https://img.shields.io/badge/Build-Pass-brightgreen)](https://vercel.com)
[![Tests](https://img.shields.io/badge/Tests-Phase%208--9D%20Complete-brightgreen)](https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane/actions)
[![Security](https://img.shields.io/badge/Security-0%20Critical-brightgreen)](./docs/SECURITY.md)
[![License](https://img.shields.io/badge/License-MIT-blue)](./LICENSE)
[![CodeQL](https://img.shields.io/badge/CodeQL-Pass-brightgreen)](https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane/security/code-scanning)

> **Production AI governance platform. Formal proofs. Evidence-backed. Enterprise-ready.**

**Live Demo:** https://tdealer01-crypto-dsg-control-plane.vercel.app

---

## The Problem

Traditional AI systems can't be audited. They make decisions, but you can't:
- ✗ Reproduce the decision (non-deterministic)
- ✗ Prove it followed policy (no verification)
- ✗ Show evidence to regulators (no audit trail)
- ✗ Certify it for compliance (no formal proof)

## The Solution: DSG

**DSG is policy-controlled AI that proves every decision.**

```
Policy → Deterministic Solver → Formal Proof → Execution → Evidence
         (Z3/QUBO)              (SHA-256)      (recorded)  (auditable)
```

**Every decision is:**
- ✅ **Deterministic** — same input always produces same output
- ✅ **Provable** — backed by Z3 formal verification
- ✅ **Auditable** — full evidence chain with SHA-256 hashing
- ✅ **Compliant** — CCVS L1-L5 evidence artifacts included

---

## What is DSG?

**A runtime governance engine for AI agents**

Instead of letting AI decide directly, DSG:

1. **Policy Input** — Define rules in natural language (Thai/English supported)
2. **Deterministic Gate** — Route through Z3 SMT solver or QUBO optimizer
3. **Formal Verification** — Generate cryptographic proof (NVIDIA HPC + Z3)
4. **Execution** — Run agent with provable decision context
5. **Evidence** — Record audit trail with compliance artifacts

**Result:** AI decisions that can be replayed, audited, and certified 2+ years later.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│ Client / Agent Request (Policy in Thai/English)              │
└──────────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────────┐
│ Policy Parser & Constraint Normalizer                         │
└──────────────────────────────────────────────────────────────┘
                         ↓
        ┌────────────────┴────────────────┐
        ↓                                  ↓
  ┌─────────────┐             ┌──────────────────┐
  │ Z3 Solver   │             │ QUBO Optimizer   │
  │ (Formal     │             │ (NVIDIA Ising)   │
  │ Verification)             │ (advisoryonly)   │
  └─────────────┘             └──────────────────┘
        ↓                                  ↓
        └────────────────┬────────────────┘
                         ↓
         ┌─────────────────────────────┐
         │ DSG Policy Gate             │
         │ (Decision + Proof)          │
         └─────────────────────────────┘
                         ↓
         ┌─────────────────────────────┐
         │ Deterministic Execution     │
         │ (Z3/QUBO result applied)    │
         └─────────────────────────────┘
                         ↓
         ┌─────────────────────────────┐
         │ Evidence Store (Supabase)   │
         │ + SHA-256 Merkle Ledger     │
         │ (Auditable 2+ years)        │
         └─────────────────────────────┘
```

---

## Core Features

| Feature | Why It Matters |
|---------|---|
| **Z3 Formal Verification** | Every decision has a cryptographic proof |
| **Deterministic Execution** | Replay any decision with same inputs → same output |
| **Evidence Chain** | CCVS L1-L5 compliance artifacts auto-generated |
| **Policy Gateway** | Define rules once, enforce everywhere (no hardcoding) |
| **Audit Trail** | Full SHA-256 hashed ledger, queryable back years |
| **Multi-Solver** | QUBO (NVIDIA Ising) + Z3 (formal), pick best fit |

---

## How It Compares

| Capability | DSG | LangGraph | OpenAI Agents | Temporal |
|------------|-----|-----------|---------------|----------|
| Deterministic execution | ✅ | Partial | ❌ | Partial |
| Formal proof (Z3) | ✅ | ❌ | ❌ | ❌ |
| Evidence chain | ✅ | ❌ | ❌ | ❌ |
| Policy governance | ✅ | Partial | Partial | Partial |
| Compliance artifacts | ✅ | ❌ | ❌ | ❌ |
| Runtime gate | ✅ | Partial | ❌ | Partial |

---

## Production Status

| Check | Status | Notes |
|-------|--------|-------|
| **Build** | ✅ | Next.js production build |
| **TypeScript** | ✅ | Type-safe, `tsc --noEmit` clean |
| **Tests** | ✅ 3091/3091 | Zero failures (79 opt-in skipped) |
| **Security** | ✅ | 0 critical/high vulnerabilities |
| **Deployment** | ✅ | Live on Vercel (commit `59ebb27`), NVIDIA API key configured |
| **CI/CD** | ✅ | GitHub Secrets configured (Supabase, Stripe, Anthropic) |
| **Phase 5** | ✅ | Complete security test coverage (unit, integration, failure) |
| **Phase 8-9D** | ✅ | DSG Infrastructure Control Plane (Vault, Event Bus, Resolver) |

---

## Phase 5: Comprehensive Security Testing

**Complete test coverage for DSG security posture:**

### Unit Tests (Security Foundation)
- ✅ **Audit Trail Integrity** — SHA-256 hash-chain validation, deterministic hashing, append-only semantics
- ✅ **Secret Management** — Timing-safe token comparison, credential broker pattern, rotation support
- ✅ **Wallet Signatures** — Ethereum address validation, EIP-191 message prefix, replay attack prevention
- ✅ **LLM Integration** — Server-side API key handling, graceful degradation, risk assessment parsing

### Integration Tests (End-to-End Security)
- ✅ **Audit Trail Flow** — Batch creation, hash chain linking, runtime commit RPC, multi-batch ordering
- ✅ **OAuth 2.0 + PKCE** — Code challenge generation, state token TTL, token exchange, CSRF prevention
- ✅ **Policy Evaluation** — CRUD operations, rule evaluation (amount_threshold, rate_limit, time_window), approval workflow
- ✅ **Row-Level Security** — Multi-tenant organization isolation, RLS policy enforcement, cross-org access prevention

### Failure & Adversarial Tests (Resilience)
- ✅ **Timeout Handling** — Fails safe to REVIEW (never ALLOW), audit trail recording
- ✅ **Invalid Token Rejection** — Malformed tokens, expired tokens, invalid signatures, timing-safe comparison failure
- ✅ **Tampered Hash Detection** — Chain breaks, modification detection, deterministic hashing verification
- ✅ **Missing Credentials** — Graceful degradation (Anthropic, Supabase, Stripe), fallback behavior
- ✅ **Injection Prevention** — SQL injection, XSS escaping, JSON structure validation
- ✅ **Race Condition Prevention** — Atomic operations, concurrent approval handling, double-spend prevention

**Test Files:** 283 files across unit, integration, failure, and e2e suites

---

## Phase 8-9D: DSG Infrastructure Control Plane (One-Time Setup)

**Transform manual infrastructure provisioning into intelligent, automated setup.**

### What's New

The DSG Infrastructure Control Plane enables:

1. **AI-Driven Discovery** — Analyze your project (GitHub URL, docker-compose.yml, package.json) and auto-detect infrastructure needs
2. **Connector Manifest System** — Each connector (GitHub, Stripe, Vercel, Supabase, OpenAI) declares capabilities declaratively
3. **Capability Engine** — Query "Who can create_secret?" instead of hard-coding provider logic
4. **Dependency Graph Resolver** — Automatically compute optimal provisioning order with topological sort
5. **Universal Vault** — Store OAuth tokens, API keys, SSH keys, certificates with AES-256-GCM encryption
6. **Event Bus (Pub-Sub)** — Loose coupling between setup components; audit trail via immutable hash-chain
7. **Provision Planner** — Generate execution plan with canonical hash for approval + verification
8. **Controlled Executor** — Run phases in order; rollback on failure; checkpoint for resumability

### Architecture

```
User Project Import
  ↓
Discovery: Detect services (Next.js, PostgreSQL, Stripe)
  ↓
Plan: Build phases with dependencies (GitHub → Supabase → Vercel → Stripe)
  ↓
Approval: User reviews + confirms canonical hash
  ↓
Execute: Run phases (parallel where safe); record audit trail
  ↓
Complete: Infrastructure ready, credentials stored securely
```

### Core Modules

| Module | Purpose |
|--------|---------|
| `lib/dsg/setup/manifest/` | Connector capability declarations |
| `lib/dsg/setup/capabilities/` | Capability query engine |
| `lib/dsg/setup/discovery/` | AI + heuristic project analysis |
| `lib/dsg/setup/resolver/` | Dependency graph (topological sort) |
| `lib/dsg/setup/planner/` | Orchestration + approval workflow |
| `lib/dsg/setup/vault/` | Multi-type secret storage (OAuth, SSH, etc.) |
| `lib/dsg/setup/events/` | Event bus + audit trail (hash-chain) |
| `lib/dsg/setup/connectors/` | Connector implementations |

### APIs

```http
POST /api/dsg-setup/analyze          # Discover infrastructure needs
POST /api/dsg-setup/plan             # Build execution plan
POST /api/dsg-setup/approve          # Approve with canonical hash
POST /api/dsg-setup/execute          # Start execution
GET  /api/dsg-setup/status/:id       # Poll progress
GET  /api/dsg-setup/connectors       # List available providers
GET  /api/dsg-setup/vault/secrets    # List stored credentials
```

### Status

- ✅ **Deployed to Production** — Commit `59ebb27` (2026-07-10)
- ✅ **Build:** TypeScript compilation clean
- ✅ **Testing:** Unit, integration, e2e tests passing
- ✅ **Security:** Credential encryption (AES-256-GCM), RLS policies, OAuth PKCE
- ✅ **Database:** 9 new tables (manifests, plans, executions, credentials, audit)

---

## Quick Start

**Installation (5 minutes):**

```bash
# 1. Clone
git clone https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane.git
cd tdealer01-crypto-dsg-control-plane

# 2. Install & configure
npm install
cp .env.example .env.local
# Add your Supabase + Stripe keys

# 3. Run locally
npm run dev
# Open http://localhost:3000/dashboard

# 4. Run tests
npm test
```

**Deploy to Vercel (1 click):**
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/import/project?template=https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane)

---

## Latest Updates

✅ **Phase 8-9D: DSG Infrastructure Control Plane** (Deployed 2026-07-10)
- AI-driven project discovery (detects Next.js, databases, services)
- Connector manifest system + capability engine (provider-agnostic)
- Dependency resolver with topological sort (automatic phase computation)
- Universal vault for OAuth tokens, SSH keys, certificates (AES-256-GCM)
- Event bus pub-sub architecture + immutable audit trail (hash-chain)
- Provision planner + controlled executor (checkpointing + rollback)
- 9 new database tables, 8 commits, all TypeScript errors fixed
- **Status:** ✅ Live on production (commit `59ebb27`)

✅ **NVIDIA LLM Advisory Verifier** (PR #868 merged)
- NVIDIA `ising-calibration-1-35b-a3b` as secondary LLM analysis layer
- Deterministic solver stays in control; LLM only analyzes/flags issues
- 18/18 tests passing, all network calls mocked for CI safety

✅ **Full API Security Audit** (PR #858-#859 merged)
- Closed 4 unauthenticated mutation routes
- Fixed cross-org data leak in Supabase views
- Added regression test to prevent future gaps

✅ **NVIDIA HPC Formal Verification** (PR #857 merged)
- Containerized Z3 SMT solving
- Parallel CCVS evidence generation (L1-L5)

---

## Explore Further

| Document | For Whom | Read Time |
|----------|----------|-----------|
| **[Architecture Deep Dive](./docs/ARCHITECTURE.md)** | Engineers | 15 min |
| **[Security Audit](./docs/SECURITY.md)** | Security teams | 10 min |
| **[Z3 Formal Verification](./docs/VERIFICATION.md)** | Researchers | 20 min |
| **[Thai PageAgent Integration](./lib/page-agent/README.md)** | Thai users | 5 min |
| **[Marketplace Setup](./MARKETPLACE.md)** | Operators | 10 min |
| **[Compliance Guide](./docs/COMPLIANCE.md)** | Auditors | 15 min |
| **[API Reference](./docs/API.md)** | Developers | 20 min |

---

## Extensions (Optional)

**Core features work standalone. Add these as needed:**

- **Trinity Multi-Agent** — AI workflow orchestration
- **Solana Integration** — Blockchain settlement layer
- **Thai Language Agent** — Natural language policy in Thai
- **Stripe Marketplace** — Revenue & billing integration
- **PageAgent** — Autonomous web interaction agent

---

## Get Support

- 📖 **Docs:** https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane/tree/main/docs
- 🐛 **Issues:** https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane/issues
- 💬 **Discussions:** https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane/discussions
- 📧 **Email:** contact@dsg.pics

---

## License

MIT — [See LICENSE](./LICENSE)

**Latest:** ✅ NVIDIA LLM Advisory Verifier (PR #868 merged) · ✅ Full API security audit (4 routes fixed, CI regression test added)
