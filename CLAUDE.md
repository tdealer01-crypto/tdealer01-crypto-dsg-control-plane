# CLAUDE.md — DSG Agent Rules

Read `AGENTS.md` first. This file adds Claude Code specific rules for this repository.

## Truth boundary

Do not claim that a route, deployment, database, migration, job, table, test, integration, or production flow works unless it has been verified from real evidence.

Acceptable evidence includes inspected repository files, command output from a real run, GitHub metadata, Supabase schema/query/log/advisor output, Vercel project/deployment/build-log metadata, or live endpoint response.

If evidence is missing, label the status as `pending`, `blocked`, or `not verified`.

## Tool policy

Allowed:

- inspect files and diffs before editing;
- create focused branches;
- make small, reviewable commits;
- open pull requests with verification evidence;
- run typecheck, tests, build, smoke checks, and targeted scripts when available;
- query GitHub, Supabase, and Vercel only through authorized local or connected tools.

Blocked:

- do not commit secrets, tokens, API keys, Supabase service role keys, Vercel tokens, Claude credentials, OpenAI keys, private cookies, or local `.env` values;
- do not print secret values in logs, PRs, issues, docs, or comments;
- do not auto-merge production code;
- do not change production environment variables without explicit approval and visible audit trail;
- do not claim production-ready, marketplace-ready, or enterprise-ready without live health/readiness evidence.

## Required PR body

Every agent PR must include:

```text
Goal:

Files changed:

Verification:
- [ ] command/result
- [ ] command/result

Known limits:

User-visible benefit:

Next step:
```

If no command was run, write `Not run` and explain why.

## GitHub command handling

When a GitHub issue or PR comment starts with `@claude`, `@codex`, `@agent`, or `@dsg-agent`, treat it as a proposed task, not as permission to merge.

Before changing code, restate the goal, inspect `AGENTS.md` and relevant files, identify risk, choose the smallest branchable change, and define verification commands.

After changing code, run the narrowest relevant checks, report exact pass/fail results, open or update a PR, and leave production release status as `NO-GO` unless all live gates pass.

## Safe default

If an instruction conflicts with `AGENTS.md`, secrets policy, production safety, or verified evidence, stop and report the conflict instead of guessing.
