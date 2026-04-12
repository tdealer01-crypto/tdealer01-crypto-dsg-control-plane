# DSG Benchmarks

This repository includes a GitHub-based benchmark runner for DSG runtime validation.

## What it measures

The benchmark validates:
- gate decision accuracy
- replay completeness
- ledger match rate
- proof presence
- false allow rate
- latency

## Required secrets

Configure these GitHub Actions secrets:
- `BENCHMARK_API_KEY`
- `BENCHMARK_AGENT_ID`

## How to run

Use the **DSG Benchmark** workflow and provide:
- `base_url`
- optional `execute_path`
- optional `replay_path_prefix`

## Output

The workflow produces:
- `artifacts/benchmark/benchmark-result.json`
- `artifacts/benchmark/benchmark-summary.md`

## Notes

This benchmark is designed for governed runtime evaluation, not generic chat preference scoring.

It should be interpreted together with:
- replay proof
- org-wide proof surfaces
- enterprise runtime reports
