# DSG Governance — Claude Code plugin

DSG Governance provides **Claude Code guidance, skills, and engineering workflows** for plan-aligned execution, deterministic policy gates, evidence review, and replayable decisions.

**Current deployment boundary (18 October 2026):** This GitHub repository distributes plugin content. The DSG Control Plane is **not deployed as a hosted service**. Installing the plugin does **not** start a runtime, activate agents, issue credentials, or provide a production API. The former Vercel destination is no longer used.

## Install from the GitHub marketplace

In a Claude Code terminal session:

```text
/plugin marketplace add tdealer01-crypto/tdealer01-crypto-dsg-control-plane
/plugin install dsg-governance@dsg-plugins
```

Or from your shell (where the Claude Code CLI is installed):

```bash
claude plugin marketplace add tdealer01-crypto/tdealer01-crypto-dsg-control-plane
claude plugin install dsg-governance@dsg-plugins
claude plugin list
```

To validate a local clone without installing or deploying a service:

```bash
claude plugin validate ./plugins/dsg-governance
# Alternatively, validate the repository-root plugin:
claude plugin validate .
```

The marketplace source is `.claude-plugin/marketplace.json`; its `dsg-governance` entry is located at `plugins/dsg-governance`.

## What you can use

- **dsg-action-layer-ged** — guidance for user-goal planning, policy checks, approvals, execution evidence, and truthful status reporting
- **dsg-github-marketplace-action-controller** — templates and review steps for packaging governed GitHub Actions
- **dsg-multi-governance-orchestrator** — governance planning across systems and release milestones

The individual `SKILL.md` files are located under `skills/` in the GitHub repository and are packaged in `plugins/dsg-governance/skills/` for marketplace distribution.

## What the plugin does not prove

- **No hosted DSG Control Plane deployment is asserted.**
- **No production authentication, API, database, approval service, or Hermes executor is activated by installing these skills.**
- The repository's policy/API designs, example payloads, and test scaffolds are **not** evidence of a running external service.
- Any compliance, formal-verification, or runtime readiness claim requires its own specific, independently verifiable execution evidence.
- **No subscription pricing or quota entitlement is offered by this plugin manifest.**

## Verification and support

Validation of a `plugin.json` file is distinct from installing a plugin and from executing a governed agent action. Record results separately:

| Check | Evidence required |
|---|---|
| Manifest | `claude plugin validate` succeeds on the exact commit |
| Install | Claude Code loads the marketplace plugin without errors |
| Capabilities | The installed skills appear and can be invoked |
| Runtime | A separately deployed, authorized runtime returns genuine execution/audit evidence |

- Source: https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane
- Issues: https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane/issues
- Marketplace: `.claude-plugin/marketplace.json`
- License: MIT (see repository LICENSE)

**Plugin metadata version:** 1.0.1. **Production service status:** NOT DEPLOYED (owner-reported); not an install prerequisite.
