# DSG ONE — Multi-Agent Parallel Task Board

## Active Tasks (5 parallel)

### Agent 1: CCVS Evidence — Commit-Signed
- **Goal**: Generate `ccvs-evidence.json` with real commit hash (not "unknown")
- **Files**: `scripts/build-evidence-bundle.mjs`, `.github/workflows/ccs-evidence.yml`
- **Success criteria**: `ccvs-evidence.json` has `commit` != "unknown", `chain_hash` present
- **Status**: ASSIGNED

### Agent 2: GDPR Position Paper
- **Goal**: Write 1-page legal position resolving immutable audit vs GDPR Art. 17
- **Files**: `docs/compliance/gdpr-position-paper.md`
- **Success criteria**: Document exists, addresses Art. 17 conflict, cites regulatory basis
- **Status**: ASSIGNED

### Agent 3: Z3 Runtime Solver Integration
- **Goal**: Replace scaffold with real Z3 proof verification before execution
- **Files**: `lib/dsg/logic/z3-agent-gate.ts`, `lib/dsg/logic/z3-runtime-check.ts` (new)
- **Success criteria**: `z3-runtime-check.ts` exists, called in spine/execute, returns proof hash
- **Status**: ASSIGNED

### Agent 4: Incidents Table Migration
- **Goal**: Create Supabase migration for incidents table with RLS + immutable trigger
- **Files**: `supabase/migrations/*_create_incidents_table.sql`
- **Success criteria**: Migration file exists, has RLS + hash chain + trigger guard
- **Status**: ASSIGNED

### Agent 5: Incident Response Playbook (Tested)
- **Goal**: Wire incidents API into real escalation flow with tests
- **Files**: `tests/integration/incidents-api.test.ts`, `docs/compliance/incident-response-playbook.md`
- **Success criteria**: Integration tests pass (5+ scenarios), playbook updated with tested flows
- **Status**: ASSIGNED

## Blocked / Waiting

### Agent 6: ISO 42001 Gap Analysis (starts after Agent 2 completes)
- **Goal**: Formal gap analysis document mapping existing controls to ISO 42001 Annex A
- **Depends on**: Agent 2 (GDPR position → input to gap analysis)

## Completed

- ✅ Phase 1+2+3 compliance hardening (PR #763)
- ✅ Team invite role error handling (PR #764)
- ✅ 54 Accenture 10Q tests passing
