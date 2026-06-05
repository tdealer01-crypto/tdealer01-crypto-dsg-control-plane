# Proposal — Guided Onboarding & Safe-by-Default UX for Real Users

Status: `proposal / not implemented`
Branch: `claude/dsg-ai-agent-governance-hbMGI`
Date: 2026-06-05
Author: AI assistant (Claude Code), reviewed-by: pending

> Scope chosen with the requester: **focus = guided onboarding / safe defaults**, **deliverable = proposal/plan first** (no product code changed in this document). Each statement below is tagged `verified fact`, `inference`, or `open question` per the repo truth policy in `CLAUDE.md`.

---

## 1. Goal

Make the first run of a *governed* AI agent understandable, verifiable, and safe by default for **real users** (operators, compliance owners, founders) — not only developers. Concretely: a new user should go from empty workspace → one safely-gated action → readable evidence, on a single guided path, without writing JSON or reading raw hashes.

This proposal does **not** touch the runtime spine, gate semantics, billing, or any production claim. It is a UX/coherence plan for the onboarding layer only.

---

## 2. Method / evidence base

Files inspected directly on this branch (verified fact):

- `app/dashboard/welcome/page.tsx`
- `app/dashboard/welcome/AutoSetupButton.tsx`
- `app/dashboard/skills/page.tsx` (Auto-Setup section + curl)
- `app/dashboard/page.tsx` (Command Center onboarding progress)
- `app/api/onboarding/state/route.ts`
- `app/api/onboarding/seed/route.ts`
- `app/api/setup/auto/route.ts`
- `components/OnboardingChecklist.tsx`

Search evidence (verified fact):

- `grep` for `onboarding/seed` callers in `app/`, `components/`, `lib/` → **no UI reference**; only the route file itself.
- `grep` for `OnboardingChecklist` importers → **no mount site found** anywhere in `app/` or `components/`.
- `grep` for `completedStepIds` / `connect_integration` in UI → rendered **only** inside `components/OnboardingChecklist.tsx` (the orphaned component).

No live deployment, Supabase, or browser checks were run for this document. Everything below is source-level analysis.

---

## 3. Current-state map (what exists today)

There are **five** onboarding-related surfaces, and they do not share one model or one journey.

| # | Surface | What it does | Wiring | Language |
|---|---------|--------------|--------|----------|
| 1 | `/dashboard/welcome` | Inline **Auto-Setup** button + 3 manual link-steps (Create API key → Quickstart → Watch) + "what's included" | calls `POST /api/setup/auto` | Mixed EN/TH |
| 2 | `/dashboard/skills` | Another **Auto-Setup** button + curl example | calls `POST /api/setup/auto` | EN |
| 3 | `/dashboard` (Command Center) | 3-step **auto-detected** progress bar: Workspace / Agent connected / First execution run, plus `Next: <next_action>` text | reads `GET /api/onboarding/state` `progress` + `next_action` | EN |
| 4 | `components/OnboardingChecklist.tsx` | Floating 6-step **manual** checklist (Connect integration → Run action → Review evidence → Team → Approvals → Export audit) | `GET`/`PATCH /api/onboarding/state` `widget.completedStepIds` | EN |
| 5 | `POST /api/onboarding/seed` | Server seeder: starter agent + default policy + sample execution + audit + usage rows | **no UI caller** | n/a |

### Two progress models inside one API

`GET /api/onboarding/state` returns **both**:

- `progress` — 3 booleans auto-derived from real DB counts (`workspace_ready`, `agent_ready`, `first_execution_ready`). Used by surface #3. (verified fact)
- `widget.completedStepIds` — up to 6 **manually toggled** step ids persisted via `PATCH`. Used only by surface #4. (verified fact)

These two taxonomies never reference each other.

### Two seeding endpoints

- `POST /api/setup/auto` — the one actually wired to the UI; creates policy (`block_risk_score: 0.8, stabilize_risk_score: 0.4, oscillation_window: 4`), active agent (`monthly_limit: 10000`), first execution via runtime commit, billing trial, onboarding state. (verified fact)
- `POST /api/onboarding/seed` — overlapping seeder; default policy (`block_risk_score: 0.8, stabilize_risk_score: 0.4`), agent (`monthly_limit: 1000`), sample execution + audit + usage. **No caller.** (verified fact)

---

## 4. Gap analysis

### G1 — Fragmented journey, no single front door (inference, high confidence)
A new user can land on `welcome`, `skills`, the Command Center, or (in principle) the floating checklist — each tells a different story. The Command Center's `next_action` text even says *"Complete Auto-Setup in **Skills**"* while the primary welcome page has Auto-Setup **inline**. The user is pointed away from where the action already is. (verified fact: `next_action` strings in `app/api/onboarding/state/route.ts:105-109`; inline Auto-Setup in `welcome/page.tsx`.)

### G2 — Self-attested onboarding contradicts the evidence-first product (verified fact + inference)
The 6-step `OnboardingChecklist` completes via `toggleStep` — the user simply checks boxes; nothing is verified against real state (`components/OnboardingChecklist.tsx:163-179`). For a product whose whole thesis is *evidence over claims*, "I pledge I reviewed the evidence pack" with no proof is off-brand and undermines trust. The auto-detected `progress` model (surface #3) is the correct pattern; the manual one is the weak one.

### G3 — Dead / orphaned onboarding code (verified fact)
`OnboardingChecklist.tsx` is not mounted, and `/api/onboarding/seed` has no caller. They duplicate concepts that the wired path (`setup/auto` + Command Center progress) already covers. Dead onboarding code is a maintenance and correctness risk: a future reader cannot tell which path is authoritative.

### G4 — Generated code handed to users contains Thai comments (verified fact)
`AutoSetupButton.tsx` produces Python/JS/cURL snippets that users copy into **their own** codebases, with inline Thai comments, e.g. `# ใส่ก่อนทุก action ที่ agent จะทำ` and `# 🚫 BLOCK — หยุด` (`AutoSetupButton.tsx:30-34, 52, 67-69`). Mixed-language generated code is a concrete quality/usability problem for any non-Thai user and looks unprofessional in a customer's repo. (UI chrome being bilingual is a product choice; **emitted code** should not be.)

### G5 — "Safe by default" is asserted but not surfaced or examined (open question)
Both seeders create a policy that only **blocks** at `risk_score > 0.8` and **stabilizes** at `> 0.4` (verified fact). Whether that is genuinely "safe by default" for a first-time user — versus, say, defaulting to require-approval / audit-only for the first actions — is unproven and undocumented. The onboarding never explains *what the default policy will and won't stop*, so the user cannot verify safety. Per `CLAUDE.md`, "safe by default" must be shown, not claimed.

### G6 — Evidence is created but the first run never shows a readable "what just happened" (inference)
Auto-Setup creates an execution + audit + evidence, but the success state shows IDs and an API key, then links to the dashboard. There is no plain-language "Your first action was ALLOWED because risk 0.05 < block threshold 0.8 — here is the stamped proof" moment. The verifiability promise is technically present in data but absent from the first-run experience.

---

## 5. Proposed plan (smallest branchable changes first)

Each phase is independently shippable and independently verifiable. Recommend doing them as **separate PRs** in order.

### Phase 1 — Make one journey authoritative, retire the rest (low risk, high clarity)
- Decide the canonical front door = **`/dashboard/welcome`** (post-signup) feeding the **Command Center auto-detected progress** (surface #3). (recommended)
- Fix the `next_action` strings in `app/api/onboarding/state/route.ts` to point at the *actual* Auto-Setup location, not "Skills," so the guidance matches the UI.
- **Decision needed (open question):** for the orphaned `OnboardingChecklist.tsx` + 6-step `widget` model and the unused `/api/onboarding/seed` — either (a) delete as dead code, or (b) adopt the checklist as the canonical post-setup guide but convert each step to **auto-detected** state (closes G2). Do not leave both half-wired.
- Verification: `npm run typecheck`, targeted route test for `/api/onboarding/state`, manual read of rendered welcome/dashboard.

### Phase 2 — Plain-language, evidence-backed first-run summary (closes G6)
- After Auto-Setup succeeds, render a human sentence built from the real execution row: decision, the risk score vs the threshold that produced it, and a link to the stamped audit entry. No raw JSON in the happy path; "view raw" stays available for developers.
- Verification: unit test the summary formatter against sample execution shapes; visual check.

### Phase 3 — De-localize emitted code, keep bilingual chrome (closes G4)
- Strip Thai from the **generated** Python/JS/cURL in `AutoSetupButton.tsx` (and the downloadable `dsg_gate.*` files via `/api/quickstart/download`); use neutral English comments. Keep UI labels bilingual if that is the product's audience.
- Verification: snapshot/string test that generated snippets contain no non-ASCII comment text; diff review.

### Phase 4 — Surface and document the default safety posture (closes G5)
- In the onboarding success state, show what the default policy enforces in one line ("Blocks risk ≥ 0.8, flags ≥ 0.4 for review") with a link to the policy page.
- Document the chosen default in `docs/` and, if review agrees a stricter first-run posture is wanted, propose an audit-only / approval-first starter policy as a **separate** change (do not silently change gate behavior here).
- Verification: doc review; if policy default changes, route + gate tests.

---

## 6. Explicitly out of scope

Runtime spine / gate decision logic, billing/quota behavior, Supabase migrations, any production-readiness claim, and the visual policy editor (a separate focus area the requester deferred). No `production-ready` / `safe` claim is asserted by this proposal.

---

## 7. Open questions for the requester

1. **Audience of emitted code:** confirm generated snippets should be English-only while UI chrome stays bilingual (G4). 
2. **Orphaned checklist + seed route (G3):** delete, or adopt-and-auto-detect?
3. **Default safety posture (G5):** keep current `block ≥ 0.8` default, or move first-run agents to audit-only / approval-first?

---

## 8. Verification status of this document

```text
Verification:
- [x] Inspected relevant source files (8 files listed in §2)
- [x] grep evidence for orphaned component + unused route
- [ ] Runtime tests not run — proposal/docs-only change
- [ ] No live deployment / Supabase / browser checks run
```

## 9. Next step

On requester's answers to §7, open **Phase 1** as a focused PR (single journey + corrected `next_action` + dead-code decision), with `npm run typecheck` and a targeted `/api/onboarding/state` test as the verification gate.
