# Encoding Proof Gate Hardening — 2026-08-11

This hardening pass closes the post-merge review gaps found in PR #1080 without expanding the proof boundary beyond what the code verifies.

## Enforced now

- Authentication, organization-scoped rate limiting and entitlement checks remain mandatory.
- Runtime JSON shape validation rejects null term objects, booleans, partially parsed numeric strings, NaN and Infinity.
- `encodingType` must equal `encoding.kind`; optional `objective` must be `min` or `max`.
- Encoding hashes use canonical JSON key ordering.
- Proof hashes bind encoding hash, request subject, checks, status, failures, constraint-set hash, previous proof hash, timestamp, policy version, metadata and evidence boundary.
- Request subject binds `problemId`, encoding type, canonical request hash, nonce hash and idempotency-key hash.
- A persistent server-side ledger enforces nonce uniqueness, idempotency and a single per-organization previous-proof-hash chain.
- Exact idempotent retries return the stored proof after re-validating its proof hash.
- CORS/preflight uses the repository's allowlist helper.
- Encoding policy constraints are exposed from the deterministic policy manifest.

## Fail-closed behavior

If the proof ledger is unavailable, proof issuance returns BLOCK/503 rather than minting an untracked proof. Concurrent requests that race on the same chain head return a deterministic conflict instead of forking the chain.

## Evidence boundary

This gate proves structural validity and integrity/replay binding for the submitted QUBO/Ising encoding. It does **not** prove that the formal model correctly represents the user's original problem, and it does **not** prove a global optimum. Those remain separate proof layers.
