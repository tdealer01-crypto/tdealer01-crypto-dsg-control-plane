# Safe DOM Integration Guide

Safe DOM is a controlled execution layer that verifies browser automation commands target only elements explicitly exposed in a manifest before execution.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Virtual PC / Browser                     │
│                  (Automation Target)                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ Element exposure metadata
                     │ (periodic snapshots)
                     ↓
┌─────────────────────────────────────────────────────────────┐
│         Browserbase Manifest Builder Service                │
│        (Scans DOM, creates manifest, stores in DB)          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ safe_dom_manifests table
                     │ (element_id, selector, tag_name, visible, ttl)
                     ↓
┌─────────────────────────────────────────────────────────────┐
│               Spine Execute Route                            │
│    /api/spine/execute (Governed Execution Entry)            │
│                                                              │
│  1. Quota gate (check before)                               │
│  2. Safe DOM verification (NEW)                             │
│  3. Gate/approval policy checks                             │
│  4. Runtime commit to audit trail                           │
└─────────────────────────────────────────────────────────────┘
```

## Integration Sequence

### 1. Manifest Creation (Browserbase → Supabase)

Periodically, the Browserbase service scans the target DOM and creates a manifest:

```
Browserbase Service
  ↓
  Scan DOM (JS runner)
  ↓
  Generate element IDs (xxx-e001, xxx-e002, ...)
  ↓
  Create manifest entries (selector, tag_name, visible, frame_id, expires_at)
  ↓
  POST /api/safe-dom/manifest/create
  ↓
  Supabase: INSERT into safe_dom_manifests (session_id, frame_id, elements[], ttl)
```

### 2. Spine Execute with Safe DOM Command

Agent sends a request to `/api/spine/execute` with a Safe DOM command:

```json
POST /api/spine/execute
Authorization: Bearer <api_key>
Content-Type: application/json

{
  "agent_id": "agent-abc",
  "action": "submit_form",
  "input": {
    "sessionId": "sess-123",
    "safeDomCommand": {
      "frameId": "frame-main",
      "elementId": "app-e001",
      "action": "click"
    }
  }
}
```

### 3. Verification Flow (Spine Execute)

```
Request arrives at /api/spine/execute
  ↓
Rate limit gate → allowed?
  ├─ NO  → 429 Too Many Requests
  └─ YES ↓
Quota gate → within quota?
  ├─ NO  → 402 Quota Exceeded
  └─ YES ↓
Safe DOM Verification (NEW) → query manifest + validate
  │
  ├─ BLOCK (element not in manifest / expired / action unsafe)
  │  ├─ Response: 403 Forbidden
  │  └─ Reason: specific validation failure
  │
  ├─ REVIEW (element not visible / manual review needed)
  │  ├─ Audit: add safeDomReview metadata to context
  │  └─ Continue to gate/approval
  │
  └─ ALLOW or NULL (no Safe DOM command / all checks pass)
     ↓
Policy gate → check decision rules
  ↓
Approval check → pending/approved?
  ↓
Runtime commit → audit trail
  ↓
Response with decision + proof
```

## API Examples

### Manifest Creation

Created by Browserbase service (or operator tooling):

```bash
curl -X POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/safe-dom/manifest/create \
  -H "Authorization: Bearer <admin_key>" \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "sess-abc123",
    "frame_id": "frame-main",
    "elements": [
      {
        "element_id": "app-e001",
        "selector": "button.submit",
        "tag_name": "button",
        "visible": true
      },
      {
        "element_id": "app-e002",
        "selector": "input#username",
        "tag_name": "input",
        "visible": true
      }
    ],
    "ttl_seconds": 300
  }'
```

### Spine Execute with Safe DOM

Sent by agent to execute a verified action:

```bash
curl -X POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/spine/execute \
  -H "Authorization: Bearer <agent_api_key>" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "agent-abc",
    "action": "submit_form",
    "input": {
      "sessionId": "sess-abc123",
      "safeDomCommand": {
        "frameId": "frame-main",
        "elementId": "app-e001",
        "action": "click"
      }
    }
  }'
```

**Response on ALLOW:**

```json
{
  "request_id": "exec-123",
  "decision": "ALLOW",
  "reason": "Safe DOM element verified and policy allows action",
  "latency_ms": 45,
  "proof": {
    "proof_hash": "0x...",
    "proof_version": "1.0",
    "theorem_set_id": null,
    "solver": null
  }
}
```

**Response on BLOCK:**

```json
{
  "error": "Safe DOM verification failed",
  "reason": "Element app-e999 not found in manifest. Only exposed elements are allowed.",
  "element_id": "app-e999",
  "decision": "block"
}
```

### Legacy rawCommand (Backward Compatible)

Commands without Safe DOM specification pass through verification:

```bash
curl -X POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/spine/execute \
  -H "Authorization: Bearer <agent_api_key>" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "agent-abc",
    "action": "query_db",
    "input": {
      "rawCommand": "SELECT * FROM users WHERE id = 1"
    }
  }'
```

Verification returns `null`, execution continues with normal gate/approval flow.

## Test Execution Guide

### Run Safe DOM Integration Tests

```bash
npm run test:integration -- spine-execute-safe-dom
```

### Test Coverage

- ✓ Safe DOM command ALLOW: element verified
- ✓ Safe DOM command BLOCK: element not in manifest
- ✓ Safe DOM command REVIEW: element not visible
- ✓ Legacy rawCommand backward compatibility
- ✓ Rate limiting applied before verification
- ✓ Quota check applied before verification
- ✓ Audit trail captures verification decision
- ✓ Missing sessionId handling

### Verify Integration with Manifest

```bash
# 1. Create a test manifest
curl -X POST http://localhost:3000/api/safe-dom/manifest/create \
  -H "Authorization: Bearer <admin_key>" \
  -d '{
    "session_id": "sess-test-123",
    "frame_id": "frame-main",
    "elements": [
      {
        "element_id": "test-e001",
        "selector": "button.go",
        "tag_name": "button",
        "visible": true
      }
    ]
  }'

# 2. Execute with Safe DOM command
curl -X POST http://localhost:3000/api/spine/execute \
  -H "Authorization: Bearer <agent_key>" \
  -d '{
    "agent_id": "agent-test",
    "action": "click_button",
    "input": {
      "sessionId": "sess-test-123",
      "safeDomCommand": {
        "frameId": "frame-main",
        "elementId": "test-e001",
        "action": "click"
      }
    }
  }'

# 3. Expect decision: ALLOW (if policy allows)
```

## Troubleshooting

### "Element not found in manifest"

**Cause:** Element ID does not exist in the current manifest for that session/frame.

**Solution:**
1. Verify manifest was created with `session_id` and `frame_id`
2. Check manifest TTL has not expired (default 5 min)
3. Verify `elementId` in command matches `element_id` in manifest exactly
4. Recreate manifest if DOM changed

### "Element manifest entry expired"

**Cause:** Safe DOM manifest has exceeded TTL (default 300 seconds).

**Solution:**
1. Request fresh manifest from Browserbase service
2. Increase TTL when creating manifest if needed (up to 1800s / 30 min)

### "Element is not currently visible"

**Cause:** Verification returned REVIEW decision (element exists but is hidden).

**Solution:**
1. Element will still execute but marked for manual review
2. Check element visibility state in Browserbase snapshot
3. Ensure page is in correct state before sending command

### "Action is not safe for element type"

**Cause:** Requested action is not permitted for the element's tag.

**Solution:**
- Check allowed actions table in `lib/spine/verify-safe-dom-intent.ts`
- Examples:
  - `button` → click, focus, blur
  - `input` → click, type, clear, focus, blur, change
  - `select` → click, change, focus, blur

## Security Model

Safe DOM verification provides **defense-in-depth** for browser automation:

1. **Manifest-based whitelist:** Only exposed elements are actionable
2. **TTL enforcement:** Manifests expire to catch stale state
3. **Visibility check:** Audits element state at verification time
4. **Action validation:** Action must be safe for element type
5. **Audit trail:** Every verification decision is recorded

**Not a substitute for:**
- Policy gates (which still apply)
- Approval workflows (which still apply)
- Network/CORS controls
- XSS/injection prevention at the target site

## Next Steps

1. **Implement manifest creation route** (`POST /api/safe-dom/manifest/create`)
2. **Deploy Browserbase integration** for periodic manifest refresh
3. **Test with real browser sessions** (local + staging)
4. **Hardening:** Add encryption for element manifest storage if needed
5. **Monitoring:** Track verification BLOCK/REVIEW rates
