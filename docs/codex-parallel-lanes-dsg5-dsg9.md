# Codex Parallel Lanes (DSG-5 to DSG-9)

## Status

Codex execution plan is ready.

Real integration lanes are split into isolated PRs with fail-closed proof boundaries.

## Source of Truth

- GitHub repository
- Codex pull requests

## Linear Policy

- Do not update Linear issues.
- Do not sync Linear status.
- Do not mention Linear in PR execution flow.

## Execution Order

Create **5 isolated Codex tasks** on `chatgpt.com/codex`.

Do not combine PRs.

## Dependency Graph

Start together:

- DSG-5 — GitHub Writer
- DSG-8 — Auth/RBAC Proof Probe
- DSG-9 — CRUD Generator Contract

Wait:

- DSG-6 waits for DSG-5
- DSG-7 waits for DSG-6

---

# Lane 1 — DSG-5 GitHub Writer

## Branch

`codex/dsg-5-real-github-writer`

## Scope

- `lib/dsg/app-builder/github-writer.ts`
- `tests/dsg/github-writer.test.ts`

## Codex Prompt

```text
Implement DSG-5: Wire real GitHub Git Trees/Commits writer.

Current scaffold:
- lib/dsg/app-builder/github-writer.ts throws DSG_GITHUB_WRITER_NOT_WIRED_REAL_GITHUB_API_REQUIRED
- lib/dsg/app-builder/file-tree.ts already produces deterministic files/treeHash

Requirements:
1. Replace the fail-closed throw with a real GitHub Git Database API implementation using fetch.
2. Do not add @octokit/rest unless absolutely necessary.
3. Use environment variables:
   - GITHUB_TOKEN
   - DSG_TARGET_REPO or GITHUB_REPOSITORY in owner/repo format
   - DSG_GITHUB_BASE_REF default main
4. Inputs must include branch and FileTree.
5. Validate:
   - branch is present
   - tree.files is non-empty
   - each file has path/content/fileHash
   - never allow .env except .env.example
   - never allow path traversal
6. Create blobs/trees/commit/ref using GitHub Git Database API:
   - GET ref heads/base
   - GET base commit/tree
   - GET or create ref heads/branch
   - POST git/blobs for files
   - POST git/trees with base_tree
   - POST git/commits
   - PATCH or POST refs/heads/branch
7. Return:
   - branch
   - real commitSha from GitHub
   - treeHash
   - baseCommitSha
8. Never return simulated commit SHA.
9. Add tests that mock fetch and verify:
   - missing token blocks
   - missing repo blocks
   - empty tree blocks
   - returned commitSha is GitHub response SHA
   - no sim_ commit identifier appears
   - API call order is deterministic enough

Fail-closed:
- Missing GITHUB_TOKEN => throw/block
- Missing repository owner/repo => throw/block
- Empty tree => throw/block
- GitHub API error => throw/block
- Hash/path validation failure => throw/block

Acceptance:
- npm run dsg:typecheck passes
- npm run dsg:runtime-check passes
- tests pass
- no production claim language
```

---

# Lane 2 — DSG-6 Build Proof Callback

## Branch

codex/dsg-6-build-proof-callback

## Scope

- `.github/workflows/dsg-app-builder-build.yml`
- `scripts/dsg-upload-build-proof-evidence.mjs`
- `app/api/dsg/runtime/build-proof/callback/route.ts`
- Keep `app/api/dsg/jobs/[jobId]/build-proof/route.ts` fail-closed unless it only triggers the workflow safely.


## Codex Prompt

```text
Implement DSG-6: Build workflow callback and build proof record.

Current scaffold:
- .github/workflows/dsg-app-builder-build.yml writes .dsg-build-proof/build-proof.json
- app/api/dsg/jobs/[jobId]/build-proof/route.ts currently returns 501
- build proof must not come from client body.ok

Requirements:
1. Add script:
   scripts/dsg-upload-build-proof-evidence.mjs
2. Script reads .dsg-build-proof/build-proof.json.
3. Script signs raw JSON body with HMAC:
   x-dsg-signature: sha256=<hex>
   using DSG_CALLBACK_SECRET.
4. Script posts to:
   DSG_BUILD_PROOF_CALLBACK_URL
5. Add callback route:
   app/api/dsg/runtime/build-proof/callback/route.ts
6. Callback verifies HMAC with timingSafeEqual.
7. Payload must include:
   - jobId
   - branch
   - treeHash
   - githubRunId
   - githubSha
   - status
   - startedAt or completedAt if available
8. If status is success/pass, record BUILD_VERIFIED.
   If not, record FAILED/BLOCK.
9. Use existing repository/RPC/evidence layer if available.
   If no build-proof RPC exists, record as evidence/replay/audit proof without claiming production.
10. Update workflow to always upload callback after artifact write.

Fail-closed:
- no signature = 401
- invalid signature = 401
- missing jobId/treeHash/githubRunId = 400
- failed workflow = record FAILED, not BUILD_VERIFIED
- never use client-supplied body.ok
- never claim PRODUCTION from build proof alone

Acceptance:
- BUILD_VERIFIED only when workflow passed and callback evidence stored
- Build proof hash is deterministic over artifact payload
- no production claim language
- npm run dsg:typecheck passes
- npm run dsg:runtime-check passes
```

---

# Lane 3 — DSG-7 Vercel Preview Proof

## Branch

codex/dsg-7-vercel-preview-proof

## Scope

- `lib/dsg/app-builder/vercel-preview-proof.ts`
- `scripts/dsg-vercel-preview-proof.mjs`
- Deploy proof route/callback only if needed.
- Preserve existing secure deployment proof route if it already uses verified actor + repository write.


## Codex Prompt

```text
Implement DSG-7: Vercel preview deploy proof via real Vercel CLI/API result.

Current scaffold:
- lib/dsg/app-builder/vercel-preview-proof.ts only returns PREVIEW_DEPLOYED from URL presence
- scripts/dsg-vercel-preview-proof.mjs only checks DSG_VERCEL_PREVIEW_URL

Requirements:
1. Replace URL-only proof with real Vercel API/CLI output parsing.
2. Use env:
   - VERCEL_TOKEN
   - VERCEL_ORG_ID or VERCEL_TEAM_ID if needed
   - VERCEL_PROJECT_ID
   - DSG_VERCEL_PREVIEW_URL or deploy output URL
   - VERCEL_DEPLOYMENT_ID if available
3. Script should:
   - inspect deployment result/status from Vercel API when deployment id/url exists
   - record deployment id/url/status/projectId
   - run basic health fetch against preview URL
   - produce JSON proof artifact with proofHash
4. Library should classify:
   - BLOCK: missing URL/token/project/status
   - PREVIEW_DEPLOYED: deployment exists but health not passed
   - PASS: deployment status ready + health passed
5. Do not claim PRODUCTION from deploy proof.
6. Prefer existing app/api/dsg/jobs/[jobId]/deployment-proof/route.ts recordDeploymentProof path.
7. Keep existing deployment-proof route security; do not replace it with caller booleans.

Fail-closed:
- Missing Vercel token/project/deployment data => BLOCK
- URL alone cannot equal PASS
- Health failure cannot equal DEPLOYABLE
- caller booleans such as vercel_pass or health_pass are forbidden as proof

Acceptance:
- No vercel_pass/health_pass caller booleans
- URL alone does not equal PASS
- Health failure blocks DEPLOYABLE
- npm run dsg:typecheck passes
```

---

# Lane 4 — DSG-8 Auth/RBAC Proof Probe

## Branch

codex/dsg-8-auth-rbac-proof-probe

## Scope

- `lib/dsg/runtime/auth-rbac-proof.ts`
- `app/api/dsg/jobs/[jobId]/auth-rbac-proof/route.ts`
- External runner/test scripts if needed.


## Codex Prompt

```text
Implement DSG-8: Auth/RBAC proof via server-side probe or external runner evidence.

Current scaffold:
- app/api/dsg/jobs/[jobId]/auth-rbac-proof/route.ts returns 501
- lib/dsg/runtime/auth-rbac-proof.ts is simple helper

Requirements:
1. Implement a real proof engine that probes preview URL:
   - public routes accessible
   - protected routes reject anonymous access with 401/403/302/307
   - admin routes reject non-admin or anonymous
2. Input must come from server-side job/plan/proof config, not caller booleans.
3. OAuth flows that cannot be automated must return MANUAL_REQUIRED, not PASS.
4. Credentials proof must use real login flow only if test identity is configured.
5. Never use fake cookies.
6. Never accept X-Test-Role or role headers as proof.
7. Record proof/evidence hash with:
   - routes checked
   - status codes
   - redirect locations
   - proofHash
   - summary hardFailures
8. Route should require verified actor with production/write permission.
9. If no preview URL or no protected routes when auth required, return BLOCK.

Fail-closed:
- fake role/header blocked
- fake cookies blocked
- caller-provided booleans cannot prove auth
- OAuth untestable => MANUAL_REQUIRED, not PASS
- anonymous protected route not blocked => FAIL
- no PRODUCTION claim directly from auth proof

Acceptance:
- public route accessible proof recorded
- anonymous protected route block/redirect proof recorded
- RBAC/admin boundary proof recorded when RBAC enabled
- no production claim language
- npm run dsg:typecheck passes
```

---

# Lane 5 — DSG-9 CRUD Generator Contract

## Branch

codex/dsg-9-crud-generator-contract

## Scope

- `lib/dsg/app-builder/database-generator.ts`
- `lib/dsg/app-builder/crud-generator.ts`
- `scripts/dsg-production-flow-runner.mjs`
- `tests/dsg/database-crud-generator.test.ts`


## Codex Prompt

```text
Implement DSG-9: CRUD generator with route and test data contract.

Current scaffold:
- lib/dsg/app-builder/database-generator.ts creates minimal table
- lib/dsg/app-builder/crud-generator.ts returns simple spec
- production flow runner blocks CRUD proof until route/test contract exists

Requirements:
1. Enhance database generator:
   - deterministic migration for allowlisted table/field names
   - supports string, number, boolean, timestamp, uuid, json
   - includes id uuid primary key
   - includes workspace_id/org_id scope columns
   - no destructive SQL
2. Enhance CRUD generator:
   - generate route template with create/read/update/delete handlers
   - all operations require workspace/org scope
   - generated code must reject missing workspace/org
3. Generate test data contract:
   - create payload
   - expected read assertion
   - update payload
   - delete assertion
4. Update tests:
   - migration deterministic
   - invalid table/field blocked
   - destructive SQL absent
   - route template includes workspace/org scope
   - CRUD test contract contains create/read/update/delete
5. Update production flow runner:
   - keep CRUD step BLOCK unless a generated CRUD contract path is provided
   - if contract path exists, run against that contract instead of /api/health

Fail-closed:
- no route/test data contract => CRUD proof BLOCK
- no workspace/org scope => BLOCK
- destructive SQL without explicit approval => BLOCK
- /api/health is never CRUD proof

Acceptance:
- deterministic migration hash
- CRUD route template includes scoped filters
- CRUD test contract includes create/read/update/delete assertions
- Playwright production flow can use generated CRUD contract for real CRUD proof
- npm run dsg:typecheck passes
```

---

## Required Checks Per PR

Each PR must pass all of the following:

```bash
git diff --check
npm run dsg:typecheck
npm run dsg:runtime-check
npm run dsg:verify
```

## Dependency Rules

Start together:

DSG-5

DSG-8

DSG-9


Wait:

DSG-6 waits for DSG-5

DSG-7 waits for DSG-6


## Claim Restrictions

Until all Codex PRs actually pass, do not claim:

“เท่า Manus”

“production ready”

“production proof complete”

“build/deploy/auth/CRUD proof complete”


## Allowed statement at this stage

“Codex execution plan is ready.”

“Real integration lanes are split into isolated PRs with fail-closed proof boundaries.”


## Integrity Constraints

Do not inject false information.

Do not guess.

Use only verifiable repository evidence.

If capacity/limit risk appears, report it and propose mitigation.

Prefer concrete, simple, and testable user-value outcomes.


## Codex Prompt Rule

Each Codex task must use the detailed lane prompt from this file.

Do not let Codex infer missing implementation details. Do not let Codex merge multiple lanes into one PR. Do not let Codex mark a lane complete without tests and clear evidence.
