# DSG Plugins — Claude Code Plugin Marketplace

`dsg-plugins` is a Claude Code plugin marketplace for working **inside** the
DSG ONE / ProofGate Control Plane repository. Each plugin encodes the repo's
own operating rules from `CLAUDE.md` and `AGENTS.md` so agents and humans stay
governance-first and evidence-first.

The marketplace catalog is defined at
[`.claude-plugin/marketplace.json`](../.claude-plugin/marketplace.json) with
`metadata.pluginRoot` set to `./plugins`, so each plugin below lives under
`plugins/<plugin-name>/`.

## Add the marketplace

From Claude Code:

```text
/plugin marketplace add tdealer01-crypto/tdealer01-crypto-dsg-control-plane
```

or from a local checkout:

```text
/plugin marketplace add ./
```

## Install a plugin

```text
/plugin install proofgate-review@dsg-plugins
/plugin install dsg-verify@dsg-plugins
/plugin install evidence-guard@dsg-plugins
/plugin install pr-body-helper@dsg-plugins
```

You can also browse and install interactively with `/plugin`.

## Plugins

| Plugin | What it gives you | Components |
|--------|-------------------|-----------|
| **proofgate-review** | Governance-aware code review against the repo's API/security/truth/runtime-spine/gate/Supabase rules | `governance-review` skill, `security-reviewer` agent |
| **dsg-verify** | Slash commands wrapping the verification ladder (only real npm scripts) | `/typecheck`, `/verify-route`, `/pre-pr-check` |
| **evidence-guard** | Truth-boundary / claim-policy help plus an advisory hook that flags forbidden readiness claims | `claim-policy` skill, `PostToolUse` hook |
| **pr-body-helper** | Generates the repo's mandatory PR body format | `/pr-body` command |
| **ising-agent** | External deterministic Z3/QUBO compliance plugin (separate repo) | hosted at `tdealer01-crypto/Compliance-ising-z3-Deterministic-` |

## Component boundaries

- These plugins are advisory and workflow tooling. They do **not** replace
  `npm run typecheck`, `npm run test`, or `npm run build` — they help you run
  and report them honestly.
- The `evidence-guard` hook is advisory only: it prints a warning to stderr and
  always exits 0, so it never blocks an edit.
- Nothing here claims production readiness, certification, or compliance. Follow
  `CLAUDE.md` section 1 and the `claim-policy` skill for the claim boundary.

## Validate locally

```bash
claude plugin validate .
```

This validates the marketplace manifest and each plugin manifest against the
official Claude Code schema.
