# dsg-verify — DSG repository verification commands

**Plugin:** `dsg-verify@dsg-plugins` (v1.0.0). A Claude Code command package that guides checks against the scripts present in the DSG ONE Control Plane repository. It does not bundle a test runner or automatically run tests upon installation.

## Install

In Claude Code:

```text
/plugin marketplace add tdealer01-crypto/tdealer01-crypto-dsg-control-plane
/plugin install dsg-verify@dsg-plugins
```

To inspect the installed plugin from a shell with Claude Code installed: `claude plugin details dsg-verify`.

## Use inside a configured repository checkout

- `/typecheck` — runs `npm run typecheck`; reports real TypeScript results.
- `/verify-route app/api/health/route.ts` — selects relevant checks for a changed API route, including typecheck and targeted tests, with additional safety checks when applicable.
- `/pre-pr-check` — performs typecheck, lint, tests and build in sequence, reporting failures rather than concealing them.

These are instructions for Claude Code to execute existing repository scripts. They require the project checkout, Node dependencies and the permissions/runtime to run the commands. Refer to `commands/typecheck.md`, `commands/verify-route.md`, and `commands/pre-pr-check.md` for exact behavior. Do not claim these commands succeeded unless their output was observed.

## Verify and limits

```sh
claude plugin validate ./plugins/dsg-verify
claude plugin details dsg-verify
```

A successful plugin install does not prove the app builds, runs in production, or passes live database/browser tests. `npm test` passing does not establish `npm run build` passing. Missing test tools, dependencies, environment, or credentials must be reported as **Not run** or **BLOCKED**, with the reason. This plugin does not expose a remote MCP server; use `dsg-governance@dsg-plugins` for the separate DSG Spacetime MCP client.
