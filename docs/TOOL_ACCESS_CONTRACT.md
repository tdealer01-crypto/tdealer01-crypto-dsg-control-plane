# Tool Access Contract — DSG One v1

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
| Build config | `next.config.ts`, `scripts/dsg-next-build.mjs` |
| Migration files | `supabase/migrations/*.sql` |

## What MUST NOT be shared via this repo

| Item | Reason |
|---|---|
| `DSG_ONE_V1_SUPABASE_SERVICE_ROLE_KEY` | Full DB bypass — never commit |
| `DSG_ONE_V1_SUPABASE_URL` | Set in Vercel env only |
| `OPENAI_API_KEY` | Billing and quota risk |
| Vercel deploy tokens | Can deploy arbitrary code |
| GitHub PATs / OAuth tokens | Account-level access |
| Claude API keys | Billing and impersonation risk |

All secrets are managed in **Vercel Environment Variables** and **GitHub Secrets**.
Never commit `.env.local` to git.

---

## Tool access by agent type

### Claude Code (this agent)

| Tool | Status | Notes |
|---|---|---|
| Read files | Allowed | Any file in repo |
| Edit files | Allowed | Via branch + PR |
| `npm run build` | Allowed | Next.js build check |
| `npx tsc --noEmit` | Allowed | TypeScript check |
| Push to `claude/*` | Allowed | Feature branches only |
| Push to `main` | Requires approval | Only when user says so |
| Merge PR | Blocked | User merges manually |
| Read Supabase (service role via `supabase-rpc.ts`) | Allowed in code | Not at CLI level |
| Import `@supabase/ssr` | Blocked | Not installed in this repo |
| Modify `middleware.ts` with Supabase | Blocked | See CRITICAL rule in CLAUDE.md |

### GitHub Actions / Codex CLI

See `.github/workflows/` for configured automations.
Secrets required: set in GitHub repo → Settings → Secrets → Actions.

Required secrets for agent workflows:
```
DSG_ONE_V1_SUPABASE_URL
DSG_ONE_V1_SUPABASE_SERVICE_ROLE_KEY
OPENAI_API_KEY   (if using Codex)
```

### External agents (Grok Build, Codex, Multica)

- Must read `AGENTS.md` before acting
- Must create a branch — never push directly to `main`
- Must open a PR with full evidence (see CLAUDE.md for PR template)
- Must not modify `middleware.ts` using Supabase client
- Must not introduce `.env` files with real values

---

## Supabase migration protocol

1. Agent creates migration file in `supabase/migrations/YYYYMMDDHHMMSS_description.sql`
2. Migration is reviewed in PR
3. After merge, human runs migration in Supabase dashboard or via CI
4. Never run migrations directly against production without review

## Supabase client usage

This repo does NOT use `@supabase/ssr`. All Supabase access goes through:
```
lib/dsg/server/supabase-rpc.ts
  └─ readDsgRest()    — GET rows from any table
  └─ callDsgRpc()     — Call Postgres functions
  └─ getDsgSupabaseRpcConfig()  — Reads env vars
```

Env vars required at runtime:
- `DSG_ONE_V1_SUPABASE_URL`
- `DSG_ONE_V1_SUPABASE_SERVICE_ROLE_KEY`

## Escalation

If an agent encounters a situation not covered by this contract, it must:
1. Stop
2. Open a GitHub issue using the agent-command template
3. Describe the situation and ask for instruction
4. Not proceed until a human responds
