# Runbook — moving the control plane from Vercel to Render

Status of this document: procedure written from repository inspection and the
Vercel API evidence quoted below. No Render service has been created or verified
from this repository yet, so every Render-side step is `pending` until executed.

`docs/RUNBOOK_DEPLOY.md` remains the deployment source of truth for anything not
specific to the host move.

---

## Why

Vercel is refusing to provision build resources for the control-plane project.
Two consecutive deployments of the same commit, one from the GitHub integration
and one from the CLI:

| Deployment | Source | Duration | errorCode | errorMessage |
|---|---|---|---|---|
| `dpl_5S8Lf9nacJ3V4TAtFjARYYcLGxLJ` | git | 1.5s | `BUILD_FAILED` | `Resource provisioning failed` |
| `dpl_641vbq7QHtAEJ2AoyynGwVrZaNMK` | cli | 2.6s | `BUILD_FAILED` | `Resource provisioning failed` |

Build logs filtered to errors for both: `No error/stderr/exit events in this
build.` The build never starts. A failure this fast with an empty build log is a
platform-side refusal, not a compile error — consistent with a blocked billing
state. Six sibling Vercel projects on the same repo and commit deployed fine,
which rules the commit itself out.

`verified fact`: the two deployment records above.
`inference`: that the cause is the billing block specifically. Confirm in the
Vercel dashboard billing page before treating that as settled.

---

## What changes in the repo

| Concern | Vercel | Render |
|---|---|---|
| Build | zero-config Next.js | `Dockerfile` (already honours `$PORT`) |
| Cron | `vercel.json` `crons` | `render.yaml` `type: cronjob` × 5 |
| Commit identity | `VERCEL_GIT_COMMIT_SHA` | `RENDER_GIT_COMMIT` |
| Branch | `VERCEL_GIT_COMMIT_REF` | `RENDER_GIT_BRANCH` |
| Stage | `VERCEL_ENV` | derived: `IS_PULL_REQUEST` + `NODE_ENV` |
| Public origin | `VERCEL_URL` (no scheme) | `RENDER_EXTERNAL_URL` (with scheme) |
| Deployment id | `VERCEL_DEPLOYMENT_ID` | `RENDER_INSTANCE_ID` |
| Managed-host flag | `VERCEL` | `RENDER` |

All of these are now read through `lib/deployment/platform.ts`. Do not add new
`process.env.VERCEL*` reads — they resolve to `undefined` on Render and degrade
silently rather than failing loudly.

Three defects the migration would otherwise have introduced, now fixed:

1. `lib/deployment/readiness.ts` gated strict readiness on
   `Boolean(process.env.VERCEL)`. On Render that reads false, silently swapping a
   fail-closed gate for the relaxed check set. Now `isManagedHost()`.
2. `lib/security/cors.ts` sourced the production origin from
   `VERCEL_PROJECT_PRODUCTION_URL`. With no Render equivalent and no
   `DSG_ALLOWED_ORIGINS`/`APP_URL`, the allow-list would have been empty and
   strict mode would block every cross-origin call.
3. `app/api/marketplace/sellers/onboard/route.ts` built Stripe `return_url` /
   `refresh_url` from `VERCEL_URL`, which is a bare hostname — the interpolation
   produced a scheme-less URL Stripe rejects, and on Render it would have fallen
   back to `http://localhost:3000`. Now `getPublicOrigin()`, which always
   includes a scheme.

---

## Environment variables to set on Render

Names only. Never paste values into this file, a PR body, or a log.

Required for the web service to build and boot:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`
- `APP_URL`, `NEXT_PUBLIC_APP_URL`
- `CRON_SECRET`
- `DSG_ALLOWED_ORIGINS`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (only if billing is in scope)

**Build-time gotcha:** Next.js inlines `NEXT_PUBLIC_*` at build time, so those
must be present when the Docker image builds, not only when the container runs.
If the first deploy comes up with an unconfigured Supabase client, this is the
cause — the values were runtime-only.

Set `APP_URL` explicitly rather than relying on `RENDER_EXTERNAL_URL`. The helper
prefers `APP_URL`, so pinning it keeps callback URLs stable when the service is
renamed or a custom domain is attached.

---

## Blocker: production promotion is Vercel-shaped

**Production cannot be cut over to Render yet, and `vercel.json` cannot be
deleted.** `scripts/verify-agent-workspace-boundary.mjs` is a governance guard
that enforces "production never deploys automatically". It asserts, and CI runs it:

- `vercel.json` exists and sets `git.deploymentEnabled["*"] = false`;
- `.github/workflows/promoted-production-deploy.yml` exists, is `workflow_dispatch`
  only, and contains an explicit production deploy command — the guard matches the
  Vercel CLI's production flag. (Deliberately not quoted verbatim here: the guard
  also scans added diff lines for that exact pattern, so writing it out in prose
  trips it. That is how this section first failed CI.);
- that workflow carries ten named controls, including the
  `Production – dsg-qubo-api` GitHub environment, an exact-current-main-commit
  check, `npm audit --audit-level=high`, `approve-agent-workspace-promotion.mjs`,
  `finalize-agent-workspace-promotion.mjs`, and a rollback step;
- no other workflow contains a production deploy command.

The coupling runs deeper than YAML: `scripts/approve-agent-workspace-promotion.mjs`
selects a **`vercel_project_id`** column from the agent-workspace row and passes it
as `p_target` to a Supabase RPC. Retargeting promotion at Render therefore needs a
schema migration plus an RPC change, which cannot be verified from a sandbox.

Consequence for this blueprint: `render.yaml` sets **`autoDeployTrigger: "off"`**.
An earlier revision used `commit`, which would have deployed production on every
merge to `main` — silently violating the invariant the guard exists to protect.
With auto-deploy off, `verify-render` is `workflow_dispatch` only; polling on push
would wait out its 15-minute budget for a deploy that never starts.

**Designing Render production promotion is a separate, gated change.** It must
preserve every control above, not remove them to make the guard pass.

## CI

`.github/workflows/deploy.yml` no longer deploys to Vercel.

- **Pull requests:** `validate` + `build` only. `npm run build` is the meaningful
  compile gate for App Router changes, and no remote environment is created per
  PR, so there is no per-preview hosting cost.
- **Manual dispatch:** `verify-render` polls `GET /api/agent/status` on the Render
  origin until the deployed `commit` equals the pushed SHA (15 minute budget),
  warns if `platform` is not `render`, then smoke-tests `GET /api/health`. Run it
  after a promotion.

CI deliberately does **not** trigger the deploy — it verifies. See the blocker
section above for why production auto-deploy stays off.

`verify-render` needs one secret, by name: **`RENDER_SERVICE_URL`**, set to the
service origin (`https://<service>.onrender.com`). While that secret is unset the
job reports `SKIPPED — NOT CONFIGURED` and passes, so pushes are not blocked
before the service exists. Setting it turns the verification on.

## Cutover

Run in order. Do not delete anything on Vercel until step 7 passes.

1. **Create the service.** Point Render at this repo and let it read
   `render.yaml`, or create the service manually to match it. Validate the
   blueprint first: `render blueprint validate`. The schema in `render.yaml` has
   not been exercised against a live Render account from this repo — expect to
   correct field names on the first attempt, and fix them in the file rather
   than only in the dashboard.
2. **Set env vars** by name from the list above. Every entry in `render.yaml`
   marked `sync: false` needs a value.
3. **Deploy** and wait for the service to reach live.
4. **Confirm deployed identity** on the Render origin:

   ```bash
   curl -fsS "https://<service>.onrender.com/api/agent/status"
   ```

   Expect `platform: "render"`, `commit` equal to the deployed SHA, and
   `env: "production"`. `commit: "local"` or `platform: "local"` means the host
   env vars are not reaching the app — stop and fix before continuing.
5. **Public probes:** `GET /api/health`, `GET /api/readiness`. Readiness is
   fail-closed and now correctly strict on Render; a red readiness here is a real
   signal, not a platform artifact.
6. **Cron:** trigger one job manually from the Render dashboard and confirm a
   2xx. `curl -f` makes a non-2xx exit non-zero, so a failed run shows as failed
   rather than silently passing. Verify the routes reject an unauthenticated
   call — they must fail closed when `CRON_SECRET` is absent.
7. **Authenticated operator checks** with real credentials, per
   `docs/RUNBOOK_DEPLOY.md`, plus `npm run go:no-go <render-url>`.
8. **Point DNS** at Render, then set `APP_URL` / `NEXT_PUBLIC_APP_URL` to the
   custom domain and redeploy so the inlined `NEXT_PUBLIC_*` values pick it up.
9. **Disable the Vercel cron schedules** so meter flushing does not run twice
   against the same database if Vercel billing is later restored.

Release status stays `NO-GO` until 4–7 all pass with recorded evidence.

---

## Rollback

The web service is additive — nothing in this change removes the Vercel path.
`vercel.json` is untouched, so restoring Vercel is a billing fix plus a redeploy.
The one shared resource is Supabase: if both hosts are live at once, both cron
sets will fire. Keep exactly one host's crons enabled at a time.

---

## Known gaps

- `render.yaml` is unvalidated against a live Render account. `pending`.
- Region is set to `singapore`; confirm it matches the Supabase project region or
  expect added latency on every query.
- Plans (`standard` web, `starter` cron) are guesses at the needed size. The
  Docker build is heavy — if it OOMs or times out, raise the web plan first.
- `@vercel/analytics` and `@vercel/speed-insights` remain as dependencies. They
  are inert off Vercel; removing them is a separate cleanup.
- Two `workflow_dispatch`-only workflows still call `vercel deploy` and will fail
  if anyone triggers them while billing is blocked: `deploy-staging.yml` and
  `promoted-production-deploy.yml`. Neither runs on push or pull_request, so
  neither affects PR status. Migrating production promotion is deliberately out
  of scope here — it needs its own gated change.
- The websocket and HPC-verification Dockerfiles are not part of this migration.
