# DSG ONE V1 — Autonomous Governed Runtime

DSG ONE V1 is a governed app-builder and autonomous runtime control plane.  
Includes **DSG SkillGate** — open-source GitHub skill discovery, inspection, verification, lock, and governed-run pipeline.

Production: `https://dsg-one-v1.vercel.app`

---

## Test Status (2026-05-25)

### CI verified — 247 tests / 29 files, 0 failures

| Suite | Tests | Status |
|---|---|---|
| `agent-skills-build-draft` | 8 | ✓ PASS |
| `agent-skills-verify` | 8 | ✓ PASS |
| `agent-skills-lock` | 16 | ✓ PASS |
| `agent-skills-run` | 7 | ✓ PASS |
| `agent-skills-pipeline` | 5 | ✓ PASS |
| `api-agent-status` | 6 | ✓ PASS |
| `api-agent-skills` | 18 | ✓ PASS |
| `api-app-builder-plan` | 12 | ✓ PASS |
| `agent-z3-integration` | 19 | ✓ PASS |
| `agent-orchestrator` | 5 | ✓ PASS |
| `agent-seed-engine` | 9 | ✓ PASS |
| `agent-security-gate` | 6 | ✓ PASS |
| `agent-test-coverage` | 6 | ✓ PASS |
| `agent-code-evolution` | 8 | ✓ PASS |
| `agent-deploy-monitor` | 6 | ✓ PASS |
| `agent-browser-research` | 6 | ✓ PASS |
| + 13 other suites | 93 | ✓ PASS |
| **Total** | **247** | **✓ ALL PASS** |

```text
npm run dsg:typecheck    EXIT: 0   (no type errors)
npm test                 247 passed / 29 files — 3.5s
```

### Production smoke (2026-05-25 ICT)

```text
login:                    PASS — t.dealer01@dsg.pics authenticated
governed-tool-request:    PASS — AUDIT ID + REQUEST HASH generated
risk-status:              data_verified
truth-ok:                 true
gate:                     VERIFIED — fail-closed before execution
GET /compliance-evidence-pack       HTTP 200 ✓ (live)
GET /api/compliance-evidence-pack   HTTP 200 ✓ (live)
Vercel deploy:            GREEN — PR #596 + PR #597
```

### Safety invariants (enforced at runtime)

```text
noClone:                        true
noInstall:                      true
noRawCodeExecution:             true
githubReadOnlyInspection:       true
governedExecutionRequired:      true
blockedSkillsRequireForceReg:   true
needsApprovalDeniedAtRunGate:   true
```

### Evidence pack

| File | Purpose |
|---|---|
| `docs/openapi-agent-skills.yaml` | OpenAPI 3.1.0 contract — 6 endpoints |
| `docs/skillgate-evidence.json` | Machine-readable safety claims + test matrix |
| `docs/TEST_EXECUTION_SUMMARY.md` | Verbatim command output (not self-written) |

---

## Overall status

Last verified: **2026-05-25 ICT**

```text
System claim: DSG_AUTONOMOUS_LEVEL_COMPLETE
Completion: true
Passed required lanes: 9/9
Tests: 247 passed / 29 files, 0 failures
TypeScript: 0 errors
Vercel deploy: GREEN
Marketplace readiness: REVIEW
Audit packet final verdict: BLOCKED
Production-ready marketplace claim: false
```

## Self-Evolving Agent Platform (PR #98 — 2026-05-25)

6 specialized agents governed by Z3 formal verification + Seed Engine:

| Agent | Z3 Invariant | Key Rule |
|---|---|---|
| Orchestrator | `goal_locked → can_dispatch` | Blocks all dispatch without goal lock |
| Code Evolution | `writes_code → plan_approved` | Cannot write without approved plan |
| Test Coverage | `new_coverage >= previous` | Coverage can only go up |
| Deploy Monitor | `triggers_deploy → gate_pass ∧ evidence ∧ ¬mock` | Gate + evidence required |
| Browser Research | `uses_result → evidence_hash_set` | Every result must carry SHA-256 hash |
| Security Gate | `action → gate_decision == ALLOW` | Wraps every other agent |

```text
formal/agent-invariants.smt2       SMT-LIB 2 spec — 6 agent invariant blocks
lib/dsg/logic/z3-agent-gate.ts     TypeScript → Z3 bridge (PASS / BLOCK)
lib/dsg/seed/seed-engine.ts        Seed Engine — data needed → must search, never guess
skills/{agent}/skill.ts            6 agent skill files (SkillGate pipeline)
lib/dsg/agents/{types,registry,executor,loop}.ts   Core agent library
```

## Production smoke evidence

```text
build:termux: PASS
smoke:first-value-flow: PASS, failures: []
smoke:audit-packet: PASS, status: 200, ok: true
smoke:marketplace-readiness: PASS endpoint/schema, verdict: REVIEW
smoke:accessibility-qa: PASS endpoint/schema, internal verdict: BLOCKED
smoke:security-rbac: PASS endpoint/schema, internal verdict: BLOCKED
smoke:entitlement: PASS endpoint/schema, internal verdict: BLOCKED
smoke:app-builder-flow-proof: PASS fail-closed, productionReadyClaim: false
```

## Marketplace evidence boundary

The marketplace readiness surface is intentionally evidence-first and fail-closed.

```text
/api/dsg/marketplace/readiness
verdict: REVIEW
gates: 6
pass: 0
review: 6
blocked: 0
noMockPolicy.enforced: true
```

```text
/api/dsg/marketplace/audit-packet
status: 200
ok: true
finalVerdict: BLOCKED
missingEvidenceCount: 65
failures: []
```

`REVIEW` and `BLOCKED` are the correct states until real enforcement, accessibility review, owner approval, and deployment evidence are attached.

This README does **not** claim marketplace PASS, production-ready status, completed RBAC enforcement, completed entitlement enforcement, WCAG approval, or owner approval completion.

## Runtime surface

```text
/dsg/app-builder
/api/dsg/app-builder/outcome
/enterprise/readiness
/enterprise/accessibility
/enterprise/market
/enterprise/terms
/enterprise/privacy
/enterprise/security
/enterprise/support
/enterprise/entitlement
/enterprise/security-rbac
/api/dsg/market/agent-app-builder
/api/dsg/marketplace/readiness
/api/dsg/marketplace/readiness-score
/api/dsg/marketplace/audit-packet
/api/dsg/marketplace/accessibility-qa
/api/dsg/marketplace/security-rbac
/api/dsg/marketplace/entitlement
/dsg/flow-studio
/api/dsg/flow-studio/config
/dsg/autonomous-level
/api/dsg/autonomous-level/status
```

## Production verification

```bash
export APP_URL="https://dsg-one-v1.vercel.app"

npm run smoke:first-value-flow
npm run smoke:audit-packet
npm run smoke:marketplace-readiness
npm run smoke:accessibility-qa
npm run smoke:security-rbac
npm run smoke:entitlement
npm run smoke:app-builder-flow-proof
```

## Claim ladder

```text
DSG_AUTONOMOUS_LEVEL_COMPLETE: current
MARKETPLACE_REVIEW_READY: current evidence-first review state
MARKETPLACE_PASS: locked until full enforcement, review, and approval evidence exists
```

## Next upgrade

```text
1. Add server-side RBAC enforcement tests and cross-org denial tests.
2. Add entitlement or billing provider proof, quota denial tests, and upgrade-path proof.
3. Add accessibility review notes for keyboard, semantics, contrast, mobile viewport, and status readability.
4. Add owner approvals and convert only proven gates from REVIEW/BLOCKED to PASS.
```