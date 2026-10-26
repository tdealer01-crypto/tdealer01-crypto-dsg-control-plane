---
name: dsg-action-layer-ged
version: 1.0.1
author: DSG Team
license: MIT
description: >
  Plan and review governed actions using evidence supplied by the user or an
  explicitly configured connector. This guidance skill does not provide a live
  gate, hosted API, approval service, credential broker, or executor.
---

# DSG Action Layer: planning and evidence review

Use this skill to turn a user goal into a scoped plan, identify required authority and evidence, and report what is verified. This package is guidance and templates. It does not itself call a DSG service, issue approvals, execute provider actions, or create cryptographic proof.

## When to use

- Break a requested action into a plan and identify its scope and risk.
- Review a result and its evidence after an independently authorized execution.
- Explain what evidence is missing before a claim can be marked verified.
- Draft a governance workflow without claiming that it is deployed.

## Operating steps

1. Restate the requested outcome and the exact target.
2. Identify the provider, capability, input/output schema, risk, scope, approval requirement, payload binding, result verifier, and evidence mapping.
3. Discover only the routes exposed by an explicitly configured connector. Do not guess a route, endpoint, payload, credential, or provider identity.
4. Before execution, check the actual plan, entitlement, policy, approval, and payload binding supplied by the execution control plane.
5. Execute only when the user requested the action and the connected tool grants the required authority. Otherwise return the plan for review.
6. Verify the returned result against its schema and evidence. Mark unavailable checks UNVERIFIED.
7. Report the actual action, target, scope, result, evidence, and limitations.

When a configured connector requires a discover → compose → execute → verify protocol, follow that connector's instructions. Never compose or execute a payload unless the discovered route and binding rules permit it.

## Status vocabulary

| Status | Meaning |
|---|---|
| PASS | The stated check ran and its required evidence passed. |
| BLOCK | A verified policy or permission rule forbids the action. |
| REVIEW | A named human or additional check is still required. |
| UNSUPPORTED | The requested action or condition is outside available verified capability. |
| UNVERIFIED | The evidence or live check needed to decide is absent. |

UNSUPPORTED and UNVERIFIED are never PASS. A browser hash, signature, or local recomputation can establish integrity of the supplied artifact; it does not by itself establish approval, authorization, provider-side execution, or correctness of the result.

## Authority boundary

The DSG OS / Browser is the user-facing workspace, Adapter Builder, and local verification surface. DSG Spacetime is the execution and governance control plane. A local browser verifier must not grant execution permission or substitute for Spacetime policy and approval.

See the bundled architecture contract at ../../references/dsg-os-spacetime-boundary.md.

## Safety and truth rules

- Do not claim this skill is a live deterministic gate or an execution service.
- Do not call a retired or unverified URL.
- Do not ask the user to paste API keys, secrets, or private credentials into chat.
- Do not invent a proof hash, evidence record, database write, approval, or provider result.
- Do not claim a runtime, Hermes executor, Supabase persistence, quota, subscription, or hosted service unless fresh evidence directly establishes it.
- If an authorized connector is unavailable, provide a plan and state UNVERIFIED.
- Keep approval distinct from integrity verification and from successful execution.

## Reference notes

- references/gate-evaluate.md — evidence-based decision mapping
- references/compliance-evidence.md — evidence inventory and claim limits
- references/runtime-governance.md — conceptual control-plane lifecycle
- references/replay-governance.md — replay requirements and gaps
- references/hermes-executor.md — historical/design reference only
