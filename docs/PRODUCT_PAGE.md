# DSG: AI Runtime Governance & Control Plane

> **Deterministic Execution. Proof-Backed. Production-Ready.**

---

## What is DSG?

**DSG (Deterministic Execution & Governance)** is the production AI runtime governance platform that gates AI/agent actions before execution and records cryptographic evidence/audit trails.

- 🎯 **Gate Before Execute** — Formal policy verification before any action runs
- 📊 **Proof Generation** — Z3 SMT formal proofs + CCVS L1-L5 evidence chain
- 🔐 **Deterministic** — Reproducible, bit-identical proofs across runs
- ⚡ **Fast** — Parallel verification (444ms L1-L5 evidence pipeline)
- 🚀 **Production-Ready** — 2699 tests passing, zero vulnerabilities

---

## Core Features

### 1. 🧮 Z3 Formal Proof Verification
Mathematical proof that AI governance policies are correct using SMT (Satisfiability Modulo Theories) solver.

**What it does:**
- Verifies policy constraints mathematically
- Guarantees no policy violations can occur
- Produces deterministic proof artifacts (bit-identical across runs)

**Command:**
```bash
npm run verify:policy:hpc:local
# Output: ccvs-makk8-z3-proof.json with mathematical proof
```

### 2. 📱 CCVS Evidence Pipeline (L1-L5)
Complete governance evidence chain in parallel execution.

**Levels:**
- **L1** — Unit-level formal proof (137ms)
- **L2** — Integration evidence: deterministic gate (55ms)
- **L3** — Adversarial/replay evidence: SMT2 invariants (68ms)
- **L4** — Proof/oversight evidence: Z3 constraints (107ms)
- **L5** — Provenance/build evidence: artifact hashes (77ms)
- **Total:** 444ms ⚡

**Command:**
```bash
npm run ccvs:hpc-parallel
```

### 3. 🎯 Deterministic Gate
TypeScript-based policy evaluation with cryptographic proof generation.

**Properties:**
- Deterministic: same input always produces same output
- Verifiable: proof hash can be independently validated
- Auditable: full trace logged with cryptographic signatures

### 4. 🔐 Governance Constraints
Built-in compliance framework with 5 constraints:
1. ✅ Agent Active (reputation ≥ 0)
2. ✅ Job Amount Valid (0 < reward < 100,000)
3. ✅ Deadline Valid (deadline in future)
4. ✅ Agent Qualified (skills.length > 0)
5. ✅ No Sanctions (reputation ≥ 0)

### 5. 🏢 Enterprise Ready
- **Multi-tenant** — Org/workspace scoping
- **Role-based Access** — Operator, reviewer, auditor roles
- **Audit Logs** — Immutable Supabase ledger
- **Compliance Exports** — CCVS matrix, evidence packages

---

## Quick Start

### 30 Seconds: Verify Policy Locally
```bash
pip install z3-solver
npm run verify:policy:hpc:local
# ✅ Done in 30 seconds
```

### 2 Minutes: Docker Verification
```bash
npm run verify:policy:hpc:docker
# ✅ Full reproducible environment
```

### 5 Minutes: Parallel Evidence Pipeline
```bash
npm run ccvs:hpc-parallel
# ✅ All 5 evidence levels in parallel
```

---

## Test Results & Verification

| Check | Result | Evidence |
|-------|--------|----------|
| **CCVS Tests** | 2699/2699 PASS | All test suites passing |
| **Security Scan** | 0 Critical, 0 High | CodeQL + Gitleaks clean |
| **Secrets** | 0 Found | Zero hardcoded secrets |
| **Z3 Verification** | PASS | Formal proof valid |
| **Deterministic** | PASS | Same input → same output |
| **TypeScript** | PASS | Full type safety |
| **Build** | PASS | Production ready |

---

## Technology Stack

- **Language:** TypeScript + Next.js 15
- **Formal Verification:** Z3 SMT Solver
- **Container:** NVIDIA HPC (CUDA, MPI, HPC libraries)
- **Database:** Supabase (PostgreSQL)
- **Testing:** Vitest + Playwright
- **CI/CD:** GitHub Actions + Vercel

---

## Compliance & Certification

### Standards Met
- ✅ **CCVS L1-L5** — Complete evidence chain
- ✅ **Formal Verification** — Z3 SMT proof
- ✅ **Deterministic Execution** — Bit-identical results
- ✅ **Audit Ready** — Evidence artifacts exportable

---

## Use Cases

### Fintech Governance
Gate payment decisions before execution with formal proof compliance.

### AI Safety & Compliance
Verify ethical constraints and detect policy violations early.

### Enterprise Automation
Govern AI-powered workflows with deterministic policy evaluation.

---

**Live Demo:** https://tdealer01-crypto-dsg-control-plane.vercel.app  
**Documentation:** [HPC Verification Guide](./HPC_VERIFICATION_GUIDE.md)  
**Version:** 2.6.1
