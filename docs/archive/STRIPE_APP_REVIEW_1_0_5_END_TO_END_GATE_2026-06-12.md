# Stripe App Review 1.0.5 — End-to-End Resubmission Gate (2026-06-12)

## Decision

**NO-GO for Stripe resubmission.** Repository-side fixes are in progress and automated compile/tests can prove only local behavior. A new submission remains blocked until the deployed Live and Sandbox installation flows, deauthorization webhook, Stripe Dashboard payment-detail viewport, listing text, and three authentic screenshots are verified with current production evidence.

## Locked review requirements

1. Live and Sandbox install buttons must use clean OAuth URLs without `channel_link`.
2. OAuth callback must reject missing, expired, forged, replayed, mismatched, or wrong-user `state` values.
3. A connection is successful only after the active account record is persisted.
4. Manual disconnect and Stripe `account.application.deauthorized` must persist a non-active connection state.
5. `stripe.dashboard.payment.detail` must render a safe loading, empty, REVIEW fallback, or decision state; it must not crash the drawer.
6. Listing description must not contain template labels or unsupported claims.
7. Three listing screenshots must be authentic Stripe Dashboard captures, at least 1600px wide, under 5MB, and contain no PII or testing indicators.
8. The public support address should be a monitored shared mailbox before resubmission.

## Deterministic invariants

- `install_success -> valid_state AND authenticated_same_user AND persisted_active_account`
- `invalid_state OR missing_membership OR persistence_failure -> no_connected_cookie AND no_success_claim`
- `deauthorized_event AND valid_signature -> persisted_status = revoked`
- `manual_disconnect AND authorized_org_member -> persisted_status = inactive`
- `missing_context OR API_failure -> safe_view_state != drawer_crash`
- `GO -> every required review item has current deployed evidence`

## Local repository evidence added in this change

- Public OAuth URL validation rejects `channel_link`, non-Stripe hosts/paths, missing client IDs, and client-ID mismatches instead of silently rewriting unsafe configuration.
- Install route no longer falls back to an External Test URL and requires a configured state-signing secret.
- OAuth callback requires a signed state, matching state cookie, same authenticated user, organization membership, and successful DB persistence before setting connected cookies.
- Dedicated Stripe App webhook verifies its signature, persists `account.application.deauthorized` evidence as `revoked`, and ignores stale deauthorization events from an older installation.
- Authenticated manual disconnect first revokes Stripe OAuth access with mode-matched credentials, then persists `inactive` evidence and clears connection cookies.
- Stripe App package compile blockers were removed so the registered viewport code can be built locally.

## Evidence still required before GO

- [ ] Configure clean `STRIPE_LIVE_INSTALL_URL` and `STRIPE_SANDBOX_INSTALL_URL` from Stripe Developer Dashboard Settings.
- [ ] Configure `STRIPE_CONNECT_STATE_SECRET`, `STRIPE_APP_WEBHOOK_SECRET`, mode-specific client IDs, and mode-specific Stripe secret keys in production secrets.
- [ ] Apply `20260612000001_stripe_app_connection_lifecycle.sql` before deploying the lifecycle routes.
- [ ] Register `/api/stripe-app/webhook` for `account.application.deauthorized` in Stripe.
- [ ] Deploy the current commit and prove Live install end-to-end.
- [ ] Deploy the current commit and prove Sandbox install end-to-end.
- [ ] Prove manual Disconnect changes the DB-backed state and UI after refresh.
- [ ] Prove uninstall from Stripe Dashboard triggers deauthorization and changes DB state to `revoked`.
- [ ] Open the installed app on a real `stripe.dashboard.payment.detail` view and prove no drawer crash.
- [ ] Verify ALLOW, BLOCK, REVIEW, missing-context, and API-unavailable viewport states with non-PII data.
- [ ] Replace all three conceptual listing images with authentic compliant screenshots.
- [ ] Confirm listing description contains no template label and every claim matches observed behavior.
- [ ] Confirm a monitored shared support mailbox and update the Stripe listing.
- [ ] Record a final review video showing install, viewport, disconnect, uninstall, and resulting connection state.

## Final gate rule

Keep **NO-GO** until every checkbox above has current deployed evidence. Passing local tests or a successful build alone does not prove Stripe Marketplace readiness.
