# CospinDSG Runtime Spine Adapter v0.1

This package contains repo-ready files for `tdealer01-crypto-dsg-control-plane`.

## Files

- `lib/runtime/udg-gate.ts`
- `tests/unit/runtime/udg-gate.test.ts`
- `docs/COSPIN_DSG_RUNTIME_SPINE.md`
- `docs/COSPIN_DSG_CUSTOMER_INTEGRATION_FLOW.md`

## Install

Copy the folders into the repository root, then run:

```bash
npm run test:unit -- tests/unit/runtime/udg-gate.test.ts
npm run typecheck
```

## Integration boundary

This patch does not replace the existing spine. It adds CospinDSG as a deterministic UDG runtime gate adapter and customer integration documentation.
