---
name: dsg-action-layer-ged
description: Execute user goals through the existing DSG Spacetime production MCP connection. Use for plan alignment, governance gates, owner approvals, provider execution, and signed evidence verification.
---

# DSG Action Layer — DSG Spacetime Production

## Connection and ownership

The only backend for this distributed plugin is the existing DSG Spacetime production MCP endpoint `https://aws.dsg.pics/mcp`, configured in this plugin's `.mcp.json`. **Do not deploy a new backend, call legacy Vercel/Azure URLs, or switch to a former Control Plane REST API.**

Claude Code connects through the `dsg-spacetime` MCP server. Check connection status with `/mcp` and use the supported OAuth sign-in flow when required. Never embed access tokens, API keys or owner credentials in skill files or logs. A successful MCP connection does not by itself prove the caller has authority to execute.

## User goal to real execution

1. **Discover:** Inspect MCP tools available in this authenticated session and discover the route/capability matching the requested task. Tool lists and API signatures are determined at runtime, not invented from this documentation.
2. **Plan:** Reuse an already approved, locked, matching plan when it exists. Otherwise create or compose only the plan needed for the user's goal and identify its runtime binding.
3. **Govern:** Ask DSG Spacetime for its actual gate and plan-alignment decision. A plan-authorized action must not be artificially blocked by this skill. An `UNSUPPORTED` result is not `PASS`; missing tool or invalid scope is a specific diagnosable failure, not evidence of denial by policy.
4. **Authorize:** Respect only approval requirements returned by the active runtime for this action; preserve the existing owner/OAuth step-up boundary. Do not request redundant approval for an already valid authorization or claim that a chat reply bypasses the production approval protocol.
5. **Execute:** If the action is allowed and its required approvals are satisfied, invoke the actual Spacetime execution tool for that route. Do not stop at read-only discovery when execute is permitted. Never invent a successful execution.
6. **Verify evidence:** Use the available evidence-verification tool and return the runtime's real plan ID, execution or action ID, outcome, and evidence reference. Report `PASSED` only when the relevant verification actually passes.

## Diagnose in the user interface

Report one actionable status: `CONNECTED`, `AUTH_REQUIRED`, `OWNER_SCOPE_REQUIRED`, `ROUTE_MISSING`, `APPROVAL_REQUIRED`, `EXECUTION_FAILED`, `EVIDENCE_UNVERIFIED`, or `E2E_VERIFIED`, as supported by real tool output. These labels are for reporting, not claims that each maps to an implemented API enumeration.

When blocked, state the exact observed error and next user action. Never fabricate an approval URL or create an alternate approval authority. Keep the same plan ID when continuing after user authentication.

## Separation of responsibilities

The plugin is a thin workflow and discovery client. DSG Spacetime production owns policy enforcement, execution authorization, provider orchestration and evidence. Installing the plugin alone does **not** deploy or activate these capabilities.
