# Task Template Reference

## Minimal Task File (task.yaml)

```yaml
goal: "Template task - replace with actual goal"
mode: hybrid
context:
  email: "user@example.com"
  password: "secret"
  targetUrl: "https://example.com"

steps:
  - id: example-navigate
    type: navigate
    rom: landing
    mode: sim-only
    description: "Example navigation step"

  - id: example-extract
    type: extract
    rom: landing
    mode: sim-only
    data:
      selectors: ["headline", "tagline"]
    description: "Example extraction step"

  - id: example-api-call
    type: api-call
    rom: health
    mode: sim-only
    description: "Example API call step"
```

## Complete Task Structure

```yaml
goal: "Human readable goal"
mode: hybrid                    # sim-only | hybrid | real-only
context:                        # Variables available as {{context.key}}
  key: "value"

steps:
  - id: step-id
    type: navigate | fill-form | click | extract | wait | api-call | action
    rom: rom-key-from-registry
    action: action-name         # For click, action, wait
    form: form-name             # For fill-form
    data:                       # Parameters
      key: "value"
    requiresAuth: false         # Requires real browser
    mode: sim-only              # Override global mode
    verification:               # T4 gate (hybrid only)
      type: exact | keys | custom
      keys: [k1, k2]            # For keys type
      fn: "(sim, real) => ..."  # For custom type
    description: "Step description"
```

## Step Type Reference

| Type | Required Fields | Description |
|------|-----------------|-------------|
| navigate | rom | Load page (sim or real) |
| fill-form | rom, form, data | Fill form fields |
| click | rom, action | Click element |
| extract | rom, action OR data.selectors | Extract data |
| wait | rom, action OR data.selector | Wait for condition |
| api-call | rom OR data.url | Call API endpoint |
| action | rom, action | Generic action |

## Verification Gates

```yaml
verification:
  type: exact      # Deep equality
  # or
  type: keys
  keys: ["decision", "evidenceHash"]
  # or
  type: custom
  fn: "(sim, real) => real.decision === 'PASS'"
```

## Context Variables

Use `{{context.key}}` in any string field:
- `{{context.email}}`
- `{{context.commit}}`
- `{{context.timestamp}}`