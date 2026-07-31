---
description: Run the DSG Control Plane TypeScript typecheck and summarize results
allowed-tools: Bash(npm run typecheck)
---

# /typecheck — TypeScript typecheck

Run the repo's typecheck, which is the narrowest check for a TypeScript/app
code change (CLAUDE.md section 6).

Command:

```bash
npm run typecheck
```

This runs `tsc --noEmit -p tsconfig.typecheck.json`.

After running:

- Report the exact command and whether it passed or failed.
- If it failed, list the first few `error TS...` lines with file:line and
  propose the smallest fix — do not silence errors by widening types blindly.
- Remind the reader that a passing typecheck does **not** prove `next build`
  passes; use `/pre-pr-check` before opening a PR.

If you could not run it (environment not configured), say `Not run` and the
reason. Do not claim a pass without real output.
