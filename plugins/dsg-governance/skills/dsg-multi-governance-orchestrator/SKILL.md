---
name: dsg-multi-governance-orchestrator
description: Coordinate multi-source DSG agent workflows using the existing Spacetime production MCP connection, real approvals, execution receipts, and independently verified audit evidence.
---

# DSG Multi-Governance Orchestrator — Production MCP

The shared backend is `https://aws.dsg.pics/mcp`. This plugin is a client and skills bundle, not a separate Control Plane deployment. It must not direct requests to abandoned Vercel or Azure production hosts.

## Orchestrate a real request

1. Translate the user goal to a minimal ordered set of capabilities and a plan. Read the current MCP tool inventory; no tools are assumed present from old documentation.
2. Reuse valid approved plan bindings; request a new approval only for actions that the runtime identifies as not covered. Do not broaden owner approval to unrequested actions.
3. Perform independent steps in parallel only when the runtime allows it; carry plan/action references across dependencies.
4. For each action, obtain its actual Spacetime gate decision, execute when authorized, and verify its execution receipt and evidence chain.
5. Return an operator-friendly status and precise next action. If authenticated tools are missing, separate connectivity and permission errors from failed governance or provider execution.

## Evidence ledger

Keep per-component fields for `SOURCE_FOUND`, `TESTED`, `DEPLOYED`, `LIVE_VERIFIED`, `E2E_VERIFIED`, or `BLOCKED`, each with its own real supporting artifact. Never infer whole-system readiness from one canary, a configured route, a UI badge, or a successful install.

## Human approval boundary

DSG Spacetime controls enforcement and evidence. Respect owner step-up when enforced by production; never emulate signatures or impersonate the owner. Once the runtime validates approval for the exact plan/action, continue to the authorized execute and evidence steps rather than looping back to request approval.
