# DSG Governance for Claude Code

This marketplace entry installs guidance skills and packaging checklists. It does not activate a hosted DSG service, issue credentials, approve actions, or execute provider operations.

## Install

In Claude Code:

/plugin marketplace add tdealer01-crypto/tdealer01-crypto-dsg-control-plane
/plugin install dsg-governance@dsg-plugins

After the install command, review the plugin details in the interactive panel and confirm the install there if prompted. In a shell, the Claude Code CLI commands are:

claude plugin marketplace add tdealer01-crypto/tdealer01-crypto-dsg-control-plane
claude plugin install dsg-governance@dsg-plugins
claude plugin list

Validate the marketplace package with:

claude plugin validate ./plugins/dsg-governance

## Included skills

- dsg-action-layer-ged: plan and evidence review guidance
- dsg-github-marketplace-action-controller: static Action packaging and review guidance
- dsg-multi-governance-orchestrator: cross-system planning and evidence checklist

The repository-root plugin discovers its three advertised skills under skills/. The marketplace plugin packages them under plugins/dsg-governance/skills/. Other repository skill material is stored under repository-skills/ and is not part of the root plugin skill scan.

## Architecture boundary

See [docs/architecture/dsg-os-spacetime-boundary.md](../docs/architecture/dsg-os-spacetime-boundary.md). DSG OS is the user-facing browser/workspace, Adapter Builder, and local verification surface. Spacetime is the execution/governance control plane.

## Authentication and evidence

No MCP server or endpoint is configured in this Claude Code plugin manifest. The owner-service bridge used for private repository read evidence is not proof of an end-user OAuth flow. Do not claim user-authenticated AWS MCP access, live execution, or a deployed control plane based on plugin installation or repository evidence.

The current deployment boundary is owner-reported as NOT DEPLOYED (18 October 2026). Source code and CI checks are distinct from deployment, authenticated runtime health, and provider execution.
