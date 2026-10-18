# Formal Verification

Deterministic formal verification for DSG ONE.

## Purpose

Verify governance policies, runtime safety, and execution correctness using Z3 Spacer and Horn Clauses.

## Features

- Verify policy rules
- Prove runtime invariants
- Generate Horn Clauses
- Generate counterexamples
- Generate inductive invariants
- Produce deterministic evidence
- Generate audit reports
- SHA-256 proof hashing

## Input

- Source file
- Policy
- Runtime model

## Output

- PASS / FAIL
- Counterexample
- Proven invariant
- Evidence report
- Audit report
- SHA-256 proof

## Engine

- Z3
- Spacer
- Horn Clause Solver

## Command

dsg verify <file>
