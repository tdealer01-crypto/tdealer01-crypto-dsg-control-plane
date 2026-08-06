# Public Vendor Baseline Comparison

This pack compares DSG tested evidence against public vendor baselines derived from official/public documentation.

## Command

```bash
npm run benchmark:vendors:baseline
```

## Outputs

```text
artifacts/public-vendor-baseline/public-vendor-baseline-result.json
artifacts/public-vendor-baseline/public-vendor-baseline-report.md
```

## Evidence model

```text
DSG = tested production evidence
Vendors = public documentation baseline only
```

This is intentionally not a claim that the vendor runtimes were tested.

## Included public baselines

- Zapier
- n8n
- Make
- Workato
- Temporal

## Safe wording

Use:

```text
DSG has production-tested evidence against a public vendor-baseline rubric derived from official/public market-leader documentation.
```

Do not use:

```text
DSG runtime-tested and beat every vendor listed here.
```

## Runtime benchmark requirement

To claim a true runtime vendor comparison, each vendor must have:

- a real endpoint or account-owned workflow
- the same benchmark payload
- recorded HTTP status
- latency measurement
- payload hash
- response hash
- evidence artifact
- status `tested`
- `scoreEligible: true`
