# Remote Action Endpoint

Remote Action Endpoint exposes a user's live browser as an execution surface for an approved DSG plan. The reasoning agent stays in its normal chat/runtime; the remote browser is only a tool for acting on the user's already-authenticated UI.

## Product semantics

- User and agent input are two independent channels.
- Both channels may be active concurrently; there is no takeover/pause/resume state machine.
- Disabling remote immediately revokes the agent channel and does **not** terminate, reload, or log out the user's browser.
- The remote session is bound to one `executionId` and one approved `planHash`.
- Endpoint URLs are encrypted at rest with `REMOTE_ACTION_ENDPOINT_KEY`.
- Cookies, passwords, refresh tokens, and browser credentials are never copied into the agent request.

## API

### Connect

`POST /api/remote/sessions`

```json
{
  "endpointUrl": "https://remote-device.example/session/opaque-id",
  "executionId": "exec_123",
  "planHash": "sha256:approved-plan",
  "expiresInMinutes": 120
}
```

`REMOTE_ACTION_ENDPOINT_KEY` must be a base64-encoded 32-byte key.

### Agent action

`POST /api/remote/sessions/:sessionId/action`

```json
{
  "executionId": "exec_123",
  "planHash": "sha256:approved-plan",
  "agentId": "codex",
  "action": {
    "kind": "pointer.click",
    "payload": { "x": 480, "y": 312 }
  }
}
```

Supported v1 actions:

- `observe`
- `navigate`
- `pointer.move`
- `pointer.click`
- `pointer.scroll`
- `keyboard.type`
- `keyboard.press`
- `browser.screenshot`

Each action is relayed as a `dsg.remote-action.v1` envelope carrying the bound execution identity. The result is recorded in `remote_action_events` with a SHA-256 evidence chain.

### Remote off / on

`PATCH /api/remote/sessions/:sessionId`

```json
{ "remoteEnabled": false }
```

Remote OFF revokes only the agent remote channel. The user's browser remains active and unchanged.

## Endpoint protocol

The supplied endpoint receives HTTP POST JSON:

```json
{
  "version": "dsg.remote-action.v1",
  "requestId": "uuid",
  "sessionId": "uuid",
  "execution": {
    "executionId": "exec_123",
    "planHash": "sha256:approved-plan",
    "agentId": "codex"
  },
  "action": {
    "kind": "keyboard.type",
    "payload": { "text": "hello" }
  },
  "issuedAt": "2026-08-25T00:00:00.000Z"
}
```

It should return:

```json
{
  "ok": true,
  "state": { "url": "https://github.com/..." },
  "evidence": { "frameHash": "sha256:..." }
}
```

The endpoint implementation owns the live browser, cookies, tabs, mouse, keyboard and user session. DSG owns execution binding, governance, relay and evidence.

## Boundary

This feature does not bypass a website's authentication or security controls. Human-presence checks that a provider requires (for example hardware-backed verification or CAPTCHA) remain provider-controlled. Ordinary plan-aligned browser actions do not require a second DSG approval for every click or keystroke.
