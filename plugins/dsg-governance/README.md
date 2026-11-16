# DSG Governance — AWS Spacetime Claude Code plugin (public install)

**Public install identity:** `dsg-governance@dsg-plugins` (v1.1.0).

**Production MCP:** `https://aws.dsg.pics/mcp` — the existing DSG Spacetime runtime on AWS. This is a client distribution, not a deployed Control Plane.

## One install path for external users

In Claude Code, add the existing public repository marketplace and install the plugin:

```sh
claude plugin marketplace add tdealer01-crypto/tdealer01-crypto-dsg-control-plane
claude plugin install dsg-governance@dsg-plugins
claude plugin details dsg-governance
```

The installation includes **three skills** and **one MCP server** named `dsg-spacetime`. Do not install both `dsg-governance@dsg-plugins` and `dsg-governance@dsg-aws-plugins` in the same scope: the latter is the private canonical/maintainer source, not a second public product. Inspect `claude plugin list` before switching an existing installation; do not remove the independent `dsg-spacetime` plugin.

The three distributed `SKILL.md` files and the `.mcp.json` have matching, verified Git blob hashes with the private AWS canonical source snapshot inspected 30 October 2026. The public manifest version matches canonical `1.1.0`. A pinned source snapshot is not an automatic live sync with subsequent private changes; the version and four fingerprints must be re-verified for every release.

## Use it

1. In Claude Code open `/mcp` and select `dsg-spacetime`. If needed, complete the supported OAuth browser sign-in; never paste access tokens into chat, files or scripts.
2. Ask the plugin to discover available DSG routes (read-only). Read the actual result, not the expected list from documentation.
3. Before any governed Compose or Execute, obtain `VERIFIED_OAUTH_SUBJECT` and `principal_binding.agent_principal` from the live `spacetime_control_surface`. Reuse that principal unchanged.
4. When the runtime requires owner approval, complete that specific approved action. Do not bypass or duplicate approval.
5. Execute through an authorized route and use `spacetime_verify_evidence` to verify the resulting evidence before reporting task success.

## Package contents

- `.claude-plugin/plugin.json`: scoped public plugin metadata, v1.1.0.
- `.mcp.json`: one remote HTTP MCP server, `dsg-spacetime`.
- `skills/dsg-action-layer-ged/SKILL.md`
- `skills/dsg-github-marketplace-action-controller/SKILL.md`
- `skills/dsg-multi-governance-orchestrator/SKILL.md`

## Evidence boundary

GitHub Actions proves manifest validation, local Claude CLI installation, component inventory and pinned source-parity at this release. It does **not** authenticate as an end user, authorize owner actions, run live provider Execute, or prove a production provider E2E. Those require actual user OAuth and runtime receipts.

The retired Vercel/Azure Control Plane is **not used**. The public distribution publishes no private repository content beyond the already-public identical client skills and MCP metadata. Never expose the private production repository, secrets, tokens or signer material.

When blocked report the observed error: `AUTH_REQUIRED`, `AUTH_PRINCIPAL_UNVERIFIED`, `ROUTE_MISSING`, `APPROVAL_REQUIRED`, `EXECUTION_FAILED`, or `EVIDENCE_UNVERIFIED` — not an invented `PASS`.
