# dsg-verify — DSG repository verification commands

Claude Code plugin for running the **existing** verification commands in the DSG ONE / ProofGate repository. It does not deploy, approve, or execute production work.

## Install

Register this repository as a Claude Code marketplace, then install the plugin:

```bash
claude plugin marketplace add tdealer01-crypto/tdealer01-crypto-dsg-control-plane
claude plugin install dsg-verify@dsg-plugins
claude plugin list
```

The commands expect to run **inside a checkout of this repository** with Node.js/npm available and dependencies installed (`npm ci`). They are not general-purpose commands for unrelated repositories.

## Use in Claude Code

| Command | What it runs or checks |
| --- | --- |
| `/dsg-verify:typecheck` | Runs `npm run typecheck` and reports TypeScript diagnostics |
| `/dsg-verify:verify-route app/api/health/route.ts` | Guides targeted API-route checks: typecheck, relevant tests, request-body checks, and dependency audit where applicable |
| `/dsg-verify:pre-pr-check` | Runs the repository verification ladder: typecheck, lint, tests and build; reports the first hard failure |

The commands are defined in [commands/](./commands/) and reference scripts from the root [package.json](../../package.json).

### Example

Open Claude Code in this repository, invoke `/dsg-verify:typecheck`, and inspect the **actual** command output. If TypeScript fails, use the file and line diagnostics before making changes. A successful typecheck **does not** establish a successful application build or a production deployment.

## Local validation

From the repository root:

```bash
claude plugin validate ./plugins/dsg-verify
```

For a full marketplace install check, also run `claude plugin validate .` and install `dsg-verify@dsg-plugins` in a clean environment. These commands are instructions, **not a claim that validation or installation has already passed**.

## Evidence boundary

Only mark a check **PASS** after capturing real tool output from that run. If tests, live services, permissions, or dependencies are unavailable, report **NOT RUN / BLOCKED** with the cause. Source documentation is not a production E2E result.
