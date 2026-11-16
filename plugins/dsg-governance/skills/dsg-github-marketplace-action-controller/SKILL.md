---
name: dsg-github-marketplace-action-controller
description: Package and validate a GitHub Action client that invokes real DSG Spacetime MCP-governed routes. Use for publishing action wrappers only when live tool contracts and permission boundaries are verified.
---

# DSG GitHub Marketplace Action Controller

This skill covers packaging client-side GitHub Actions around **the existing DSG Spacetime production MCP** at `https://aws.dsg.pics/mcp`. It does not publish an Action, create production endpoints, or prove that a route exists.

## Workflow

For governed Compose/Execute, obtain the authenticated principal from the live `spacetime_control_surface.principal_binding.agent_principal` (`VERIFIED_OAUTH_SUBJECT`) and carry that value unchanged. Never invent a caller principal or bypass `OAUTH_AGENT_PRINCIPAL_MISMATCH`.

1. Inspect the target repository and existing `action.yml`, entrypoint and CI. Do not infer that examples in archived documentation are deployed.
2. Discover the current remote MCP tools and identify the exact route and payload contract needed by the Action.
3. Keep authentication on the server side of the Action, with GitHub Secrets or a supported delegated OAuth flow. Do not embed credentials in action.yml, plugin manifests, command lines or PRs.
4. Preserve DSG Spacetime plan alignment, required owner approval, execution and evidence verification. Do not add a parallel policy engine or make all executions read-only.
5. Write the minimum Action changes, run tests and report the observed results. Pin third-party GitHub Actions by a full commit SHA; never use an imaginary `@sha256:` reference.
6. Publish or merge only when requested and when GitHub confirms the operation succeeded.

## Completion criteria

Report `SOURCE_FOUND`, `TESTED`, `DEPLOYED`, `LIVE_VERIFIED`, `E2E_VERIFIED` or `BLOCKED` separately, with actual run IDs and evidence references. A valid `action.yml` is not sufficient to claim a live provider execution.

If the requested MCP route or owner authority is missing, report it precisely and stop the affected operation. Do not substitute the legacy `/api/dsg/v1/gates/evaluate` endpoint without observing it in the current production runtime.
