# DSG Architecture Deep Dive

## Overview

DSG (Deterministic Execution & Governance) is a runtime governance engine that makes AI decisions provable and auditable.

```
Client Request
    ↓
Policy Parser (Thai/English support)
    ↓
Constraint Normalizer
    ↓
    ├─ QUBO Builder (for optimization problems)
    ├─ Z3 Encoder (for logic/constraint problems)
    └─ Hybrid Router (complexity-based selection)
    ↓
    ├─ Z3 SMT Solver (formal verification)
    └─ QUBO Optimizer (NVIDIA Ising + fallback)
    ↓
DSG Policy Gate
  - Compares deterministic result with optional LLM advisory
  - Deterministic verdict ALWAYS decides (LLM never overrides)
  - Disagreement flags for human review
    ↓
Deterministic Execution
  - Apply solver result
  - Execute agent/workflow with proven context
    ↓
Evidence Store (Supabase)
  - SHA-256 hashed proof chain
  - CCVS L1-L5 compliance artifacts
  - Auditable 2+ years back
```

## Core Layers

### 1. Policy Parser
Converts natural language policies to structured constraints

### 2. Constraint Normalizer
Normalizes constraints to QUBO or Z3 format

### 3. Solver Router
Routes problems to Z3 or QUBO based on complexity:
- Small problems (complexity < 50): Use Z3 (faster)
- Large optimization (complexity > 50): Use QUBO + Z3 verification

### 4. Z3 Formal Verification
Z3 SMT Solver verifies all solutions against constraints

### 5. QUBO Optimizer (NVIDIA Ising)
QUBO optimization for large combinatorial problems

### 6. LLM Advisory Verifier (Optional)
NVIDIA `ising-calibration-1-35b-a3b` provides secondary analysis
- Never modifies solution
- Deterministic verdict always wins
- Disagreement flags for human review

### 7. DSG Policy Gate
Combines deterministic result with optional LLM advisory

### 8. Evidence Store
Records proof chain with SHA-256 hashing for auditability

## Performance

| Operation | Time |
|-----------|------|
| Policy Parse | 10-50ms |
| Constraint Normalize | 20-100ms |
| Z3 Solve (small) | 100-500ms |
| Z3 Solve (medium) | 500ms-2s |
| QUBO Optimize | 100-1000ms |
| Evidence Record | 10-50ms |
| **Total Pipeline** | **300-1500ms** |

## Determinism Guarantee

Same input + seed → Same output always

```
quboHash + solverVersion + solverSeed + normalizationVersion
→ Identical proof hash
→ Reproducible decision
```

See [VERIFICATION.md](./VERIFICATION.md) for details.
