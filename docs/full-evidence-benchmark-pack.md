# DSG Full Evidence Benchmark Pack

This pack runs all current DSG evidence suites and writes a single manifest/report.

## Command

```bash
npm run benchmark:evidence
```

## Included suites

1. Production Gateway Benchmark
2. Market Comparison Score
3. SMT2 Runtime Invariants
4. Published Formal Verification DOI reference

## Outputs

```text
artifacts/full-evidence/dsg-full-evidence-manifest.json
artifacts/full-evidence/dsg-full-evidence-report.md
```

The manifest also hashes the underlying evidence files:

```text
artifacts/gateway-benchmark/gateway-benchmark-result.json
artifacts/gateway-benchmark/gateway-benchmark-report.md
artifacts/gateway-comparison/gateway-comparison-result.json
artifacts/gateway-comparison/gateway-comparison-report.md
artifacts/gateway-smt2/gateway-smt2-invariants-result.json
artifacts/gateway-smt2/gateway-smt2-invariants-report.md
```

## Evidence boundary

This full evidence pack combines production benchmark evidence, comparison scoring evidence, SMT2-compatible runtime invariant evidence, and the published formal verification DOI reference.

It does not claim independent third-party certification of the deployed SaaS runtime.
