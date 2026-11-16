# evidence-guard — DSG claim-policy checks

**Plugin:** `evidence-guard@dsg-plugins` (v1.0.0). This is a Claude Code plugin for reviewing factual/readiness claims while working with the DSG ONE / ProofGate repository. It is **not** a remote governance gateway, a production verifier, or a certification.

## Install

In Claude Code, add the public marketplace once and install the scoped plugin:

```text
/plugin marketplace add tdealer01-crypto/tdealer01-crypto-dsg-control-plane
/plugin install evidence-guard@dsg-plugins
```

From a shell with Claude Code installed, inspect the package using `claude plugin list` and `claude plugin details evidence-guard`. The plugin source is `plugins/evidence-guard/` in this repository.

## Use

1. Ask Claude Code to apply the **`claim-policy`** skill to a status update, PR description, documentation change, or readiness claim.
2. For every material claim, identify its classification: **verified fact**, **inference**, **pending**, **blocked**, or **not verified**. A verified claim must cite evidence actually inspected.
3. When Claude Code writes or edits a file, the included `PostToolUse` hook (matcher `Write|Edit`) invokes `scripts/claim-lint.sh`. The hook checks the received event text for selected high-risk readiness phrases and prints an advisory warning to stderr if it detects one.
4. Correct unsupported wording or supply fresh evidence before publishing. Read the exact results of real tests; never infer PASS from an advisory hook.

## Included components

- `.claude-plugin/plugin.json` — Claude Code plugin metadata.
- `skills/claim-policy/SKILL.md` — the classification rules and truth boundary.
- `hooks/hooks.json` — `PostToolUse` configuration.
- `scripts/claim-lint.sh` — advisory shell check.

## Verify and troubleshoot

In a checkout with the Claude Code CLI, use:

```sh
claude plugin validate ./plugins/evidence-guard
claude plugin details evidence-guard
```

If the hook prints no warning, that does **not** prove the file is accurate: it only matches selected phrases found in its event input. The script is deliberately **non-blocking** and exits with status 0 even when it warns. It does not check a live MCP server, validate evidence cryptographically, sign receipts, or establish regulatory compliance. A missing Bash/grep-capable environment or an unavailable Claude Code installation also limits local execution.

For actual governed AWS Spacetime operations, use the **separate** `dsg-governance@dsg-plugins` package and verify OAuth, the permitted route, execution result, and evidence at the runtime. Plugin installation alone is not production E2E proof.
