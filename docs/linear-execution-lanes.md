# Linear execution lanes (DSG-5 / DSG-8 / DSG-9)

This repository is now set to execute the three in-progress lanes first, with strict dependency gates for blocked lanes.

## Active lanes (start now)

Create and use these branches:

1. `tdealer01/dsg-5-lane-1-wire-real-github-git-treescommits-writer`
2. `tdealer01/dsg-8-lane-4-authrbac-proof-via-external-runner-or-server-side`
3. `tdealer01/dsg-9-lane-5-crud-generator-with-route-and-test-data-contract`

## Blocked lanes (do not start yet)

- `DSG-6 — Build proof callback`
  - Blocked by: `DSG-5`
  - Unlock condition: `DSG-5` must produce real `branch/treeHash` output.

- `DSG-7 — Vercel deploy proof`
  - Blocked by: `DSG-6`
  - Unlock condition: `DSG-6` build proof callback must pass.

## PR verification checklist (required every PR)

Run all commands below before opening each PR:

```bash
git diff --check
npm run dsg:typecheck
npm run dsg:runtime-check
npm run dsg:verify
```

If any check fails, PR must stay blocked until fixed.
