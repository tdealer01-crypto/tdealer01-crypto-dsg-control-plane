# DSG ONE V1 — Autonomous Governed Runtime

DSG ONE V1 is a governed app-builder and autonomous runtime control plane.  
Includes **DSG SkillGate** — open-source GitHub skill discovery, inspection, verification, lock, and governed-run pipeline.

Production: `https://dsg-one-v1.vercel.app`

---

## Test Status (2026-05-26)

### CI verified — GitHub Actions [`skillgate-ci.yml`](/.github/workflows/skillgate-ci.yml)

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
| `template-commission` | 12 | ✓ PASS |
| **Total** | **259** | **✓ ALL PASS** |

```text
npx tsc --noEmit          EXIT: 0   (no type errors)
npm run lint              EXIT: 0   (no lint errors)
npm run build             ✓ Compiled successfully
vitest run                259 passed / 30 files
```

### Production smoke (2026-05-23 ICT)

```text
login:                    PASS — t.dealer01@dsg.pics authenticated
governed-tool-request:    PASS — AUDIT ID + REQUEST HASH generated
risk-status:              data_verified
truth-ok:                 true
gate:                     VERIFIED — fail-closed before execution
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

Last verified: **2026-05-26 ICT**

```text
System claim: DSG_AUTONOMOUS_LEVEL_COMPLETE + TEMPLATE_MARKETPLACE_LIVE + GRAPHMAP_PLUGIN_DEPLOYED
Completion: true
Passed required lanes: 9/9
Template marketplace: LIVE (Stripe Checkout wired)
Audit packet final verdict: BLOCKED (governance gates unchanged)
Production-ready marketplace claim: false (pending RBAC + entitlement enforcement)
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

### App Builder & Marketplace (new 2026-05-26)

```text
/dsg/app-builder
/dsg/templates                          — marketplace gallery (live data, owned badges)
/dsg/templates/submit                   — creator submit form (80/20 revenue split)
/dsg/templates/my                       — buyer library (purchased templates)
/dsg/templates/my-payouts               — creator earnings dashboard + revenue chart

/api/dsg/templates                      — GET list with search & category filter
/api/dsg/templates/[id]/purchase        — POST purchase (Stripe Checkout for paid)
/api/dsg/templates/submit               — POST creator list template for sale
/api/dsg/templates/my/purchases         — GET buyer's cleared purchases
/api/dsg/templates/my/payouts           — GET creator earnings summary + sales
/api/webhooks/stripe                    — POST Stripe webhook (clears PENDING sales)
```

### GraphMap Plugin (new 2026-05-26)

```text
/api/plugins/graphmap/build   — POST skill:execute — scan repo → build graph → Supabase
/api/plugins/graphmap/query   — POST skill:read    — keyword BFS → evidence + gate
/api/plugins/graphmap/status  — GET  skill:read    — EMPTY | READY, isStale boolean

Edge confidence:
  import / link   → EXTRACTED  (direct parse evidence)
  co-located      → INFERRED   (same-directory heuristic)

Gate:
  ALLOW   — ≥3 EXTRACTED evidence + graph age < 24h
  REVIEW  — any INFERRED, stale, or < 3 EXTRACTED
  BLOCK   — no evidence or all AMBIGUOUS

Plugin manifest: plugins/graphmap/plugin.json
  read_repo: true | write_repo: false | call_dsg_gate: true
```

### Enterprise & Governance

```text
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

### Template Marketplace — Revenue Flow

```text
Creator: /dsg/templates/submit → POST /api/dsg/templates/submit
Buyer:   /dsg/templates → POST /api/dsg/templates/[id]/purchase
         → Stripe Checkout (paid) or CLEARED instantly (free)
         → POST /api/webhooks/stripe (checkout.session.completed)
         → sale status: PENDING → CLEARED
Creator: /dsg/templates/my-payouts → GET /api/dsg/templates/my/payouts
         → clearedPayoutTHB (80%), pendingPayoutTHB, totalRevenueTHB

Commission: 20% platform / 80% creator (2000 bps, integer satang)
Duplicate guard: UNIQUE(template_id, buyer_id) — returns ALREADY_PURCHASED 422
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
1. Apply Supabase migrations on production DB (000001–000003).
2. Register https://dsg-one-v1.vercel.app/api/webhooks/stripe in Stripe dashboard
   → event: checkout.session.completed
3. Add server-side RBAC enforcement tests and cross-org denial tests.
4. Add entitlement or billing provider proof, quota denial tests, and upgrade-path proof.
5. Add accessibility review notes for keyboard, semantics, contrast, mobile viewport.
6. Add owner approvals and convert only proven gates from REVIEW/BLOCKED to PASS.
7. GraphMap: add /dsg/graphmap UI page + sidebar nav link.
8. GraphMap: add LLM-backed semantic query on top of keyword BFS.
```