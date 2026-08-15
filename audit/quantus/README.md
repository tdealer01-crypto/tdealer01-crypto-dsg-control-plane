# Quantus Audit Competition Workspace

This workspace orchestrates local, read-only testing of the frozen Immunefi Quantus competition repositories. It does not deploy Quantus, connect to mainnet/public testnet, or receive DSG/cloud secrets.

## Run

Open **Actions → Quantus Audit Orchestrator → Run workflow** and choose either `all` or one target.

The workflow checks out the exact frozen commit SHA, records source metadata, runs a release build, runs release tests, optionally runs Clippy, and uploads a 14-day evidence artifact per target.

## Targets

- `dilithium` — ML-DSA/Dilithium implementation only.
- `hdwallet` — HD-wallet module only.
- `zk-circuits` — Quantus ZK circuits/modifications; exclude the voting module and unmodified upstream Plonky2.
- `poseidon` — Quantus Poseidon2 implementation.
- `chain` — Quantus-owned chain/runtime/pallet/QPoW modifications only; unmodified upstream Substrate/dependencies are excluded.

Exact refs and SHAs are recorded in `targets.yml`.

## Evidence flow

`frozen source -> build -> tests -> clippy -> artifact -> candidate finding -> human scope/impact review -> runnable local PoC -> Immunefi submission`

A green GitHub Actions run is not a vulnerability result. A red run is also not automatically a vulnerability. Build/test output is evidence that must be reviewed against the competition scope and impact rules.

## Safety and scope guardrails

- Local runner only; never mainnet/public testnet.
- No DoS against project assets.
- No deployment or infrastructure mutation.
- No DSG, Vercel, AWS, Supabase, production, wallet, or unrelated secrets are passed to these jobs.
- Do not treat third-party/upstream dependency findings as competition findings when they are out of scope.
- Do not publish an unpatched finding.
- Do not submit scanner-only output without demonstrated in-scope impact.

## Existing DSG agents

The existing DSG Code Review, Security Audit, Test & QA, Workspace Guard, and Production Readiness workflows remain separate. The Quantus orchestrator reuses the same fail-closed/evidence-first operating model but uses Rust-native build/test checks and deliberately does not inherit deployment credentials or production mutation permissions.
