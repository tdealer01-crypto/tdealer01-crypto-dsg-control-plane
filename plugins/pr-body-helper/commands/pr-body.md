---
description: Generate a DSG Control Plane PR body in the repo's mandatory format
argument-hint: "[short goal of the change]"
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git log:*)
---

# /pr-body — Generate the mandatory PR body

Produce a PR body that matches the required format in CLAUDE.md section 20 and
the PR hygiene rules in AGENTS.md. Use the change described in `$ARGUMENTS`
plus the actual working-tree state.

## Gather real context first

Inspect the actual changes (do not invent a file list):

```bash
git status --short
git diff --stat
```

List only files this change actually touched. Never use guessed paths.

## Emit exactly this structure

```text
Goal:
<one or two sentences: the user goal this change serves>

Files changed:
- <path> — <what changed and why>
- <path> — <what changed and why>

Verification:
- [ ] <command> — <pass/fail/warning result>
- [ ] <command> — <pass/fail/warning result>

Known limits:
- <what is not covered, mock vs live, pending checks>

User-visible benefit:
- What can the user do now?
- What became easier?
- What proof shows it works?
- What is the next step?

Next step:
<the shortest safe path forward>
```

## Rules (CLAUDE.md sections 1, 20; AGENTS.md)

- Every `Verification` line must reflect a command that was actually run. If a
  command was not run, write `Not run` and the reason — do not fake a pass.
- Do not hide failing tests. Report failures as warnings with exact output.
- Do not use forbidden readiness claims (see the `evidence-guard` plugin's
  `claim-policy` skill) unless fresh evidence supports them.
- Skip any section that would require pasting secrets, tokens, env values, or
  private hostnames — describe the code change instead.
- Leave production release status `NO-GO` unless all live gates pass.

Output only the finished PR body, ready to paste.
