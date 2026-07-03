# GitHub Action `action.yml` Spec — DSG Reference

## Required fields

```yaml
name: string          # Display name in GitHub Marketplace
description: string   # One-line description (≤ 125 chars)
branding:
  icon: string        # Feather icon name (e.g. shield, lock, check-circle)
  color: string       # blue | green | orange | red | purple | yellow | gray | white
inputs:
  <input_id>:
    description: string
    required: boolean
    default: string   # optional
outputs:
  <output_id>:
    description: string
runs:
  using: node20       # or composite
  main: dist/index.js
```

## DSG-specific branding convention

All DSG actions use:
```yaml
branding:
  icon: shield
  color: blue
```

## Input naming convention

| Input | Type | Notes |
|---|---|---|
| `dsg_api_key` | secret | Always required — never logged |
| `agent_id` | string | Active agent identifier |
| `action_type` | string | Category label for the action |
| `risk_level` | enum | `low` \| `medium` \| `high` \| `critical` |
| `idempotency_key` | string | Use `${{ github.run_id }}-${{ github.run_attempt }}` |
| `nonce` | string | Auto-generated if omitted |

## Output naming convention

| Output | Type | Notes |
|---|---|---|
| `gate_status` | string | `PASS` \| `BLOCK` \| `REVIEW` |
| `proof_hash` | string | sha256:... — store for replay |
| `policy_version` | string | Pin for audit trail |
| `report_id` | string | Shareable evidence report ID |

## Build requirement

Actions must commit a self-contained `dist/index.js`.
Use `@vercel/ncc` or `esbuild` to bundle:

```bash
npx @vercel/ncc build src/main.ts -o dist --minify
```

Commit `dist/` to the repository — GitHub Actions does not run `npm install`.
