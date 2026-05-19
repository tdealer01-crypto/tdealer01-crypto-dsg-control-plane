# DSG ONE — ProofGate Control Plane

> **Block before the AI agent acts — not after the damage is done.**

DSG ONE is a runtime governance layer for AI agents. Connect it in one line, gate every action before execution, and get a cryptographic audit trail that satisfies EU AI Act Articles 9, 12, and 14.

**Production URL:** `https://tdealer01-crypto-dsg-control-plane.vercel.app`

---

## What it does

Other tools tell you what your agent did *after* the fact.  
DSG ONE intercepts the action *before* it executes — issues an ALLOW stamp or a BLOCK with agent guidance.

```
Agent wants to act
  → POST /api/try/gate  { session_id, action }
  → ALLOW + cryptographic stamp   (agent proceeds)
  → BLOCK + suggested_llm_prompt  (agent self-corrects)
```

Every decision is hashed and tamper-proof. No rebuild of your existing stack required.

## Deployment Status Note

Repository test status and deployment readiness are intentionally tracked separately.

- Repository baseline: the automated test suite is green on the current branch.
- Deployment baseline: production-readiness is only claimed when deployed health, core connectivity, environment configuration, migrations, smoke checks, authenticated first-run flow, and operator/runtime verification are all confirmed in the target environment.

Passing repository tests alone does not mean the deployed environment is production-ready.

---

## Current test and security evidence — 2026-05-19

This section records the latest operator-observed verification evidence for team review. It is intentionally separated from final production certification claims.

### Summary verdict

| Area | Status | Evidence |
|---|---:|---|
| Local unit/integration tests | PASS | `27` tests passed (post-i18n); `pnpm typecheck` 0 errors; `pnpm build` compiled successfully. |
| Public trust surface | PASS | `/terms`, `/privacy`, `/security`, `/support` returned HTTP `200`. |
| Runtime baseline | PASS | `/api/health` HTTP `200` `db_ok:true`; `/api/readiness` HTTP `200` all 7 sub-checks green (`env`, `nextAuthSecret`, `supabaseServiceRole`, `dsgCoreConfig`, `dsgCoreHealth`, `financeGovernanceSurface`, `financeGovernanceBackend`). |
| Legacy route cleanup | PASS | No legacy `/api/finance-governance/server-store` callers found. |
| `api.dsg_*` RLS hardening | PASS | `api.dsg_app_builder_*` and `api.dsg_memory_*` tables have RLS enabled and authenticated workspace-member policies for `SELECT`, `INSERT`, and `UPDATE`. |
| `api.generated_app_items` exposure | PASS | RLS enabled with deny-all policy for `anon` and `authenticated`; no `anon`/`authenticated` table grants observed. |
| **i18n — Thai text removed** | **PASS** | `grep -rP "[฀-๿]" app/ components/ lib/` → 0 matches. All dashboard pages, email templates, agent libs, and model provider strings translated to English. |
| **i18n — Public UI smoke** | **PASS** | `/` and `/product` rendered English via Playwright screenshot (920 KB, 805 KB). No Thai visible. |
| **i18n — Authenticated dashboard smoke** | **PASS** | All 7 protected routes (`/dashboard/audit`, `executions`, `live-control`, `policies`, `referrals`, `skills`, `verification`) returned HTTP `200` with authenticated Supabase session; `grep /[฀-๿]/` on response HTML → 0 matches. Verified 2026-05-19 against production Vercel deploy `2573697`. |
| Vercel production deploy | PASS | Commits `46b45e1` and `2573697` deployed READY on Production. |
| Supabase auth advisor | WARN | Leaked password protection remains disabled in Supabase Auth settings. |

### Current operational decision

- **i18n gate:** ✅ **GO** — all source, build, unit-test, public UI, and authenticated dashboard smoke gates passed on 2026-05-19.
- **Controlled pilot:** GO, using explicit claim boundaries and evidence capture.
- **Enterprise production-ready / certified SaaS:** NO-GO until CI Playwright audit on non-Android runner, live DB integration tests (`pnpm test:live:db:required`) with staging credentials, and Supabase Auth leaked-password warning are resolved.

### Evidence boundary

Allowed claim:

```
DSG ONE has live public runtime health, readiness, trust-surface checks,
unit/integration test evidence, hardened RLS coverage, and full English UI
(no Thai text) verified in authenticated production sessions on 2026-05-19.
```

Disallowed claim:

```
Certified, third-party audited, WORM-certified, externally Z3 production verified,
or end-to-end formally verified SaaS.
```

---

## Customer journey

```
/eu-ai-act          ← compliance landing page (EU AI Act Art. 9 / 12 / 14)
  ↓
/signup             ← email + workspace name → magic link
  ↓
/auth/confirm       ← creates org + 14-day trial + billing subscription
  ↓
/dashboard/welcome  ← shows workspace name, trial days, 3 onboarding steps
  ↓
/dashboard/api-keys ← create scoped API key (shown once, hashed server-side)
  ↓
/quickstart         ← REST API integration guide (curl / Python / JS)
  ↓
/api/try/gate       ← live gate endpoint, no auth required for trial
```

---

## REST API — no SDK required

### Step 1 — Declare your session

```bash
curl -X POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/try/gate \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "my-agent-run-001",
    "declared_actions": ["read database", "send email", "update user record"],
    "ttl_minutes": 30
  }'
```

### Step 2 — Gate every action

```bash
curl -X POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/try/gate \
  -H "Content-Type: application/json" \
  -d '{"session_id": "my-agent-run-001", "action": "send email to user@example.com"}'
```

Response:
```json
{
  "decision": "ALLOW",
  "stamp": "DSG-X9K3M7P2",
  "action": "send email to user@example.com",
  "session_state": { "stamps_issued": 1, "blocked_count": 0, "ttl_remaining_min": 29 }
}
```

### Step 3 — Handle BLOCK

```json
{
  "decision": "BLOCK",
  "reason": "Pattern \"delete\\s+all\" is permanently blocked",
  "agent_guidance": {
    "can_proceed_with": ["read database", "send email", "update user record"],
    "suggested_llm_prompt": "Your action was blocked. You can still perform: ..."
  }
}
```

**Trial limits:** 60 req/min · sessions TTL 60 min · no API key needed for trial

**Permanently blocked patterns:** `delete all`, `drop table`, `truncate`, `bypass policy`, `rm -rf`, `exfiltrate`, `steal`

---

## Pages

| Path | Purpose |
|---|---|
| `/` | Homepage |
| `/eu-ai-act` | EU AI Act compliance landing — comparison table, Art. 9/12/14 |
| `/proofgate` | ProofGate product story |
| `/enterprise-ready` | No-migration enterprise setup |
| `/finance-governance` | Payment & finance controls |
| `/automation` | Webhook & workflow automation |
| `/ai-compliance` | ISO 42001, NIST AI RMF |
| `/pricing` | Four tiers: Trial / Pro / Business / Enterprise |
| `/quickstart` | REST API integration guide (curl / Python / JS) |
| `/docs` | API endpoint reference |
| `/signup` | 14-day trial signup |
| `/login` | Magic link + password login |
| `/dashboard/welcome` | Post-signup onboarding (org name, trial days, 3 steps) |
| `/dashboard/api-keys` | Create / revoke scoped API keys |
| `/dashboard/integrations` | Integration setup guide |
| `/dashboard` | Command center |
| `/admin/leads` | Founder-only lead pipeline view |
| `/unsubscribe` | CAN-SPAM unsubscribe (updates lead intent in DB) |

---

## API routes

### Gate (public trial)

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/try/gate` | Declare session or gate an action — no auth required |

### API keys

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/api-keys` | List org API keys |
| `POST` | `/api/api-keys` | Create API key (raw key returned once) |
| `DELETE` | `/api/api-keys/:id` | Revoke key (sets status to REVOKED) |

### Agents & execution

| Method | Path | Description |
|---|---|---|
| `GET/POST` | `/api/agents` | List or create agents |
| `POST` | `/api/execute` | Protected execution entry |
| `POST` | `/api/dsg/v1/gates/evaluate` | Deterministic gate evaluation |
| `POST` | `/api/dsg/v1/proofs/prove` | Generate deterministic proof scaffold |
| `GET` | `/api/dsg/v1/policies/manifest` | Fetch policy manifest |

### Crons (Vercel, daily)

| Schedule (UTC) | Path | Purpose |
|---|---|---|
| `0 8 * * *` | `/api/cron/github-leads` | Find AI agent repos on GitHub, save as leads |
| `30 8 * * *` | `/api/cron/social-listen` | Monitor Reddit + HN for AI agent mentions |
| `0 9 * * *` | `/api/cron/lead-outreach` | Send cold email to 20 highest-intent leads/day |
| `0 10 * * *` | `/api/cron/lead-followup` | Day-3 follow-up for non-responders |
| `0 9 * * *` | `/api/cron/drip-emails` | Trial user drip sequence |
| `0 10 * * *` | `/api/cron/smart-drip` | Smart drip variant |
| `0 3 * * *` | `/api/health` | Health probe |

---

## Lead pipeline

Automated customer acquisition for enterprise/compliance buyers:

```
GitHub search → repos using LangChain / AutoGen / CrewAI / OpenAI Agents SDK / PydanticAI
  → filter: updated < 30 days, stars ≥ 20
  → fetch owner email from GitHub public profile
  → save to leads table (insert + catch 23505)
  → lead-outreach cron: cold email (EU AI Act angle)
  → lead-followup cron: day-3 follow-up
  → /unsubscribe: opt-out updates intent in DB
  → /admin/leads: founder views pipeline
```

Target ICP: Fintech/banks, SOC 2 / ISO 42001 audit companies, GDPR/PDPA-regulated orgs.

---

## Tech stack

```
Next.js 15 (App Router)
React 18
TypeScript
Supabase (auth + postgres + service role)
Resend (transactional email)
Stripe (billing webhooks)
Vercel (deployment + crons)
```

---

## Local development

```bash
npm install --ignore-scripts
cp .env.example .env.local   # fill in values
npm run dev
```

Open: `http://localhost:3000`

### Required env vars

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# App URL (used in auth email redirect)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Email
RESEND_API_KEY=

# Cron protection
CRON_SECRET=

# Lead pipeline
GITHUB_TOKEN=          # optional — raises rate limit for github-leads cron

# Admin
FOUNDER_EMAIL=         # email that can access /admin/leads

# Stripe (optional for local)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

Pull from Vercel (if connected):
```bash
vercel env pull .env.local
```

Evaluation should use all three layers together:
- repository evidence (tests, docs, artifacts)
- deployment evidence (`/api/health`, readiness, smoke checks)
- authenticated operator/runtime evidence in the target environment

Do not treat green repository tests alone as final proof of deployment readiness.

---

## Verification

```bash
npm run typecheck      # TypeScript — currently 1 pre-existing error in tests/
npm run build          # Next.js production build
npm test               # Jest unit tests
```

Live gate check:
```bash
curl -s -X POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/try/gate \
  -H "Content-Type: application/json" \
  -d '{"session_id":"readme-test","declared_actions":["read data"],"ttl_minutes":5}'
```

Expected: `{"ok":true,"decision":"ALLOW","declaration_stamp":"DSG-..."}`

---

## EU AI Act compliance coverage

| Article | Requirement | DSG ONE |
|---|---|---|
| Art. 9 | Risk management — prevent before act | Gates every action before execution |
| Art. 12 | Record keeping — tamper-proof log | Cryptographic stamp on every ALLOW |
| Art. 14 | Human oversight — ability to intervene | BLOCK + approval workflow |

---

## Formal verification artifact

```
DOI: https://doi.org/10.5281/zenodo.18225586
Title: Deterministic State Gate (DSG): Formally Verified Control Primitive for Safety-Critical AI Systems
```

> The DOI artifact is the formal verification reference. Repository runtime routes provide scaffold behavior — they are not equivalent to an end-to-end formally verified SaaS deployment.

---

## GitHub Marketplace action

```yaml
- name: DSG Secure Deploy Gate
  uses: tdealer01-crypto/dsg-secure-deploy-gate-action@v1.0.2
```

```
https://github.com/marketplace/actions/dsg-secure-deploy-gate
```

---

## Claim boundary

Supported claims based on current repository evidence:

```
✓ REST API gate endpoint — live, no SDK required
✓ Cryptographic audit trail on every gated action
✓ EU AI Act Art. 9 / 12 / 14 coverage scaffold
✓ 14-day trial with automated org provisioning
✓ Automated lead pipeline (GitHub signal → cold email → follow-up)
✓ API key management (scoped, SHA-256 hashed, revocable)
✓ Deterministic proof/gate scaffold
```

Not yet verified without additional live evidence:

```
✗ Independent third-party audit or certification
✗ External Z3 solver in production (scaffold only)
✗ SDK published to npm / PyPI (@dsg-one/sdk is private — use REST API)
```
