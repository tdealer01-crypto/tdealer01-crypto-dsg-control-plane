---
name: Agent command
about: Request Claude/Codex/DSG agent work with evidence and safety boundaries
title: "[agent] "
labels: ["agent-command", "needs-verification"]
assignees: []
---

## Agent trigger

Use one:

```text
@claude
@codex
@agent
@dsg-agent
```

## Goal

What should the agent accomplish?

## Scope

Repo/path/files/routes involved:

## Evidence required

What must be inspected before any claim is made?

- [ ] repository files
- [ ] tests/build/typecheck output
- [ ] Supabase schema/query/logs
- [ ] Vercel deployment/build/live endpoint
- [ ] GitHub PR/commit/workflow metadata
- [ ] other:

## Verification required

Commands or checks expected:

```bash
# examples
npm run typecheck
npm test
npm run build
curl https://example.vercel.app/api/health
```

## Do not

List forbidden actions for this task:

- Do not commit secrets or tokens.
- Do not auto-merge.
- Do not claim production-ready without live evidence.

## Expected output

- [ ] PR with changed files
- [ ] issue comment only
- [ ] diagnosis report
- [ ] migration proposal
- [ ] deployment/readiness report

## User-visible benefit

What gets easier, safer, or more verifiable for the user?
