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

For local CLI runs:

```bash
export BENCHMARK_BASE_URL="https://<your-domain>"
export BENCHMARK_API_KEY="dsg_live_xxx"
export BENCHMARK_AGENT_ID="<agent-uuid>"
export BENCHMARK_EXECUTE_PATH="/api/execute"
export BENCHMARK_REPLAY_PATH_PREFIX="/api/replay"
node scripts/benchmark-dsg.mjs
```

Troubleshooting:
- Do not leave placeholder values like `<API_KEY ของคุณ>` or `<Agent_ID ของคุณ>`; the script now rejects placeholder-looking values.
- If execution/replay fails, the script prints per-case status + server error to stderr so you can quickly identify auth/route/runtime issues.
- If API key/agent mismatch is detected (`Invalid agent_id or API key`), benchmark stops immediately with a curl command you can copy to verify credentials.

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

## Public benchmark site

A GitHub Pages deployment workflow is available through:

- `.github/workflows/benchmark-pages.yml`

It:
1. runs the benchmark
2. renders a static public report
3. publishes the report to GitHub Pages

Public outputs:
- `/benchmark/`
- `/benchmark/result.json`

## Immediate rollout order (Now)

Follow this exact sequence for production-facing benchmark publishing:

1. **Merge this branch/PR first** so the latest workflow and benchmark site renderer are on `main`.
2. **Configure GitHub repository settings**:
   - `Settings -> Pages -> Build and deployment -> Source = GitHub Actions`
   - `Settings -> Secrets and variables -> Actions`:
     - `BENCHMARK_API_KEY`
     - `BENCHMARK_AGENT_ID`
3. **Run workflow `DSG Benchmark Pages` manually** with `base_url` set to the real staging/public URL.
4. **Verify all three checks**:
   - workflow run status is `Success`
   - `https://<org>.github.io/<repo>/benchmark/` is reachable
   - `https://<org>.github.io/<repo>/benchmark/result.json` metrics match real run output

### Validation tips

- Confirm `result.json` values match the run artifact `artifacts/benchmark/benchmark-result.json` from the same workflow run.
- If Pages returns 404, re-check Pages Source is set to **GitHub Actions** (not branch deploy).
- If workflow fails on auth, re-check `BENCHMARK_API_KEY` and `BENCHMARK_AGENT_ID` in repository secrets.
