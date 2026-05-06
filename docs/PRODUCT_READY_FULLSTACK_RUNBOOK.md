# DSG ONE V1 Product Ready Fullstack Runbook

This runbook turns the current DSG ONE V1 repository into a visible, fail-closed product-readiness flow.

## Decision frame

Every readiness answer must pass this sequence before any production claim:

```txt
verify(data)
  -> samadhi(answer, target)
  -> kilesa(verification, verified)
  -> parami(real_history)
  -> answer only from evidence
```

## Product surfaces added

| Surface | Path |
|---|---|
| Decision frame library | `lib/dsg/product-ready/decision-frame.ts` |
| Readiness assessment library | `lib/dsg/product-ready/readiness.ts` |
| Readiness API | `GET /api/dsg/product-ready` |
| Readiness dashboard | `/product-ready` |
| CLI readiness gate | `npm run dsg:product-ready` |

## Deterministic checks

Run locally or in CI:

```bash
npm run dsg:product-ready
npm run dsg:verify
npm run build
```

Expected deterministic behavior:

- Missing required runtime variables returns `BLOCKED` and exits non-zero.
- Present required runtime variables with missing optional proof variables returns `PILOT_READY`.
- Present required and optional proof variables returns `PRODUCT_READY`.

## Truth boundary

This change creates the product-readiness gate and dashboard. It does not certify compliance and does not prove production verification by itself. A live App Builder run, audit row, branch/PR evidence, deployment proof, and production-flow proof are still required before any `PRODUCTION_VERIFIED` claim.
