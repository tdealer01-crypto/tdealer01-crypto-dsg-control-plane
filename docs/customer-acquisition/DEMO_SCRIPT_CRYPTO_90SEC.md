# 90-Second Demo Script — Crypto Variant

**Duration:** 90 seconds (record as video)  
**Platform:** Loom, YouTube, or embedded  
**Use:** LinkedIn DMs, cold email, landing page

---

## Video Setup

**Recording environment:**
- Screen capture: Browser with DSG demo environment
- Audio: Clear microphone, quiet background
- Format: MP4, 1920x1080, 30fps
- Optional: Webcam in corner (builds trust)

**Slides/visuals to show:**
1. Problem statement (10 sec)
2. DSG solution (30 sec)
3. Live demo or animation (35 sec)
4. Call to action (15 sec)

---

## Script (90 seconds exactly)

### Slide 1: Problem (0-10 sec)

**Voiceover:**
```
"Your Solana staking platform distributes rewards every week.

Your auditor asks: 'Prove every distribution was approved.'

Today, you're scrambling through email chains and spreadsheets.

Tomorrow, your audit prep takes 1.5 hours instead of 10."
```

**Visuals:**
- Show spreadsheet chaos (no structure)
- Show email chain (approval hidden)
- Show clock: "10 hours per audit cycle"

---

### Slide 2: Solution (10-40 sec)

**Voiceover:**
```
"This is DSG ONE.

It's a control plane that gates fund movements before they execute.

Here's how it works:

Your system proposes: 'Approve 1,000 SOL staking distribution.'

DSG gate evaluates your policy:
- 'Amount > 500 SOL? Requires 1 approval.'
- 'Approved: Yes.'

Your team sees: Proposal + decision + proof.

They click: Approve.

Evidence logged: Cryptographic hash chain.

Result: Audit-ready proof in seconds."
```

**Visuals:**
- Show workflow diagram (4 steps)
- Show approval card UI
- Show policy rule: "500+ SOL = 1 approval"
- Show proof hash chain animation

---

### Slide 3: Live Demo or Animation (40-75 sec)

**Option A: Actual API demo (if live)**

```
[Show browser]

"Let me show you the live API.

Here's a fund movement approval request:
[Show POST /api/dsg/v1/gates/evaluate request in JSON]

Input:
- Amount: $50,000 SOL distribution
- Policy: 'Staking payouts > 10k SOL = 1 approval'
- Approver: treasury@example.com

DSG evaluates in 200 milliseconds.

Response:
[Show response JSON]
- Decision: ALLOW
- Reason: 'Policy rule 3 matched: amount approved'
- Proof: <hash_chain>
- Timestamp: 2026-07-25 17:15:31

Audit trail logged automatically.

No external solver needed. No latency."
```

**Option B: Animated walkthrough (if no live demo)**

```
[Show animation]

"Here's a staking protocol approving payouts.

Step 1: Treasury submits payment proposal (amount, recipient, reason)

Step 2: DSG gate evaluates against policy
        - Is amount approved?
        - Is approver authorized?
        - Any blockers?

Step 3: Decision returned with proof
        - Approved or Blocked
        - Reason and policy version
        - Cryptographic proof hash

Step 4: Audit trail captured
        - Who decided?
        - When?
        - Why (policy rule matched)?

Everything immutable. Auditor-ready."
```

**Visuals:**
- Show policy rules (if available)
- Show decision cards
- Show proof hash
- Show immutable audit trail

---

### Slide 4: Call to Action (75-90 sec)

**Voiceover:**
```
"This is DSG ONE.

Free tier: 10 decisions per month. No credit card.

Try it on your next staking distribution.

See 50 decisions logged. See what audit prep looks like.

Then decide: want to go live?

Two ways to get started:

Option 1: Try free
[Link: https://tdealer01-crypto-dsg-control-plane.vercel.app]

Option 2: Talk to us
[Link: https://cal.com/dsg-one/demo]

Questions? Reply to this message.

Let's make fund movement governance simple."
```

**Visuals:**
- Show product logo
- Show pricing tiers (Free, Pro, Business)
- Show CTA buttons (Try Free, Book Demo)
- Show logo + website URL
- Fade out with contact info

---

## Timing Breakdown

| Section | Duration | Start | End |
|---------|----------|-------|-----|
| Problem | 10 sec | 0 | 10 |
| Solution | 30 sec | 10 | 40 |
| Demo/Animation | 35 sec | 40 | 75 |
| CTA | 15 sec | 75 | 90 |

---

## Variant 1: Short (60 seconds)

If you need a shorter version for LinkedIn feed ads:

```
"Your crypto platform distributes fund movements every week.
But when auditors ask for proof, you're scrambling for hours.

DSG ONE solves this.

It gates fund approvals BEFORE execution.
Logs proof automatically.
Audit prep drops 80%.

Free tier: try on your next distribution.

[Try free] [Book demo]"
```

---

## Variant 2: Long (2-3 minutes)

If you have more time for a deeper walkthrough:

```
[Problem - 30 sec]
- Show their current process (manual, error-prone)
- Show audit pressure (regulatory, customer questions)
- Show ROI gap (10 hours per cycle = $5K+ waste)

[Solution - 45 sec]
- Show DSG ONE architecture (gate before execution)
- Explain 4 pillars: policy, approval, proof, audit trail
- Show it's deterministic (no external solver, fast)

[Demo - 60 sec]
- Live API call (or animated walkthrough)
- Show decision, proof hash, audit trail
- Show integration points (Stripe, Solana, OpenAI)

[Social proof - 30 sec]
- 3 customer logos using DSG ONE
- Quote: "Audit prep 80% faster" — [Customer name]
- Stats: "50K+ decisions logged" or similar

[CTA - 15 sec]
- Free tier signup
- Book demo
- Contact info
```

---

## Recording Checklist

Before you hit record:

- [ ] Browser zoomed to 150% (text visible on screen)
- [ ] Microphone tested (no background noise)
- [ ] Lighting good (no glare on monitor)
- [ ] Internet stable (no lag on demo)
- [ ] Tab titles relevant (shows company name if possible)
- [ ] Slides or visuals ready
- [ ] API demo environment live (if showing live)
- [ ] Timer set to 90 seconds (rehearse 2-3 times)

---

## Post-Production

**After recording:**

1. **Edit**:
   - Trim silence (start/end)
   - Cut out mistakes (if any)
   - Add text overlays (key points, CTA)
   - Add music (optional, quiet background)

2. **Upload**:
   - YouTube (unlisted or public)
   - Loom (easy sharing, auto-captions)
   - Self-hosted (embed on landing page)

3. **Add captions**:
   - YouTube auto-captions (then review)
   - Loom auto-captions
   - Manual SRT file (for landing page)

4. **Add thumbnail** (if YouTube):
   - Text: "Fund Movement Approval — 90 seconds"
   - Color: Blue + white (DSG branding)
   - Include: Logo + key metric ("80% faster")

---

## Distribution Strategy

**Where to use this demo:**

| Channel | Format | Notes |
|---------|--------|-------|
| Cold email | Link to YouTube/Loom | "Watch 90-sec demo" in email body |
| LinkedIn DMs | Link to YouTube/Loom | First follow-up after DM |
| Landing page | Embedded video | Auto-play (muted) in hero section |
| Discovery call | Link to watch before call | "Watch this first, questions in the call" |
| Slack | Link + screenshot | In customer acquisition channel |
| Case studies | Embedded | After customer quote |

**Expected engagement:**
- Email link: 20-30% click rate
- YouTube: 2-3 min avg watch time (goal: finish 80%+)
- Landing page: 1-2 min avg watch time

---

## Performance Metrics

Track:
- View count
- Completion rate (% who watch to end)
- Click-through rate (CTA clicks)
- Email opens (if linked in email)
- Conversion rate (watch demo → book call)

**Target:**
- Completion rate: 70%+ (if good, people finish it)
- CTR: 10%+ (of viewers click CTA)
- Demo → booking rate: 15%+ (of email recipients who watch)

---

## A/B Test Ideas

**If completion rate is low (<60%):**
- Make problem statement more urgent
- Shorten demo/animation section
- Add subtitles (easier to follow)
- Increase music/visual interest

**If CTR is low (<5%):**
- Clearer CTA (bigger text, more obvious)
- Add urgency ("Limited spots available")
- Show social proof earlier (customer logos)
- Add alternative CTA ("Book demo" + "Try free")

---

## Approval Checklist

Before sharing widely:
- [ ] All info accurate (no exaggeration)
- [ ] No confidential customer data (anonymize if needed)
- [ ] Complies with advertising guidelines
- [ ] Audio clear and professional
- [ ] Captions accurate
- [ ] Links all working
- [ ] Mobile-optimized (preview on phone)
- [ ] Legal review (if showing customer data)

---

## Example Visuals (Create in Figma/Canva)

**Slide 1: Problem**
```
[Image: Confused person surrounded by spreadsheets + emails]
Text overlay: "10 hours per audit"
Subtext: "Scrambling for proof that your fund movements were approved"
```

**Slide 2: Solution**
```
[Diagram: Approval flow]
Proposal → Policy Evaluation → Approval Card → Proof Logged
Text: "DSG ONE: Gate Before Execution"
```

**Slide 3: Live Demo**
```
[Screenshot or animation of actual API/UI]
Highlight: Request → Decision → Proof Hash
Text: "200ms response. Immutable audit trail."
```

**Slide 4: CTA**
```
[Logo + pricing tiers]
"Free Tier: 10 decisions/month"
"Business: $199/mo"
Buttons: [Try Free] [Book Demo]
```

---

## Final Notes

- **Key message:** "Audit prep 80% faster. Proof automatic."
- **Pain point:** Auditors demand proof. You have to scramble.
- **Solution:** Gate before execution. Log proof automatically.
- **Social proof:** [Add customer names as they sign]
- **CTA:** Free trial, no risk.

**Last Updated:** 2026-07-25  
**Next:** Record on Day 2-3 of Week 1
