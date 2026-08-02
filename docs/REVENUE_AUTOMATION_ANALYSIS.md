# Revenue Automation Analysis

Merged analysis of the automated revenue surface in this control plane: what exists, what is
wired, what silently does nothing, and the ordered work to close the gap.

Scope of evidence: `lib/billing/*`, `lib/revenue/*`, `lib/usage/quota.ts`,
`app/api/billing/*`, `app/api/revenue/*`, `app/api/quotas/*`, `app/api/cron/*` (27 routes),
`lib/security/cron-auth.ts`, `vercel.json`.

## Verdict

The revenue machinery is substantially built. It is **not automated**, because nothing schedules it.

| Layer | Built | Automated |
| --- | --- | --- |
| Pricing catalog / entitlements / quota policy | Yes | n/a (pure config) |
| Quota enforcement on request path | Yes | Yes |
| Metered usage capture (durable outbox) | Yes | No — no scheduler |
| Usage delivery to Stripe | Yes | No — no scheduler |
| Meter reconciliation / drift repair | Yes | No — no scheduler |
| Upgrade nudge (80/95/100%) | Yes | No — no scheduler |
| Dunning / drip / trial invite emails | Yes | No — no scheduler |
| Lead capture, scoring, outreach, follow-up | Yes | No — no scheduler |
| Marketplace + Stripe webhook ingest | Yes | Yes (event-driven) |

## Finding 1 — No cron schedules exist (blocker)

`vercel.json` before this change contained only `buildCommand`, `outputDirectory`, and `github`.
There was no `crons` array. There are 27 route handlers under `app/api/cron/`, all of them
authenticated and ready, and **not one of them was ever invoked by the platform.**

Consequences that were live in production:

- Metered usage accumulated in `billing_meter_outbox` and was never delivered to Stripe.
  Usage-based revenue was being recorded and not billed.
- `usage-alerts` never ran, so no org ever received an 80% or 95% upgrade nudge. The entire
  documented conversion path in `lib/revenue/upgrade-nudge.ts` was dead code at runtime.
- `send-pending-emails`, `drip-emails`, `trial-invite` never fired, so queued lifecycle email
  never left the queue.
- `reconcile-meter` never ran, so outbox drift was never detected or repaired.

Fixed by the `crons` block added to `vercel.json`. See "Schedules" below.

## Finding 2 — Two competing metering pipelines

There are two independent paths from usage to a Stripe meter event:

**A. Durable outbox (canonical).** `lib/billing/metered.ts` writes a `billing_meter_outbox` row
*before* calling Stripe, marks it sent or failed, and exposes `flushMeterOutbox()` for retry.
Drift repair lives in `lib/billing/reconciliation.ts` (`reconcileMeterOutbox`,
`requeueStuckRows`). Driven by `/api/cron/flush-meter-outbox` and `/api/cron/reconcile-meter`.

**B. Legacy batch (superseded).** `/api/cron/billing-sync` reads `billing_usage` where
`synced_to_stripe = false`, groups by org, and calls `stripe.billing.meterEvents.create`
directly with no outbox row and no idempotency key.

These two paths write to the same Stripe meter. **Scheduling both would double-bill every
customer.** Path A is the one to keep: it has the outbox, idempotency, retry, and reconciliation.

`billing-sync` has therefore been left out of the schedule deliberately. It is also currently
unreachable by Vercel Cron for a second reason — see Finding 3 — which is the only thing that
prevented double billing from being a latent one-line mistake.

Recommendation: migrate any remaining `billing_usage` writers onto `reportMeterEvent()` from
`lib/billing/metered.ts`, then delete `/api/cron/billing-sync` and the `synced_to_stripe`
column. Until that is done, do not add `billing-sync` to `vercel.json`.

## Finding 3 — Two cron routes cannot be scheduled at all

Vercel Cron issues a **`GET`** request carrying `Authorization: Bearer $CRON_SECRET`. It does
not send `POST`, and it does not send an `x-vercel-cron-secret` header.

| Route | Method | Secret read from | Schedulable |
| --- | --- | --- | --- |
| `billing-sync` | `POST` | `x-vercel-cron-secret` / `cron-secret` | No |
| `inventory-sync` | `POST` | `Authorization` | No |

Both need a `GET` handler before they can ever be automated. `billing-sync` should be retired
instead (Finding 2). `inventory-sync` needs a `GET` export if inventory is revenue-relevant.

## Finding 4 — Cron auth is correct but inconsistent

Every one of the 27 routes is authenticated; there is no open endpoint that spends money. But
they split into two styles:

- **11 routes** use the shared helper `requireCronAuth(request, jobName)` from
  `lib/security/cron-auth.ts`. This supports a per-job secret (`CRON_<JOB>_SECRET`), a
  SHA-256 pre-image (`..._SECRET_SHA256`), constant-time comparison via `verifyBearerSecret`,
  and returns 503 rather than 401 in production when no secret is configured.
- **16 routes** hand-roll `authHeader !== \`Bearer ${process.env.CRON_SECRET}\``. This is a
  plain string comparison, supports only the shared secret, and cannot be rotated per job.

Recommendation: migrate the 16 inline checks to `requireCronAuth`. This is mechanical, and it
buys per-job secret rotation — worth doing before granting any third party a cron trigger.

Also note the project has both `CRON_SECRET` and a typo'd `CRON_SECRE` environment variable.
`CRON_SECRE` is read by nothing in the codebase and should be deleted to avoid a future
operator rotating the wrong one.

## Finding 5 — The conversion funnel is complete but unmeasured

`lib/revenue/upgrade-nudge.ts` implements a well-specified funnel: soft nudge at 80%, hard nudge
at 95%, quota block at 100%, with `PLAN_UPGRADE_PATH` walking free → trial → pro → business →
enterprise and a prebuilt `upgradeUrl` pointing at `/api/billing/checkout`.

What is missing is the other half of the loop. `lib/revenue/events.ts` exposes
`insertRevenueEvent` / `listRevenueEvents`, but nothing correlates *nudge shown* with
*checkout completed*. Without that join there is no way to know whether the 80% threshold is
the right threshold for this product.

Recommendation: emit a revenue event when a nudge is delivered, carrying `orgId`, `nudge` level,
and `pct`, then attribute Stripe `checkout.session.completed` back to the most recent nudge for
that org. That turns the threshold constants into something tunable against real conversion
rather than the industry benchmark quoted in the file header.

## Schedules

Added to `vercel.json`. All are `GET` routes already using Bearer auth. Times are UTC.

| Schedule | Route | Why this cadence |
| --- | --- | --- |
| `*/10 * * * *` | `flush-meter-outbox` | Usage → Stripe. Tightest loop that matters; every delay is unbilled revenue. |
| `0 * * * *` | `reconcile-meter` | Hourly drift detection and stuck-row requeue. |
| `*/15 * * * *` | `send-pending-emails` | Transactional queue drain. |
| `*/30 * * * *` | `agent-health-check` | Detects a wedged agent before it eats a billing period. |
| `0 * * * *` | `cleanup-expired-leases` | Credential lease hygiene. |
| `0 13 * * *` | `usage-alerts` | Daily upgrade nudge sweep. |
| `0 15 * * *` | `trial-invite` | Trial activation. |
| `0 14 * * *` | `drip-emails` | Lifecycle drip. |
| `30 8 * * *` | `update-icp-scores` | Rescore leads before outreach picks them up. |
| `0 6 * * *` | `github-leads` | Lead capture, ahead of scoring. |
| `0 7 * * *` | `marketing-agent` | Autonomous daily marketing action. |
| `0 9 * * 1-5` | `lead-outreach` | Cold outreach, weekdays only. |
| `0 10 * * 1-5` | `lead-followup` | Follow-up, one hour behind outreach. |
| `0 6 * * 1` | `content-gen` | Weekly SEO + social content. |
| `0 16 * * 1` | `weekly-report` | Monday revenue summary. |

Ordering inside a day is deliberate: `github-leads` (06:00) → `update-icp-scores` (08:30) →
`lead-outreach` (09:00) → `lead-followup` (10:00). Each stage reads what the previous wrote.

Deliberately **not** scheduled:

- `billing-sync` — double-bill risk, see Finding 2.
- `inventory-sync` — `POST`-only, see Finding 3.
- `social-listen`, `reddit-leads`, `twitter-leads` — depend on external API credentials that
  should be confirmed live before burning quota on a schedule.
- `superteam/*`, `week3-campaign-pulse`, `yield-optimizer` — campaign- or program-specific;
  enable per campaign rather than standing.
- `agent-orchestrator` — verify its concurrency behaviour against `agent-health-check` first.

## Preconditions before the schedule earns money

`vercel.json` only guarantees invocation. These must also hold:

1. `CRON_SECRET` is set in the production environment. Without it `requireCronAuth` returns 503
   and every job no-ops silently.
2. `STRIPE_SECRET_KEY`, `STRIPE_METER_ID`, and `STRIPE_METER_EVENT_NAME` are set and pointing at
   **live** mode, not sandbox. `isMeteredBillingConfigured()` in `lib/billing/metered.ts` is the
   check to run.
3. The `billing_meter_outbox` migration is applied. `lib/billing/metered.ts` notes the table is
   introduced by a migration on this branch — verify by querying the table, not by checking that
   a migration file exists.
4. `/api/billing/meter-health` returns healthy. Use it as the post-deploy gate.

## Ordered next work

1. Confirm the four preconditions above, then watch `/api/billing/meter-health` and the
   `flush-meter-outbox` logs for one hour.
2. Retire the legacy path: move remaining `billing_usage` writers to `reportMeterEvent()`,
   delete `/api/cron/billing-sync`.
3. Migrate the 16 inline `CRON_SECRET` checks to `requireCronAuth`, then delete `CRON_SECRE`.
4. Close the attribution loop between `upgrade-nudge` and `checkout.session.completed`.
5. Add a `GET` handler to `inventory-sync`, or drop it.
