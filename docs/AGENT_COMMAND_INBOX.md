# Agent Command Inbox — DSG One v1

This file describes how to issue commands to agents (Claude Code, Codex, Grok Build)
through GitHub without needing to open a live chat session.

---

## How it works

1. Create a GitHub Issue using the **Agent Command** template
2. The issue body follows the structured format below
3. An agent (Claude Code via GitHub Actions, or Codex) picks it up and acts
4. The agent comments on the issue with its result and closes it when done

---

## Issue format

See `.github/ISSUE_TEMPLATE/agent-command.md` for the full template.

Required fields:
```
Agent:    claude | codex | grok
Priority: critical | high | normal | low
Scope:    control-plane | dsg-one-v1 | both
Task:     [one clear sentence describing what to do]
```

Optional:
```
Context:  [background the agent needs]
Files:    [specific files to look at]
Blocked:  [things the agent must NOT do]
```

---

## Example commands

### Ask Claude to add a new API route
```
Agent: claude
Priority: normal
Scope: dsg-one-v1
Task: Add GET /api/dsg/saved-apps that returns the user's deployed generated apps from dsg_app_builds
Context: Auth pattern is in CLAUDE.md. Use readDsgRest with user_id filter.
Blocked: Do not use @supabase/ssr. Do not touch middleware.ts.
```

### Ask Codex to fix a build error
```
Agent: codex
Priority: high
Scope: dsg-one-v1
Task: Fix TypeScript error in app/api/dsg/history/route.ts
Files: app/api/dsg/history/route.ts
```

### Ask Claude to write a migration
```
Agent: claude
Priority: normal
Scope: dsg-one-v1
Task: Add dsg_comments table so users can annotate builds with notes
Context: Follow RLS pattern from 20260516000002_dsg_one_tables.sql — user_id = auth.uid().
```

---

## What agents will NOT do via inbox commands

- Merge PRs (human action only)
- Push directly to main
- Modify GitHub Secrets or Vercel env vars
- Add real credentials to any file
- Deploy to production independently
- Import `@supabase/ssr` (not installed)
- Add Supabase client calls to `middleware.ts`
