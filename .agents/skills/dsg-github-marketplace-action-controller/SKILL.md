---
name: dsg-github-marketplace-action-controller
description: Use this skill when creating, packaging, validating, publishing, or maintaining DSG GitHub Marketplace Actions. It turns DSG control-plane, action-layer permission gates, deterministic GO/NO-GO validation, audit proof, and secure deploy checks into reusable GitHub Action products.
---

# DSG GitHub Marketplace Action Controller

This skill controls the packaging path from DSG product logic into a GitHub Marketplace Action.

## Core product target

Primary action:

- `DSG Secure Deploy Gate`

Product promise:

- Block unsafe production deployments.
- Validate readiness and protected route behavior.
- Emit deterministic `GO` / `NO-GO` output.
- Produce an evidence hash for audit/proof workflows.
- Keep the GitHub Action small, portable, and marketplace-ready.

## Marketplace rule

Do not publish the full SaaS control-plane repo as the Marketplace Action.

Use one of these layouts:

1. Preferred: separate public repository:
   - `tdealer01-crypto/dsg-secure-deploy-gate-action`
   - `action.yml` at repository root
   - `scripts/dsg-gate.sh`
   - `README.md`
   - release tag `v1.0.0` then stable major tag `v1`

2. Bootstrap from this control-plane repo:
   - source scaffold lives at `marketplace-actions/dsg-secure-deploy-gate-action/`
   - copy that folder into a fresh public action repo before publishing

## Allowed action scope

The v1 action may check only:

- readiness endpoint HTTP status
- optional JSON `ok: true`
- optional protected route returning expected `401` or `403`
- deterministic evidence file hash
- GitHub Actions step summary

The v1 action must not:

- store secrets
- call arbitrary shell commands
- deploy directly to production
- mutate databases
- run migrations
- publish releases automatically
- print sensitive tokens

## Inputs

Required:

- `readiness_url`

Optional:

- `expected_status` default `200`
- `require_json_ok` default `true`
- `protected_url` default empty
- `protected_expected` default `401,403`

## Outputs

- `verdict`: `GO` or `NO-GO`
- `readiness_status`: HTTP status from readiness endpoint
- `evidence_hash`: SHA256 hash of the evidence payload

## Deterministic gate behavior

1. Fetch readiness URL.
2. Compare returned HTTP status with expected status.
3. If required, verify body contains JSON `ok: true`.
4. If protected URL is supplied, verify it returns one of the expected unauthenticated statuses.
5. Write a stable evidence JSON object.
6. Hash evidence JSON with SHA256.
7. Emit outputs and GitHub step summary.
8. Exit non-zero on `NO-GO`.

## Release path

1. Create or update the action scaffold.
2. Validate locally with shellcheck where available.
3. Copy scaffold to a dedicated public action repo.
4. Commit files.
5. Tag `v1.0.0`.
6. Create or update moving tag `v1`.
7. Draft GitHub release.
8. Enable `Publish this Action to the GitHub Marketplace`.
9. Category: `Continuous integration` or `Deployment`.
10. Publish after final README check.

## Output format

```markdown
## What I changed
[summary]

## Files
[paths]

## Validation
[commands or checks]

## Marketplace status
[not ready / ready to copy / ready to release / published]

## GO/NO-GO
[current verdict]
```
