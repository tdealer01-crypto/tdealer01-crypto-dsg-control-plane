# Merge blockers snapshot (2026-03-30)

## User question
- "ทำไมถึงกด merge ไม่ได้"

## Verified evidence from this repo
1. Prior triage explicitly marked some PRs as **do not merge directly**:
   - PR #34: high-risk normalization bundle; instructed to recreate from `main`.
   - PR #36: marked **non-mergeable when checked** due to problematic branch history.
   - PR #35: superseded by PR #39.

2. The local repository in this execution environment has **no Git remote configured** on branch `work`.
   - This means merge status/check-runs from GitHub cannot be fetched directly from this local clone.

3. Local code-health checks pass (`typecheck`, `lint`), so immediate blockers are likely PR metadata/history/conflict/policy side rather than TypeScript/ESLint failures.

## Practical interpretation
- If you are trying to merge PR #34/#36 directly, the expected blocker is branch/mergeability condition already documented in repo triage.
- If it is another PR, local evidence here is insufficient to assert exact GitHub-side rule failure (required checks, branch protection, approvals, or conflicts) without live PR metadata.

## Next best action path
1. Rebase/cherry-pick needed commits onto fresh branch from `main`.
2. Push as new PR.
3. Ensure required checks and review policy pass.
4. Close superseded/problematic PRs.
