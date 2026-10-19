# DSG Governance — scoped Claude Code plugin

**Production MCP server:** `https://aws.dsg.pics/mcp` (remote Streamable HTTP; OAuth is handled by the MCP client and production identity provider).

## Contents

- `.claude-plugin/plugin.json`: plugin identity and metadata
- `.mcp.json`: exactly one server, `dsg-spacetime`
- `skills/dsg-action-layer-ged/SKILL.md`: discover → plan → gate → approval (if required) → execute → verify evidence
- `skills/dsg-github-marketplace-action-controller/SKILL.md`: build client-side GitHub Action wrappers for verified routes
- `skills/dsg-multi-governance-orchestrator/SKILL.md`: coordinate real multi-route tasks and evidence

## Install

```sh
claude plugin marketplace add tdealer01-crypto/tdealer01-crypto-dsg-control-plane
claude plugin install dsg-governance@dsg-plugins
```

Inside Claude Code, run `/mcp` and authenticate `dsg-spacetime` if prompted.

**Before composing an authorized plan:** use `spacetime_control_surface` to get the `VERIFIED_OAUTH_SUBJECT` `principal_binding.agent_principal`. Reuse this exact principal for Compose and Execute. Never invent an identity from a username, repository name or client ID; if the binding is unavailable, report the authentication blocker.
 An MCP connection proves only connectivity; real execution requires the actual tools, plan authorization, owner approval if required, and verified evidence.

## Validation

```sh
claude plugin validate ./plugins/dsg-governance --strict
claude plugin validate . --strict
```

The last command validates the **whole repository marketplace**, including unrelated entries. A plugin-specific fix cannot assert that every unrelated plugin passes.

No secrets are packaged. No alternate runtime is deployed. No owner approval is bypassed.
