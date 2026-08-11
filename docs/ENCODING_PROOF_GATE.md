# Encoding Proof Gate Specification

## Overview

The **Encoding Proof Gate** is a formal validation layer that verifies QUBO and Ising problem encodings before they are submitted to solvers. It bridges the gap between problem formalization and solver execution by ensuring that encodings conform to a set of structural, semantic, and policy constraints.

## Problem Statement

The current DSG verification pipeline:
```
Problem → QUBO/Ising → Candidate → Z3 Verification → Certificate
         ↑ Gap: no encoding proof
```

A solver can prove it found the QUBO/Ising minimum correctly, but **cannot prove that minimum solves the original problem correctly**. This breaks the claim of "verified solution to the original problem."

## Solution Architecture

The Encoding Proof Gate adds a formal validation step:

```
Problem
  ↓
[Encoding Proof Gate] ← NEW
  ├─ 8 structural/semantic checks
  ├─ Hash chain linkage
  └─ Policy constraint validation
  ↓
QUBO / Ising
  ↓
Candidate Engines (Deterministic Sim, NVIDIA strategy, QPU)
  ↓
Cinema Verifier (Z3 optimality proof)
  ↓
Deterministic Receipt
```

## Truth Boundary

**This gate validates:**
- ✓ QUBO/Ising matrix structure (no NaN, proper symmetry, bounds)
- ✓ Variable consistency (naming, dimension alignment)
- ✓ Problem size within policy limits (MAX_VARIABLES = 62)
- ✓ Encoding hash stability (deterministic)

**This gate does NOT validate:**
- ✗ Semantic correctness of problem formalization (pre-gate responsibility)
- ✗ Penalty weight sufficiency (Cinema handles this via Z3)
- ✗ Cryptographic signing (uses SHA256 only)
- ✗ Immutable storage (WORM not guaranteed)

## Encoding Proof Data Structure

```typescript
interface EncodingProof {
  // Identification
  proofId: string;              // epf_<hash>
  proofHash: string;            // SHA256(entire proof payload)
  encodingHash: string;         // SHA256(encoding object)
  
  // 8 Validation Checks
  checks: {
    linear_terms_valid: boolean;           // Check 1
    quadratic_terms_valid: boolean;        // Check 2
    dimension_within_bounds: boolean;      // Check 3
    coefficient_magnitude_bounded: boolean;// Check 4
    no_nan_or_infinity: boolean;           // Check 5
    no_duplicate_edges: boolean;           // Check 6
    variable_naming_consistent: boolean;   // Check 7
    encoding_type_matches: boolean;        // Check 8
  };
  
  // Decision
  status: "PASS" | "BLOCK" | "REVIEW";
  failedChecks?: string[];
  failureReasons?: string[];
  
  // Audit Trail
  constraintSetHash: string;    // SHA256(8 constraint IDs)
  previousProofHash: string;    // Hash chain linkage (for replay protection)
  timestamp: string;            // ISO 8601 timestamp
  policyVersion: string;        // Policy version used for validation (e.g., "1.0")
  
  // Metadata
  metadata: {
    dimensionCount: number;
    linearTermsCount: number;
    quadraticTermsCount: number;
    maxCoefficientValue: string; // As string for precision
  };
  
  // Evidence Boundary
  evidenceBoundary: {
    statement: string;
    externalVerifierInvoked: boolean;
    certificationClaim: false;   // Always false (no third-party audit)
  };
}
```

## The 8 Validation Checks

### 1. `linear_terms_valid` (CRITICAL)

**Purpose**: Ensure linear coefficients are valid numbers and properly typed.

**Validation**:
- Each linear term is a number (not NaN, not Infinity)
- Index is a non-negative integer < variableCount
- Weight is a real number (typically stored as string for precision)

**Example QUBO linear term**:
```json
{"index": 0, "weight": "2.5"}  // PASS
{"index": 0, "weight": "NaN"}  // BLOCK: NaN value
{"index": 5, "weight": "1.0"}  // BLOCK if variableCount <= 5
```

### 2. `quadratic_terms_valid` (CRITICAL)

**Purpose**: Ensure quadratic terms are symmetric and properly formed.

**Validation**:
- For Ising/QUBO: matrix must be symmetric (if (i,j) exists, (j,i) must not exist or must be equal)
- No duplicate edges (no two entries with same i,j pair)
- Indices i,j are non-negative integers < variableCount
- Weight is a real number (not NaN/Infinity)

**Example**:
```json
{"i": 0, "j": 1, "weight": "3.14"}  // OK
{"i": 1, "j": 0, "weight": "3.14"}  // BLOCK: Asymmetry detected
{"i": 0, "j": 0, "weight": "1.0"}   // OK: diagonal allowed
```

### 3. `dimension_within_bounds` (HIGH)

**Purpose**: Enforce maximum problem size policy.

**Validation**:
- variableCount <= MAX_VARIABLES (currently 62)
- variableCount > 0

**Example**:
```json
{"variableCount": 10}   // PASS
{"variableCount": 150}  // BLOCK: exceeds limit
{"variableCount": 0}    // BLOCK: invalid size
```

### 4. `coefficient_magnitude_bounded` (HIGH)

**Purpose**: Prevent numerical overflow and solver issues.

**Validation**:
- All coefficients have absolute value <= MAX_COEFFICIENT (e.g., 1e6)
- Prevents solver numerical instability

**Example**:
```json
{"weight": "1000.5"}     // PASS (< 1e6)
{"weight": "1e7"}        // BLOCK: exceeds limit
{"weight": "-999999.9"}  // PASS
```

### 5. `no_nan_or_infinity` (CRITICAL)

**Purpose**: Catch floating-point edge cases.

**Validation**:
- No NaN values anywhere
- No Infinity or -Infinity values
- Applies to: constant, all linear weights, all quadratic weights

**Example**:
```json
{"constant": "0.0"}      // PASS
{"constant": "NaN"}      // BLOCK
{"constant": "Infinity"} // BLOCK
```

### 6. `no_duplicate_edges` (HIGH)

**Purpose**: Ensure QUBO/Ising matrix is well-formed.

**Validation**:
- For each (i,j) pair in quadratic terms, at most one entry exists
- No repeated edges

**Example**:
```json
[
  {"i": 0, "j": 1, "weight": "1.0"},
  {"i": 0, "j": 1, "weight": "2.0"}  // BLOCK: Duplicate edge
]
```

### 7. `variable_naming_consistent` (MEDIUM)

**Purpose**: Ensure variable indices are consistent across linear and quadratic terms.

**Validation**:
- All variable indices mentioned in linear and quadratic terms must be < variableCount
- No gaps in expected indices (all indices 0..variableCount-1 can appear, but no index >= variableCount)

**Example**:
```json
{
  "variableCount": 3,
  "linear": [
    {"index": 0, "weight": "1.0"},
    {"index": 1, "weight": "1.0"},
    {"index": 2, "weight": "1.0"}
  ],
  "quadratic": [
    {"i": 0, "j": 1, "weight": "1.0"}
  ]
}
// PASS: all indices < variableCount
```

### 8. `encoding_type_matches` (HIGH)

**Purpose**: Ensure encoding structure matches declared type.

**Validation**:
- If kind="qubo-v1": objective must be "min" (or "max" depending on convention)
- If kind="ising-v1": uses h (linear) and j (quadratic) field names
- Field names match type specification

**Example**:
```json
{
  "kind": "qubo-v1",
  "linear": [...],   // OK
  "quadratic": [...],
  "objective": "min"
}

{
  "kind": "ising-v1",
  "h": [...],        // OK: Ising uses 'h' not 'linear'
  "j": [...]
}
```

## Decision Logic

### PASS
All 8 checks return true. Encoding is valid and safe to submit to solver.

### BLOCK
One or more critical checks (1, 2, 5) fails, OR multiple checks fail.
Encoding does not conform to policy and must be corrected before proceeding.

Example blockage reasons:
- "Problem size (150 variables) exceeds policy limit (62)"
- "Coefficient 1.5e7 exceeds maximum allowed (1e6)"
- "Detected asymmetric quadratic terms"
- "NaN detected in linear coefficients"

### REVIEW
Non-critical check fails (e.g., check 3, 4, 6, 7, 8).
Encoding may be valid but requires manual review before allowing production use.

Example review reasons:
- "Duplicate edges detected (non-fatal, but unusual)"
- "Coefficient magnitude near limit (999000)"

## API Endpoints

### POST /api/dsg/v1/encoding/prove

**Request**:
```json
{
  "problemId": "prob_aimo_123",
  "encodingType": "qubo-v1",
  "encoding": {
    "variableCount": 10,
    "constant": "0.0",
    "linear": [
      {"index": 0, "weight": "2.5"},
      {"index": 1, "weight": "-1.2"}
    ],
    "quadratic": [
      {"i": 0, "j": 1, "weight": "3.14"}
    ],
    "objective": "min"
  },
  "nonce": "uuid-nonce-string",
  "idempotencyKey": "uuid-idem-key"
}
```

**Response (PASS)**:
```json
{
  "ok": true,
  "proofId": "epf_abc123...",
  "status": "PASS",
  "proof": {
    "proofId": "epf_abc123...",
    "proofHash": "sha256:...",
    "encodingHash": "sha256:...",
    "checks": {
      "linear_terms_valid": true,
      "quadratic_terms_valid": true,
      "dimension_within_bounds": true,
      "coefficient_magnitude_bounded": true,
      "no_nan_or_infinity": true,
      "no_duplicate_edges": true,
      "variable_naming_consistent": true,
      "encoding_type_matches": true
    },
    "status": "PASS",
    "timestamp": "2026-08-10T12:00:00Z",
    "policyVersion": "1.0"
  }
}
```

**Response (BLOCK)**:
```json
{
  "ok": false,
  "error": "encoding_validation_failed",
  "status": "BLOCK",
  "failedChecks": [
    "dimension_within_bounds",
    "coefficient_magnitude_bounded"
  ],
  "failureReasons": [
    "Problem size (150 variables) exceeds policy limit (62)",
    "Coefficient 1250.5 exceeds maximum allowed (1000.0)"
  ]
}
```

## Rate Limiting

- **Limit**: 60 requests/minute per org
- **Headers**:
  - `X-RateLimit-Limit: 60`
  - `X-RateLimit-Remaining: 58`
  - `X-RateLimit-Reset: <unix-timestamp>`
- **Backoff**: Implement exponential backoff (2s, 4s, 8s, 16s) on 429 responses
- **Timeout**: 5 second default

## Caching

Encoding proofs should be cached by the client to avoid redundant validation:

- **Key**: `encoding_proof:{encodingHash}`
- **TTL**: 30 minutes
- **Invalidation**: If encoding changes, new proof required
- **Miss-on-expiry**: Silently request new proof (don't fail)

## Hash Chain

Encoding proofs participate in a deterministic hash chain for replay protection and audit trails:

```
previousProofHash (links to prior proof)
        ↓
proofHash = SHA256({
  proofId,
  status,
  timestamp,
  policyVersion,
  checks,
  previousProofHash,
  constraintSetHash
})
```

This chain allows:
1. Audit trail of all encoding proofs per org
2. Replay detection (same encoding proof ID cannot be reused)
3. Integrity verification (if hash chain breaks, fraud detected)

## Integration Points

### Control Plane
- POST `/api/dsg/v1/encoding/prove` — validate encoding
- Extends GET `/api/dsg/v1/policies/manifest` with ENCODING_CONSTRAINTS

### dsg-agi-simulation
- Requires `encodingProofId` in solve request
- Cross-validates proof before executing solver
- Returns BLOCKED status if proof missing or invalid

### dsg-one-v1
- Requests proof before submitting to solver
- Caches proofs (30 min TTL)
- Dispatches encoding proof events via webhook

### DSG-Cinema-Proof-Agent
- Receives `encoding_proof_id` in verification requests
- Cross-validates encoding proof hash
- Links proof to final certificate

## Boundary Statements

**Verified**:
- ✓ Deterministic validation of QUBO/Ising structure
- ✓ Hash chain audit trail
- ✓ Proof that encoding doesn't violate structural/policy constraints

**Not Verified**:
- ✗ Semantic correctness of natural language problem formalization
- ✗ Penalty weight sufficiency (Cinema handles via Z3)
- ✗ Full cryptographic signing (SHA256 only)
- ✗ WORM-certified immutable storage

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-08-10 | Initial specification: 8 checks, PASS/BLOCK/REVIEW, hash chain |
