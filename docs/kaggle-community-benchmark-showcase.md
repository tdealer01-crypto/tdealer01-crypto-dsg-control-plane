# DSG Kaggle Community Benchmark Showcase

## Purpose

This document maps DSG repository evidence into a Kaggle Community Benchmark-ready package without publishing DSG core/control-plane source code.

Kaggle Benchmarks use two core objects:

- **Task**: a Python function defining a problem and scoring behavior.
- **Benchmark**: a Kaggle UI collection of saved tasks plus selected models.

This repository therefore provides task-ready Python functions and deterministic case definitions. It does not claim that a public Kaggle leaderboard result exists until the tasks are saved in Kaggle, added to a benchmark, and evaluated against supported models inside Kaggle.

## No-Core-Source Boundary

Do **not** upload DSG core/control-plane source packages to Kaggle.

Forbidden:

```text
dsg-control-plane-main.zip
full repository ZIPs
runtime core source code
production secrets or environment values
Supabase service role keys
customer data
raw production audit exports
private partner/customer artifacts
```

Allowed:

```text
benchmark task cases
Kaggle task-ready scoring functions
generated showcase manifest/report
file information copy
README copy
hashes and evidence summaries
```

Reason:

```text
Kaggle should show reproducible benchmark structure, governance evaluation methodology,
case definitions, scoring behavior, and evidence boundary — not distribute the DSG
operational control-plane implementation.
```

## Files

```text
benchmarks/kaggle-community/benchmark_cases.json
benchmarks/kaggle-community/dsg_finance_governance_tasks.py
scripts/kaggle-community-showcase.mjs
.github/workflows/kaggle-community-showcase.yml
```

## Command

```bash
npm run benchmark:kaggle:community
python benchmarks/kaggle-community/dsg_finance_governance_tasks.py
```

## Outputs

```text
artifacts/kaggle-community-showcase/kaggle-community-showcase-manifest.json
artifacts/kaggle-community-showcase/kaggle-community-showcase-report.md
artifacts/kaggle-community-showcase/kaggle-file-information.md
artifacts/kaggle-community-showcase/README-kaggle-copy.md
artifacts/kaggle-community-showcase/NO_CORE_SOURCE_BOUNDARY.md
```

## Community tasks

| Task ID | Name | Purpose |
|---|---|---|
| DSG-TASK-001 | Payment Decision Control | Tests governed payment gate decisions. |
| DSG-TASK-002 | Policy Compliance Detection | Tests detection of missing proof and false production claims. |
| DSG-TASK-003 | Audit Evidence Generation | Tests audit/evidence manifest boundaries and completion-claim blocking. |

## What gets showcased

- deterministic governance cases
- PASS / REVIEW / BLOCK decision expectations
- risk-level expectations
- required evidence terms
- forbidden false-claim terms
- copy-ready Kaggle task functions
- source file hashes
- Kaggle file information copy
- no-core-source publishing boundary
- claim boundary text

## Evidence boundary

This is a Community Benchmark preparation and showcase pack. It is not:

- an independent third-party audit
- official Kaggle leaderboard validation
- ISO certification
- bank certification
- guaranteed compliance
- a downloadable DSG control-plane source package

Safe claim:

```text
DSG provides task-ready Kaggle Community Benchmark materials and repository-generated showcase artifacts for payment decision control, policy compliance detection, and audit evidence generation. Public Kaggle leaderboard validation remains pending until saved Kaggle tasks and evaluated model runs are completed.
```

## Operator steps on Kaggle

1. Open Kaggle Benchmarks.
2. Create task `DSG-TASK-001 Payment Decision Control`.
3. Copy the matching Python task function into the Kaggle task notebook.
4. Save the task.
5. Repeat for `DSG-TASK-002` and `DSG-TASK-003`.
6. Create a Kaggle benchmark collection.
7. Add the three saved tasks.
8. Add supported models from Kaggle Community Benchmarks.
9. Run evaluations.
10. Only then cite leaderboard results.
