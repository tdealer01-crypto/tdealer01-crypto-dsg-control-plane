# Agent Command Inbox — DSG Control Plane

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
Scope: control-plane
Task: Add GET /api/billing/usage that returns requests_this_month from api_keys grouped by org_id
Context: Auth pattern is in CLAUDE.md. org_id comes from users table.
Blocked: Do not add mock data. Supabase only.
```

### Ask Codex to fix a bug
```
Agent: codex
Priority: high
Scope: control-plane
Task: Fix TypeScript error in app/api/webhooks-config/[id]/route.ts line 34
Files: app/api/webhooks-config/[id]/route.ts
```

### Ask any agent to write a migration
```
Agent: claude
Priority: normal
Scope: both
Task: Add audit_entries table to track who changed what, with RLS scoped to org
Context: Follow the same RLS pattern as api_keys table in the latest migration.
```

---

## What agents will NOT do via inbox commands

- Merge PRs (human action only)
- Push directly to main
- Modify GitHub Secrets or Vercel env vars
- Add real credentials to any file
- Deploy to production independently
