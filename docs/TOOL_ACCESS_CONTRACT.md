# Tool Access Contract — DSG Control Plane

This file defines which tools agents may use, how to use them, and what is forbidden.
It is a contract between the repo owner and all automated agents.

---

## What CAN be shared via this repo

| Item | How |
|---|---|
| Agent rules and conventions | `AGENTS.md`, `CLAUDE.md` |
| Tool usage instructions | This file |
| Agent command formats | `docs/AGENT_COMMAND_INBOX.md` |
| GitHub issue templates | `.github/ISSUE_TEMPLATE/` |
| Build and deployment config | `vercel.json`, `next.config.ts` |
| Migration files | `supabase/migrations/*.sql` |

## What MUST NOT be shared via this repo

| Item | Reason |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Full DB bypass — never commit |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client key — set in Vercel env, not repo |
| `OPENAI_API_KEY` | Billing and quota risk |
| Vercel deploy tokens | Can deploy arbitrary code |
| GitHub PATs / OAuth tokens | Account-level access |
| Claude API keys | Billing and impersonation risk |

All secrets are managed in **Vercel Environment Variables** and **GitHub Secrets**.
Never `.env.local` committed to git.

---

## Tool access by agent type

### Claude Code (this agent)

| Tool | Status | Notes |
|---|---|---|
| Read files | Allowed | Any file in repo |
| Edit files | Allowed | Via branch + PR |
| `npm test` | Allowed | Vitest unit tests |
| `npm run build` | Allowed | Next.js build check |
| `npx tsc --noEmit` | Allowed | TypeScript check |
| Push to `claude/*` | Allowed | Feature branches only |
| Push to `main` | Requires approval | Only when user says so |
| Merge PR | Blocked | User merges manually |
| Read Supabase (via service role) | Allowed in code | Not at CLI level |
| Vercel deploy trigger | Blocked directly | Happens on push to main |

### GitHub Actions / Codex CLI

See `.github/workflows/` for configured automations.
Secrets required: set in GitHub repo → Settings → Secrets → Actions.

Required secrets for agent workflows:
```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
OPENAI_API_KEY   (if using Codex)
```

### External agents (Grok Build, Codex, Multica)

- Must read `AGENTS.md` before acting
- Must create a branch — never push directly to `main`
- Must open a PR with full evidence (see CLAUDE.md for PR template)
- Must not introduce `.env` files with real values

---

## Supabase migration protocol

1. Agent creates migration file in `supabase/migrations/YYYYMMDDHHMMSS_description.sql`
2. Migration is reviewed in PR
3. After merge, human runs `supabase db push` in Supabase dashboard **or** CI runs it
4. Never run migrations directly against production without review

## Escalation

If an agent encounters a situation not covered by this contract, it must:
1. Stop
2. Open a GitHub issue using the agent-command template
3. Describe the situation and ask for instruction
4. Not proceed until a human responds
