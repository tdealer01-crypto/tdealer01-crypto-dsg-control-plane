# DSG Provider Proof Bundle

This folder holds provider proof artifacts for the DSG autonomous runtime lanes.

## Template

Use:

```text
artifacts/dsg-provider-proof/provider-proof-bundle.example.json
```

Copy it to this runtime-only path when real provider evidence exists:

```text
artifacts/dsg-provider-proof/provider-proof-bundle.json
```

## Required lanes

The proof bundle must include real evidence for all five lanes:

1. `sandbox` — isolated command run proof
2. `repair` — bounded repair loop proof
3. `browser` — real remote browser/session proof
4. `timeline` — unified artifact timeline proof
5. `preview` — deployment URL route proof

## Validation command

```bash
node scripts/dsg-provider-proof-bundle-check.mjs artifacts/dsg-provider-proof/provider-proof-bundle.json
```

The validator must return `DSG_PROVIDER_PROOF_COMPLETE` before any higher autonomous-complete claim is allowed.

## Boundary

Do not commit fake PASS evidence. If a provider has not produced the proof, the lane must remain `PROOF_REQUIRED`.
