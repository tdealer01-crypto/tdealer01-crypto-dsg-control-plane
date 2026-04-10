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

The runtime spine is implemented in control-plane, and remaining work is contract-depth verification:

- transactional consistency under failure paths
- strict org scoping across callback and reconciliation paths
- RBAC depth across monitor and runtime admin surfaces
- billing and usage accounting consistency under concurrency
- multi-repo product assembly verification

Current practical deployment risk is configuration drift (especially Supabase/Vercel auth environment variables and redirect URL settings), not missing runtime-spine files.

## Current integration gap

The control-plane expects a richer core contract than the canonical gate contract currently visible in the gate repo. The current product is therefore a multi-repo system with verified components, not yet a single fully aligned execution path.

## Current control-plane route truth

The public and operator-facing route surfaces should be interpreted as follows:

### Public baseline probe
- `GET /api/health`

This is the baseline public availability probe for deployment and smoke-check purposes.

### Stable execution entry
- `POST /api/execute`

This path remains the stable compatibility entry for sample and quickstart execution.
Internally, it forwards to the current spine execution handler.

### Current execution implementation layer
- `POST /api/intent`
- `POST /api/spine/execute`

These routes reflect the current spine-oriented execution shape in the control-plane repo.

### Authenticated operator routes
- `GET /api/usage`
- `GET /api/executions`
- `GET /api/audit`
- `GET, POST /api/policies`
- `GET /api/capacity`
- `POST /api/agent-chat`

These should be evaluated with authenticated, org-scoped access.
They are not anonymous/public health probes.

## Practical interpretation

When checking repo truth for the control-plane:
- treat `/api/health` as the public baseline probe
- treat `/api/execute` as the stable public execution entry
- treat `/api/spine/execute` as the current implementation path behind execution
- treat usage, policy, capacity, audit, and execution inspection routes as operator surfaces

## PR merge timeline note (April 2026)

If you are trying to "merge #216" in this repository timeline, note that this branch history currently has:

- `#215` (`33aa49d`)
- `#217` (`e1b3987`)
- `#218` (`52e17a8`)
- `#219` (`eb170a6`)
- `#220` (`8920f39`)

There is no commit tagged with `(#216)` in the local git history, which usually means one of the following:

1. PR 216 was closed without merge.
2. PR 216 was merged with a different title that omitted the `(#216)` suffix.
3. The branch was rebased/squashed and commit references changed.

Suggested recovery flow:

1. Fetch full remote refs (`git fetch --all --prune`).
2. Check whether `origin/pr/216` or an equivalent branch exists.
3. If PR 216 exists remotely, merge/cherry-pick by commit SHA, not PR number label.
4. If PR 216 does not exist, continue from the latest merged baseline (`#220`) and re-open the missing changes as a new PR.
