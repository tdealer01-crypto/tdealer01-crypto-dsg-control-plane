# pr-body-helper — evidence-grounded PR description

**Plugin:** `pr-body-helper@dsg-plugins` (v1.0.0). Claude Code command that drafts a DSG Control Plane pull-request body using the actual working tree and test results.

## Install

In Claude Code:

```text
/plugin marketplace add tdealer01-crypto/tdealer01-crypto-dsg-control-plane
/plugin install pr-body-helper@dsg-plugins
```

Inspect the installed package with `claude plugin details pr-body-helper` in a shell with Claude Code installed.

## Use

Inside a repository checkout, invoke `/pr-body <short goal>`. The command instructions read `git status --short` and `git diff --stat`, then produce these sections:

1. **Goal** and **Files changed** — grounded in inspected changes.
2. **Verification** — exact observed tests and their outcomes; write **Not run** if not executed.
3. **Known limits** — what remains untested or blocked.
4. **User-visible benefit** — what changed for the user and supporting proof.
5. **Next step** — shortest responsible continuation.

The command is defined in `commands/pr-body.md`. It does not run CI, merge the PR, sign evidence, or prove production readiness. Do not include tokens, secrets or private environment values in the PR text.

## Validate

```sh
claude plugin validate ./plugins/pr-body-helper
claude plugin details pr-body-helper
```

A generated PR body is a draft, not evidence that tests passed. Check the listed files and test outputs before publishing.
