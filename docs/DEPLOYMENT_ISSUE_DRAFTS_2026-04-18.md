# Deployment Issue Drafts (April 18, 2026)

This document provides ready-to-copy GitHub issue drafts for the public deployment review.

- Target deployment: `https://tdealer01-crypto-dsg-control-plane.vercel.app`
- Scope: readiness, messaging consistency, and verification gaps.
- Source alignment: `README.md`, `docs/RUNBOOK_DEPLOY.md`, `docs/ops/GO_NO_GO.md`.

> Note: Re-check current deployment behavior before posting. “Actual” sections below reflect the latest observed state and may need refresh.

---

## Issue 1 (P0)

**Title:** `P0: /api/health returns unhealthy state in deployed environment`

### Body

#### Summary
The public health probe is reporting an unhealthy state in the deployed environment. This blocks baseline readiness validation and should be treated as a release blocker.

#### Reproduction
1. Open `https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health`
2. Inspect the JSON response.

#### Expected
`GET /api/health` should return a healthy baseline availability signal for deployment smoke validation.

#### Actual
Observed in deployment verification:
- `ok: false`
- `core_ok: false`
- core fetch failure against configured core dependency

#### Impact
- Baseline readiness fails.
- Smoke checks cannot be closed.
- Violates go/no-go release expectations.

#### Likely Cause
Runtime environment misconfiguration for DSG Core connectivity:
- `DSG_CORE_MODE`
- `DSG_CORE_URL`
- `DSG_CORE_API_KEY`

#### Acceptance Criteria
- [ ] `/api/health` returns healthy in deployed target
- [ ] Core mode/env values match selected runtime mode
- [ ] Post-fix smoke evidence is attached
- [ ] Release status updated to match go/no-go gates

---

## Issue 2 (P1)

**Title:** `P1: Public docs page still presents pre-production milestone language`

### Body

#### Summary
The public `/docs` page still reads as mixed pre-production/scaffold guidance and does not clearly match production-facing readiness messaging.

#### Reproduction
1. Open `https://tdealer01-crypto-dsg-control-plane.vercel.app/docs`
2. Review quickstart/milestone/setup language.

#### Expected
Public docs should clearly communicate environment maturity (Preview/Staging/Production Candidate) and avoid mixed messaging.

#### Actual
Deployment docs currently combine product positioning and scaffold/local-setup style guidance.

#### Impact
- Creates uncertainty about environment maturity.
- Reduces reviewer trust and clarity.

#### Suggested Fix
- Establish a single status source of truth.
- Sync deployed docs with repo status docs.
- Add explicit environment label.

#### Acceptance Criteria
- [ ] `/docs` reflects current environment state
- [ ] Wording aligns with README + runbook/go-no-go docs
- [ ] Local/dev guidance is clearly separated from deployed docs
- [ ] No conflicting maturity signals remain

---

## Issue 3 (P1)

**Title:** `P1: /app-shell is publicly accessible but behaves like an unverified operations surface`

### Body

#### Summary
`/app-shell` is publicly accessible and appears like a live ops console while backend readiness is not fully validated.

#### Reproduction
1. Open `https://tdealer01-crypto-dsg-control-plane.vercel.app/app-shell`
2. Review monitor widgets, counters, and readiness indicators.

#### Expected
`/app-shell` should be either:
1. clearly labeled as public demo/proof, or
2. auth-gated if intended as verified runtime surface.

#### Actual
The page is public and appears operationally authoritative despite unresolved runtime readiness concerns.

#### Impact
- May mislead evaluators about runtime truth.
- Blurs public proof vs verified runtime boundaries.

#### Suggested Fix
Choose one:
- Keep public + explicitly label as demo/proof
- Move behind auth if representing verified runtime evidence

#### Acceptance Criteria
- [ ] `/app-shell` has explicit status label
- [ ] Public view cannot be misread as verified live operations
- [ ] If verified-runtime intent, route is auth-gated
- [ ] Messaging aligns with backend readiness state

---

## Issue 4 (P1)

**Title:** `P1: Environment readiness messaging is inconsistent across README, runbook, and deployed surfaces`

### Body

#### Summary
Readiness messaging is inconsistent across deployed pages and repo documentation.

#### Reproduction
Compare:
- public pages (`/`, `/docs`, `/app-shell`)
- `README.md`
- `docs/RUNBOOK_DEPLOY.md`
- `docs/ops/GO_NO_GO.md`

#### Expected
All surfaces should communicate one consistent release stage and readiness definition.

#### Actual
Public deployment mixes production-style positioning with preview/scaffold indicators and unresolved readiness signals.

#### Impact
- Reviewer confusion on maturity standard
- Risk of over-claiming readiness
- Harder release/triage communication

#### Suggested Fix
- Add a global environment banner
- Sync copy across public pages + repo docs
- Define and publish explicit “production-ready” criteria

#### Acceptance Criteria
- [ ] Single environment status label is visible and unambiguous
- [ ] Public pages and repo docs are aligned
- [ ] Release stage is consistent across all surfaces
- [ ] Reviewers can assess maturity without ambiguity

---

## Issue 5 (P2)

**Title:** `P2: Auth redirect works, but authenticated first-run flow remains unverified on deployment`

### Body

#### Summary
Unauthenticated redirect behavior appears correct, but authenticated first-run/operator flow has not been fully validated on deployment.

#### Reproduction
1. Open `https://tdealer01-crypto-dsg-control-plane.vercel.app/dashboard`
2. Confirm redirect to login.

#### Expected
After auth, first-run flow should be verified end-to-end:
1. signup/confirm
2. `/dashboard/skills`
3. Auto-Setup
4. `/dashboard/executions`
5. operator/runtime proof surfaces

#### Actual
Route protection is observable; authenticated runtime flow evidence is still missing.

#### Impact
- Can only confirm auth gate exists
- Cannot confirm operator flow readiness in deployment

#### Suggested Next Test
Run QA workspace flow and collect evidence:
- signup → magic link confirm → skills → auto-setup → executions
- capture screenshots/logs/traces for go/no-go evidence

#### Acceptance Criteria
- [ ] Authenticated first-run flow validated on deployed target
- [ ] Evidence artifacts attached (screenshots/logs/traces)
- [ ] Auto-Setup completes successfully
- [ ] First execution and operator surfaces verified
- [ ] Checklist status updated with evidence links

---

## Recommended opening order
1. Issue 1 (P0 health)
2. Issue 2 (docs maturity messaging)
3. Issue 3 (app-shell labeling/gating)
4. Issue 4 (cross-surface readiness consistency)
5. Issue 5 (authenticated E2E evidence gap)
