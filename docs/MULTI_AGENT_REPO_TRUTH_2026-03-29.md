# MULTI-AGENT ONE-SHOT REPO TRUTH REPORT (2026-03-29)

GITHUB_CONTEXT: READY

Budget snapshot (best-effort):
- mode: normal
- GitHub metadata reads: 15 repos + targeted file/tree reads only (P0/P1)
- exploratory/P2 cuts: skipped org-wide search endpoint scanning and skipped non-referenced secondary repos
- confirmed: repo existence/default branches for scan-first set, key contract files, formal artifact location, runtime/control-plane API surfaces
- not confirmed: repos returning 404 in current owner context; any private repos outside visible set

## 1) Current Verified Reality

- `tdealer01-crypto-dsg-control-plane` is a real Next.js control-plane product shell with API routes for execute/agents/usage/ledger/proofs/audit/billing plus Supabase schema and migrations.
- `DSG-Deterministic-Safety-Gate` is a real separate repo containing canonical gate core code and formal artifact file `artifacts/formal/dsg_full_proof.smt2`.
- `DSG-ONE` is a real separate runtime plane with Express routes for execute/ledger/proofs/replay/stream and runtime decision/proof/ledger persistence.
- `dsg-deterministic-audit` exists but appears lightweight from root structure (no deep server contract surface found in this pass).
- `dsg-Legal-Governance` exists and is mostly spec/narrative + web surface content.

## 2) Verified Formal Core

Verified fact accepted and corroborated:
- formal artifact path exists in gate repo: `artifacts/formal/dsg_full_proof.smt2`
- artifact header explicitly states SMT-LIB v2 for Z3
- local control-plane integration constants also encode the same verified properties and scope boundary:
  - Determinism
  - Safety Invariance
  - Constant-Time Bound
  - expected solver result `sat`

Scope boundary remains strict:
- formal proof validates gate-core invariants, not full runtime/monitor/billing/org/product loop assembly by itself.

## 3) Source of Truth Map

Canonical source-of-truth decisions from code evidence:
- gate core + formal schemas/artifacts: `DSG-Deterministic-Safety-Gate`
- runtime execution/proof/ledger APIs: `DSG-ONE`
- product shell (UI + org/auth/usage/billing + supabase persistence): `tdealer01-crypto-dsg-control-plane`
- legal/spec narrative and governance positioning: `dsg-Legal-Governance`
- audit dashboard lineage (supporting): `dsg-deterministic-audit` and `-tdealer01-crypto-dsg-deterministic-audit-v2`

## 4) Repo Classification

- canonical:
  - `DSG-Deterministic-Safety-Gate` (formal gate core + schema)
  - `DSG-ONE` (runtime decision/execution/proof/ledger plane)
  - `tdealer01-crypto-dsg-control-plane` (control-plane product shell)
- supporting:
  - `dsg-Legal-Governance` (spec/governance narrative, ecosystem map)
  - `dsg-deterministic-audit` (audit dashboard surface)
  - `-tdealer01-crypto-dsg-deterministic-audit-v2` (audit variant)
- overlap:
  - `dsg-deterministic-mvp` overlaps as another generated app shell path
  - audit v1/v2 overlap by product intent
- unclear / inactive / placeholder:
  - `jarvis-saas-Public` (very small footprint)
- not visible in current owner context (404 during verified metadata read):
  - `DSG-Gate-`, `dsg-architect-mobile`, `dsg-aibot-v2`, `dsg-aibot-v3`, `dsg-aibot-v4`, `dsg-ai-bot-v10`, `studio`

## 5) Problems Actually Found

1. Contract-shape drift across gate vs runtime vs control-plane:
   - gate repo schema response is compact and protocol-centric
   - runtime (`DSG-ONE`) exposes execution/audit/proof/ledger-oriented operational payloads
   - control-plane execute path uses Supabase org/agent/quota/billing context plus local adapter/compat logic
2. Cross-repo unification is real but incomplete as a single strict contract authority:
   - local `lib/core-compat.ts` explicitly probes both canonical-gate and runtime-style paths
3. Several repos in requested scan list are not resolvable under current owner visibility (404), so those cannot be treated as verified participants.

## 6) Cross-Agent Synthesis

- Agent A (Repo Mapper): confirmed scan-first repo availability matrix and root manifests.
- Agent B (Architecture/SOT): identified three-core split (gate core, runtime, control plane) with governance/audit supporting repos.
- Agent C (API/DB/Event): verified real contracts in control-plane API routes + Supabase schema and runtime routes in DSG-ONE.
- Agent D (Mission Control/UI): verified control-plane route shell and dashboard/API inventory.
- Agent E (Decision/Safety/Proof/Ledger): verified formal artifact path + runtime proof/ledger route presence and gap to full E2E verification.
- Agent F (Runtime/Sandbox/Mirror/Mobile): runtime authority exists in DSG-ONE; mobile repo in requested list was not visible (404).
- Agent G (Auth/Billing/Usage): verified control-plane has billing + usage tables/routes; cannot assert production-complete loop without deployment/runtime env evidence.
- Agent H (Integrator): selected minimal deliverable = update live repo-truth report only, no risky contract rewrite.

## 7) Unification Plan

Minimal, verified-first plan:
1. Freeze canonical schema authority in `DSG-Deterministic-Safety-Gate`.
2. Add machine-readable adapter contract mapping in control-plane (read-only compatibility matrix first).
3. Align DSG-ONE execute/ledger/proofs payloads to a versioned contract namespace (non-breaking adapter layer).
4. Gate runtime integration in control-plane by explicit profile (`canonical_gate` vs `dsg_one_runtime`) until convergence.
5. Promote one audit repo as canonical and archive overlap variant.

## 8) Files / Repos To Change

Changed now (this commit):
- `docs/MULTI_AGENT_REPO_TRUTH_2026-03-29.md`

Not changed (planned only):
- contract files in `DSG-Deterministic-Safety-Gate`
- runtime route DTOs in `DSG-ONE`
- adapter mapping in `tdealer01-crypto-dsg-control-plane/lib/*`

## 9) Exact Changes

- Replaced previous `GITHUB_CONTEXT: NOT_READY` report with a live-verified report derived from real GitHub API metadata + targeted file reads.
- Added strict 15-section one-shot output structure.
- Added repo classification and formal-core-vs-runtime gap analysis with explicit uncertainty boundaries.

## 10) Git Actions Performed

- Updated local file: `docs/MULTI_AGENT_REPO_TRUTH_2026-03-29.md`
- Prepared commit on current branch.

## 11) Commit Message

- `docs: refresh multi-agent repo truth with live GitHub verification`

## 12) PR Draft

Title:
- `docs: refresh DSG multi-repo truth and formal-vs-runtime gap`

Body sections:
- Summary
- Verified Reality
- Source of Truth Decisions
- Formal Gate vs Runtime Gap
- Changes
- Risks
- Unknowns

## 13) Risks / Impact

- No runtime code-path behavior change (docs-only).
- Risk is primarily interpretation drift if upstream repos change after this snapshot date.
- This report should be treated as point-in-time truth (2026-03-29 UTC).

## 14) Missing Info But Continued Anyway

- จุดนี้ยังยืนยันไม่ได้จากไฟล์และข้อมูลที่มองเห็นอยู่
- มองไม่เห็น repo/file/config ที่จำเป็นต่อการสรุปจุดนี้
- ไม่มีหลักฐานพอจะสรุปเป็น fact
- จะไม่เดาต่อ

Concrete missing items in this pass:
- any private/renamed repos behind 404 in requested scan list
- deployment-time env wiring proving production loop end-to-end
- live monitor stream evidence beyond repository code presence

## 15) Hard Blockers

- Hard blocker for full requested breadth: multiple repos in the requested list returned 404 under current owner context, so cross-repo truth for those specific repos cannot be verified in this run.
