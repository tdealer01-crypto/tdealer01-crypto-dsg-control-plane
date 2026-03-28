# Verified Read Side DSG Adapter Plan

Current verified source of truth:
- Product shell: tdealer01-crypto/tdealer01-crypto-dsg-control-plane
- Canonical gate: tdealer01-crypto/DSG-Deterministic-Safety-Gate
- Runtime plane: tdealer01-crypto/DSG-ONE
- Audit plane: tdealer01-crypto/dsg-deterministic-audit

This plan is read side only.
The current connector setup allowed verified reads, new file commits, PR updates, and Vercel preview verification.
The available GitHub write surface in this session does not expose a direct update_file action, and the low level tree metadata needed to safely overwrite lib/dsg-core.ts was not available through current connector responses.
Because of that, the next safe step is to publish a verified read side adapter plan rather than guessing a write path patch.

Verified profiles:

1. DSG-ONE runtime profile
- health: /api/health
- ledger: /api/ledger
- metrics: synthesize from /api/executions
- audit: not verified on this runtime surface
- execute next step to verify later: /api/execute-v2

2. Canonical gate profile
- health: /health
- ledger: /ledger/verify
- metrics: no verified direct metrics surface
- audit: not verified on this canonical gate surface
- execute next step to verify later: /evaluate

Already deployed in preview:
- /api/integration
- /dashboard/integration
- /api/core-compat
- /dashboard/core-compat
- /api/adapter-plan

Next code change when update access is available:
1. try /health then /api/health
2. try /ledger then /api/ledger then /ledger/verify
3. use /metrics when available, otherwise synthesize metrics from /api/executions
4. leave execute path untouched until write contract mapping is verified from repo truth
