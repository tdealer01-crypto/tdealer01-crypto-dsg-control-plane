# DSG ONE Design Review Scorecard
## Implementation Checklist & Compliance Rubric

**Purpose**: Evaluate designs, features, and changes against the Design Constitution (Phases 21–28)

**How to Use**:
1. Review a design decision, feature proposal, or implementation
2. Score each dimension (0–5 per section)
3. Calculate total compliance score
4. Refer to guidance for each question to understand "why"
5. Document decision in project record

**Scoring Guide**:
- **5** = Fully compliant; exemplary execution
- **4** = Mostly compliant; minor refinement needed
- **3** = Partially compliant; significant work required
- **2** = Mostly non-compliant; redesign recommended
- **1** = Critically non-compliant; blocker
- **0** = Not assessed or not applicable

**Threshold**:
- **48–60 (Green)**: Proceed with confidence ✓
- **36–47 (Yellow)**: Proceed with caution; document tradeoffs
- **24–35 (Red)**: Revise or reject
- **< 24 (Critical)**: Stop and rethink entirely

---

## Section 1: Phase 21 — Truth Before Beauty

**Principle**: Beauty must serve clarity. Design choices are legitimate only when they make a system *more* transparent to its users.

### Question 21.1: Evidence Hierarchy
**What it measures**: Are decision, policy, evidence, and audit ID visible and in a clear hierarchy?

**Score: __/5**

**Guidance**:
- **5**: Decision shows all four (decision, policy, evidence, proof ID). User can verify decision independently.
- **4**: Shows three of four; one element missing but not critical.
- **3**: Shows decision + policy, but evidence or ID missing.
- **2**: Shows only decision or only status (e.g., "APPROVED" with nothing else).
- **1**: Completely hidden; user can't see reasoning.

**Examples**:
- ✓ GOOD: "✓ Approved by policy-revenue-v2.3.1 | Rule 6.2 | Evidence: 3 citations, 0.94 confidence | exec-7f3a9c2b"
- ❌ BAD: "✓ APPROVED"

---

### Question 21.2: Relationship Visibility
**What it measures**: When metrics appear together (revenue, sales, performance), are their connections visible?

**Score: __/5**

**Guidance**:
- **5**: Relationships explicitly shown (lines, spatial proximity, narrative). User sees how one metric drives another.
- **4**: Relationships implied through layout; not explicit but clear to attentive user.
- **3**: Metrics on same screen but not connected; user must infer relationships.
- **2**: Metrics separated; relationships unclear.
- **1**: Metrics on completely different pages; relationships hidden.

**Examples**:
- ✓ GOOD: Revenue $2.3M | Impact on Sales: 12 new customers required | Performance impact: 99.5% uptime needed
- ❌ BAD: Revenue: $2.3M | Sales: $1.2M | Performance: 98.2% (no visible connection)

---

### Question 21.3: Information Transparency
**What it measures**: Is the design transparent about what information is shown, hidden, or requires permission to access?

**Score: __/5**

**Guidance**:
- **5**: Clear labels on all information states. Hidden data is explicitly marked as "requires X permission."
- **4**: Mostly transparent; one or two information states lack clarity.
- **3**: Some transparency; unclear which information is hidden or why.
- **2**: Little transparency; users unsure what they're looking at.
- **1**: Completely opaque; information state unknown.

**Examples**:
- ✓ GOOD: "This policy was set by Finance team (you see summary only; full policy visible to Finance admin)"
- ❌ BAD: Showing only partial information with no explanation

---

### Question 21.4: Audit Trail Accessibility
**What it measures**: Can users access the audit trail and execution history?

**Score: __/5**

**Guidance**:
- **5**: Audit trail easily accessible (1 click), searchable, with full metadata.
- **4**: Accessible but requires 2–3 clicks; good search.
- **3**: Accessible but buried; limited search.
- **2**: Very hard to find; minimal search.
- **1**: Audit trail not accessible to users.

**Examples**:
- ✓ GOOD: [View all decisions] → Shows 50 historical decisions, each with exec ID, policy, timestamp
- ❌ BAD: No audit trail link visible; data only available to admins

---

**Section 21 Total: __/20**

---

## Section 2: Phase 22 — Visual Ethics

**Principle**: Design choices must not manipulate, mislead, or disproportionately influence user behavior. Every visual choice is ethical or it's a liability.

### Question 22.1: Color Proportionality
**What it measures**: Do colors reflect actual importance, or do they push users toward a desired outcome?

**Score: __/5**

**Guidance**:
- **5**: Colors accurately reflect semantic meaning and importance. No persuasion via color.
- **4**: Mostly accurate; one color choice slightly emphasizes a desired direction.
- **3**: Some bias; colors push toward certain choices.
- **2**: Significant bias; colors strongly guide toward preferred outcome.
- **1**: Manipulative; colors designed to trick users.

**Examples**:
- ✓ GOOD: Approve, Hold, Review buttons all same size, same color weight (equal visual importance)
- ❌ BAD: Approve button is 2x larger, bright green; Hold button is tiny, grey

---

### Question 22.2: Visual Equality of Options
**What it measures**: When two or more options are equally valid, are they visually equal?

**Score: __/5**

**Guidance**:
- **5**: All valid options have equal visual weight. Emphasis only on invalid/harmful options.
- **4**: Mostly equal; one option slightly emphasized.
- **3**: Unequal; user might feel pressured to choose one over another.
- **2**: Significant inequality; one option clearly favored.
- **1**: One option dominates; others hidden or minimized.

**Examples**:
- ✓ GOOD: [Hold] [Review] [Approve] — Three equal buttons, user chooses freely
- ❌ BAD: [APPROVE (green, large)] [hold (grey, tiny)]

---

### Question 22.3: Recommendation Transparency
**What it measures**: When recommendations are shown, is the rationale explicit?

**Score: __/5**

**Guidance**:
- **5**: Every recommendation explicitly states its rationale. User knows why it's recommended.
- **4**: Most recommendations explained; one or two lack rationale.
- **3**: Some explanations; user sometimes unsure why recommendation exists.
- **2**: Few explanations; rationale mostly hidden.
- **1**: Recommendations shown with no explanation; appears arbitrary.

**Examples**:
- ✓ GOOD: "Recommended for speed (3-day avg. onboarding vs 12-day alternative)"
- ❌ BAD: "Recommended" (with no reason)

---

### Question 22.4: Reversibility Without Friction
**What it measures**: Can users undo consequential decisions easily?

**Score: __/5**

**Guidance**:
- **5**: Immediate undo available (< 30s); time-windowed review available; audit trail permanent.
- **4**: Undo available with minor friction (1–2 clicks); good recovery window.
- **3**: Undo possible but requires effort; limited recovery window.
- **2**: Undo is slow or requires permission; short recovery window.
- **1**: No undo; decision is permanent and irreversible.

**Examples**:
- ✓ GOOD: After approving, user sees [Undo this approval] link for 30 seconds; can review any past decision anytime
- ❌ BAD: Approval is final; no undo option

---

**Section 22 Total: __/20**

---

## Section 3: Phase 23 — The Living Grid

**Principle**: Layout is a system, not a decoration. The grid must be flexible enough to scale to new metrics without becoming chaotic, yet rigid enough that every user sees the same logical structure.

### Question 23.1: Golden Ratio Proportions
**What it measures**: Do layouts use consistent proportional relationships (e.g., 61.8% / 38.2%)?

**Score: __/5**

**Guidance**:
- **5**: Consistent golden-ratio proportions throughout (major sections, content/margin, primary/supporting).
- **4**: Mostly consistent; one or two sections use different proportions.
- **3**: Some proportions intentional; others arbitrary.
- **2**: Proportions mostly arbitrary; layout feels unbalanced.
- **1**: No proportional system; layout is chaotic.

**Examples**:
- ✓ GOOD: Content 61.8%, margin 38.2%; primary metric 61.8%, supporting 38.2%
- ❌ BAD: Sections at 70/30, 50/50, 60/40 with no underlying system

---

### Question 23.2: Breathing Room
**What it measures**: Is spacing between sections generous enough to provide visual rest?

**Score: __/5**

**Guidance**:
- **5**: Spacing is rhythmic and generous. Sections clearly separated. User can scan without feeling crowded.
- **4**: Good spacing; one or two areas could use more breathing room.
- **3**: Adequate spacing; some sections feel tight.
- **2**: Cramped; sections feel adjacent without separation.
- **1**: Claustrophobic; layout feels chaotic due to insufficient spacing.

**Examples**:
- ✓ GOOD: Vertical spacing = 26px minimum between sections (golden-ratio × 16px)
- ❌ BAD: Sections touching with 8px gap; layout feels cluttered

---

### Question 23.3: Scalability
**What it measures**: Can new metrics be added without breaking the layout?

**Score: __/5**

**Guidance**:
- **5**: New metrics integrate seamlessly. Layout expands predictably. No existing sections disrupted.
- **4**: New metrics fit well; might require minor spacing adjustments.
- **3**: New metrics possible but require significant restructuring.
- **2**: Adding metrics would break layout; redesign needed.
- **1**: Layout inflexible; new metrics require completely new design.

**Examples**:
- ✓ GOOD: Adding "Customer Satisfaction" as 4th metric expands grid gracefully; all 4 at 61.8% weight
- ❌ BAD: Adding new metric breaks 3-column layout; existing sections get squeezed

---

### Question 23.4: Responsive Consistency
**What it measures**: Do proportions and hierarchy remain consistent across mobile, tablet, and desktop?

**Score: __/5**

**Guidance**:
- **5**: Proportions scale fluidly. Hierarchy unchanged. Visual relationships preserved at all sizes.
- **4**: Mostly consistent; one or two responsive changes necessary.
- **3**: Some breakpoint-based changes; general structure preserved.
- **2**: Significant redesigns at different breakpoints; hierarchy sometimes changes.
- **1**: Completely different layouts at different sizes; relationships not preserved.

**Examples**:
- ✓ GOOD: Metric width stays 61.8% of container at all breakpoints; spacing scales proportionally
- ❌ BAD: Desktop is 3-column, tablet is 2-column, mobile is 1-column with different hierarchy each time

---

**Section 23 Total: __/20**

---

## Section 4: Phase 24 — Interaction Charter

**Principle**: Every interaction has a contract: intent → action → feedback → result. Users should predict what will happen before they act, and the system should confirm their prediction.

### Question 24.1: Intent Clarity
**What it measures**: Before acting, does the user understand what will happen?

**Score: __/5**

**Guidance**:
- **5**: Intent is crystal clear. Button label + tooltip/description + preview of result. User is confident.
- **4**: Intent is mostly clear; minor ambiguity possible.
- **3**: Intent is somewhat clear; user might guess wrong.
- **2**: Intent unclear; user unsure what will happen.
- **1**: Intent completely hidden; user is guessing.

**Examples**:
- ✓ GOOD: "Approve Revenue $2.3M. This triggers policy validation and records the decision. You can review anytime but cannot undo the ledger entry."
- ❌ BAD: "Submit"

---

### Question 24.2: Action Acknowledgment
**What it measures**: Does the system immediately acknowledge when user acts?

**Score: __/5**

**Guidance**:
- **5**: Immediate feedback within 100ms (visual change, loading state, etc.). User knows action was received.
- **4**: Feedback within 300–500ms; clear and obvious.
- **3**: Feedback after 500ms–1s; somewhat obvious.
- **2**: Feedback after 1–3s; user might think action failed.
- **1**: No feedback; user unsure if action was received.

**Examples**:
- ✓ GOOD: User clicks "Approve" → button changes to "Approving..." [spinner] within 50ms
- ❌ BAD: User clicks "Approve" → nothing happens for 2 seconds

---

### Question 24.3: Feedback and Result Clarity
**What it measures**: After action completes, does the system clearly show the result?

**Score: __/5**

**Guidance**:
- **5**: Result is explicit and detailed. Decision shown, policy mentioned, evidence visible, proof ID provided.
- **4**: Result mostly clear; one element missing.
- **3**: Result apparent but requires interpretation; user might miss details.
- **2**: Result vague; user unsure what happened.
- **1**: Result completely unclear; user doesn't know if action succeeded.

**Examples**:
- ✓ GOOD: "✓ Approved by policy-v2.3.1 | Decision ID: exec-7f3a9c2b | Timestamp: 2026-07-25 14:32"
- ❌ BAD: "✓ Done"

---

### Question 24.4: Error Handling
**What it measures**: When errors occur, are they explained with actionable next steps?

**Score: __/5**

**Guidance**:
- **5**: Errors specify what went wrong, why, and clear next steps. Blame system/policy, not user.
- **4**: Errors mostly clear; one element missing (e.g., no next-step suggestions).
- **3**: Errors explained but could be clearer; generic next steps.
- **2**: Errors vague; user unsure what happened or how to fix it.
- **1**: Errors cryptic or blame user (e.g., "Invalid input").

**Examples**:
- ✓ GOOD: "✗ Revenue $3M exceeds policy limit of $2M. Request director approval or reduce amount. [Contact director] [Edit amount]"
- ❌ BAD: "✗ Error 400"

---

**Section 24 Total: __/20**

---

## Section 5: Phases 25–28 — Integrated Assessment

**These phases overlap and reinforce each other. Rather than separate questions, evaluate holistically.**

### Question 25–28.1: Consistency Across Principles
**What it measures**: Do phases 21–27 work together without conflict? Does Phase 28 (North Star) resolve any conflicts?

**Score: __/5**

**Guidance**:
- **5**: All phases aligned. No conflicts. North Star principle (trust through clarity) is evident.
- **4**: Mostly aligned; minor conflicts resolved.
- **3**: Some conflicts; unclear which phase takes priority.
- **2**: Significant conflicts; unclear resolution.
- **1**: Phases contradict each other; design fails multiple principles.

**Examples**:
- ✓ GOOD: Tone (Phase 25) supports clarity (Phase 21). Spacing (Phase 23) supports focus (Phase 27). All unified by North Star.
- ❌ BAD: Design is beautiful (Phase 22) but hides information (Phase 21). Conflicts unresolved.

---

### Question 25–28.2: Evolution Without Confusion
**What it measures**: If this is an update or addition, does it expand coherently or create fragmentation?

**Score: __/5**

**Guidance**:
- **5**: Change integrates harmoniously. Existing users unsurprised. New users easily onboard. Old version deprecated clearly.
- **4**: Change mostly coherent; might require minor documentation or transition.
- **3**: Change works but requires some learning/adjustment.
- **2**: Change is disruptive; existing patterns broken or confused with new ones.
- **1**: Change fragments the system; users lost.

**Examples**:
- ✓ GOOD: New metric "Customer Satisfaction" added as 4th section alongside Revenue, Sales, Performance. Same design pattern. Clear changelog. Users adopt naturally.
- ❌ BAD: New metric appears in 3 different places with different designs. Users confused.

---

### Question 25–28.3: North Star Alignment
**What it measures**: Does this design pass the North Star test: Does it build trust through clarity?

**Score: __/5**

**Guidance**:
- **5**: Clearly builds trust and clarity. Would explain this design decision to stakeholders immediately.
- **4**: Mostly aligned; minor clarity or trust tradeoff.
- **3**: Partially aligned; some tradeoff acknowledged.
- **2**: Weakly aligned; significant tradeoff.
- **1**: Misaligned; fails North Star; should be redesigned.

**Examples**:
- ✓ GOOD: "This policy-version label builds trust (proves policy applied) and clarity (users can trace decisions). Aligned with North Star."
- ❌ BAD: "We removed error messages to simplify the UI. This reduces clarity; contradicts North Star."

---

### Question 25–28.4: User Benefit Clarity
**What it measures**: Is the user-facing benefit obvious? Can you explain in one sentence why users will prefer this design?

**Score: __/5**

**Guidance**:
- **5**: Benefit is crystal clear and compelling. Users will immediately understand why this is better.
- **4**: Benefit is clear; users might need 30 seconds to appreciate it.
- **3**: Benefit exists but isn't obvious; explanation required.
- **2**: Benefit unclear; users might wonder why this change was made.
- **1**: No clear user benefit; change appears arbitrary.

**Examples**:
- ✓ GOOD: "Users can now see policy version on every decision, so they can verify and trust that the right rules were applied."
- ❌ BAD: "We refactored the button component to use new CSS framework."

---

**Section 25–28 Total: __/20**

---

## Compliance Score Summary

**Calculate total**:

```
Section 1 (Phase 21):       __/20
Section 2 (Phase 22):       __/20
Section 3 (Phase 23):       __/20
Section 4 (Phase 24):       __/20
Section 5 (Phases 25–28):   __/20
────────────────────────────────
TOTAL COMPLIANCE SCORE:     __/100

Normalized (out of 60):     __/60
```

**Interpretation**:
- **48–60 (Green)**: ✓ PROCEED WITH CONFIDENCE
  - Design is compliant with Design Constitution
  - Ready for implementation
  - Document decision and proceed

- **36–47 (Yellow)**: ⚠ PROCEED WITH CAUTION
  - Design is mostly compliant; some refinement recommended
  - Document tradeoffs explicitly
  - Get team review before launch
  - Plan post-launch monitoring for user feedback

- **24–35 (Red)**: ✗ REVISE OR REJECT
  - Design has significant issues
  - Return to design phase
  - Re-evaluate against failing sections
  - Resubmit after revision

- **< 24 (Critical)**: 🛑 STOP
  - Design fundamentally misaligned with constitution
  - Significant redesign required
  - Do not proceed without major changes
  - Consult design lead and product team

---

## How to Document Your Review

**For every design review, record**:

```markdown
# Design Review: [Feature/Change Name]

**Date**: 2026-07-25
**Reviewer(s)**: [Names]
**Design**: [Link to mockup/spec]

## Compliance Score

Section 1 (Truth Before Beauty):     [__/20]
Section 2 (Visual Ethics):           [__/20]
Section 3 (Living Grid):             [__/20]
Section 4 (Interaction Charter):     [__/20]
Sections 5 (Integrated):             [__/20]

**Total: __/100 (__/60 normalized)**

## Status
- [ ] Green (48–60): APPROVED
- [ ] Yellow (36–47): APPROVED WITH CONDITIONS
- [ ] Red (24–35): REJECTED, REDESIGN REQUIRED
- [ ] Critical (< 24): STOP, MAJOR REDESIGN NEEDED

## Tradeoffs & Notes
[If Yellow or above: document any tradeoffs; if Red or Critical: document blocking issues]

## Next Steps
[What happens next: launch, revision, monitoring, etc.]
```

---

## Quick Reference: 8-Phase Checklist

Use this condensed checklist for rapid reviews:

- [ ] **Phase 21**: Evidence is transparent (policy, reasoning, ID shown)
- [ ] **Phase 22**: Colors and emphasis reflect actual importance (not persuasion)
- [ ] **Phase 23**: Layout uses golden-ratio proportions; scalable for new metrics
- [ ] **Phase 24**: Intent clear, feedback immediate, errors explain next steps
- [ ] **Phase 25**: Tone and patterns are consistent; behavior reflects values
- [ ] **Phase 26**: Changes integrate coherently; old versions deprecated clearly
- [ ] **Phase 27**: Users can accomplish goals without unnecessary friction
- [ ] **Phase 28**: Design passes North Star test (builds trust through clarity)

**If all 8 are checked**: Design is Green (48–60). Proceed with confidence.

---

## Questions or Conflicts?

If a design conflicts with the Design Constitution, or if you're unsure how to score a section:

1. **Review the Phase documentation** in `design-constitution-complete.md`
2. **Review the Visual Exemplar** for that phase (PDFs in `docs/visual-exemplars/`)
3. **Apply the North Star test** (Phase 28): Does it build trust through clarity?
4. **Discuss with design lead** if still uncertain

Remember: The Design Constitution is a living document. Feedback on this checklist or the principles themselves is welcome. Document any decisions that intentionally deviate from the constitution—those deviations should be rare and well-justified.

---

**Version**: 1.0  
**Status**: Implementation Ready  
**Alignment**: Design Constitution v1.0  
**Last Updated**: 2026-07-25
