# DSG ONE Design Constitution
## The Complete System of Design Principles

**Version**: 1.0  
**Status**: Philosophy & Implementation Ready  
**Alignment**: Harmonic Integration  
**Last Updated**: 2026-07-25

---

## Introduction: Design as Governance

Design is not decoration. Design is a system of decisions that shapes behavior, enables trust, and determines whether a product feels like it's helping or controlling. The DSG ONE Design Constitution is a set of 8 integrated principles (Phases 21–28) that govern **every design decision** at the intersection of revenue, sales, and performance systems.

Unlike isolated style guides or design systems, this constitution is a **unified governance document**. Each phase depends on the others. Each principle reflects a commitment to orchestrated simplicity—systems working in harmony without friction, transparency without surveillance, and control that enhances rather than constrains.

---

## Phase 21: Truth Before Beauty
### Core Principle
**Beauty must serve clarity, not obscure it. Design choices are legitimate only when they make a system *more* transparent to its users.**

### Why It Matters

In systems where revenue, sales, and performance intersect, users make high-stakes decisions. A beautiful interface that hides complexity is a liability. A complex system explained with precision is trustworthy.

The philosophy of minimal governance depends on radical transparency. If users cannot see how revenue flows connect to sales channel decisions, or how performance metrics drive revenue targets, then "simplicity" is actually hidden bureaucracy.

Truth Before Beauty means:
- **Decisions over decoration**: Every color, line, spacing, and label must serve one purpose: helping the user understand what's happening.
- **Evidence over impression**: Show the data, the logic, the connections. Don't make users guess.
- **Clarity over polish**: A rough draft that shows the truth is better than a polished interface that obscures reality.

### How to Apply It

**1. Evidence Hierarchy**
Every interface that touches governed execution must surface:
- What decision is being made (execution intent, policy applied)
- Why that decision was reached (evidence, policy rule, approval status)
- What happens next (next step in flow, approval stage, audit trail)

Example: A revenue approval screen shows not just ✓ APPROVED, but:
```
APPROVED by policy-v2.3.1
├─ Revenue threshold: $50K < $1M (policy rule 7.2)
├─ Sales channel: Direct (whitelisted, zero-friction)
└─ Evidence chain: 3 citations, confidence 0.94
   └─ Last verified: 2026-07-25 14:32 UTC
```

**2. Transparent Relationships**
When revenue, sales, and performance are on the same screen, show how they're connected:
- Use spatial proximity, not just labels
- Show data flow direction (cause → effect)
- Explain why moving one metric affects another
- Never let an orphaned metric sit without context

Example: A dashboard showing revenue growth with sales channels visible should connect them:
```
Revenue (this quarter)
├─ Direct sales:        $450K (↑ 12% vs last quarter)
│  └─ Reason: New B2B onboarding (sales channel efficiency)
├─ Partner ecosystem:   $280K (↑ 5%)
│  └─ Reason: 3-week onboarding cycle delay
└─ Performance impact:  98.2% uptime (↑ 0.6%)
   └─ Reason: Infrastructure refresh completed Q2
```

**3. Fail-Safe Defaults**
When ambiguity exists, default toward more information, not less.
- Show the policy version that made a decision
- Include execution ID for audit tracing
- List evidence, even when confidence is high
- Expose the approval chain, not just the final decision

**4. Evidence-Ready Metadata**
Every governed action must carry metadata that makes it independently verifiable:
```
Execution ID: exec-7f3a9c2b
Query Hash: qry:d4e8f2c5
Response Hash: rsp:b1a9c3e6
Evidence Level: L2 (Integration-ready)
Timestamp: 2026-07-25T14:32:15Z
Policy Version: 2.3.1
```

This isn't hidden in logs—it's available to the user, auditor, or system that needs to verify this decision later.

### Anti-Patterns (What NOT to Do)

❌ **Hidden Complexity**: A clean interface with no way to see how decisions were made  
❌ **Aesthetic First**: Choosing a design direction because it "looks good" before proving it serves clarity  
❌ **Vague Status**: Showing only ✓ APPROVED without evidence, policy, or reasoning  
❌ **Disconnected Metrics**: Revenue, sales, and performance shown separately with no visible connection  
❌ **Lost Audit Trail**: Removing execution metadata to "simplify" the display  
❌ **Unexplained Policy**: A decision that says "blocked" without showing the policy rule that caused it  

### Relation to Harmonic Integration

Truth Before Beauty is the foundation of the Harmonic Integration philosophy. A conductor guides an orchestra with minimal gestures because every musician can see the score—the transparent rules are understood by all. If the orchestra had to guess what the conductor wanted, minimal gestures would fail immediately.

In DSG ONE, Truth Before Beauty means every system (revenue, sales, performance) can see the same policy score and evidence chain. That shared transparency enables the "minimal governance" that Harmonic Integration promises.

---

## Phase 22: Visual Ethics
### Core Principle
**Design choices must not manipulate, mislead, or disproportionately influence user behavior. Every visual choice is ethical or it's a liability.**

### Why It Matters

In systems where decisions drive revenue or performance, visual design choices have consequences. A color that emphasizes one metric over another influences behavior. A layout that prioritizes one approval path over another changes outcomes.

Visual Ethics means:
- **No manipulation**: Colors, sizes, and emphasis must be proportional to importance, not to desired outcome.
- **Equal treatment**: When two options are equally valid, they should be visually equal.
- **Bias awareness**: Every visual choice reflects assumptions about what users value. State those assumptions.
- **Reversible choice**: Users should be able to undo a visually-guided decision without friction.

### How to Apply It

**1. Color as Information, Not Persuasion**
Color palette in DSG ONE is Harmonic Integration standard:
- Deep Teal (#1a4d5c) — trust, flow, foundation
- Warm Gold (#b8860b) — growth, guidance, primary actions
- Soft Grey (#4a5568) — neutral, secondary, restraint
- Light Cream (#f5f1e8) — background, breathing room
- Accent Coral (#c17a6f) — connection, warning, secondary actions

Each color has a **semantic meaning**, not a persuasive intent:
- Warm Gold is used for "forward" actions, not to push users toward revenue goals
- Accent Coral is used for warnings or secondary connections, not to bias toward caution
- Deep Teal is used for trust/foundation, not to hide complexity

**Example of Ethical Color Use**:
```
APPROVED (Deep Teal) — Status: factual, trustworthy
PENDING REVIEW (Warm Gold) — Action needed: forward motion
BLOCKED (Accent Coral) — Alert: requires attention
SKIPPED (Soft Grey) — Neutral: conditional bypass
```

**2. Visual Hierarchy Without Bias**
When showing revenue, sales channels, and performance equally:
- Use the same size and visual weight
- If one is more important in context, add a subtle label ("Primary metric") not visual emphasis
- Group related metrics spatially, not by preference

**Example**: A dashboard with three equal zones:
```
┌─────────────────────────────────────────────┐
│ REVENUE        │ SALES CHANNELS │ PERFORMANCE │
│ $2.3M (↑ 8%)  │ 12 active      │ 98.2% up    │
└─────────────────────────────────────────────┘
```

All three sections are equal in size, color weight, and typography. The user can prioritize them based on their goals, not the designer's assumptions.

**3. Reversible Choices**
Any decision that looks visually prominent must be easily undoable:
- A large "Approve" button should have an equally accessible "Hold" or "Review" button
- A workflow that moves forward must allow stepping back without penalty
- A setting that looks "on" by default can be "off" by clicking once

**Example**: Approval flow with equal friction:
```
HOLD (Soft Grey button)  ·  REVIEW (Warm Gold button)  ·  APPROVE (Deep Teal button)
```

Not:
```
APPROVE (large, prominent)  vs  review (small, secondary)
```

**4. Consent and Explicitness**
When design guides a user toward a choice, make the guidance explicit:
- "Recommended for revenue efficiency" — if you're suggesting one path
- "Most common choice" — if you're showing statistical bias
- "Requires policy exception" — if there's friction for a reason

**Example**: A sales channel selection that states its assumption:
```
Select Sales Channel

( ) Direct Sales  ← Recommended for speed (avg. 3-day onboarding)
( ) Partner Network  ← Recommended for scale (avg. 12 partners)
( ) Custom Ecosystem  ← Recommended for fit (requires 1:1 setup)
```

vs (unethical):
```
Select Sales Channel

(X) Direct Sales  ← Pre-selected with no explanation
( ) Partner Network
( ) Custom Ecosystem
```

### Anti-Patterns (What NOT to Do)

❌ **Color Manipulation**: Using Warm Gold to emphasize revenue over sales metrics to subtly push toward revenue-first thinking  
❌ **Hidden Defaults**: Pre-selecting options that serve business goals, not user goals  
❌ **Asymmetric Buttons**: "Approve" large and green, "Hold" small and grey  
❌ **Buried Alternatives**: Secondary options tucked into menus while primary options are prominent  
❌ **Unexplained Bias**: Showing a recommendation without stating why it's recommended  
❌ **Dark Patterns**: Making undo more friction than commit  

### Relation to Harmonic Integration

Visual Ethics is the moral foundation of Harmonic Integration. A conductor doesn't manipulate musicians through visual tricks—the conductor's gestures are honest signals. The score is read the same way by every player.

In DSG ONE, Visual Ethics means every user can trust that visual design reflects actual system state, not hidden business preferences. When revenue, sales, and performance appear on the same screen with equal visual weight, users know that no one metric is being artificially prioritized by design sleight-of-hand.

---

## Phase 23: The Living Grid
### Core Principle
**Layout is a system, not a decoration. The grid must be flexible enough to scale to new metrics without becoming chaotic, yet rigid enough that every user sees the same logical structure.**

### Why It Matters

DSG ONE integrates revenue, sales, and performance. Tomorrow, it might integrate five more dimensions. Without a living grid—a responsive, scalable layout system—each new metric breaks the composition.

The Living Grid is:
- **Golden-ratio proportions** (1.618) as the foundation
- **Spacious by default**, breathing room is structure, not accident
- **Hierarchical but flat**, no arbitrary nesting
- **Responsive without breakpoints**, graceful scaling from mobile to desktop
- **Sectional balance**, each major section (revenue, sales, performance) can grow independently

### How to Apply It

**1. Grid Foundation: Golden Ratio and Thirds**

The DSG ONE layout system is based on the golden ratio applied at every scale:

**Page Level**: 
- Content area: 61.8% of page width (golden ratio)
- Margin/breathing room: 38.2%
- This proportion feels balanced because it matches proportions found in nature and human perception

**Section Level** (Revenue, Sales, Performance):
- Primary metric: 61.8% of section space
- Supporting details: 38.2%
- Example: A revenue card shows the number prominently (61.8%), supporting trend/policy (38.2%)

**Vertical Rhythm**:
- Spacing between sections: base unit × 1.618 = breathing room
- Spacing within sections: base unit = tight information
- This creates visual rhythm—related items close, distinct sections breathe

**Example Layout**:
```
Page width: 100%
├─ Left margin: 19.1%
├─ Content: 61.8%
│  ├─ Revenue section (61.8% of content width)
│  │  ├─ Metric: 61.8%
│  │  └─ Details: 38.2%
│  ├─ [Spacer: golden-ratio-scaled]
│  ├─ Sales section (61.8% of content width)
│  │  ├─ Metric: 61.8%
│  │  └─ Details: 38.2%
│  ├─ [Spacer: golden-ratio-scaled]
│  └─ Performance section (61.8% of content width)
│     ├─ Metric: 61.8%
│     └─ Details: 38.2%
└─ Right margin: 19.1%
```

**2. Sectional Independence with Visual Connection**

Each major section (revenue, sales, performance) should be:
- **Self-contained**: Can display independently, has clear boundaries
- **Connected**: Subtle lines, shared color palette, or spacing indicate relationships
- **Scalable**: If a section grows to hold 5 metrics instead of 1, it should expand gracefully

**Example**: Three sections with visual connection:
```
┌────────────────────────────────────────────────────┐
│ REVENUE                                            │
│ $2.3M • 8% growth • Policy v2.3                    │
└────────────────────────────────────────────────────┘
        [Subtle connecting line in Soft Grey]
┌────────────────────────────────────────────────────┐
│ SALES CHANNELS                                     │
│ Direct: $1.2M | Partners: $800K | Ecosystem: $300K│
└────────────────────────────────────────────────────┘
        [Subtle connecting line in Soft Grey]
┌────────────────────────────────────────────────────┐
│ PERFORMANCE                                        │
│ 98.2% uptime • 140ms latency • 0 incidents        │
└────────────────────────────────────────────────────┘
```

**3. Responsive Scaling (No Breakpoints)**

The Living Grid uses **fluid proportions**, not discrete breakpoints:

- On mobile (360px): All sections stack vertically, each takes 100% width
- On tablet (768px): Two-column layout, sections reflow naturally
- On desktop (1440px): Three-column layout or single-column with horizontal sections

The key: proportions stay the same. A metric that was 61.8% of its section on desktop is still 61.8% on mobile—just the overall page width changed.

**Example**:
```css
/* No breakpoints at specific pixels. Instead: */
section {
  width: 100%;
  padding-left: calc(100vw * 0.191);   /* Golden ratio */
  padding-right: calc(100vw * 0.191);
  max-width: 1440px;                    /* Absolute limit on desktop */
}

metric {
  width: 61.8%;  /* Stays the same ratio regardless of device */
  flex-grow: 1;  /* Fills remaining space gracefully */
}
```

**4. Adding New Metrics Without Breaking Composition**

When a new metric (e.g., "Customer Satisfaction") needs to be added:

1. Determine its relationship: Is it primary or supporting?
2. If primary: Give it 61.8% of a new section
3. If supporting: Add it to an existing section at 38.2% weight
4. Maintain vertical rhythm: Use golden-ratio spacing between sections
5. Test at 3 breakpoints: mobile, tablet, desktop

**Example of Growth**:
```
Original (3 metrics):
├─ Revenue (61.8%)
├─ Sales (61.8%)
└─ Performance (61.8%)

Grows to (4 metrics):
├─ Revenue (61.8%)
├─ Sales (61.8%)
├─ Performance (61.8%)
└─ Customer Satisfaction (61.8%)  ← New section added, same proportions
```

### Anti-Patterns (What NOT to Do)

❌ **Arbitrary Breakpoints**: Completely redesigning at 768px, 1024px, etc.  
❌ **Inconsistent Rhythm**: Spacing that varies randomly between sections  
❌ **Golden Ratio Ignored**: Using grid systems that don't reflect natural proportions  
❌ **Cluttered by Addition**: Adding new metrics without clearing space first  
❌ **No Breathing Room**: Sections touching with no margin, no visual rest  
❌ **Hidden Relationships**: Metrics that are related but visually disconnected  

### Relation to Harmonic Integration

The Living Grid is the physical manifestation of Harmonic Integration. Just as a musical score is proportioned to be readable—with staff lines at precise intervals, rests that create rhythm—the Living Grid proportions DSG ONE so that revenue, sales, and performance exist in natural visual harmony.

When new metrics are added, they don't break the grid. They expand it. This is how the system scales without losing coherence—exactly the philosophy that systems can grow without losing their orchestrated simplicity.

---

## Phase 24: Interaction Charter
### Core Principle
**Every interaction has a contract: intent → action → feedback → result. Users should predict what will happen before they act, and the system should confirm their prediction.**

### Why It Matters

In governed systems, user expectations must match reality. When a user clicks "Approve," they expect a specific outcome. If the system does something different, trust erodes.

The Interaction Charter ensures that:
- **Intent is clear before interaction**: Users know what will happen if they click
- **Feedback is immediate**: The system acknowledges the action instantly
- **Results are predictable**: The outcome matches what the interface promised
- **Undo is available**: Users can reverse a decision without penalty

### How to Apply It

**1. The Interaction Contract**

Every interactive element (button, toggle, form, approval flow) must implement this four-part contract:

**Part 1: Intent Communication**
Before the user acts, the interface must answer:
- What will this action do?
- What changes will result?
- What can I not undo?

**Example** — Approval button:
```
[APPROVE] Revenue $2.3M for Q3

Intent label shows: "Approve this revenue target. 
This triggers policy validation and records the decision 
in the audit ledger. You can review the decision later 
but cannot undo the ledger entry."
```

**Part 2: Action Acknowledgment**
The moment the user acts, the system must respond:
- Action received ✓
- Processing started ◌
- Do not leave this page (if applicable)

**Example**:
```
User clicks APPROVE
System immediately shows: "Approving... [spinner]"
Not: Silent delay, then result appears
```

**Part 3: Feedback**
As the action completes, the system must explain what happened:
- Success or failure
- What changed
- Next step

**Example** — Success:
```
✓ Revenue approved
├─ Policy version: 2.3.1 applied
├─ Decision recorded: exec-7f3a9c2b
└─ Next: Sales channel notification queued

[View decision] [Undo review] [Next item]
```

**Example** — Failure:
```
✗ Approval blocked
├─ Policy rule 7.2: Revenue threshold exceeded
├─ Your approval: $2.3M
├─ Policy limit: $2M (requires director approval)
└─ Next: Request director review or reduce amount

[Contact director] [Edit amount] [Cancel]
```

**Part 4: Result Visibility**
After interaction, the user should see:
- The new state (decision approved, recorded, etc.)
- Proof (execution ID, timestamp, policy version)
- Recovery path if needed (undo, review, escalation)

**2. Predictable Patterns**

DSG ONE uses consistent interaction patterns across all governed actions:

**Approval workflows**:
```
HOLD  →  REVIEW  →  APPROVE
(Soft Grey) (Warm Gold) (Deep Teal)
```

All three buttons are always available. Clicking one shows immediate feedback:
```
Clicked HOLD:
"This decision is pending. You can review it anytime. 
It will not proceed until you click REVIEW or APPROVE."

Clicked REVIEW:
"Policy validation running... [spinner]
This checks authorization, quota, and policy rules."

Clicked APPROVE:
"✓ Approved by policy-v2.3.1
Decision ID: exec-7f3a9c2b
Timestamp: 2026-07-25 14:32:15Z"
```

**Metric updates** (revenue, sales, performance):
```
User sees: $2.3M (↑ 12% vs last quarter)
User clicks: ↑ arrow to see breakdown

System shows:
├─ Direct sales: ↑ $150K
├─ Partner ecosystem: ↑ $80K
├─ Performance improvement: ↑ $70K

[Return to overview] [Drill into Direct sales]
```

**3. Error Handling as Interaction**

Errors are interactions too. They must communicate:
- What went wrong (specific error)
- Why it went wrong (policy/system reason)
- How to fix it (concrete next step)

**Example** — Rate limit error:
```
✗ Too many requests
├─ You have sent 105 queries in the last 60 seconds
├─ Limit: 100 queries per minute
├─ Limit resets: 2026-07-25 14:35:12 UTC
└─ Options:
   [Wait until reset] 
   [Request quota increase] 
   [Spread requests over time]
```

Not:
```
✗ 429 Error
```

**4. Undo and Recovery**

After every consequential action, offer a reversible window:

**Immediate undo** (0–30 seconds):
```
✓ Decision approved
[Undo this approval] [Details]
```

**Time-windowed review** (30 seconds – 24 hours):
```
Your recent approvals from the last 24 hours:
├─ Revenue $2.3M — approved 2 hours ago [Review] [Revoke]
├─ Sales channel Direct — approved 45 min ago [Review] [Revoke]
└─ Performance target 98% — approved 10 min ago [Review] [Revoke]
```

**Audit trail access** (permanent):
```
All decisions (searchable by ID, date, policy version):
exec-7f3a9c2b | APPROVED | Revenue $2.3M | 2026-07-25 14:32 | Policy v2.3.1 [View]
exec-6e2a8b1c | REVIEWED | Sales Direct | 2026-07-25 13:15 | Policy v2.3.1 [View]
```

### Anti-Patterns (What NOT to Do)

❌ **Silent Actions**: User clicks a button and nothing happens for 3 seconds  
❌ **Ambiguous Intent**: "Submit" button with no context on what submits  
❌ **Delayed Feedback**: 10 seconds pass before user knows if action succeeded  
❌ **No Undo**: Consequential decision that can't be reversed  
❌ **Vague Errors**: "Error 500" with no explanation  
❌ **Surprise Results**: User clicks "Approve revenue" and the system approves something else  

### Relation to Harmonic Integration

The Interaction Charter is trust-building. A conductor doesn't trick the orchestra—every baton gesture means exactly what the musicians expect it to mean. Interactions in DSG ONE must have the same clarity.

When a user approves revenue, they need to know exactly what that approval does, how it's recorded, and how to reverse it if needed. This predictability is what allows minimal governance to work—users trust the system because the system has earned that trust through consistent, honest interaction design.

---

## Phase 25: Identity Beyond Logo
### Core Principle
**Identity is built through consistent patterns and behavior, not through graphic design. A system's identity is felt through how it responds, what it values, and how it treats users.**

### Why It Matters

DSG ONE doesn't have a logo on every page. It has an identity through:
- How decisions are explained (transparent, evidence-first)
- How errors are handled (blame the policy, not the user)
- How growth is supported (breathing room, not constraint)
- How metrics relate (harmonic balance, not dominance)

This identity is **stronger** than a logo because it shapes every interaction.

### How to Apply It

**1. Identity Through Tone**

Every text element in DSG ONE carries identity. Choose words that reflect values:

**Decision acknowledgment**:
```
NOT: "Approved"
INSTEAD: "Approved by policy-v2.3.1 | Decision recorded"

Reason: Shows that approval is policy-driven, not arbitrary
```

**Error message**:
```
NOT: "Invalid input"
INSTEAD: "Revenue $2.5M exceeds policy limit of $2M. 
Request director approval or reduce amount."

Reason: Explains policy, offers path forward
```

**Metric introduction**:
```
NOT: "Sales: $1.2M"
INSTEAD: "Sales across 3 channels: Direct $800K (67%) | 
Partner $300K (25%) | Ecosystem $100K (8%)"

Reason: Shows relationships, not just numbers
```

**Policy explanation**:
```
NOT: "Policy enforced"
INSTEAD: "Policy-v2.3.1 requires director approval for 
revenue over $2M. Your approval is pending director review."

Reason: Names the policy, explains why constraint exists
```

**2. Identity Through Patterns**

Consistent patterns signal identity. DSG ONE uses these recurring patterns:

**Pattern 1: Evidence Hierarchy**
Every decision shows: Decision → Policy → Evidence → Audit ID
```
✓ APPROVED
├─ Policy: revenue-approval-v2.3.1
├─ Rule: 6.2 (auto-approve if < $500K)
├─ Evidence: [3 citations, confidence 0.94]
└─ Exec ID: exec-7f3a9c2b | Timestamp: 2026-07-25 14:32
```

This pattern appears in:
- Approval screens
- Decision history
- Audit trails
- Error explanations

**Pattern 2: Relationship Visibility**
Revenue, sales, and performance always show connections:
```
Revenue $2.3M
├─ Driven by: Sales channels (Direct 67%, Partner 25%, Ecosystem 8%)
└─ Enabled by: Performance 98.2% uptime (↑ from 96% last quarter)
```

This pattern appears in:
- Dashboards
- Drill-down views
- Trend explanations
- Forecast models

**Pattern 3: Breathing Room**
Sections are always separated, never cramped:
```
Section A
[Vertical space = golden ratio × base unit]
Section B
[Vertical space = golden ratio × base unit]
Section C
```

This pattern appears in:
- Page layouts
- Card spacing
- List items
- Navigation

**3. Identity Through Behavior**

How the system behaves under stress, error, or growth reveals identity:

**Under quota stress**:
```
Your usage this month: 8,500 / 10,000 queries (85%)

At current rate, you'll hit limit in 3 days.
[Request increase] [Optimize usage] [See breakdown]
```

Identity message: "We give you visibility, help you plan, 
and don't surprise you with shutdowns."

**During errors**:
```
✗ Policy validation failed
├─ Reason: Sales channel 'experimental' not whitelisted
├─ Who decided: Policy v2.3.1, rule 4.1
├─ Next: Request whitelist exemption
└─ Questions? [Contact policy team] [View policy docs]
```

Identity message: "Policies exist for reasons. We explain 
those reasons. We help you work within them or change them."

**During growth**:
```
You added a new metric: "Customer Retention"

Where should it appear?
├─ Primary dashboard (with Revenue, Sales, Performance)
├─ Secondary view (with other outcome metrics)
└─ Custom view (build a custom dashboard)

[Preview in each location] [Make decision]
```

Identity message: "Systems can grow without becoming chaotic. 
We make space for what matters to you."

**4. Visual Identity Consistency**

While identity is primarily behavioral, visual consistency supports it:

**Color consistency** (Harmonic Integration palette):
- Deep Teal for trust/foundation → used in headers, primary text
- Warm Gold for growth/action → used in approvals, forward buttons
- Soft Grey for neutrality → used in secondary info, dividers
- Light Cream for space → background, breathing room
- Accent Coral for connection/warning → used in alerts, secondary connections

**Typography consistency**:
- Headlines: Bold, Deep Teal (28px max) — clear hierarchy
- Body text: Regular, Soft Grey (14px) — readable, restrained
- Labels: Oblique, Soft Grey (11px) — metadata, not decoration
- Evidence/code: Monospace, Deep Teal (11px) — precise, trustworthy

**Spacing consistency**:
- Between sections: golden-ratio × 16px = 26px minimum
- Within sections: 16px standard
- Between related items: 8px
- This creates rhythm: tight close relationships, generous section separation

### Anti-Patterns (What NOT to Do)

❌ **Logo Everywhere**: Assuming a graphic mark creates identity  
❌ **Inconsistent Tone**: Errors say "Invalid input", explanations say "The system is confused"  
❌ **Random Spacing**: Sections separated by 10px, 30px, 15px with no pattern  
❌ **Ignored Relationships**: Revenue, sales, performance shown independently with no connection  
❌ **Opaque Behavior**: Errors with no context, decisions with no evidence  
❌ **Color Randomness**: Warm Gold used for success, warnings, and navigation  

### Relation to Harmonic Integration

Identity Beyond Logo is about consistency in values, not graphics. A conductor doesn't wear a uniform—the conductor is recognized by the clarity and consistency of gesture. Musicians trust a conductor because the conductor's choices are predictable and honest.

In DSG ONE, identity is built through consistent patterns: evidence always follows the same hierarchy, relationships are always visible, errors always explain themselves. Users come to expect this consistency, and that consistency **is** the brand.

---

## Phase 26: Evolution Strategy
### Core Principle
**Systems must grow without losing their identity. Add new metrics, capabilities, and revenue streams without confusing users or breaking the governance model.**

### Why It Matters

DSG ONE today has Revenue, Sales, and Performance. Tomorrow, it might add:
- Customer satisfaction
- Support costs
- Risk metrics
- Market opportunity
- Competitive positioning

Without an evolution strategy, each addition breaks the composition. With one, the system grows and stays coherent.

### How to Apply It

**1. Metric Addition Protocol**

When a new metric is proposed:

**Step 1: Classify the metric**
- Is it primary (directly affects revenue/sales/performance)?
- Is it supporting (provides context)?
- Is it predictive (early signal)?
- Is it operational (internal only)?

**Step 2: Find its place in the harmonic structure**

If primary:
```
Current (3 sections):
├─ Revenue (61.8% weight)
├─ Sales (61.8% weight)
└─ Performance (61.8% weight)

Adding "Customer Satisfaction" as primary:
├─ Revenue (61.8% weight)
├─ Sales (61.8% weight)
├─ Performance (61.8% weight)
└─ Customer Satisfaction (61.8% weight)  ← New section, same weight
```

If supporting:
```
Current (Revenue section):
├─ Metric: $2.3M (61.8%)
└─ Details: ↑ 8%, policy v2.3.1 (38.2%)

Adding "Customer Acquisition Cost" as supporting:
├─ Metric: $2.3M (61.8%)
└─ Details: ↑ 8%, policy v2.3.1, CAC: $150/customer (38.2%)
```

**Step 3: Test for coherence**
- Does the new metric introduce new relationships?
- Can those relationships be shown visually without breaking the grid?
- Does the metric align with Harmonic Integration values (orchestrated, not controlled)?

**Step 4: Update documentation**
- Add the metric to the Design Constitution
- Update the Living Grid proportions if necessary
- Record the decision in the evolution log

**Example evolution log entry**:
```
Date: 2026-07-25
Metric: Customer Satisfaction
Classification: Primary outcome
Decision: Add as new section alongside Revenue, Sales, Performance
Rationale: Customer satisfaction drives long-term revenue; 
           should be visible equally with current metrics
Grid Impact: No changes (added 4th section at 61.8% weight)
Training: Updated onboarding docs; notified 8 teams
Feedback Loop: Review adoption after 2 weeks; adjust if needed
```

**2. Feature Addition Without Disruption**

When new features are added (e.g., a new approval workflow):

**Phase 1: Preview** (Week 1)
- Show the feature to power users
- Collect feedback
- Update documentation
- Do NOT change defaults for all users

**Phase 2: Opt-In** (Week 2-3)
- Feature available as opt-in choice
- Announce with clear benefits
- Include "how to go back to old version" instructions
- Collect more feedback

**Phase 3: Gradual Migration** (Week 4-6)
- Set new feature as default for new users
- Offer existing users one-click migration
- Maintain parallel support (old feature still works)
- Monitor adoption and issues

**Phase 4: Deprecation** (Week 7+)
- Set clear timeline for old feature removal
- Provide migration support
- Celebrate the upgrade path
- After deprecation, maintain in logs for audit trail only

**3. Capability Expansion Without Complexity**

When capabilities expand (e.g., new revenue streams, new sales channels):

**Principle**: New capabilities should feel like natural extensions, not added complexity.

**Example**: Adding "Marketplace Revenue" as a new sales channel

**Current state**:
```
Revenue $2.3M
├─ Direct: $1.6M
├─ Partner: $500K
└─ Ecosystem: $200K
```

**Adding marketplace**:
```
Revenue $2.3M (original data for comparison)
├─ Direct: $1.6M
├─ Partner: $500K
├─ Ecosystem: $200K
└─ [PLANNED] Marketplace: $0 (launching next month)

OR

Revenue $2.8M (updated, includes marketplace)
├─ Direct: $1.6M
├─ Partner: $500K
├─ Ecosystem: $200K
└─ Marketplace: $300K (new, onboarded 3 weeks ago)

[Show side-by-side] [Compare channels] [Drill into Marketplace]
```

The new channel is integrated into existing metrics, not bolted on.

**4. Policy Evolution**

As new metrics and capabilities are added, policies must evolve:

**Current policy** (v2.3.1):
```
Revenue approval:
├─ Auto-approve if < $500K
├─ Require director approval if $500K–$2M
└─ Require CEO approval if > $2M
```

**As marketplace revenue is added** (v2.4.0):
```
Revenue approval:
├─ Auto-approve if < $500K
├─ Require director approval if $500K–$2M
├─ Require CEO approval if > $2M
├─ [NEW] Marketplace revenue has different thresholds:
│  ├─ Auto-approve if < $100K (different dynamics, lower risk)
│  └─ Require director approval if > $100K
└─ Combined revenue limits apply:
   └─ All channels combined cannot exceed $5M/quarter
```

**Policy changelog** (visible to users):
```
Policy v2.4.0 (2026-07-25)
├─ Added marketplace revenue approval rules
├─ Lowered direct channel approval threshold to $500K
└─ [View what changed] [See old policy] [Appeal]

Policy v2.3.1 (2026-06-01)
├─ Original release
└─ [Archive]
```

### Anti-Patterns (What NOT to Do)

❌ **Silent Changes**: New metrics appear without explanation  
❌ **Breaking Disruptions**: Existing workflows stop working when new features launch  
❌ **Orphaned Features**: New capabilities that don't connect to existing systems  
❌ **Policy Whiplash**: Approval thresholds change without notice or appeal path  
❌ **Complexity Creep**: Each addition adds layers instead of integrating harmoniously  
❌ **Lost Audit Trail**: Old metrics removed instead of archived  

### Relation to Harmonic Integration

Evolution Strategy is the Harmonic Integration philosophy applied over time. A symphony doesn't break when a new instrument is added—the conductor adds it to the score in a way that maintains the harmonic relationship.

In DSG ONE, new metrics and capabilities must be added the same way: integrated into the existing harmonic structure, visible in the grid, governed by evolved policies. The system grows, but it doesn't lose its coherence.

---

## Phase 27: Ultimate Experience
### Core Principle
**The ultimate experience of DSG ONE is one where users feel empowered, not surveilled. They understand the rules, predict the outcomes, and trust the system.**

### Why It Matters

Beyond individual design choices or patterns, the complete DSG ONE experience should evoke:
1. **Understanding**: "I know how this system works"
2. **Trust**: "This system acts in my interest"
3. **Focus**: "I can accomplish my goal without distraction"
4. **Naturalness**: "This feels like it could happen in the real world"

### How to Apply It

**1. Understanding Experience**

A user should feel like they understand the system after a few core interactions.

**Onboarding** (First 5 minutes):
```
Welcome to DSG ONE

This system manages revenue, sales, and performance decisions 
with transparent policies. Here's how it works:

1. You propose a decision (revenue target, sales channel, etc.)
2. Policy checks the proposal against governance rules
3. If approved automatically, you're done
4. If review needed, it's assigned to the right person
5. You can see the entire decision history anytime

[Tour the system] [Let's start] [See example]
```

**First decision** (First interaction):
```
Propose Revenue Target: $2M for Q3

Policy checks:
├─ ✓ Within annual budget
├─ ✓ Aligns with sales capacity (12 channels, 5 sales reps)
└─ ✓ No conflicts with performance commitments

Result: ✓ APPROVED by policy-v2.3.1

What just happened:
├─ Your $2M target was checked against 3 policy rules
├─ All checks passed
├─ The decision is recorded and auditable
├─ You can reference it anytime as exec-7f3a9c2b

[Next step: Set sales channel targets] [View policy] [Done]
```

After these two interactions, a user should understand:
- How proposals flow through the system
- What happens when policies apply
- How to find decisions again
- Why certain constraints exist

**2. Trust Experience**

Users trust the system when it's consistently honest:

**Honesty in error**:
```
✗ Approval blocked
├─ Reason: Your revenue target $3M exceeds the quarterly limit of $2M
├─ Policy version: 2.3.1 (set on 2026-06-01)
├─ Who set this limit: Finance team
├─ Why: Last quarter's $2.5M target strained operations
└─ Options:
   [Request exception] 
   [Reduce target to $2M] 
   [Schedule call with Finance]
```

Not: "Authorization failed" with no context.

**Honesty in relationships**:
When revenue goes up, what happens?
```
Your Revenue Target: $2.3M (↑ from $2M last quarter)

Impact on Sales:
├─ Required: 12 additional customers
├─ Current channels can acquire: 8
└─ Gap: 4 customers (requires new partnership or channel)

Impact on Performance:
├─ Required uptime: 99.5% (vs current 98.2%)
├─ Required latency: < 100ms (vs current 140ms)
└─ Infrastructure upgrade planned for Q3 addresses this

[Confirm target] [Adjust target] [Discuss with teams]
```

This honesty builds trust—users see that revenue isn't arbitrary; it's connected to sales capacity and performance capability.

**3. Focus Experience**

Users should accomplish their goal without distraction:

**Goal: Approve a revenue target**
```
Step 1: Propose (30 seconds)
$2M Q3 revenue target
[Propose]

Step 2: Review policy check (10 seconds, automatic)
✓ Policy-v2.3.1 approves

Step 3: Confirm (5 seconds)
[Confirm and record]

Result: ✓ Recorded as exec-7f3a9c2b

Total time: < 1 minute
Unnecessary distractions: 0
```

Not:
```
Step 1: Fill out form (5 fields)
Step 2: Select approvers (pick from 20 people)
Step 3: Add notes (open-text field)
Step 4: Attach evidence files
Step 5: Wait for policy check (may take minutes)
Step 6: Wait for human approval (may take hours)
Step 7: Receive notification when approved

Total time: 10+ minutes
Friction: High
```

For high-stakes decisions (e.g., CEO approval needed), friction is appropriate. For routine decisions, minimizing friction shows respect for the user's time.

**4. Naturalness Experience**

The system should feel like how decisions naturally work in an organization.

**Real organization**:
```
Manager: "We should target $2.3M revenue this quarter"
Finance: "Let me check if that fits our constraints"
[Finance checks: budget, cash flow, tax implications]
Finance: "Yes, that works. We're aligned"
Manager: "Great, let's go with it. I'll communicate to the team"
[Manager records the decision]
[Team executes]
[Quarterly review: How did we do?]
```

**DSG ONE equivalent**:
```
User proposes: Revenue target $2.3M

System checks (Policy):
├─ Budget fits: ✓
├─ Cash flow OK: ✓
├─ Tax aligned: ✓

System responds: Approved by policy-v2.3.1

User confirms: Decision recorded (exec-7f3a9c2b)

[Notify teams] [Set sales targets] [Quarterly review]
```

The flow mirrors real organizational decision-making. It's not adding bureaucracy; it's automating the checks that thoughtful organizations do anyway.

### Anti-Patterns (What NOT to Do)

❌ **Mystifying Systems**: Users feel like they don't understand what's happening  
❌ **Inconsistent Honesty**: Sometimes transparent, sometimes hidden  
❌ **Unnecessary Friction**: Extra steps that don't add governance value  
❌ **Disconnected Relationships**: Decisions that feel like they're made in isolation  
❌ **Artificial Workflows**: Processes that don't match how real organizations work  

### Relation to Harmonic Integration

The Ultimate Experience is Harmonic Integration felt through the user's entire journey. The system feels orchestrated—things flow, decisions connect, relationships are visible—because every design choice from Phase 21 through Phase 26 has been intentionally aligned.

Users don't feel like they're using a control system. They feel like they're using a system that helps them understand and make good decisions.

---

## Phase 28: Design North Star
### Core Principle
**Unified principle: "Design for Trust Through Clarity." Every decision is measured against this single question: Does this choice make the system more trustworthy, more transparent, or more understandable?**

### Why It Matters

With 7 phases (21–27), it's possible to optimize for one principle at the expense of another. The Design North Star prevents that conflict.

A color choice (Phase 22) might look beautiful but reduce clarity (Phase 21). A feature addition (Phase 26) might be useful but create confusion (Phase 27). A workflow (Phase 24) might be intuitive for power users but alienate newcomers.

The Design North Star resolves these conflicts: **Always choose the path that builds trust through clarity.**

### How to Apply It

**1. Decision Tree: The North Star Test**

When facing a design decision, walk this tree:

```
Design decision to make:
├─ Does it increase clarity?
│  └─ Yes → Does it maintain or improve trust?
│     ├─ Yes → PROCEED ✓
│     └─ No → Revise to fix trust (phase 22, 24, 25)
├─ No → Does it reduce confusion?
│  └─ Yes → Does it maintain or improve trust?
│     ├─ Yes → PROCEED ✓
│     └─ No → Reject and try alternative
└─ No → Does it maintain existing clarity?
   └─ Yes → Does it maintain or improve trust?
      ├─ Yes → PROCEED ✓
      └─ No → Reject
```

**Example 1: Should we add a dark mode?**

```
Decision: Implement dark mode UI
├─ Does it increase clarity?
│  └─ No (information content stays same, just inverted colors)
├─ Does it reduce confusion?
│  └─ No (users are familiar with light theme)
└─ Does it maintain existing clarity?
   └─ Yes (dark mode preserves relationships and hierarchy)
   
Trust impact?
├─ Dark mode builds trust by respecting user preferences
├─ Accessibility improved for some users
└─ No trust cost
   
Decision: PROCEED ✓ (maintains clarity, improves trust)
```

**Example 2: Should we hide "policy version" metadata in approval screens?**

```
Decision: Remove "Policy v2.3.1" label from approval screen
├─ Does it increase clarity?
│  └─ No (removes information)
├─ Does it reduce confusion?
│  └─ Maybe (simpler UI, but at what cost?)
└─ Does it maintain existing clarity?
   └─ No (removes audit trail information)

Trust impact?
├─ Removing metadata reduces transparency
├─ Users can't verify which policy approved their decision
├─ Audit trail becomes weaker
└─ Trust significantly harmed

Decision: REJECT ✗ (fails clarity test, harms trust)
```

**2. Evaluation Rubric: Trust Through Clarity Score**

For each design decision, score these four dimensions:

```
Dimension 1: Clarity (0-5)
─ Does the user understand what this choice does? (5 = crystal clear)
─ Are relationships between elements obvious? (5 = yes)
─ Is the purpose of every element evident? (5 = yes)
─ Score: ___/15

Dimension 2: Trust (0-5)
─ Does this choice align with policies/values? (5 = perfectly)
─ Would I explain this choice to my team? (5 = immediately)
─ Does this build or harm user confidence? (5 = significantly builds)
─ Score: ___/15

Dimension 3: Consistency (0-5)
─ Does this align with patterns established in phases 21-27? (5 = perfectly)
─ Is this decision reversible if needed? (5 = easily undoable)
─ Does this avoid introducing new edge cases? (5 = clean)
─ Score: ___/15

Dimension 4: Naturalness (0-5)
─ Does this mirror how real organizations make decisions? (5 = mirrors perfectly)
─ Would a user predict this behavior before trying it? (5 = definitely)
─ Does this feel effortless after learning? (5 = yes)
─ Score: ___/15

─────────────────────────
TOTAL SCORE: ___/60

Green (48-60): Proceed with confidence
Yellow (36-47): Proceed with caution, document tradeoffs
Red (24-35): Revise or reject
Critical (< 24): Stop and rethink entirely
```

**Example evaluation: Should we change the "Approve" button color from Deep Teal to Warm Gold?**

```
Dimension 1: Clarity (current = Deep Teal)
─ Users recognize Deep Teal as "trust/foundation" (4/5)
─ Would Warm Gold be clearer? (3/5 — gold is "growth/action", also appropriate)
─ Current score: 4/5

Dimension 2: Trust
─ Does color change harm trust? (4/5 — no, both colors signal positive action)
─ Would users understand why we changed it? (2/5 — no announcement needed)
─ Trust impact: Neutral to slightly positive (4/5)

Dimension 3: Consistency
─ Does this align with phase 22 (Visual Ethics)? (5/5 — both colors are ethical)
─ Is it reversible? (5/5 — one line of CSS)
─ Does it introduce edge cases? (2/5 — yes, now "gold" is used for both growth and approvals)

Dimension 4: Naturalness
─ Real orgs use any positive color for approve buttons (5/5)
─ Would users predict this? (4/5)
─ Does it feel right? (3/5 — gold is richer, but deep teal is "proven")

─────────────────────────
TOTAL: (4+4+5+4) + (4+2+4) + (5+5+2) + (5+4+3)
     = 13/15 + 10/15 + 12/15 + 12/15
     = 47/60

Result: YELLOW (proceed with caution)
Recommendation: Test with 3 internal users first. If > 80% prefer gold, proceed. Otherwise, stay with teal.
```

**3. Decision Log: The North Star Record**

Every significant design decision should be logged:

```
Decision ID: DSG-2026-07-25-001
Date: 2026-07-25
Title: Approve button color (Deep Teal vs Warm Gold)
Context: User testing showed confusion between approval and action
Decision: Keep Deep Teal, add explainer text on first use
North Star Score: 47/60 (Yellow)
Rationale: Consistency with Phase 25 (Identity Beyond Logo) more important than novelty
Reversible: Yes (revert in 1 day if needed)
Feedback Loop: Survey 50 users in 2 weeks, revisit if > 30% preferred gold
Status: Implemented, monitoring
```

These logs become part of the Design Constitution living record.

**4. Conflict Resolution: When Principles Collide**

If Phase 22 (Visual Ethics) conflicts with Phase 23 (Living Grid):

```
Conflict: Visual Ethics says "equal visual weight to equal-importance metrics"
          Living Grid says "use golden ratio proportions (61.8% / 38.2%)"
          
Resolution via North Star: 
├─ North Star: Design for Trust Through Clarity
├─ Visual Ethics builds trust through honest design
├─ Living Grid builds clarity through proportional harmony
├─ Combined: Equal-importance metrics should be visually equal (ethics)
│           AND positioned in golden-ratio harmony (grid)
│           
Solution: Place metrics side-by-side with equal square footage,
          but arrange them using golden-ratio spacing between sections
          
This satisfies both principles:
├─ Visual Ethics: No metric dominates another
└─ Living Grid: Spacing maintains harmonic proportions
```

### Anti-Patterns (What NOT to Do)

❌ **Principle Conflicts Unresolved**: Choosing clarity over trust, or vice versa  
❌ **North Star Unapplied**: Making design decisions without checking them against clarity + trust  
❌ **Decision Logs Ignored**: Making the same tradeoff twice because the first decision wasn't documented  
❌ **Consistency Abandoned**: Ignoring phases 21-27 to pursue a new direction  
❌ **User Needs Forgotten**: Optimizing for internal preferences over user trust  

### Relation to Harmonic Integration

The Design North Star is the conductor's eye. Just as a master conductor looks at the entire orchestra and asks "Is this harmonious?", the Design North Star asks "Is this trustworthy and clear?"

Every decision—color, spacing, interaction, capability—must pass through this lens. That's how DSG ONE remains coherent as it grows, changes, and adapts. The North Star is the organizing principle that keeps everything in harmony.

---

## Appendix A: Design North Star Compliance Checklist

Use this checklist when evaluating a design decision, feature, or change:

### Phase 21: Truth Before Beauty
- [ ] Evidence hierarchy is explicit (decision, why, proof, ID)
- [ ] Relationships between revenue/sales/performance are visible
- [ ] No information is hidden to "simplify" the display
- [ ] Audit trail metadata is accessible to users
- [ ] Policy version and execution ID are shown

### Phase 22: Visual Ethics
- [ ] Color choices reflect semantic meaning, not persuasion
- [ ] Equal-importance items have equal visual weight
- [ ] Recommendations explicitly state their rationale
- [ ] User choices are reversible without friction
- [ ] No dark patterns or hidden manipulations

### Phase 23: The Living Grid
- [ ] Spacing uses golden-ratio proportions (1.618)
- [ ] Sections are visually separated (breathing room)
- [ ] New metrics can be added without breaking layout
- [ ] Mobile, tablet, and desktop views maintain proportions
- [ ] Hierarchy is clear without arbitrary nesting

### Phase 24: Interaction Charter
- [ ] Intent is clear before user acts
- [ ] Feedback is immediate (within 500ms)
- [ ] Results are predictable and match intent
- [ ] Undo/recovery path is available for consequential actions
- [ ] Errors explain what went wrong and how to fix it

### Phase 25: Identity Beyond Logo
- [ ] Tone is consistent across all text elements
- [ ] Patterns repeat (evidence hierarchy, relationship visibility, etc.)
- [ ] System behavior reveals values (honest errors, policy explanations, etc.)
- [ ] Visual identity supports behavioral identity
- [ ] No identity confusion (different sections don't feel disconnected)

### Phase 26: Evolution Strategy
- [ ] New metrics are classified (primary/supporting/predictive/operational)
- [ ] New features use phase-in approach (preview → opt-in → migration → deprecation)
- [ ] Related systems are updated when adding capabilities
- [ ] Policies evolve with metrics and capabilities
- [ ] Old versions are archived, not deleted

### Phase 27: Ultimate Experience
- [ ] Users understand the system after 2-3 core interactions
- [ ] Trust is built through consistent honesty
- [ ] Friction is minimized for routine decisions, preserved for critical ones
- [ ] Workflows mirror real organizational decision-making
- [ ] No artificial processes

### Phase 28: Design North Star
- [ ] Decision passes clarity + trust test
- [ ] Design scores > 36/60 on North Star rubric (yellow minimum)
- [ ] Decision is logged with rationale
- [ ] Principles 21-27 are not in conflict
- [ ] User benefit is clear

---

## Appendix B: Evolution Log (Living Record)

This section grows as DSG ONE evolves:

### 2026-07-25 – Design Constitution v1.0 Launch
- Status: Philosophy + Implementation Principles Ready
- Phases 21-28: Complete
- Next: Visual exemplars, implementation checklist, team training

---

## Conclusion: Governance as Composition

The Design Constitution is a commitment to orchestrated simplicity. It rejects the false choice between control and freedom. Instead, it proposes that **governance built on transparency, consistency, and honest interaction can be simultaneously powerful and minimal**.

Every principle (21-28) serves this purpose. Every decision made through the North Star (Phase 28) reinforces it.

The result is not a system that controls users. It's a system that users trust to be honest, predictable, and aligned with their interests.

This is Harmonic Integration in practice.

---

**Version**: 1.0  
**Status**: Philosophy-Complete, Implementation-Ready  
**Next Phase**: Visual Exemplars (8 diagrams) + Implementation Checklist  
**Authored**: 2026-07-25  
**Alignment**: Harmonic Integration Philosophy ✓
