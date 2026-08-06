# DSG Owner-Approved Full File Manager Mode

## Goal

Add a high-risk but owner-controlled full file manager mode to the Android agent.

This mode is intentionally separate from the default file picker flow. Default file selection should still use Android Storage Access Framework. Full File Manager Mode exists only when the owner explicitly enables Android `MANAGE_EXTERNAL_STORAGE` from system settings.

## Permission boundary

Permission:

```text
android.permission.MANAGE_EXTERNAL_STORAGE
```

Runtime check:

```text
Environment.isExternalStorageManager()
```

Settings intent:

```text
Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION
fallback: Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION
```

## Required user-visible flow

```text
Open app
→ Read warning
→ Tap Open Full File Manager Permission
→ Android Settings opens
→ Owner enables All files access manually
→ Return to app
→ App shows Full file manager enabled: true
→ File action is queued
→ Owner approves in Command Inbox
→ Android Keystore signs command digest
→ Executor verifies signature
→ Permission gate checks MANAGE_EXTERNAL_STORAGE
→ Execute allowed file action
→ Audit log records lifecycle
```

## MVP actions

Enabled:

- `FILE_LIST_ROOT`
- `FILE_SEND_TO_CLAW` placeholder action after owner approval

Blocked in MVP:

- `FILE_DELETE`
- secret-like file action: `.env`, `api_key`, `token`, `secret`, `.pem`, `.key`
- destructive rename/move/delete execution

## Audit events

- `FILE_PERMISSION_REQUESTED`
- `FILE_ACTION_QUEUED`
- `FILE_ACTION_APPROVED`
- `FILE_ACTION_EXECUTED`
- `FILE_ACTION_BLOCKED`
- `FILE_LISTED`

## Sensitive file policy

Sensitive or secret-like files are blocked by default in this MVP. A future PR may add a separate sensitive-file approval sheet with stronger warnings, redaction preview, and backend policy confirmation.

## Definition of done

- APK builds in Android Agent workflow.
- App shows Full File Manager Mode section.
- App opens Android All files access settings.
- With permission disabled, file commands are queued but blocked/waiting permission.
- With permission enabled, `FILE_LIST_ROOT` executes only after owner approval.
- Audit log records queued, approved, listed/executed.
- Secret-like test file action is blocked.
