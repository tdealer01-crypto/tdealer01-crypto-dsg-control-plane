---
name: dsg-github-marketplace-action-controller
description: >-
  Use this skill when creating, packaging, validating, publishing, or
  maintaining DSG GitHub Marketplace Actions. It turns DSG control-plane,
  action-layer permission gates, deterministic GO/NO-GO validation, audit proof,
  and secure deploy checks into reusable GitHub Action products.
version: 1.0.0
author: DSG Team
license: MIT
---

# DSG GitHub Marketplace Action Controller

This skill packages the DSG Governance Control Plane capabilities as distributable
**GitHub Marketplace Actions** — reusable CI/CD building blocks that any team can drop
into their workflow to gate, audit, and prove AI agent actions.

---

## When to use this skill

| User asks about | Use this skill |
|---|---|
| "Create a GitHub Action that gates AI actions" | ✅ Yes |
| "Package the DSG gate as a reusable action" | ✅ Yes |
| "Publish DSG governance to the GitHub Marketplace" | ✅ Yes |
| "Add a governance check to our CI pipeline" | ✅ Yes |
| "Validate deployment readiness with DSG proof" | ✅ Yes |
| "Writing a plain GitHub Action unrelated to DSG" | ❌ Out of scope |

---

## Available DSG GitHub Actions

### 1. `dsg-gate-evaluate` — Gate any action before execution

```yaml
- uses: tdealer01-crypto/dsg-control-plane/.github/actions/gate-evaluate@v1
  with:
    dsg_api_key: ${{ secrets.DSG_API_KEY }}
    agent_id: ${{ vars.AGENT_ID }}
    action_type: deployment
    risk_level: high
    action_description: "Deploy ${{ github.repository }} to production"
    idempotency_key: ${{ github.run_id }}-${{ github.run_attempt }}
```

Output: `gate_status`, `proof_hash`, `policy_version`

### 2. `dsg-compliance-evidence` — Generate compliance evidence pack

```yaml
- uses: tdealer01-crypto/dsg-control-plane/.github/actions/compliance-evidence@v1
  with:
    dsg_api_key: ${{ secrets.DSG_API_KEY }}
    evidence_level: L3
    output_path: ./compliance-output/
```

Output: `evidence_bundle_path`, `hash_manifest_path`, `matrix_json`

### 3. `dsg-go-no-go` — Production GO/NO-GO gate

```yaml
- uses: tdealer01-crypto/dsg-control-plane/.github/actions/go-no-go@v1
  with:
    dsg_api_key: ${{ secrets.DSG_API_KEY }}
    production_url: https://your-app.vercel.app
    repo_url: ${{ github.server_url }}/${{ github.repository }}
```

Output: `go_no_go_decision`, `readiness_report_id`, `proof_hash`

---

## Packaging a new DSG GitHub Action

Structure for a publishable GitHub Marketplace Action:

```
.github/actions/<action-name>/
├── action.yml          ← action manifest (inputs, outputs, runs)
├── src/
│   └── main.ts         ← TypeScript entry point
├── dist/
│   └── index.js        ← compiled + bundled (committed to repo)
├── README.md           ← marketplace readme
└── package.json
```

### `action.yml` template

```yaml
name: DSG Gate Evaluate
description: Evaluate a proposed agent action through the DSG deterministic safety gate
branding:
  icon: shield
  color: blue
inputs:
  dsg_api_key:
    description: DSG API key (use secrets)
    required: true
  agent_id:
    description: Active agent identifier
    required: true
  action_type:
    description: Category of the proposed action
    required: true
  risk_level:
    description: Risk level — low | medium | high | critical
    required: false
    default: medium
  action_description:
    description: Human-readable description of the action
    required: false
  idempotency_key:
    description: Prevents duplicate evaluations
    required: true
outputs:
  gate_status:
    description: PASS | BLOCK | REVIEW
  proof_hash:
    description: SHA256 proof hash for replay
  policy_version:
    description: Policy version at time of evaluation
runs:
  using: node20
  main: dist/index.js
```

---

## GO/NO-GO decision rules (deterministic)

A CI gate MUST fail the workflow when:

| Condition | Decision |
|---|---|
| `gate_status == BLOCK` | NO-GO — halt job immediately |
| `gate_status == REVIEW` and no human approval | NO-GO — require approval |
| `gate_status == UNSUPPORTED` and `risk_level >= medium` | NO-GO |
| `proof_hash` is empty or missing | NO-GO — evidence gap |
| HTTP 402 (quota exceeded) | NO-GO — upgrade required |
| HTTP 429 (rate limit) | Retry with backoff, then NO-GO |

A CI gate MUST pass when:

| Condition | Decision |
|---|---|
| `gate_status == PASS` and `proof_hash` present | GO |
| `gate_status == REVIEW` and operator approval recorded | GO (with approval evidence) |

---

## Security rules for action authors

- **Never** echo `dsg_api_key` to logs — use `core.setSecret(apiKey)`.
- **Never** store `dsg_api_key` in action outputs — only non-sensitive gate results.
- Always use `secrets.*` for DSG API keys, never `vars.*`.
- Pin action versions with SHA (`@sha256:...`) for supply-chain security.
- Build with `ncc` or `esbuild` to produce a self-contained `dist/index.js`.

---

## References

- <references/action-yml-spec.md> — Full `action.yml` field reference
- <references/go-no-go-logic.md> — Complete GO/NO-GO decision tree
- Gate evaluate API: see `dsg-action-layer-ged` skill → `references/gate-evaluate.md`
