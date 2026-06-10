# Safe DOM Manifest Format Specification

This document defines the schema and requirements for Safe DOM element manifests stored in Supabase.

## SafeElementManifest Schema

### Table: `safe_dom_manifests`

```sql
CREATE TABLE safe_dom_manifests (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  session_id TEXT NOT NULL,
  frame_id TEXT NOT NULL,
  element_id TEXT NOT NULL,
  selector TEXT NOT NULL,
  tag_name TEXT NOT NULL,
  visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  metadata JSONB DEFAULT NULL,
  UNIQUE(session_id, frame_id, element_id),
  INDEX(session_id, frame_id),
  INDEX(expires_at)
);
```

### Type Definition

```typescript
export type SafeElementManifest = {
  element_id: string;      // Required: unique element identifier
  selector: string;        // Required: CSS selector to locate element
  tag_name: string;        // Required: HTML tag name (button, input, etc)
  visible: boolean;        // Required: current visibility state
  frame_id?: string;       // Optional: iframe frame ID if nested
  created_at: string;      // ISO 8601 timestamp
  expires_at: string;      // ISO 8601 timestamp (TTL boundary)
};
```

## Field Definitions

### element_id

**Format:** `{context}-e{number}`

- Context: typically application or component name (3-10 chars, lowercase, alphanumeric + dash)
- Prefix: always lowercase `e` for "element"
- Number: sequential 001, 002, 003, ... (zero-padded to 3 digits)

**Valid examples:**
- `app-e001` — first element in main app context
- `modal-e042` — element in a modal dialog
- `settings-e001` — element in settings page
- `checkout-e015` — element in checkout form

**Invalid examples:**
- `e001` — missing context prefix
- `app-1` — wrong prefix format (should be `e1` or `e001`)
- `APP-E001` — uppercase not allowed
- `app_e001` — underscore not allowed (use dash)

### selector

**Format:** valid CSS selector

Used to locate the element in the DOM for verification and logging.

**Valid examples:**
- `button.submit` — button with class submit
- `input#username` — input with ID username
- `form > button:last-of-type` — button in form
- `div[data-testid="close-button"]` — element with data attribute
- `iframe#payment-iframe` — nested iframe

**Requirements:**
- Must be a valid CSS selector (no XPath)
- Should be as specific as needed to uniquely identify the element
- Avoid overly complex selectors when simpler ones work
- Should survive minor DOM reorganizations

### tag_name

**Format:** lowercase HTML tag name

The canonical HTML tag of the element, used for action validation.

**Valid examples:**
- `button` — button element
- `input` — input field
- `textarea` — multiline text input
- `select` — dropdown select
- `a` — anchor/link
- `form` — form container
- `checkbox` — semantic checkbox (or input[type=checkbox])
- `radio` — semantic radio (or input[type=radio])

**Note:** For inputs with specific types, store `input` in `tag_name` and optionally include type in metadata.

### visible

**Format:** boolean

Current visibility state at the time manifest was created.

- `true` — element is visible on screen
- `false` — element is hidden (display: none, visibility: hidden, opacity: 0, off-screen, etc)

**Implications:**
- `visible: true` → verification returns ALLOW
- `visible: false` → verification returns REVIEW (element exists but not visible)

### frame_id

**Format:** `{context}-frame-{number}` or `auto-{uuid}`

For elements inside iframes, records which frame contains the element.

**Valid examples:**
- `main-frame-0` — main document (frame 0)
- `payment-frame-1` — first iframe named "payment-"
- `auto-a1b2c3d4` — auto-generated UUID frame ID

**Optional:** Omit if element is in main document. Query by `frame_id` to get all elements in a specific frame.

### created_at

**Format:** ISO 8601 timestamp with timezone

When this manifest entry was created/recorded.

**Example:** `2026-06-10T14:23:45.123Z`

**Purpose:** Audit trail, detecting stale manifests.

### expires_at

**Format:** ISO 8601 timestamp with timezone (must be > created_at)

When this manifest entry becomes invalid.

**Default TTL:** 5 minutes (300 seconds)
- Suitable for interactive browser sessions with periodic refreshes
- Short enough to catch stale DOM state
- Long enough for normal multi-step workflows

**Configurable TTL:**
- Minimum: 60 seconds
- Maximum: 1800 seconds (30 minutes)
- Recommended: 300 seconds (5 minutes)

**Calculation:**
```
expires_at = created_at + ttl_seconds
```

**Example:**
- `created_at`: `2026-06-10T14:23:45Z`
- `ttl_seconds`: `300`
- `expires_at`: `2026-06-10T14:28:45Z`

## Manifest Creation Request Format

Request body for `POST /api/safe-dom/manifest/create`:

```typescript
type SafeDomManifestCreateRequest = {
  session_id: string;        // Browser session ID
  frame_id: string;          // Frame being scanned
  elements: Array<{
    element_id: string;      // Element identifier
    selector: string;        // CSS selector
    tag_name: string;        // HTML tag
    visible: boolean;        // Visibility state
  }>;
  ttl_seconds?: number;      // Optional TTL (default 300)
};
```

**Validation rules:**
- `session_id` must be 8+ characters, alphanumeric + dash/underscore
- `frame_id` must be 8+ characters, alphanumeric + dash/underscore
- `elements` array must have 1-1000 items
- Each element must have all required fields
- `element_id` must be globally unique per session/frame
- `ttl_seconds` if provided must be 60-1800
- No duplicate `element_id` values in array

**Example request:**

```json
POST /api/safe-dom/manifest/create
Content-Type: application/json
Authorization: Bearer <admin_key>

{
  "session_id": "sess-abc123def456",
  "frame_id": "frame-main",
  "elements": [
    {
      "element_id": "form-e001",
      "selector": "form#user-form",
      "tag_name": "form",
      "visible": true
    },
    {
      "element_id": "form-e002",
      "selector": "input#username",
      "tag_name": "input",
      "visible": true
    },
    {
      "element_id": "form-e003",
      "selector": "input#password",
      "tag_name": "input",
      "visible": true
    },
    {
      "element_id": "form-e004",
      "selector": "button.submit",
      "tag_name": "button",
      "visible": true
    }
  ],
  "ttl_seconds": 300
}
```

## Real-World Examples

### E-Commerce Checkout Form

```json
{
  "session_id": "sess-checkout-xyz789",
  "frame_id": "frame-main",
  "elements": [
    {
      "element_id": "checkout-e001",
      "selector": "input[name='email']",
      "tag_name": "input",
      "visible": true
    },
    {
      "element_id": "checkout-e002",
      "selector": "input[name='card_number']",
      "tag_name": "input",
      "visible": true
    },
    {
      "element_id": "checkout-e003",
      "selector": "select#country",
      "tag_name": "select",
      "visible": true
    },
    {
      "element_id": "checkout-e004",
      "selector": "button.pay-now",
      "tag_name": "button",
      "visible": true
    }
  ],
  "ttl_seconds": 600
}
```

### Modal Dialog

```json
{
  "session_id": "sess-modal-abc123",
  "frame_id": "frame-main",
  "elements": [
    {
      "element_id": "modal-e001",
      "selector": "div.modal-overlay",
      "tag_name": "div",
      "visible": true
    },
    {
      "element_id": "modal-e002",
      "selector": "input.modal-input",
      "tag_name": "input",
      "visible": true
    },
    {
      "element_id": "modal-e003",
      "selector": "button.modal-confirm",
      "tag_name": "button",
      "visible": true
    },
    {
      "element_id": "modal-e004",
      "selector": "button.modal-cancel",
      "tag_name": "button",
      "visible": true
    }
  ],
  "ttl_seconds": 300
}
```

### Cross-Frame Setup (Main + Payment Iframe)

**Main frame manifest:**

```json
{
  "session_id": "sess-payment-main",
  "frame_id": "frame-main",
  "elements": [
    {
      "element_id": "page-e001",
      "selector": "button.checkout",
      "tag_name": "button",
      "visible": true
    },
    {
      "element_id": "page-e002",
      "selector": "iframe#stripe-payment",
      "tag_name": "iframe",
      "visible": true
    }
  ]
}
```

**Payment iframe manifest:**

```json
{
  "session_id": "sess-payment-main",
  "frame_id": "frame-stripe-payment",
  "elements": [
    {
      "element_id": "payment-e001",
      "selector": "input[data-testid='card-number']",
      "tag_name": "input",
      "visible": true
    },
    {
      "element_id": "payment-e002",
      "selector": "button.pay",
      "tag_name": "button",
      "visible": true
    }
  ]
}
```

## Query Examples

### Get all elements for a session

```sql
SELECT * FROM safe_dom_manifests
WHERE session_id = 'sess-abc123'
  AND expires_at > now()
ORDER BY created_at DESC;
```

### Get elements in a specific frame

```sql
SELECT * FROM safe_dom_manifests
WHERE session_id = 'sess-abc123'
  AND frame_id = 'frame-main'
  AND expires_at > now();
```

### Get latest manifest (with TTL check)

```sql
SELECT DISTINCT ON (frame_id) *
FROM safe_dom_manifests
WHERE session_id = 'sess-abc123'
  AND expires_at > now()
ORDER BY frame_id, created_at DESC;
```

### Find specific element

```sql
SELECT * FROM safe_dom_manifests
WHERE session_id = 'sess-abc123'
  AND element_id = 'form-e001'
  AND expires_at > now()
LIMIT 1;
```

## Constraints and Validation

1. **Uniqueness:** Each (session_id, frame_id, element_id) tuple must be unique
2. **TTL:** `expires_at` must be >= `created_at` + 60 seconds
3. **Element ID format:** Must match regex `^[a-z0-9\-]+\-e\d{3}$`
4. **Selector:** Must be non-empty, < 1000 chars
5. **Tag name:** Must be valid HTML tag (lowercase, alphanumeric + dash)
6. **Frame ID:** Must be non-empty, < 200 chars
7. **Session ID:** Must be non-empty, < 200 chars

## Best Practices

1. **Manifest refresh strategy:** Request fresh manifest every 2-3 minutes for long sessions
2. **Element ID stability:** Use consistent prefixes for related elements (e.g., `form-e001`, `form-e002`)
3. **Selector robustness:** Prefer data attributes or IDs over class names (more stable across CSS changes)
4. **Visibility accuracy:** Update `visible` field on every manifest refresh (don't assume state)
5. **TTL tuning:** Use 5 min (300s) for normal use, 10-30 min for slow workflows
6. **Frame naming:** Use semantic names (`payment-frame`, `settings-frame`, not `frame-1`, `frame-2`)
7. **Cleanup:** Configure database retention policy to delete expired manifests after 24 hours

## Changes and Versioning

This specification is v1.0. Future versions may add:
- Element attribute snapshots for verification
- Element bounding box coordinates
- Action parameter constraints
- Cross-origin frame handling
