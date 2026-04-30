# Deterministic Governance Claims

This guide defines evidence-aligned claims for DSG's deterministic control, mathematical invariants, audit proof, and risk-reduction positioning.

## Evidence base

DSG combines four assurance layers:

1. Published formal verification evidence
   - DOI: https://doi.org/10.5281/zenodo.18225586
   - Z3 theorem prover / SMT-LIB proof artifact scope
   - deterministic behavior, safety invariance, and constant-time O(1) control primitive claims from the artifact abstract

2. Production Gateway benchmark evidence
   - 6/6 checks passed
   - 100% pass rate
   - avgLatencyMs: 2047
   - minLatencyMs: 1029
   - maxLatencyMs: 4254

3. Runtime SMT2-compatible invariant evidence
   - 6/6 invariant cases passed
   - 100% pass rate
   - deterministic static evaluation with SMT-LIB v2-compatible emitted constraints

4. Public vendor-baseline comparison
   - publicDocVendors: 5
   - vendorRuntimeTested: 0
   - used for positioning, not direct vendor runtime victory claims

## Approved claims

```text
DSG is a deterministic AI Action Governance Gateway that checks policy, risk, approval, and mathematical invariants before tool execution.
```

```text
DSG combines published formal verification evidence with runtime audit proof for governed AI and automation workflows.
```

```text
DSG uses deterministic control logic for high-risk tool calls, reducing reliance on probabilistic model judgment at the execution boundary.
```

```text
DSG is designed to reduce hallucination-driven actions by preventing AI outputs from directly executing tools unless they satisfy predefined policy and invariant checks.
```

```text
DSG enforces mathematical safety invariants over tool-execution requests.
```

```text
DSG turns AI tool execution into an auditable state transition with request hashes, record hashes, and exportable evidence.
```

```text
DSG can reduce downstream remediation and audit-preparation effort by blocking invalid actions before execution and producing structured evidence during normal operation.
```

## Marketplace copy

```text
DSG is a deterministic AI Action Governance Gateway for high-risk tool execution.

It places a verified control layer between AI intent and production systems, checking policy, entitlement, risk, approval, and mathematical invariants before an action can execute.

Latest evidence:
- Production Gateway Benchmark: 6/6 passed, 100%
- SMT2 Runtime Invariants: 6/6 passed, 100%
- Comparison Rubric: 190/200, 95%
- Published formal verification artifact: DOI 10.5281/zenodo.18225586

DSG is designed to reduce hallucination-driven actions, audit preparation effort, and integration risk by turning AI tool execution into deterministic, auditable state transitions.
```

## Procurement copy

```text
DSG provides a deterministic control-plane primitive for governed AI tool execution.

The system separates probabilistic AI inference from execution authority. AI systems may propose actions, but DSG evaluates each action against explicit policy, entitlement, approval, and invariant constraints before execution or audit commit.

For regulated environments, DSG provides:
- deterministic pre-execution decisions
- runtime invariant checks
- Monitor Mode for customer-held API keys
- audit proof with requestHash and recordHash
- exportable evidence records
- published formal verification evidence using SMT-LIB/Z3 artifacts
```

## Boundary statement

```text
DSG does not claim to make language models hallucination-free. Instead, it controls whether AI-proposed actions can affect business systems by requiring deterministic policy and invariant checks at the execution boundary.
```

```text
Cost reduction claims should be stated as design goals and risk-reduction mechanisms unless supported by customer production studies.
```
