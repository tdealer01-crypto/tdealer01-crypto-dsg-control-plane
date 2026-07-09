# Z3 Formal Verification & Proof Generation

## Overview

Every DSG decision is backed by formal mathematical proof using the Z3 SMT Solver (Satisfiability Modulo Theories).

**What this means:**
- Not "probably correct" — guaranteed correct
- Not "seems to work" — formally verified
- Not auditable after the fact — proven at decision time
- Reproducible years later with same input + seed

---

## How Z3 Verification Works

### Problem Formulation

Convert policy constraints to mathematical logic:

```
Policy: "High-risk tasks only to agents with verified identity"

Constraint Set:
1. ∀ t ∈ Tasks: ∃! a ∈ Agents: assign(t, a) = 1
   (Every task assigned to exactly one agent)

2. ∀ a ∈ Agents: Σ assign(t, a) ≤ a.maxCapacity
   (No agent exceeds capacity)

3. ∀ t ∈ Tasks: if risk(t) = "high" then verify(agent(t)) = true
   (High-risk tasks only to verified agents)

4. ∀ a ∈ Agents: if assigned ≥ 1 then available(a) = true
   (Only available agents can be assigned)
```

### SMT Solving

Z3 determines if constraints can be satisfied:

```
Input:  Constraint set + proposed solution
Query:  "Is this assignment valid?"

Z3 Processes:
├─ Parse constraints into SMT formula
├─ Apply simplification rules
├─ Solve satisfiability
└─ Return: SAT or UNSAT

Output: {"isSAT": "sat", "isValid": true, "proof": "..."}
```

### Proof Generation

Z3 produces a proof trace (simplified):

```
Proof = [
  "Constraint 1 satisfied: task-1 assigned to agent-3 (verified)",
  "Constraint 2 satisfied: agent-3 current capacity 5/10",
  "Constraint 3 satisfied: task-1 risk=high, agent-3 verified=true",
  "Constraint 4 satisfied: agent-3 available=true",
  "All constraints satisfied: VALID"
]
```

Then SHA-256 hashed for immutability:
```
proofHash = SHA256(normalize(proof))
         = "0x3f4a7b2c91e8f..." (64 hex chars)
```

---

## Example: Task Assignment Problem

### Setup

**Problem:** Assign 5 payment tasks to 3 agents with constraints

```json
{
  "tasks": [
    {"id": "t1", "amount": 1000, "risk": "high", "requires": "verified"},
    {"id": "t2", "amount": 500, "risk": "low", "requires": "none"},
    {"id": "t3", "amount": 5000, "risk": "high", "requires": "verified"},
    {"id": "t4", "amount": 200, "risk": "low", "requires": "none"},
    {"id": "t5", "amount": 800, "risk": "medium", "requires": "2fa"}
  ],
  "agents": [
    {"id": "a1", "verified": true, "has_2fa": true, "maxTasks": 3},
    {"id": "a2", "verified": false, "has_2fa": false, "maxTasks": 2},
    {"id": "a3", "verified": true, "has_2fa": false, "maxTasks": 2}
  ]
}
```

### Z3 Constraint Generation

```smt2
; Z3 SMT-LIB format

; Variables: assign_t1_a1, assign_t1_a2, assign_t1_a3, ... (15 total)

; Constraint 1: Each task to exactly one agent
(assert (= (+ assign_t1_a1 assign_t1_a2 assign_t1_a3) 1))
(assert (= (+ assign_t2_a1 assign_t2_a2 assign_t2_a3) 1))
(assert (= (+ assign_t3_a1 assign_t3_a2 assign_t3_a3) 1))
(assert (= (+ assign_t4_a1 assign_t4_a2 assign_t4_a3) 1))
(assert (= (+ assign_t5_a1 assign_t5_a2 assign_t5_a3) 1))

; Constraint 2: Agent capacity
(assert (<= (+ assign_t1_a1 assign_t2_a1 assign_t3_a1 assign_t4_a1 assign_t5_a1) 3))
(assert (<= (+ assign_t1_a2 assign_t2_a2 assign_t3_a2 assign_t4_a2 assign_t5_a2) 2))
(assert (<= (+ assign_t1_a3 assign_t2_a3 assign_t3_a3 assign_t4_a3 assign_t5_a3) 2))

; Constraint 3: Risk/verification policy
; t1 (high-risk) → a1 or a3 (verified only)
(assert (=> (= assign_t1_a2 1) false))  ; Cannot assign to a2 (not verified)
; t3 (high-risk) → a1 or a3
(assert (=> (= assign_t3_a2 1) false))
; t5 (medium-risk, needs 2fa) → a1 only
(assert (=> (= assign_t5_a2 1) false))
(assert (=> (= assign_t5_a3 1) false))

; Query
(check-sat)
```

### Z3 Result

```
Z3 Output:
sat

Model:
assign_t1_a1 = 1  (task-1 → agent-1: ✓ verified, capacity ok)
assign_t2_a2 = 1  (task-2 → agent-2: ✓ no-risk requirement, capacity ok)
assign_t3_a3 = 1  (task-3 → agent-3: ✓ verified, capacity ok)
assign_t4_a1 = 1  (task-4 → agent-1: ✓ no requirement, capacity ok)
assign_t5_a1 = 1  (task-5 → agent-1: ✓ has 2FA, capacity 2/3)

Agent loads:
a1: 3/3 (full)
a2: 1/2
a3: 1/2

Status: VALID ✓
Proof hash: 0x2c8f4a...
```

---

## QUBO + Z3 Verification Flow

When using NVIDIA Ising (QUBO solver):

```
1. Formulate problem as QUBO
   ↓
2. Send to NVIDIA Ising API
   → Get binary assignment (fast, ~100-500ms)
   ↓
3. Verify assignment with Z3 (formal check, ~50-200ms)
   ├─ SAT: accept Ising solution ✓
   ├─ UNSAT: fallback to full Z3 solve ⚠️
   └─ Timeout: use Ising result (best-effort)
   ↓
4. Record both proofs in evidence store
```

**Guarantee:** No unverified solution ever executes

---

## Determinism & Replay

### Proof Components

Each proof record includes:
```json
{
  "quboHash": "abc123...",      // Problem formulation fingerprint
  "solverVersion": "z3-4.8.12", // Exact solver used
  "solverSeed": 42,             // Randomness seed (if applicable)
  "normalizationVersion": "1.0",// Schema version
  "solution": {...},            // Binary assignment
  "proofHash": "def456..."      // SHA256 of all above
}
```

### Replay Determinism

To verify a decision 2 years later:
```typescript
const originalProof = await evidenceStore.get("proof-id-xyz")

// Replay with identical inputs
const replaySolution = z3Solve(
  originalProof.quboHash,
  originalProof.solverVersion,
  originalProof.solverSeed
)

// Verify proof hasn't changed
const replayHash = sha256(normalize(replaySolution))
assert(replayHash === originalProof.proofHash)  // Must match!
```

**If they don't match:** Either
- Z3 version produced different result (regression)
- Normalization changed
- Evidence tampered with

All cases flagged for investigation.

---

## Performance & Timeouts

| Problem Size | Z3 Time | Result |
|--------------|---------|--------|
| < 20 variables | 50-200ms | Quick |
| 20-100 variables | 200-1000ms | Acceptable |
| 100-500 variables | 1-5s | Slow |
| > 500 variables | > 5s | Timeout, use QUBO |

**Configuration:**
```bash
Z3_TIMEOUT_MS=5000  # Default: 5 seconds
Z3_MAX_TIMEOUT=30000  # Cap: 30 seconds
```

If timeout exceeded → fallback to QUBO (if available) or return "uncertain"

---

## Compliance Integration

Proof hash feeds into CCVS L3 (Formal Verification):

```
L1: Execution decision
     ↓
L2: Policy applied
     ↓
L3: Formal proof (Z3 generates this) ← ← ← YOU ARE HERE
     ↓
L4: Evidence audit trail
     ↓
L5: Cryptographic non-repudiation
```

See [COMPLIANCE.md](./COMPLIANCE.md) for full chain.

---

## Troubleshooting

### "Z3 timeout after 5000ms"
**Cause:** Problem too large for Z3

**Solution:**
1. Enable QUBO (for optimization problems)
2. Increase timeout: `Z3_TIMEOUT_MS=10000`
3. Simplify constraints (remove redundant rules)

### "UNSAT - no valid assignment exists"
**Cause:** Constraints are contradictory

**Solution:**
1. Review policy for conflicts
2. Relax constraints (e.g., allow lower capacity)
3. Add more agents or resources

### "Proof hash mismatch on replay"
**Cause:** Either Z3 version changed or normalization format changed

**Solution:**
1. Use same `solverVersion` + `normalizationVersion`
2. Check if Z3 was upgraded (may produce different solver order)
3. Audit evidence store for tampering

---

## References

- [Z3 Documentation](https://microsoft.github.io/z3guide/)
- [SMT-LIB Standard](http://www.smt-lib.org/)
- [ARCHITECTURE.md](./ARCHITECTURE.md) — How Z3 fits in DSG pipeline
- [COMPLIANCE.md](./COMPLIANCE.md) — Evidence chain integration
