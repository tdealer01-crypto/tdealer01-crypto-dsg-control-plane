---
name: z3-formal-solver-verification
description: |
  Verify deterministic gates and governance policies using hybrid Ising + Z3 formal solver pipeline.
  Use this skill whenever you need to: verify policy constraints formally, generate deterministic proofs for audit trails, detect violations and counterexamples, integrate formal proofs into CCVS evidence pipeline, or validate gate decisions using Z3 SMT solver.
  The skill coordinates a three-stage verification workflow: (1) Ising solver finds safe assignments matching policy requirements, (2) Agent processes results in parallel, (3) Z3 performs formal verification to detect violations.
  Triggers on: "verify policy", "formal proof", "check constraint", "Z3", "gate verification", "proof generation", "violation detection", "CCVS evidence", "deterministic proof", "counterexample", "satisfiability".
compatibility: |
  Requires: Z3 SMT solver (local or remote), Node.js 18+
  Integrates with: lib/dsg/deterministic/*, /api/dsg/v1/gates/evaluate, CCVS evidence pipeline
---

# Z3 Formal Solver Verification Skill

## Overview

This skill coordinates a **hybrid verification pipeline** combining Ising optimization, parallel agent processing, and Z3 formal verification to prove governance policies are sound and safe.

```
┌──────────────────────┐
│  Policy Constraint   │
│  + Requirement       │
└──────────┬───────────┘
           │
           ↓
┌──────────────────────────────────────┐
│ 1. Ising Solver                      │
│    Find safe values satisfying       │
│    policy + requirement              │
└──────────┬───────────────────────────┘
           │
           ↓
┌──────────────────────────────────────┐
│ 2. Agent (Parallel Processing)       │
│    Process assignments concurrently  │
│    Build candidate set               │
└──────────┬───────────────────────────┘
           │
           ↓
┌──────────────────────────────────────┐
│ 3. Z3 Formal Verification            │
│    Prove satisfiability              │
│    Detect violations                 │
│    Generate counterexamples          │
└──────────┬───────────────────────────┘
           │
           ↓
┌──────────────────────────────────────┐
│ 4. Action Layer                      │
│    Execute gate decision             │
│    Generate CCVS evidence            │
└──────────────────────────────────────┘
```

## When to Use This Skill

### Policy Constraint Verification
**Goal:** Prove a governance policy is satisfiable and sound.

**Example:**
```
Policy: "Approve action if risk_score < 50 AND user_role IN ['admin', 'operator']"
Task: Generate formal proof that this policy is satisfiable with example values.
```

**Skill handles:**
1. Ising finds safe assignment: {risk_score: 35, user_role: "admin"}
2. Agent validates assignment against policy rules
3. Z3 proves policy is SAT with model as evidence
4. Output: Proof hash, model (satisfying assignment), CCVS L1 evidence

### Deterministic Gate Validation
**Goal:** Generate replay-deterministic proofs for audit trails.

**Example:**
```
Gate Input: {policy_id: "gov-policy-v1", threshold: 50, action: "APPROVE"}
Task: Generate proof that proves same input → same output (deterministic).
```

**Skill handles:**
1. Ising solves gate constraints deterministically
2. Agent processes in parallel
3. Z3 generates proof hash + replay evidence
4. Output: Proof hash (deterministic), replay test data, CCVS L3 evidence

### Violation Detection
**Goal:** Detect unsatisfiable constraints and generate minimal counterexamples.

**Example:**
```
Policy: "Approve if risk < 50 AND risk >= 100" (contradiction)
Task: Prove policy is UNSAT and show why.
```

**Skill handles:**
1. Ising detects infeasibility
2. Agent attempts processing (fails safely)
3. Z3 generates UNSAT proof with minimal core
4. Output: UNSAT proof, violated constraints, counterexample, evidence

## How to Use

### Input Format

Provide a **policy specification** with constraints:

```json
{
  "policy_id": "gov-policy-v1",
  "description": "Governance policy for action approval",
  "constraints": [
    "risk_score >= 0 AND risk_score <= 100",
    "action_approval => risk_score < threshold",
    "user_role IN ['admin', 'operator', 'viewer']",
    "admin_approval => user_role == 'admin'"
  ],
  "variables": {
    "risk_score": {"type": "integer", "min": 0, "max": 100},
    "threshold": {"type": "integer", "min": 0, "max": 100},
    "user_role": {"type": "enum", "values": ["admin", "operator", "viewer"]},
    "action_approval": {"type": "boolean"},
    "admin_approval": {"type": "boolean"}
  },
  "goal": "Verify satisfiability and generate proof"
}
```

### Output Format

The skill produces **audit-ready evidence**:

```json
{
  "proof_status": "SATISFIABLE",
  "proof_hash": "sha256:abc123...",
  "model": {
    "risk_score": 35,
    "threshold": 50,
    "user_role": "admin",
    "action_approval": true,
    "admin_approval": true
  },
  "solver_calls": 3,
  "execution_time_ms": 8.88,
  "replay_deterministic": true,
  "ccvs_evidence": {
    "level": "L1",
    "schema": "z3-proof-v1",
    "proof_object": {...},
    "timestamp": "2026-07-23T12:58:00Z"
  }
}
```

## Workflow Steps

### Step 1: Policy Specification
Provide policy constraints in SMT-LIB or JSON format.

### Step 2: Ising Optimization
Ising solver finds safe value assignments that:
- Satisfy all constraints
- Minimize violations
- Maximize policy compliance

### Step 3: Agent Parallel Processing
Agent processes candidate assignments:
- Validates each assignment
- Builds evidence chains
- Prepares for Z3 verification

### Step 4: Z3 Formal Verification
Z3 performs formal proof:
- Proves satisfiability (SAT/UNSAT/UNKNOWN)
- Generates model (satisfying assignment) or counterexample (unsatisfiable core)
- Computes proof hash for replay verification

### Step 5: Action Execution
Based on Z3 result:
- **SAT:** Execute action with proof attached
- **UNSAT:** Block action, return violation evidence
- **UNKNOWN:** Use Ising advisory (safe fallback)

### Step 6: Evidence Generation
Produce CCVS-compatible evidence:
- L1: Z3 proof object
- L2: Proof + agent processing trace
- L3: Replay determinism verification
- L4: Formal property proof
- L5: Provenance + signature chain (optional)

## Integration Points

### DSG Deterministic Gate Scaffold
```
POST /api/dsg/v1/gates/evaluate
├─ Input: policy_id, constraints, variables
├─ Use Skill: z3-formal-solver-verification
└─ Output: proof_hash, proof_status, ccvs_evidence
```

### CCVS Evidence Pipeline
```
L1 (Unit): Z3 proof object
L2 (Integration): Ising + Agent + Z3 trace
L3 (Replay): Determinism verification
L4 (Mutation/Proof): Formal property invariants
L5 (Provenance): Build artifacts + signatures
```

### Credential Broker Integration
```
DSG Brain: Credential Lease
├─ Generate proof of credential access
├─ Use Skill: z3-formal-solver-verification
└─ Attach proof to audit trail
```

## Key Features

- ✅ **Ising Optimization:** Fast assignment finding for large constraint sets
- ✅ **Parallel Processing:** Agent processes candidates while Z3 works
- ✅ **Deterministic Proofs:** Same input → same proof hash (replay-safe)
- ✅ **Counterexample Generation:** UNSAT produces minimal violated core
- ✅ **CCVS Evidence:** L1-L5 evidence generation for compliance
- ✅ **Hybrid Fallback:** Z3 timeout → Ising advisory (graceful degradation)
- ✅ **Audit Trail:** All proofs timestamped and hashable for verification

## Examples

### Example 1: Simple Policy Verification

**Input:**
```
Policy: "Approve if risk < 50 AND role == admin"
Variables: risk [0-100], role [admin|user|guest]
Goal: Prove satisfiability
```

**Output:**
```
Status: SATISFIABLE ✅
Proof Hash: z3:abc123...
Model: {risk: 35, role: "admin"}
Execution: 8.88ms
Evidence: CCVS L1 + L3 (replay verified)
```

### Example 2: Contradiction Detection

**Input:**
```
Policy: "Approve if risk < 50 AND risk >= 100" (contradictory)
Goal: Detect UNSAT and show why
```

**Output:**
```
Status: UNSATISFIABLE ❌
Proof Hash: z3:def456...
UNSAT Core: [risk < 50, risk >= 100]
Execution: 2.14ms
Evidence: CCVS L1 + violation core + counterexample
```

### Example 3: Deterministic Gate (Replay Test)

**Input:**
```
Same policy and assignment as Example 1
Goal: Verify proof determinism (same input → same hash)
```

**Output:**
```
Status: SATISFIABLE ✅
Proof Hash: z3:abc123... (SAME as Example 1)
Replay Deterministic: TRUE ✅
Consistency: 100%
Evidence: CCVS L3 (replay verification)
```

## Troubleshooting

### Z3 Timeout
If Z3 solver times out (typically >30s):
- Fall back to Ising advisory
- Mark result as "UNKNOWN" with Ising recommendation
- Return fallback evidence for gate decision

### Infeasible Constraint Set
If Ising cannot find assignment:
- Return UNSAT immediately
- Generate minimal violated constraint core
- Suggest constraint relaxation

### Large Solution Space
If constraint space is very large:
- Use sampling to find representative assignment
- Verify sample with Z3
- Return sample + proof

## See Also

- `lib/dsg/deterministic/` — Deterministic gate scaffold
- `lib/dsg/brain/` — Credential broker integration
- `/api/dsg/v1/gates/evaluate` — DSG gate evaluation endpoint
- `lib/ccvs/` — CCVS evidence pipeline
- `Z3_FORMAL_SOLVER_README.md` — Complete Z3 implementation details
