# DSG Control Plane

Production AI governance + execution platform for regulated workflows.

Live: https://tdealer01-crypto-dsg-control-plane.vercel.app

---

## Verified Results (evidence-backed)

| Check | Result | Notes |
|-------|--------|-------|
| TypeScript typecheck | ✅ PASS | `tsc --noEmit` clean |
| Production health | ✅ PASS | `/api/health` 200, `/api/agent/chat` 200 |
| Vitest unit + integration | ⚠️ 2221 passed / 41 failed / 58 skipped | See Known Limitations |
| Z3 invariant proofs | ✅ PASS | quota + billing proofs passing |
| Finance governance actions | ✅ PASS | `tests/integration/api/finance-governance-actions.test.ts` |
| Spine evidence chain | ⚠️ BLOCKED | Requires live Supabase env in test runner |
| Stripe webhook | ⚠️ FAIL | Signature error message mismatch (3 tests) |
| CORS preflight | ⚠️ FAIL | `access-control-allow-origin` header missing (1 test) |

---

## Stack

- Frontend: Next.js 15, React 18, Tailwind, Motion, Recharts
- Backend: Next.js Route Handlers (App Router)
- Runtime + Governance DB: Supabase (Postgres)
- Auth: Supabase Auth + internal service tokens
- LLM: OpenRouter (multi-model failover)
- Billing: Stripe (checkout, webhooks, metered usage)
- Infra: Vercel, Upstash Redis
- Testing: Vitest, Playwright, Z3 solver
- Compliance: DSG Verification, CCVS evidence chain, Safe DOM, Answer Gate

---

## Environment Variables

Required in Vercel / `.env`:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role |
| `NEXT_PUBLIC_APP_URL` | Canonical app URL |
| `APP_URL` | Server-side base URL |
| `DSG_ALLOWED_ORIGINS` | CORS allowed origins |
| `DSG_DEFAULT_POLICY_ID` | Default policy |
| `DSG_CORE_MODE` | `internal` or `remote` |
| `DSG_CORE_URL` | Remote DSG Core URL (if remote mode) |
| `DSG_CORE_API_KEY` | DSG Core API key |
| `INTERNAL_SERVICE_TOKEN` | Machine-to-machine auth for agent/cron |
| `OPENROUTER_API_KEY` | OpenRouter API key |

Stripe (payments + Stripe App):

| Variable | Purpose |
|---|---|
| `STRIPE_API_KEY` | Stripe secret key |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `STRIPE_CLIENT_ID` | Stripe Connect client ID |
| `STRIPE_PRICE_PRO` | Pro price ID |
| `STRIPE_PRICE_BUSINESS` | Business price ID |
| `STRIPE_METER_ID` | Stripe Meter ID |

Optional:

| Variable | Purpose |
|---|---|
| `UPSTASH_REDIS_URL` | Redis for rate limit / quota |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash auth |
| `GITHUB_APP_ID` | GitHub App integration |
| `GITHUB_APP_PRIVATE_KEY` | GitHub App private key |
| `SENTRY_DSN` | Error tracking |
| `RESEND_API_KEY` | Email sending |

---

## Compliance Status

### Accenture 10 Critical Questions

| # | Question | Status | Evidence |
|---|----------|--------|----------|
| 1 | Agent decides from what? | ⚠️ Partial | Policy manifest + Z3 scaffold + Safe DOM |
| 2 | Who approves policy? | ⚠️ Partial | Role-based gate + finance approval workflow |
| 3 | Can audit be traced back? | ⚠️ Partial | Evidence chain + audit API; immutability unverified |
| 4 | Can logs be deleted? | ❓ Unknown | RLS not yet verified for deletion prevention |
| 5 | Prove agent doesn't hallucinate? | ⚠️ Partial | Z3 design proofs + evidence trail (runtime gap) |
| 6 | EU AI Act? | ❌ No | No mapping yet |
| 7 | ISO 42001? | ❌ No | Not certified; no AIMS |
| 8 | Control evidence? | ⚠️ Partial | Audit trail + access log (fragmented) |
| 9 | Incident response? | ❌ No | No playbook |
| 10 | Governance dashboard? | ⚠️ Partial | Hermes chat ≠ governance visibility |

Full mapping: [`docs/ACCENTURE_10Q_COMPLIANCE_MAPPING.md`](docs/ACCENTURE_10Q_COMPLIANCE_MAPPING.md)

### Control Evidence Location

- Audit schema + RLS policies: `docs/compliance/audit-log-schema.sql`
- Incident response playbook: `docs/compliance/incident-response-playbook.md`
- Evidence bundle: `docs/compliance/evidence-bundle.tar.gz`
- AIMS documentation: `docs/compliance/iso-42001-aims.md`

---

## Database

Supabase Postgres. Migrations under `supabase/migrations/`.

Core tables:

| Table | Purpose |
|---|---|
| `users` | Users (`auth_user_id` → Supabase Auth, `org_id`, `role`) |
| `organizations` | Orgs |
| `agents` | Agent definitions + policy + quota |
| `policies` | Policy configs |
| `executions` | Execution records |
| `audit_logs` | Audit trail |
| `usage_events` | Usage events |
| `usage_counters` | Rolled-up usage |
| `billing_subscriptions` | Stripe subscription state |
| `billing_customers` | Stripe customer mapping |
| `billing_events` | Metered billing events |
| `trial_signups` | Trial tracking |

Governance + approval:

| Table | Purpose |
|---|---|
| `gateway_monitor_events` | Gateway event log |
| `dsg_governance_decision_events` | DSG decision audit |
| `dsg_agent_command_gate_decisions` | Agent command gate evidence |
| `dsg_agent_action_result_receipts` | Action result receipts |
| `agi_action_audit` | AGI action audit |
| `user_confirmation_requests` | Human confirmation requests |

Runtime spine:

| Table | Purpose |
|---|---|
| `runtime_truth_states` | Canonical state snapshots |
| `runtime_approval_requests` | Runtime approval requests |
| `runtime_ledger_entries` | Immutable ledger |
| `runtime_effects` | Effect tracking |
| `runtime_checkpoints` | Checkpoints |

Finance governance:

| Table | Purpose |
|---|---|
| `finance_workflow_cases` | Finance case records |
| `finance_workflow_approvals` | Finance approval steps |
| `finance_workflow_action_events` | Finance action events |
| `finance_approval_requests` | Finance approval requests |
| `finance_approval_steps` | Finance approval steps |
| `finance_approval_decisions` | Finance approval decisions |
| `finance_exceptions` | Finance exceptions |
| `finance_evidence_bundles` | Finance evidence |
| `finance_export_jobs` | Finance exports |
| `finance_governance_audit_ledger` | Finance audit ledger |

Hermes / memory / skills:

| Table | Purpose |
|---|---|
| `hermes_agents` | Hermes agent configs |
| `hermes_sessions` | Chat sessions |
| `hermes_session_events` | Session events |
| `hermes_session_threads` | Session threads |
| `hermes_memory_stores` | Memory stores |
| `hermes_memories` | Memory entries |
| `hermes_vaults` | Secret vaults |
| `hermes_skills` | Skill metadata |
| `hermes_environments` | Runtime environments |
| `hermes_user_profiles` | User profiles |
| `hermes_webhooks` | Webhooks |

DSG App Builder:

| Table | Purpose |
|---|---|
| `dsg_app_builder_jobs` | App builder jobs |
| `dsg_app_builder_approvals` | App builder approvals |
| `policies_markdoc` | Markdoc policies |
| `policy_markdoc_versions` | Policy version history |

Org / access / compliance:

| Table | Purpose |
|---|---|
| `org_sso_configs` | SSO config |
| `directory_sync_configs` | Directory sync |
| `directory_group_role_mappings` | Group → role mappings |
| `directory_sync_events` | Sync events |
| `org_billing_policies` | Org billing policy |
| `seat_activations` | Seat tracking |
| `org_onboarding_states` | Onboarding state |
| `guest_access_grants` | Guest access |
| `access_requests` | Access requests |
| `sign_in_events` | Auth events |
| `safe_dom_manifests` | Safe DOM manifests |
| `api_keys` | API keys |
| `webhook_configs` | Webhook configs |
| `webhook_deliveries` | Webhook deliveries |
| `notifications` | Notifications |
| `notification_settings` | Notification prefs |
| `marketplace_products` | Marketplace listings |
| `marketplace_checkout_sessions` | Marketplace checkout |
| `stripe_app_accounts` | Stripe App accounts |
| `stripe_operation_policies` | Stripe App policies |
| `stripe_operation_audits` | Stripe App audits |
| `repair_tickets` | Support tickets |
| `ticket_messages` | Ticket messages |
| `ticket_status_history` | Ticket history |

RLS is enforced on governance tables. Org isolation rule:
`org_id` must derive from `auth.uid()` → `users.auth_user_id`. No client-supplied `org_id` bypass.

---

## API Surface (actually implemented)

Core agent + workflow:

| Route | Purpose |
|---|---|
| `POST /api/agent/chat` | Main chat (multi-agent orchestrator) |
| `POST /api/chat/hermes` | Hermes chat (legacy adapter) |
| `POST /api/assistant/chat` | Assistant chat |
| `POST /api/agent/execute` | Agent execution |
| `GET  /api/agent/status` | Agent status |
| `GET  /api/agent/preflight` | Preflight check |
| `POST /api/agent/commands` | Agent commands |
| `GET  /api/agent/work-sessions` | Work sessions |
| `GET  /api/agents` | List agents |
| `GET  /api/agents/[id]` | Agent detail |
| `POST /api/multi-agent/execute` | Multi-agent execution |

Approval + governance:

| Route | Purpose |
|---|---|
| `GET  /api/approval-queue/pending` | Pending approvals |
| `POST /api/approval-queue/request` | Request approval |
| `GET  /api/approval-queue/[id]` | Approval detail |
| `GET  /api/gateway/approvals` | Gateway approval queue |
| `POST /api/gateway/approvals` | Approve / reject |
| `GET  /api/finance-governance/approvals` | Finance approvals |
| `POST /api/finance-governance/submit` | Finance submit |
| `GET  /api/finance-governance/readiness` | Readiness |
| `GET  /api/finance-governance/onboarding` | Onboarding |
| `GET  /api/finance-governance/audit-ledger` | Audit ledger |
| `POST /api/dsg/agent-command-gate` | Agent command gate |
| `GET  /api/dsg/evaluate` | Evaluate action |
| `GET  /api/dsg/history` | History |

Audit + evidence:

| Route | Purpose |
|---|---|
| `GET  /api/audit` | Audit records |
| `GET  /api/audit/export` | Audit export |
| `GET  /api/audit/matrix` | Evidence matrix |
| `GET  /api/enterprise-proof` | Enterprise proof |
| `GET  /api/enterprise-proof/report` | Enterprise report |
| `GET  /api/compliance-evidence-pack` | Evidence pack |
| `GET  /api/compliance/export` | Compliance export |
| `GET  /api/ccvs/evidence-chain` | CCVS evidence chain |
| `GET  /api/ccvs/compliance-status` | CCVS status |

Execution + gateway:

| Route | Purpose |
|---|---|
| `POST /api/execute` | Execute tool |
| `POST /api/executors/dispatch` | Dispatch executor |
| `GET  /api/executions` | Execution history |
| `GET  /api/gateway/connectors` | Connector list |
| `POST /api/gateway/plan-check` | Plan check |
| `POST /api/spine/execute` | Spine execute (Safe DOM) |
| `GET  /api/safe-dom/browserbase` | Safe DOM status |
| `GET  /api/checkpoint` | Checkpoint |
| `POST /api/effect-callback` | Effect callback |
| `GET  /api/replay/[executionId]` | Replay |

Billing + subscription:

| Route | Purpose |
|---|---|
| `POST /api/billing/checkout` | Create checkout |
| `GET  /api/billing/meter-health` | Meter health |
| `POST /api/billing/webhook` | Stripe webhook |
| `GET  /api/release-gate/check` | Release gate |
| `POST /api/release-gate/checkout` | Release checkout |
| `GET  /api/marketplace/verify` | Marketplace verify |
| `POST /api/marketplace/checkout` | Marketplace checkout |

Auth + access:

| Route | Purpose |
|---|---|
| `POST /api/auth/session` | Session |
| `POST /api/auth/provision-access` | Provision access |
| `POST /api/access/request` | Access request |
| `POST /api/access/review` | Access review |

Hermes:

| Route | Purpose |
|---|---|
| `GET  /api/hermes/sessions` | Sessions |
| `GET  /api/hermes/skills` | Skills |
| `GET  /api/hermes/agents` | Agents |
| `GET  /api/hermes/memory-stores` | Memory stores |
| `GET  /api/hermes/vaults` | Vaults |
| `GET  /api/hermes/webhooks` | Webhooks |
| `GET  /api/hermes/environments` | Environments |
| `POST /api/hermes/enroll` | Enroll |
| `GET  /api/hermes/chat` | Hermes chat |
| `GET  /api/hermes/user-profiles` | User profiles |

Marketing + automation:

| Route | Purpose |
|---|---|
| `GET  /api/marketing/agent` | Marketing agent |
| `POST /api/cron/*` | Cron jobs (50+ scheduled tasks) |
| `GET  /api/quickstart/*` | Quickstart flows |
| `GET  /api/blog` | Blog |
| `POST /api/beta-signup` | Beta signup |

Stripe App (under `packages/stripe-app`):

| Route | Purpose |
|---|---|
| `POST /api/stripe-app/webhook` | Stripe App webhook |
| `POST /api/stripe-app/disconnect` | Disconnect |
| `GET  /api/stripe-app/policies` | Policies |
| `GET  /api/stripe-app/approvals` | Stripe App approvals |
| `GET  /api/stripe-app/audit` | Stripe App audit |
| `POST /api/stripe-app/connect` | Stripe App connect |

Other integration routes: `dsg-bridge/*`, `delegation/*`, `integrations/*`, `github-app/*`, `defi/*`, `playground/*`, `demo/*`, `proof/*`, `readiness/*`, `settings/*`, `support/*`.

Full route list: `find app/api -name 'route.ts'`

---

## Library Structure (lib)

Key namespaces:

- `lib/agent*` — Agent execution, context, tools, skills
- `lib/audit*` — Audit recording, hash chains
- `lib/auth*` — RBAC, SSO, directory sync, safe redirects
- `lib/billing*` — Entitlements, metering, quota, reconciliation
- `lib/ccvs*` — CCVS evidence, compliance matrix, drift detection
- `lib/dsg*` — Core DSG runtime: gates, planner, memory, safe DOM, answer gate, app builder, brain, context graph, deterministic proof, multi-agent
- `lib/enterprise*` — Enterprise proof + access
- `lib/executors*` — Browser, terminal, Android, Browserbase
- `lib/finance-governance*` — Finance workflow, ledger, readiness
- `lib/gateway*` — Gateway approval, audit, connectors, executor, policy
- `lib/governance*` — Decision recorder
- `lib/hermes*` — Hermes orchestrator, planner, skills, runtime
- `lib/mcp*` — MCP server + tool schemas
- `lib/runtime*` — Runtime gates, checkpoint, recovery
- `lib/spine*` — Spine engine, pipeline, plugins, safe DOM verification
- `lib/security*` — CORS, rate limit, audit export, secret crypto
- `lib/stripe-app*` — Stripe App OAuth + deauth
- `lib/webhooks*` — Webhook delivery

---

## Setup

Prereqs:
- Node.js 20+
- Supabase project
- OpenRouter API key
- Vercel account (recommended)

1. Clone
2. `cp .env.example .env.local`
3. `npm install --no-audit --no-fund --ignore-scripts`
4. `npx supabase db push` (or apply migrations in Supabase SQL editor)
5. `npx supabase gen types typescript --project-id $SUPABASE_PROJECT_ID > lib/database.types.ts`
6. `npm run db:types` (if using script)
7. `npm run dev` → http://localhost:3000

Troubleshooting:
- If Supabase install fails on Android/Termux: use `--ignore-scripts`
- If DB push fails: run SQL from `supabase/migrations/` via Dashboard → SQL Editor
- If RLS blocks inserts: check `users` table has `auth_user_id` matching your Supabase Auth user

---

## Testing

| Command | Scope |
|---|---|
| `npm run typecheck` | TypeScript |
| `npm test` | Vitest unit + integration |
| `npm run test:integration` | Integration only |
| `npm run test:live:db:required` | Live DB required suites |
| `npm run test:e2e` | Playwright enterprise-proof + finance-governance |
| `npm run test:multi-agent` | Multi-agent coordination |
| `npm run ux:routes` | UX route map verification |
| `npm run verify:policy` | Policy verification |
| `npm run benchmark:full` | Full benchmark |
| `npm run ccvs:pipeline` | Evidence pipeline |

---

## Deployment

- Vercel: `vercel --yes --prod`
- Env must include production Stripe + Supabase keys
- `installCommand` in `vercel.json` is `npm install` (not `npm ci`) because lockfile diverges on `lucide-react`

---

## Packages

- `packages/stripe-app/` — Stripe App marketplace build
  - Build: `cd packages/stripe-app && npm run build`
  - Docs: `packages/stripe-app/docs/`

---

## Known Limitations

1. **Test coverage gaps**: 41 failing tests, mostly due to missing Supabase env vars in test runner (environment setup issue, not code defect).
2. **Z3 proofs**: Design-time invariant proofs only. Not a runtime SMT solver verification (credibility gap for compliance).
3. **EU AI Act**: No risk classification or transparency disclosure yet.
4. **ISO 42001**: Not certified; AIMS documentation incomplete.
5. **Incident response**: No documented playbook or escalation matrix.
6. **Audit log deletion prevention**: RLS policies not yet verified; no automated test.
7. **Local dev on Termux/Android**: `next dev` compile hangs for some routes. Use production URL instead.

---

## Key Design Rules

- Org isolation: every row scoped by `org_id`. `org_id` is never trusted from client input.
- Auth derives org from `auth.uid()` → `users.auth_user_id` → `users.org_id`.
- High-risk tools require approval token (`gap_*`) before execution.
- Approval queue uses `audit_token` (`gat_*`) to locate pending review, then returns `approvalToken` on approve.
- Verification layer enforces ALLOW / REVIEW / BLOCK with evidence hash + record hash.
- No Russian outputs in assistant/agent prompts.
- Do not add mock-only routes or in-memory stores to production paths.
- Compliance evidence is exported via `/api/compliance/export` and `/api/compliance-evidence-pack`.

---

## License

Proprietary. All rights reserved.
