# Verified Repair Simulator

The Verified Repair Simulator turns an untrusted set of repair candidates into a reviewable binary plan:

```text
candidate input → QUBO/Ising proposal → Z3 exact gate → isolated worktree → fixed validation → evidence/replay
```

The Ising result is only a candidate. Z3, the controlled executor, compiler/tests, security validation, and replay evidence decide whether the result can move forward.

## Use through the unified MCP front door

Call `dsg.repair.simulate` through `/api/mcp` with an issued DSG MCP key or an authenticated operator session.

Required input:

- `jobId`
- `finding` with severity, execution risk, affected files, and real `sha256:` evidence hashes
- `candidates` containing exact `file`, `expected`, and `replacement` text
- `allowedFiles`

The MCP tool is plan-only. It does not edit a repository, create a branch, merge, deploy, or claim a production fix.

## Use through HTTP

```http
POST /api/dsg/v1/repair/simulate
```

The route requires an operator or organization-admin session. It returns a decision object even when the plan is blocked, so the user can see the exact reason and next evidence.

The response is in `data`:

- `READY_FOR_CONTROLLED_EXECUTION` — the binary plan passed Z3 and is waiting for the isolated executor.
- `VERIFIED_IN_SIMULATION` — the local executor ran the selected change in a disposable worktree and the configured validation profile passed. This is not a merge or production claim.
- `BLOCKED` — input scope, evidence, approval, solver, Z3, executor, or validation failed.

## Run the local controlled executor

The local worker can run the same request in a disposable worktree. It never writes the base checkout.

```bash
npx tsx scripts/verified-repair.ts \
  --request ./repair-request.json \
  --execute \
  --validation full
```

The full profile runs fixed commands only:

1. `git diff --check`
2. `npm run typecheck`
3. `npm run test:unit`
4. `npm run build`
5. `npm audit --omit=dev --audit-level=high --json`

No arbitrary shell command is accepted from a repair candidate. Patch application is exact-text based and rejects traversal, sensitive paths, missing text, repeated text, overlapping changes, and empty diffs.

## Evidence and truth boundary

The evidence pack contains hashes and statuses for the finding, plan, QUBO, Z3 proof, validations, audit chain, and replay. It deliberately does not turn a successful workflow dispatch into a production claim.

The next action after `VERIFIED_IN_SIMULATION` is human review of the evidence and diff, followed by a separate approval-boundary action to create a draft PR. Merge and deployment are outside this simulator.
