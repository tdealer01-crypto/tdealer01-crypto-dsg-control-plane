# Vercel → Render Migration Contract

Date: 2026-08-13

## Why

The consolidated Vercel project (`tdealer01-crypto-dsg-control-plane`) has an
unresolved provisioning failure: git-triggered and CLI deployments both return
`BUILD_FAILED: Resource provisioning failed` before a Vercel build log is even
produced (see PR #1096). A follow-on attempt (PRs #1097–#1099) tried a
fail-closed migration to a second Vercel account, but the automated dry-run is
blocked on a real credential gap — no `VERCEL_TOKEN_NEW` secret is configured,
and the existing `VERCEL_TOKEN` is not authorized for any non-legacy Vercel
team. That path cannot proceed without a human adding a working token in the
Vercel dashboard.

Decision: stop pursuing the Vercel account migration and move the production
runtime to Render instead, following the same pattern already completed for
`dsg-one-v1` (see that repo's `docs/FRAMER_RENDER_MIGRATION.md`).

As of this doc, `vercel.json` already has git auto-deploy disabled
(`git.deploymentEnabled: { "*": false }`), so Vercel is not currently deploying
`main` regardless of this migration. Live production
(`https://tdealer01-crypto-dsg-control-plane.vercel.app`) is still serving commit
`bb044e33` (PR #965, merged 2026-07-28) until a new origin is live.

## What this change adds

- `render.yaml` — a Render Blueprint defining:
  - a `web` service (`dsg-control-plane`) running `npm ci && npm run build` /
    `npm run start`, with `healthCheckPath: /api/health`.
  - five `cron` services mirroring the five schedules currently in
    `vercel.json`'s `crons` array (`flush-meter-outbox`, `reconcile-meter`,
    `usage-alerts`, `trial-invite`, `weekly-report`), each a `curl` call to the
    same protected route with the same `Authorization: Bearer $CRON_SECRET`
    contract the routes already enforce (verified against each route's
    exported `GET` handler and `CRON_SECRET` check).
- `package.json` `start` script now honors `$PORT` (`next start -p
  ${PORT:-3000}`) — required because Render assigns the service a port at
  runtime; the previous hardcoded `-p 3000` would not bind to it.

## What this change does NOT do

- It does not create or connect a Render service. That is a one-time
  dashboard action (or `render.yaml` Blueprint sync) that requires a Render
  account and cannot be done from this repository alone.
- It does not touch `vercel.json`, `.github/workflows/sync-vercel-envs.yml`,
  or the other Vercel-specific workflows/scripts. They are left in place,
  inert (auto-deploy already off), until Render is verified live.
- It does not update the production URL referenced in `CLAUDE.md` §2 and §23,
  or the smoke-check URLs baked into `docs/RUNBOOK_DEPLOY.md` / other
  workflows. Those should change only after a Render origin is confirmed
  `Ready` with live evidence — updating them now would be an unverified claim.
- The `render.yaml` cron/env schema was checked against Render's published
  Blueprint spec but has not been applied against a live Render account in
  this session (no Render API/CLI access here). Treat it as a reviewed draft,
  not a verified-working blueprint, until a Blueprint sync actually succeeds.

## Manual cutover steps (human, in the Render dashboard)

1. Create a new Blueprint from this repo (or a Web Service directly) pointed
   at the `main` branch; Render should detect `render.yaml`.
2. Set the `sync: false` env vars for the web service and each cron service
   by name — see `.env.example` for the full variable list. At minimum the
   web service needs `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `CRON_SECRET`, and
   `APP_URL`/`NEXT_PUBLIC_APP_URL` pointed at the Render origin once assigned
   (e.g. `https://dsg-control-plane.onrender.com`) — mirror the pattern in
   `dsg-one-v1`'s `docs/FRAMER_RENDER_MIGRATION.md`.
3. Deploy and wait for the web service to report `Ready`.
4. Verify with live evidence, not assumption:
   ```bash
   curl -fsSL "https://<render-origin>/api/health"
   curl -fsSL "https://<render-origin>/api/agent/status"
   curl -fsSL "https://<render-origin>/api/readiness"
   ```
5. Confirm each cron service ran at least once (Render dashboard → service →
   Logs) and returned a non-error status from the target route.
6. Only after step 4 and 5 pass: update `CLAUDE.md` §2/§23, `docs/RUNBOOK_DEPLOY.md`,
   and any workflow that hardcodes the Vercel production URL to point at the
   Render origin instead, and disable/remove the now-unused Vercel project
   and its GitHub Actions workflows.

## Cutover checklist

- [x] `render.yaml` blueprint added (web + 5 cron services).
- [x] `start` script honors `$PORT`.
- [ ] Render service created and connected to `main`.
- [ ] Required env vars set in Render (by name, no values committed).
- [ ] Render deployment reports `Ready`.
- [ ] `/api/health`, `/api/agent/status`, `/api/readiness` verified live on the Render origin.
- [ ] Cron services verified to have run successfully at least once each.
- [ ] `CLAUDE.md`, `docs/RUNBOOK_DEPLOY.md`, and Vercel-referencing workflows updated to the Render origin.
- [ ] Vercel project and its GitHub Actions workflows retired.
