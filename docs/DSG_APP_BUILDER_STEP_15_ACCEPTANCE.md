# DSG App Builder Step 15 Rev A Acceptance

## Required Files

- `lib/dsg/app-builder/status.ts`
- `lib/dsg/app-builder/model.ts`
- `lib/dsg/app-builder/stable-json.ts`
- `lib/dsg/app-builder/hash.ts`
- `lib/dsg/app-builder/goal-lock.ts`
- `lib/dsg/app-builder/prd-generator.ts`
- `lib/dsg/app-builder/plan-generator.ts`
- `lib/dsg/app-builder/gate.ts`
- `lib/dsg/app-builder/approval.ts`
- `lib/dsg/app-builder/runtime-handoff.ts`
- `lib/dsg/app-builder/index.ts`
- `supabase/migrations/202604110015_create_dsg_app_builder_jobs.sql`

## Behavior

- A goal can be locked.
- A deterministic PRD can be created.
- A proposed plan can be created.
- A gate can pass, review, or block.
- A blocked plan cannot be approved.
- Runtime handoff requires READY_FOR_RUNTIME.
- Runtime handoff verifies planHash again.
- Step 15 does not execute commands or deploy.

## Completion Claim

Step 15 Rev A may claim planning readiness only, not runtime or production readiness.
