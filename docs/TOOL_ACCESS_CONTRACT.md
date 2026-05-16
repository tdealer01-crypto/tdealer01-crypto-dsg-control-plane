# Tool Access Contract — DSG Agent Work

This repository can share tool usage rules, command templates, and agent workflow contracts. It must not share real credentials.

## What can be shared through the repository

- Agent operating rules such as `AGENTS.md` and `CLAUDE.md`.
- GitHub issue templates for agent tasks.
- Tool capability descriptions.
- Verification checklists.
- PR evidence requirements.
- Safe runbooks for GitHub, Supabase, Vercel, Codex, Claude Code, and other approved development tools.

## What must not be shared through the repository

Never commit or paste:

- Supabase service role keys;
- Supabase database passwords;
- Vercel tokens or bypass tokens;
- Claude, OpenAI, Anthropic, or other model provider API keys;
- GitHub personal access tokens;
- cookies, sessions, local storage dumps, or auth state files;
- `.env`, `.env.local`, `.vercel/.env*`, or any file containing live secrets;
- screenshots or logs that reveal secret values.

If a secret is accidentally exposed, stop work and rotate the secret before continuing.

## Approved agent command path

Use GitHub issues or PR comments as the command inbox.

Recommended trigger prefixes:

```text
@claude
@codex
@agent
@dsg-agent
```

A valid command should include:

```text
Goal:
Repo:
Scope:
Evidence required:
Verification required:
Do not:
Expected output:
```

## Required workflow

1. Read repository rules first.
2. Inspect the real files relevant to the request.
3. Classify status as `verified`, `pending`, `blocked`, or `failed`.
4. Make the smallest branchable change.
5. Run the most relevant checks available.
6. Open a PR with exact evidence.
7. Do not auto-merge.

## Tool-specific boundaries

### GitHub

Allowed:

- inspect files, commits, issues, PRs, branches, and workflow metadata;
- create branches, focused commits, issues, and PRs;
- add comments with evidence.

Blocked:

- force-push shared branches without explicit instruction;
- merge without review;
- create fake evidence or fake test results.

### Supabase

Allowed:

- list project metadata;
- list tables and migrations;
- run read-only diagnostic SQL;
- apply migrations only when explicitly requested and reviewed.

Blocked:

- expose service role keys;
- run destructive SQL without explicit approval;
- disable RLS without a written security reason and follow-up remediation.

### Vercel

Allowed:

- inspect projects, deployments, domains, and build logs;
- fetch protected deployments through authorized Vercel tooling;
- report deployment state accurately.

Blocked:

- expose Vercel tokens or bypass tokens;
- claim production is healthy when the latest production deployment is canceled, errored, protected, or not verified;
- change production environment variables without explicit approval.

### Claude Code / Codex

Allowed:

- use repository rules to perform code review and branch-based fixes;
- produce PRs with evidence;
- assist with deterministic verification.

Blocked:

- treat issue comments as permission to merge;
- skip verification silently;
- invent unavailable tool access.

## Production readiness rule

The default launch decision is `NO-GO` until live evidence proves otherwise.

Minimum evidence for `GO` must include:

- current production deployment is `READY`;
- `/api/health` or equivalent returns healthy status;
- Supabase connectivity is verified;
- required tests/build/typecheck pass or are explicitly waived with reason;
- known limitations are documented.
