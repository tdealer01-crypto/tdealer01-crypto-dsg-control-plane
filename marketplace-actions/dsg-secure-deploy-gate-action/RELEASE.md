# DSG Secure Deploy Gate Release Runbook

This folder is the source scaffold for the standalone GitHub Action.

## Target repository

```text
tdealer01-crypto/dsg-secure-deploy-gate-action
```

Required root files in the target repository:

```text
action.yml
README.md
RELEASE.md
scripts/dsg-gate.sh
```

## Release checklist

1. Create a dedicated public repository named `dsg-secure-deploy-gate-action`.
2. Copy this scaffold into the target repository root.
3. Commit the copied files.
4. Tag the first release as `v1.0.0`.
5. Move the stable major tag `v1` to `v1.0.0`.
6. Draft a GitHub release from `v1.0.0`.
7. Enable the GitHub Marketplace option on the release.
8. Use category `Continuous integration` or `Deployment`.
9. Release only after the smoke test passes.

## Smoke workflow for target repo

```yaml
name: Smoke test DSG Secure Deploy Gate

on:
  pull_request:
  push:
    branches: [main]

jobs:
  smoke:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./
        with:
          readiness_url: "https://tdealer01-crypto-dsg-control-plane.vercel.app/api/finance-governance/readiness"
          expected_status: "200"
          require_json_ok: "true"
```
