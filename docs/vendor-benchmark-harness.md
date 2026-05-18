# Vendor Benchmark Harness

This harness creates a fair test surface for DSG and adjacent vendors.

## Command

```bash
npm run benchmark:vendors
```

## Default behavior

By default, only DSG is tested because DSG has a native benchmark suite inside this repository.

Other vendors are marked `not_configured` until their endpoint/credential environment variables are provided.

## Vendor environment variables

```bash
export ZAPIER_BENCHMARK_WEBHOOK_URL="https://hooks.zapier.com/..."
export MAKE_BENCHMARK_WEBHOOK_URL="https://hook.make.com/..."
export N8N_BENCHMARK_WEBHOOK_URL="https://your-n8n.example.com/webhook/..."
export WORKATO_BENCHMARK_WEBHOOK_URL="https://www.workato.com/webhooks/..."
export TEMPORAL_BENCHMARK_ENDPOINT="https://your-temporal-wrapper.example.com/benchmark"
```

Then rerun:

```bash
npm run benchmark:vendors
```

## Outputs

```text
artifacts/vendor-comparison/vendor-comparison-result.json
artifacts/vendor-comparison/vendor-comparison-report.md
```

## Evidence boundary

Only vendors with status `tested` and `scoreEligible: true` should be scored in a same-suite comparison.

Vendors marked `not_configured` or `skipped` must not receive comparative scores.

This harness does not claim DSG beats another vendor unless that vendor has been tested with the same workload and evidence requirements.

## Workload

The current cross-vendor smoke workload sends a governed-action payload and records:

- HTTP status
- latency
- payload hash
- response hash
- configured endpoint state

This is the first layer. Deeper vendor-specific harnesses can add approval, audit export, retry, replay, and policy evidence when a vendor account supports those features.
