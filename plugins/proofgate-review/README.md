# proofgate-review — governance-aware review

**Plugin:** `proofgate-review@dsg-plugins` (v1.0.0). Repository-specific code review guidance for DSG ONE / ProofGate. It is not a security certification or an automated production authorization gate.

## Install

In Claude Code:

```text
/plugin marketplace add tdealer01-crypto/tdealer01-crypto-dsg-control-plane
/plugin install proofgate-review@dsg-plugins
```

From a shell with Claude Code installed, inspect the package with `claude plugin details proofgate-review`.

## Use

Ask Claude Code to use the **`governance-review`** skill on a concrete diff or PR. The skill reviews truth-boundary wording, API-route conventions, authentication, runtime-spine execution flow, deterministic gate semantics and Supabase/RLS changes. For security-focused changes, request the **`security-reviewer`** subagent and provide the relevant files/diff.

Findings should cite an inspected `file:line` and be classified as **BLOCKER**, **WARNING**, or **NOTE**. A missing proof must be reported as **not verified**, not a made-up violation or PASS. Review findings are not a substitute for actual `npm run typecheck`, targeted tests or `npm run build`.

## Components and verification

- `skills/governance-review/SKILL.md` — review instructions and output format.
- `agents/security-reviewer.md` — security-focused subagent.
- `.claude-plugin/plugin.json` — package metadata.

For a local package validation in a checkout:

```sh
claude plugin validate ./plugins/proofgate-review
```

The plugin does not deploy or execute a remote DSG runtime. Use the separately packaged `dsg-governance@dsg-plugins` for production MCP access, subject to verified OAuth, authorized actions and runtime evidence.
