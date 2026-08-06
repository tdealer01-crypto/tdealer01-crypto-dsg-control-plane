# DSG Android Owner Command MVP

## Goal

Implement the first real owner-device command lifecycle across DSG Control Plane, MCP/OpenClaw-style command envelope, CLI, and Android Owner-Agent.

Execution rule:

```text
propose -> normalize -> policy evaluate -> queue -> owner approve -> permission check -> execute -> audit -> reconcile
```

No real device action may skip owner review on the Android device.

## Implemented scope

### Android

- Local command model with canonical digest material.
- Local command inbox UI.
- Owner approve/reject buttons.
- Android Keystore-backed ECDSA approval signature for `commandDigest`.
- Executor-side verification of signed digest before execution.
- Local append-style audit log with hash chain.
- Idempotency-style local dedupe for non-expired commands.
- Expired pending command pruning.
- Permission gates for Accessibility and Notification Listener.
- `PERMISSION_REVOKED_MID_FLIGHT` handling for Accessibility disconnect or active window loss.
- First visible actions: `OPEN_URL`, `OPEN_APP`, `OPEN_SETTINGS`, `BACK`, `HOME`, `SCROLL_DOWN`.

### Control Plane

- `lib/commands/schema.ts` command contract.
- `lib/commands/normalize.ts` canonical normalization and digest helper.
- `GET/POST /api/agent/commands` MVP queue API.
- Expiry-aware idempotency index behavior in the in-memory MVP queue.
- `GET/POST /api/mcp` owner-agent MCP facade.

### CLI

- `scripts/agent/send-command.mjs`
- Default mode is dry-run.
- `--submit` posts to `/api/agent/commands`.
- Android still requires local owner approval before execution.

## Safety boundaries

### PASS class

- `device.status.get`
- `device.open_url`
- `device.open_app`
- `device.open_settings`

These are still queued for owner review in this MVP. They are visible actions and use Android intents where possible.

### REVIEW class

- `ui.back`
- `ui.home`
- `ui.scroll`
- `device.notifications.summary`

These require owner approval plus the matching Android permission gate.

### Not enabled in this MVP

- arbitrary hidden screen input
- credential collection
- silent background operation
- app install/remove flows outside Android user-controlled screens
- money/payment actions
- broad storage or broad package visibility permissions

## Production hardening still required

This PR uses local Android SharedPreferences and an in-memory Control Plane MVP queue to make the contract and APK build testable quickly. Production should replace these with:

- Android Room DB local source of truth.
- WorkManager sync / retry / backoff.
- Server database tables: `devices`, `commands`, `command_approvals`, `audit_logs`.
- Remote append-only audit writer.
- Device pairing and short-lived device JWT.
- Protected release lane with signed APK/AAB.

## Smoke test checklist

1. Build APK through Android Agent workflow.
2. Install APK on owner-controlled Android device.
3. Open app.
4. Queue `open_url` demo.
5. Confirm command appears in inbox.
6. Tap Approve.
7. Confirm URL opens visibly.
8. Confirm audit shows queued, approved, executed.
9. Queue `back` while Accessibility is disabled.
10. Confirm command waits for permission instead of running.
11. Enable Accessibility manually.
12. Queue `back` again and approve.
13. Confirm one Back action executes and audit records it.
