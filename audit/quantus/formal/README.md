# Quantus Formal Bug Scan — Ising + Z3/SMT + DSG

This layer is an **authorized, local-only audit triage system** for the frozen Immunefi Quantus competition repositories.

## What it does

1. **Static candidate extraction**
   - scans Rust production source only;
   - skips test/benchmark/example/vendor/build output;
   - excludes the explicitly out-of-scope `threshold` and `voting` modules where applicable;
   - flags review patterns such as unsafe/unchecked APIs, panic/unwrap paths, debug-only guards, permissive fallbacks, and boundary-sensitive arithmetic.

2. **Deterministic SIM scenarios**
   - attaches local test ideas such as malformed input, missing values, release-build behavior, numeric boundaries, replay/duplicate cases, and malformed signature/proof inputs;
   - these are scenario labels for local reproduction, not exploit instructions against a live network.

3. **Ising/QUBO-style prioritization**
   - runs a deterministic classical simulated-annealing model with a fixed seed;
   - treats each candidate as a binary variable;
   - rewards higher-risk/security-context candidates and penalizes over-concentration in one file/rule;
   - produces a bounded review set.

4. **Z3/SMT validation**
   - uses the repository's pinned `z3-solver` dependency;
   - verifies hard triage constraints such as candidate budget and per-file caps;
   - emits an SMT-LIB v2 evidence model.

5. **DSG fail-closed gate**
   - scanner integrity failure => `BLOCK_SCANNER_INTEGRITY`;
   - candidates => `REVIEW_CANDIDATES`;
   - no candidates => `PASS_NO_CANDIDATES` (this does **not** prove absence of vulnerabilities);
   - every candidate remains blocked from submission until scope, runnable local PoC, impact, and human review are present.

## GitHub Actions

Workflow:

```text
.github/workflows/quantus-formal-bug-scan.yml
```

It can be started manually, and it also runs after a successful **Quantus Audit Orchestrator** run once both workflows are on the default branch.

Targets:

- `dilithium`
- `hdwallet`
- `zk-circuits`
- `poseidon`
- `chain`
- `all`

Artifacts per target:

```text
formal-scan.json
formal-scan.md
triage-model.smt2
```

## Important claim boundary

This is **not a magic vulnerability detector**. Ising ranks suspicious locations, Z3 verifies the scanner's formal triage constraints, and DSG controls evidence/decision state. A real Immunefi finding still needs a target-specific security property plus a runnable local PoC demonstrating an in-scope impact.

For `chain`, every result is marked `manual-upstream-diff-review` because the competition excludes unmodified upstream Substrate/dependency code. A reviewer must confirm that the implicated code is Quantus-owned or modified before treating it as in scope.

## Safety boundary

- No mainnet testing.
- No public-testnet testing.
- No project infrastructure mutation.
- No third-party system testing.
- No deployment credentials or DSG/cloud secrets are passed to the scan jobs.
- No automated submission to Immunefi.
