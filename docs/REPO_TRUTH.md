# DSG Repo Truth

This document records the current verified source-of-truth layout for the DSG product surface.

## Verified topology

- Product shell: `tdealer01-crypto/tdealer01-crypto-dsg-control-plane`
- Canonical gate core: `tdealer01-crypto/DSG-Deterministic-Safety-Gate`
- Runtime plane: `tdealer01-crypto/DSG-ONE`
- Audit plane: `tdealer01-crypto/dsg-deterministic-audit`

## Verified formal core

The DSG formal gate core is verified for:

- Determinism
- Safety Invariance
- Constant-Time Bound

The uploaded proof artifact is SMT-LIB v2 and is intended to be checked with Z3, expecting `sat`.

## Scope boundary

This does not mean the full product is formally verified end to end.

The following still require repository-truth verification and contract alignment:

- runtime orchestration
- live monitor flows
- billing and organization flows
- multi-repo product assembly

## Current integration gap

The control-plane expects a richer core contract than the canonical gate contract currently visible in the gate repo. The current product is therefore a multi-repo system with verified components, not yet a single fully aligned execution path.
