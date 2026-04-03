# Runtime Spine Cutover

This repository now has a dedicated `lib/spine` implementation that separates decision evaluation from commit/audit truth handling.

## What is in place

- `lib/spine/plugin.ts` plugin registry with idempotent registration.
- `lib/spine/pipeline.ts` fail-closed decision pipeline.
- `lib/spine/engine.ts` execution and intent handlers built around `runtime_commit_execution`.
- `lib/spine/request.ts` request normalization so `/api/intent` and `/api/execute` can share the same canonical request.
- `lib/spine/plugins/gate-bridge.ts` bridge to the existing gate registry.
- `lib/spine/plugins/risk-gate.ts` direct local risk gate.
- `lib/spine/plugins/arbiter.ts` MAKK8 arbiter plugin.

## Cutover plan

1. Point the execute route to `executeSpineIntent`.
2. Point the intent route to `issueSpineIntent`.
3. Keep `runtime_commit_execution` as the atomic truth commit boundary.
4. Set `DSG_SPINE_GATE_PLUGIN` if you want to force direct risk-gate usage.
5. Keep old routes for fallback until billing lock is cleared and CI can run.
