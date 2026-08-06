# PR #156 Closure + Hardening Follow-up Plan

Date: 2026-04-03

## Closure decision

PR #156 should be closed without merge because it is superseded by PR #160 (commit `540d347adf3ffff09684a0be8f7be3885f4b8fc6`) already on `main`.

### Close comment (copy/paste)

> Superseded by PR #160 (commit `540d347a`) which already ships all 4 bug fixes on `main`:
> - Gate infra errors throw `SpineInfraError` instead of `buildBlockedPipeline` — no quota burn
> - try/catch around `runPipeline()` before canonical hash and `runtime_commit_execution`
> - Canonical hash restored (no `proof_version`/`authoritative_plugin_id`)
> - `mapRpcError` supports both underscore and space-delimited formats

## Why this is the safest path

- Avoids rebasing old/conflicting branch state from PR #156.
- Keeps production aligned to already-merged fixes in PR #160.
- Prevents accidental reintroduction of stale behavior from `8207ab3f`.
- Enables clean review by splitting hardening-only changes into a fresh branch off current `main`.

## Follow-up ticket / PR scope (hardening, non-bugfix)

Create a new PR based on current `main` for hardening-only work:

1. Introduce `DECISION_SEVERITY` constant (replace inline `severity()` usage).
2. Add helper extraction:
   - `normalizeDecision()`
   - `normalizeOutput()`
   - `evaluatePlugin()`
3. Add observer stage execution via `registry.getByKind('observer')`.

### Out of scope

- Do not include any code resurrection from PR #156 bugfix path.
- Do not modify behavior already fixed and released by PR #160 unless explicitly required by new tests.

## Implementation checklist for the new PR

- [ ] Branch from latest `main`
- [ ] Add/adjust tests for helper extraction and observer stage behavior
- [ ] Confirm canonical hash output unchanged from current `main`
- [ ] Confirm `mapRpcError` compatibility remains intact for both token formats
- [ ] Request focused review as "hardening-only"
