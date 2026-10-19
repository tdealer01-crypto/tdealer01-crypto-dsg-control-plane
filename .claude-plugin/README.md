# DSG Governance Control Plane — Claude Code plugin

This is a Claude Code **client plugin**, not a separate deployed control plane. It connects to the existing DSG Spacetime production MCP endpoint:

`https://aws.dsg.pics/mcp`

The plugin contains three skills and **one** plugin-scoped remote MCP server. DSG Spacetime retains responsibility for plan alignment, policy decisions, owner authorization, execution, and verifiable evidence. Plugin installation does not prove runtime access.

## Install only the DSG Governance plugin

In Claude Code:

```sh
claude plugin marketplace add tdealer01-crypto/tdealer01-crypto-dsg-control-plane
claude plugin install dsg-governance@dsg-plugins
claude plugin list
```

The marketplace entry points at `plugins/dsg-governance`. The installation-tested inventory is **3 Skills + 1 MCP Server**. ClaudePluginHub may temporarily show the monorepo's legacy root inventory (25 Skills / 10 MCP Servers), which is not the scoped plugin's runtime inventory. Treat the Claude Code CLI `plugin details` and the exact GitHub Actions install check as the package evidence. It is intentionally **not** the entire root project's `.mcp.json` and does not require Vercel, Azure, Supabase or a separate API key configured by this plugin.

## Connect and use

1. Inside Claude Code, open `/mcp` and find `dsg-spacetime`.
2. If it requests authentication, complete the provider's real OAuth browser flow. Authentication does not automatically grant owner permissions.
3. Confirm that the server exposes real tools before attempting execution.
4. Ask the plugin to run the chosen task with the existing plan if already approved.
5. Review the runtime's exact decision, execution result and evidence proof.

## Failure diagnostics

| Observation | Meaning / next step |
|---|---|
| Plugin validation error | Check `claude plugin validate ./plugins/dsg-governance --strict` against the matching source checkout |
| MCP missing | Confirm the plugin installed/enabled and `/mcp` shows `dsg-spacetime` |
| 401 or OAuth required | Sign in using `/mcp`; no token should be pasted into repository files |
| Owner scope or approval required | Complete the actual owner approval flow for the specific plan/action, then resume the same plan |
| Tools discoverable but execute unavailable | Record the actual tool/route/scope error. Do not invent a replacement tool or successful execution |
| Execute succeeded, evidence incomplete | Report `EVIDENCE_UNVERIFIED` until the production verifier confirms the action |

## Truth boundary

The Marketplace version and syntax are software packaging concerns. Production must separately prove OAuth, tool discovery, plan match, required approvals, governed execute, and audit evidence. Do not claim `ACTIVATED ALL` from an install or a simulated response.

**References:** [Official Claude Code plugin manifest](https://code.claude.com/docs/en/plugins-reference), [MCP authentication](https://code.claude.com/docs/en/mcp), [repository](https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane).
