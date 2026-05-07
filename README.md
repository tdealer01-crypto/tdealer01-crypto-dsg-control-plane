# DSG ONE V1 — Governed App Builder Runtime

> From user goal to PRD, gated plan, approval, runtime handoff, generated app evidence, and deployable proof trail.

![Product Ready Gate](https://img.shields.io/badge/product--ready--gate-PASS-brightgreen)
![Build](https://img.shields.io/badge/build-PASS-brightgreen)
![Vercel](https://img.shields.io/badge/vercel-production--deployed-brightgreen)
![Truth Boundary](https://img.shields.io/badge/production--verified-not--claimed-orange)

## Current status

**Last operator verification:** 2026-05-07 21:00 ICT

DSG ONE V1 now has a passing product-ready environment gate, a passing production build, a clean `git diff --check`, and a successful Vercel production deployment.

```text
Status: DEPLOYABLE / PRODUCT_READY_GATE_PASS
Production verified: false
Production alias: https://dsg-one-v1.vercel.app
Latest Vercel production URL: https://dsg-one-v1-18wq8x7m4-tdealer01-cryptos-projects.vercel.app
```

Safe claim right now:

```text
governed app-builder runtime with product-ready gate pass and production deployment evidence
```

Do not claim yet:

```text
PRODUCTION_VERIFIED
```

Full production verification still requires live runtime proof, Supabase audit rows, generated GitHub branch / PR evidence, deployment proof artifact, and production-flow proof.

## Verified checks

```text
PASS: DSG_ONE_V1_SUPABASE_URL
PASS: DSG_ONE_V1_SUPABASE_SERVICE_ROLE_KEY
PASS: GITHUB_TOKEN
PASS: OPENAI_API_KEY
PASS: DSG_BUILDER_GITHUB_OWNER
PASS: DSG_BUILDER_GITHUB_REPO
PASS: DSG_BUILDER_BASE_BRANCH
PASS: APP_URL
PASS: VERCEL_TOKEN
PASS: VERCEL_ORG_ID
PASS: VERCEL_PROJECT_ID
PASS: npm run build
PASS: git diff --check
PASS: vercel --prod
```

## Verification commands

Run this before any status claim:

```bash
npm run dsg:claim-gate \
&& npm run dsg:runtime-check \
&& npm run dsg:typecheck \
&& npm run lint \
&& npm run dsg:product-ready
```

Then run:

```bash
npm run build
git diff --check
vercel --prod
```

## What DSG ONE V1 does

DSG ONE V1 is a governed AI app-builder and action-runtime control plane.

It is designed to make app generation visible, reviewable, auditable, fail-closed, evidence-driven, and safe to operate before production claims.

Core rule:

```text
No production claim without real runtime evidence.
```

## Product flow

```text
User goal
  -> Goal lock
  -> PRD
  -> Plan gate
  -> Approval
  -> Runtime handoff
  -> App Builder orchestration tool
  -> Runtime environment provisioner
  -> Agent action layer
  -> Full-stack build tool
  -> GitHub branch / PR evidence
  -> DB-backed audit
  -> Product-ready check
  -> Production-flow proof
```

## Main surfaces

```text
/                               Main DSG control plane
/dsg/app-builder                App Builder Console
/dsg/app-builder/[jobId]        Job detail and evidence view
/dsg/app-builder/sandbox        App Builder sandbox
/product-ready                  Product-ready gate UI
/generated-apps/[appId]         Generated app output
/api/dsg/product-ready          Product-ready API
/api/dsg/*                      Runtime, memory, proof, and app-builder APIs
```

## Claim vocabulary

```text
PLANNED_ONLY              PRD or plan exists only.
APPROVED_ONLY             Approval exists, execution proof is missing.
ENVIRONMENT_READY         Runtime environment exists, build/deploy proof is incomplete.
IMPLEMENTED_UNVERIFIED    Code or PR evidence exists, verification is incomplete.
DEPLOYABLE                Build and deployment gates passed with evidence.
PRODUCTION_VERIFIED       Live production-flow proof passed with recorded evidence.
BLOCKED                   Required env, approval, proof, or audit evidence is missing.
```

Current safe level:

```text
DEPLOYABLE / PRODUCT_READY_GATE_PASS
```

Not claimed:

```text
PRODUCTION_VERIFIED
```

## Truth boundary

This repo currently proves that the implementation surface can pass the configured product-ready gate and deploy to Vercel production.

It does not yet prove that every generated workflow is production verified.

Missing proof must stay missing. Mock data, local-only state, browser-only state, or unchecked logs must not be presented as production evidence.

Allowed evidence includes:

```text
database rows
GitHub commits / branches / PRs
Vercel deployment status
build logs
migration results
audit rows
replay/proof artifacts
browser-visible status after real execution
```

## Required environment variables

Server-only runtime variables:

```bash
DSG_ONE_V1_SUPABASE_URL=
DSG_ONE_V1_SUPABASE_SERVICE_ROLE_KEY=
GITHUB_TOKEN=
OPENAI_API_KEY=
VERCEL_TOKEN=
VERCEL_ORG_ID=
VERCEL_PROJECT_ID=
```

Builder target variables:

```bash
DSG_BUILDER_GITHUB_OWNER=tdealer01-crypto
DSG_BUILDER_GITHUB_REPO=dsg-one-v1
DSG_BUILDER_BASE_BRANCH=main
APP_URL=https://dsg-one-v1.vercel.app
```

Do not expose server secrets through `NEXT_PUBLIC_*`.

## Local development

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

## Available DSG scripts

```bash
npm run dsg:claim-gate
npm run dsg:runtime-check
npm run dsg:typecheck
npm run dsg:production-flow-check
npm run dsg:product-ready
npm run dsg:verify
npm run smoke:app-builder-flow-proof
npm run smoke:memory-api
```

## Termux / Android workflow

```bash
npm run clean
npm run build:termux
npm run dev:termux
```

Termux wrappers keep local proof possible on Android where cache paths, PostCSS/Tailwind snapshots, or watcher permissions can be unstable.

## API surface

Key App Builder endpoints:

```text
POST /api/dsg/app-builder/jobs
POST /api/dsg/app-builder/jobs/:jobId/plan
POST /api/dsg/app-builder/jobs/:jobId/approval
POST /api/dsg/app-builder/jobs/:jobId/runtime-handoff
GET  /api/dsg/app-builder/tools
POST /api/dsg/app-builder/jobs/:jobId/tool-call
```

Runtime and proof endpoints:

```text
POST /api/dsg/jobs/:jobId/runtime/start
POST /api/dsg/jobs/:jobId/replay
GET  /api/dsg/jobs/:jobId/production-flow-proof
POST /api/dsg/runtime/build-proof/callback
POST /api/dsg/runtime/production-flow/callback
GET  /api/dsg/product-ready
GET  /api/dsg/verify
```

Memory/context endpoints:

```text
POST /api/dsg/memory/ingest
POST /api/dsg/memory/search
POST /api/dsg/memory/gate
GET  /api/dsg/memory/context-pack
GET  /api/dsg/workspaces
```

## Product-ready checklist

- [x] Required server env configured for local product-ready gate
- [x] GitHub token configured with writer capability
- [x] Builder repo target configured
- [x] Vercel deployment variables configured
- [x] Local production build passes
- [x] Vercel production deployment passes
- [ ] Supabase migrations applied-state proof attached
- [ ] Live App Builder runtime run attached
- [ ] GitHub branch / PR evidence attached for a live generated app
- [ ] `dsg_app_builder_tool_audits` audit row attached
- [ ] Deployment proof artifact attached
- [ ] Production-flow proof attached

## Next proof targets

```text
1. Run a real App Builder job.
2. Capture runtime handoff evidence.
3. Generate a GitHub branch / PR from runtime.
4. Confirm Supabase audit row evidence.
5. Attach deployment proof artifact.
6. Run production-flow proof.
7. Only then consider PRODUCTION_VERIFIED.
```

## Operator notes

Safe wording:

```text
governed app-builder runtime
product-ready gate pass
deployable evidence workflow
implementation surface with proof boundary
runtime handoff scaffold
```

Do not claim:

```text
certified enterprise system
guaranteed compliant
fully autonomous production builder
PRODUCTION_VERIFIED without live proof
```

## License

Private/operator-controlled project unless a license file is added.
