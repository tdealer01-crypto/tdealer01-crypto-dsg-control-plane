---
name: Agent Command
about: Issue a task to Claude Code, Codex, or Grok Build
title: "[AGENT] "
labels: agent-command
assignees: ""
---

## Agent Command

**Agent:** <!-- claude | codex | grok -->

**Priority:** <!-- critical | high | normal | low -->

**Scope:** <!-- control-plane | dsg-one-v1 | both -->

**Task:**
<!-- One clear sentence: what should the agent do? -->


**Context (optional):**
<!-- Background the agent needs to know. Reference AGENTS.md sections if relevant. -->


**Files to inspect (optional):**
<!-- Comma-separated paths, e.g. app/api/team/route.ts, lib/supabase/server.ts -->


**Blocked from doing (optional):**
<!-- Things the agent must NOT do, e.g. "Do not modify middleware.ts" -->


---

**Rules for the agent:**
- Read `AGENTS.md` and `CLAUDE.md` before starting
- Create a `claude/task-<short-slug>` branch
- Open a PR with full evidence (goal / files / commands / pass-fail / next step)
- Comment on this issue with the PR link when done
- Do not merge the PR — the human merges
- Close this issue only after the PR is merged or explicitly cancelled
