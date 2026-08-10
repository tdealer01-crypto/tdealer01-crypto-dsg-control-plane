# Encoding Proof Gate Policy Constraints

This document specifies the 8 validation constraints that the Encoding Proof Gate applies to QUBO and Ising encodings.

## Policy Version: 1.0

Effective: August 2026

---

## Constraint 1: linear_terms_valid (CRITICAL)

**Policy ID**: `enc_policy_01`

**Objective**: Ensure all linear coefficients are well-formed numbers with valid indices.

**Applies To**: 
- QUBO: `linear[]` array
- Ising: `h[]` array

**Validation Rules**:
1. Each term must have a non-negative integer index
2. Index must be strictly less than `variableCount`
3. Weight must be a real number (not NaN, not Infinity)
4. Weight can be positive, negative, or zero
5. Weight is stored and validated as string for precision

**Failure Conditions**:
- Any weight is NaN or Infinity
- Index >= variableCount
- Index is negative
- Weight is not a valid number

**Error Example**:
```
❌ {"index": 5, "weight": "NaN"} → NaN weight
❌ {"index": 10, "weight": "1.0"} → index 10, variableCount=5
❌ {"index": -1, "weight": "1.0"} → negative index
```

**Pass Example**:
```
✓ {"index": 0, "weight": "2.5"}
✓ {"index": 4, "weight": "-1.2"}
✓ {"index": 2, "weight": "0"}
```

---

## Constraint 2: quadratic_terms_valid (CRITICAL)

**Policy ID**: `enc_policy_02`

**Objective**: Ensure quadratic terms form a valid symmetric matrix.

**Applies To**: 
- QUBO: `quadratic[]` array
- Ising: `j[]` array

**Validation Rules**:
1. Each term must have non-negative integers i, j
2. Both i and j must be strictly less than `variableCount`
3. Weight must be a real number (not NaN, not Infinity)
4. Matrix must be symmetric: if (i,j) exists, (j,i) must not appear (handled by solver convention)
5. No duplicate edges: at most one entry per (i,j) pair

**Failure Conditions**:
- Any weight is NaN or Infinity
- i or j >= variableCount
- i or j is negative
- Duplicate (i,j) pairs detected
- Asymmetric edges (both (0,1) and (1,0) as separate entries)

**Error Example**:
```
❌ {"i": 0, "j": 1, "weight": "NaN"}
❌ {"i": 0, "j": 5, "weight": "1.0"} → j >= variableCount
❌ [
     {"i": 0, "j": 1, "weight": "1.0"},
     {"i": 0, "j": 1, "weight": "2.0"}  ← duplicate
   ]
❌ [
     {"i": 0, "j": 1, "weight": "3.14"},
     {"i": 1, "j": 0, "weight": "3.14"}  ← asymmetry
   ]
```

**Pass Example**:
```
✓ {"i": 0, "j": 1, "weight": "3.14"}
✓ {"i": 0, "j": 0, "weight": "1.0"}  (diagonal allowed)
✓ [{"i": 0, "j": 1, "weight": "1.0"}, {"i": 2, "j": 3, "weight": "2.0"}]
```

---

## Constraint 3: dimension_within_bounds (HIGH)

**Policy ID**: `enc_policy_03`

**Objective**: Enforce maximum problem size limit.

**Policy Limit**: `MAX_VARIABLES = 62`

**Validation Rules**:
1. `variableCount` must be a positive integer
2. `variableCount` must be <= 62
3. `variableCount` should match the maximum index in linear/quadratic terms

**Rationale**: 
- Exhaustive enumeration is 2^n. Current deterministic simulator can handle 2^62.
- Larger problems require heuristic/quantum approaches or sampling.

**Failure Conditions**:
- `variableCount` > 62
- `variableCount` <= 0
- Largest index in terms >= variableCount

**Error Example**:
```
❌ {"variableCount": 100}
❌ {"variableCount": 0}
❌ {"variableCount": 10, "linear": [{"index": 15, "weight": "1.0"}]}
```

**Pass Example**:
```
✓ {"variableCount": 10}
✓ {"variableCount": 62}
✓ {"variableCount": 32}
```

---

## Constraint 4: coefficient_magnitude_bounded (HIGH)

**Policy ID**: `enc_policy_04`

**Objective**: Prevent numerical overflow and solver instability.

**Policy Limit**: `MAX_COEFFICIENT_MAGNITUDE = 1e6`

**Validation Rules**:
1. All coefficients (constant, linear, quadratic) must have absolute value <= 1e6
2. This includes negative coefficients: |-999999.9| <= 1e6
3. Zero coefficients are allowed

**Rationale**: 
- Avoids floating-point overflow in solver computation
- Prevents numerical precision loss
- Keeps energy values in reasonable range for Z3 verification

**Failure Conditions**:
- |coefficient| > 1e6
- Example: 1e7, -1.5e7, etc.

**Error Example**:
```
❌ {"weight": "1.5e7"}     → 15,000,000 > 1e6
❌ {"weight": "-1.2e7"}    → |-12,000,000| > 1e6
❌ {"constant": "1e6"}     → Boundary case, but allowed
```

**Pass Example**:
```
✓ {"weight": "999999"}
✓ {"weight": "-999999.9"}
✓ {"constant": "1000"}
✓ {"weight": "0"}
```

---

## Constraint 5: no_nan_or_infinity (CRITICAL)

**Policy ID**: `enc_policy_05`

**Objective**: Catch floating-point edge cases.

**Validation Rules**:
1. No NaN values anywhere in the encoding
2. No Infinity or -Infinity values
3. Applies to: constant, all linear weights, all quadratic weights

**Failure Conditions**:
- Any coefficient is NaN
- Any coefficient is Infinity or -Infinity
- String representation is "NaN", "Infinity", "-Infinity", "Inf", etc.

**Error Example**:
```
❌ {"constant": "NaN"}
❌ {"constant": "Infinity"}
❌ {"weight": "-Infinity"}
❌ {"weight": "1.0/0"}  (evaluates to Infinity)
```

**Pass Example**:
```
✓ {"constant": "0"}
✓ {"constant": "-1000000"}
✓ {"weight": "1e-6"}  (very small is OK)
```

---

## Constraint 6: no_duplicate_edges (HIGH)

**Policy ID**: `enc_policy_06`

**Objective**: Ensure QUBO/Ising matrix is well-formed without redundancy.

**Validation Rules**:
1. In quadratic terms, each (i,j) pair appears at most once
2. For any unordered pair {i,j}, only one entry should exist
3. Self-loops (i,j with i=j) are allowed and unique

**Failure Conditions**:
- Same (i,j) pair appears twice
- Same (i,j) and (j,i) both appear as separate entries

**Error Example**:
```
❌ [
     {"i": 0, "j": 1, "weight": "1.0"},
     {"i": 0, "j": 1, "weight": "2.0"}  ← duplicate
   ]
❌ [
     {"i": 0, "j": 1, "weight": "1.0"},
     {"i": 1, "j": 0, "weight": "1.0"}  ← both orderings
   ]
```

**Pass Example**:
```
✓ [{"i": 0, "j": 1, "weight": "1.0"}]
✓ [{"i": 0, "j": 0, "weight": "1.0"}, {"i": 0, "j": 1, "weight": "1.0"}]
✓ [{"i": 0, "j": 1}, {"i": 2, "j": 3}]  (all unique pairs)
```

---

## Constraint 7: variable_naming_consistent (MEDIUM)

**Policy ID**: `enc_policy_07`

**Objective**: Ensure variable indices are consistent throughout.

**Validation Rules**:
1. All variable indices must be in range [0, variableCount - 1]
2. No index >= variableCount
3. No index < 0
4. Sparse representation is OK (not all indices need to appear)

**Failure Conditions**:
- Any index in linear or quadratic terms >= variableCount
- Any negative index
- Index out of bounds

**Error Example**:
```
❌ variableCount=5, linear=[{"index": 7, "weight": "1.0"}]  → 7 >= 5
❌ variableCount=5, quadratic=[{"i": 0, "j": -1, "weight": "1.0"}]
```

**Pass Example**:
```
✓ variableCount=10, linear=[{"index": 0}, {"index": 9}]  (sparse OK)
✓ variableCount=5, quadratic=[{"i": 2, "j": 3}]
```

---

## Constraint 8: encoding_type_matches (HIGH)

**Policy ID**: `enc_policy_08`

**Objective**: Ensure encoding structure matches declared type.

**Validation Rules**:

**For QUBO-v1**:
1. `kind` must be exactly "qubo-v1"
2. Must use `linear` and `quadratic` field names (not `h`, `j`)
3. `objective` should be "min" or "max" (typically "min")
4. `variableCount` must be positive integer

**For Ising-v1**:
1. `kind` must be exactly "ising-v1"
2. Must use `h` and `j` field names (not `linear`, `quadratic`)
3. `objective` should be "min" or "max"
4. `variableCount` must be positive integer

**Failure Conditions**:
- Wrong field names for type
- Wrong `kind` string
- Mixing QUBO and Ising field names

**Error Example**:
```
❌ kind="qubo-v1" but uses h/j fields (Ising style)
❌ kind="ising-v1" but uses linear/quadratic fields (QUBO style)
❌ kind="qubo-v2" (unsupported version)
```

**Pass Example**:
```
✓ {
    "kind": "qubo-v1",
    "variableCount": 10,
    "linear": [...],
    "quadratic": [...],
    "objective": "min"
  }

✓ {
    "kind": "ising-v1",
    "variableCount": 10,
    "h": [...],
    "j": [...],
    "objective": "min"
  }
```

---

## Decision Logic

### PASS Decision

All 8 checks must return TRUE for PASS status.

**Implication**: Encoding conforms to all structural, semantic, and policy constraints. Safe to submit to solver.

### BLOCK Decision

Any of the following trigger BLOCK:
1. Any CRITICAL check (1, 2, 5) fails
2. Two or more HIGH/MEDIUM checks fail
3. Error in constraint evaluation itself

**Implication**: Encoding does not conform to policy. Must be corrected before proceeding. No solver invocation.

### REVIEW Decision

One or more HIGH/MEDIUM check fails, but no CRITICAL failure.

**Implication**: Encoding has issues that require manual review. Flag for operator attention before production.

---

## Policy Update History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-08-10 | Initial policy: 8 constraints, PASS/BLOCK/REVIEW |

---

## Appendix: Implementation Notes

### Numerical Precision

- Coefficients stored as strings to preserve precision during JSON serialization
- Validation should parse strings to numbers for magnitude checks
- Floating-point comparison should use epsilon for near-equality (not needed here, but noted)

### Performance

- Each constraint check should complete in < 10ms
- Total validation < 100ms for most problems
- Caching by encodingHash prevents redundant validation

### Backward Compatibility

- Encoding Proof Gate is optional during rollout phase
- Legacy encodings without proofs can still be verified (Cinema handles it)
- Migration window: 2 weeks after production deploy
