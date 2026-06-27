# DSG Native Android Agent — Locked Target

Status: target locked, production status not verified.

## Goal

Build a DSG-owned Android app that pairs with the DSG Control Plane and gives the device owner a visible, auditable agent console.

## Locked scope for v1

- Native Android app source under `apps/android/`.
- Device pairing screen.
- Agent status screen.
- Visible foreground service status.
- Permission checklist screen.
- Local command inbox that requires the device owner to confirm actions.
- Local and server audit event contract.
- Kill switch visible in the app.

## Non-goals for v1

- No hidden background control.
- No credential storage in the mobile app.
- No silent access to private app content.
- No production release claim until APK build and real-device smoke evidence exist.

## User-visible result

The user should be able to install the app, pair the device, see live DSG status, see whether the agent service is running, approve or reject queued actions, and stop the agent at any time.

## Verification required before release

- Android project opens in Android Studio.
- Debug APK builds.
- App launches on a real Android device.
- Pairing screen works.
- Status call to DSG Control Plane works.
- Foreground service notification is visible.
- Kill switch stops the service.
- Audit event is recorded for every approved or rejected action.
