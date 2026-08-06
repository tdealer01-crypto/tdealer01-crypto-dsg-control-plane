# DSG Hermes Runtime APK

## Goal

Build an Android APK that can operate like a DSG-specific Termux-lite runtime for Hermes:

```text
DSG Android APK
→ local Hermes runtime sandbox
→ Nous / model provider
→ DSG Gate
→ Android Owner Executor
→ audit / evidence / result receipt
```

This is not a generic unrestricted remote shell. It is an owner-controlled local runtime for the owner's own Android device.

## Current repo truth

The existing Android app is already a native Android application under `apps/android` with `applicationId = com.dsg.agent`.
It already contains Android command models, permission gates, local audit concepts, foreground service entries, Accessibility service, and Notification Listener service.

What is not yet present is a Termux-like userland/runtime layer for installing and running Hermes inside the APK sandbox.

## Target product behavior

1. Owner installs DSG Agent APK.
2. Owner opens the APK and goes to the Hermes Runtime panel.
3. APK creates a private runtime directory:

```text
/data/data/com.dsg.agent/files/hermes-runtime
```

4. Owner taps `Install Hermes Runtime`.
5. APK bootstraps the runtime in the app sandbox.
6. Owner connects Nous/provider credentials through the app UI.
7. Owner taps `Start Hermes`.
8. APK starts Hermes gateway through a foreground service.
9. Android UI sends goals to local Hermes.
10. Proposed actions are checked by DSG Gate.
11. Only gate-approved commands are handed to the Android executor.
12. Result receipts, logs, and evidence are stored locally and optionally synced to the DSG backend.

## Required files to add

```text
apps/android/app/src/main/java/com/dsg/agent/runtime/HermesRuntimeManager.kt
apps/android/app/src/main/java/com/dsg/agent/runtime/RuntimeShell.kt
apps/android/app/src/main/java/com/dsg/agent/service/HermesForegroundService.kt
apps/android/app/src/main/java/com/dsg/agent/runtime/HermesRuntimeState.kt
```

## UI additions

Add a Hermes Runtime card to `MainActivity.kt`:

```text
Install Hermes Runtime
Start Hermes
Stop Hermes
View Logs
Test: reply only ok
Runtime status
Provider status
Gate status
```

## Runtime directory layout

```text
files/hermes-runtime/
├── home/
│   └── .hermes/
│       ├── config.yaml
│       ├── logs/
│       └── sessions/
├── bin/
├── tmp/
├── evidence/
└── audit/
```

## Environment keys

Secrets must be stored through Android Keystore-backed storage, not hard-coded into the APK.

```text
NOUS_API_KEY
NOUS_API_BASE_URL
NOUS_MODEL
DSG_GATE_BASE_URL
DSG_OWNER_WORKSPACE_ID
DSG_OWNER_AGENT_ID
```

## Gate model

Owner Full means the owner has permission to approve critical execution. It does not mean DSG Gate, audit, or evidence are skipped.

```text
Owner Full permissions:
- tool:execute_low
- tool:execute_medium
- tool:execute_high
- tool:execute_critical
```

Command handoff rule:

```text
Hermes proposes command
→ DSG Gate evaluates command
→ if PASS: Android executor receives command
→ if BLOCK/REVIEW: Android does not execute
→ Android records result receipt after execution
```

## Android execution boundary

Allowed Android executor actions should continue to use the existing command model:

```text
STATUS
OPEN_URL
OPEN_APP
OPEN_SETTINGS
BACK
HOME
SCROLL_DOWN
NOTIFICATION_SUMMARY
FILE_LIST_ROOT
FILE_PREVIEW
FILE_SELECT
FILE_SEND_TO_CLAW
FILE_RENAME
FILE_MOVE
FILE_DELETE
```

## Build route

Use the existing GitHub Actions workflow:

```text
Actions → Android Agent → Run workflow → branch: dsg/hermes-nous-owner-full-apk
```

Expected artifact:

```text
dsg-agent-debug-apk
```

## Acceptance checks

1. APK builds with `gradle assembleDebug`.
2. App opens on owner Android device.
3. Hermes Runtime panel appears.
4. Runtime directory is created.
5. Start/Stop foreground service works.
6. Runtime logs are visible in the APK.
7. Provider test returns `ok`.
8. Hermes proposes a command.
9. DSG Gate decision is recorded.
10. Android executes only after gate PASS.
11. Result receipt is recorded after execution.
12. No production-ready claim is made until APK install, runtime test, command execution, and evidence sync are proven.

## Non-goals for the first APK

- No Play Store release yet.
- No signed release AAB yet.
- No claim that the embedded runtime is production-ready.
- No silent remote operation without visible owner-controlled foreground service.
- No hard-coded provider secrets.
