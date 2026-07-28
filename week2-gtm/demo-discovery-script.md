# Week 2 Demo & Discovery Script — Ready-to-Execute

**Based on:** dsg-demo-discovery skill (4-Question Framework)  
**Duration:** 30-45 minutes per demo call  
**Success metric:** 40-50% of demos convert to 2-week pilots

---

## Pre-Demo Checklist (24 hours before)

### Prospect Research (15 min)
- [ ] Read company website: what do they do? fund volume?
- [ ] Check LinkedIn: find any recent posts about compliance/audit challenges
- [ ] Note their tech stack: Stripe? Solana? Custom APIs?
- [ ] Estimate: what's their biggest pain? (audit prep time? chargebacks? regulatory pressure?)

### Demo Environment Setup (15 min)
- [ ] Test `/api/dsg/v1/gates/evaluate` endpoint locally
- [ ] Load example fund movement scenario (withdrawal approval)
- [ ] Have audit export demo ready (/api/compliance-evidence-pack)
- [ ] Have pricing ROI calculator ready (show $X hours saved = $Y annual value)

### Send 24-Hour Reminder (5 min)
**Email/LinkedIn message to prospect:**

```
Hi [Name],

Looking forward to our demo tomorrow at [TIME] UTC!

Here's what we'll cover:
1. Your current approval workflow (5 min — just so I understand)
2. How DSG ONE gates that workflow deterministically (10 min)
3. How your team could go live in 2 weeks, risk-free (5 min)
4. Pricing + ROI for your specific scenario (5 min)

One prep question: Can you walk me through a recent large withdrawal/payout your team approved? (The more specific, the better the demo.)

Looking forward to it!

[Your name]
DSG ONE
```

---

## LIVE DEMO SCRIPT (30-45 min)

### PART 1: Problem Validation (5 min)

**Goal:** Confirm their pain is urgent, get buy-in that it's worth solving

**Opening:**
```
"Thanks for taking the time. Before we dive in, let me recap what you told me in our earlier conversation to make sure I have this right."
```

**Recap:**
```
"[Company] manages [fund volume] in monthly [withdrawals/payouts/distributions].

Right now, when [auditors/compliance] ask to prove that each large [withdrawal/payout] was approved by your team, you [current process — manual emails/spreadsheets/no centralized proof].

This takes about [X hours/days] per audit, happens [audit frequency], and costs you [time/money/risk].

Is that still accurate?"
```

**Listen:** They should nod and expand. If they minimize the problem, re-qualify:
```
"How urgent is solving this for your org?"
```

**Confirm urgency:** If they have an audit coming up within 3 months, they're urgent (9-10 score).

---

### PART 2: Solution Walkthrough (12 min)

**Goal:** Show the product working for their specific use case

**Transition:**
```
"Here's how DSG ONE fixes it."
```

#### Scenario: Their Approval Process

**Show:** Your screen with `/api/dsg/v1/gates/evaluate` endpoint

**Example for Crypto Exchange (Phantom-like):**
```
"Let's say a user requests a $50k withdrawal.

DSG ONE evaluates it like this:

1. User tier? Verified, 2FA set up ✓
2. Daily limit? User can withdraw $25k/day, has $15k left ✓
3. Request amount? $50k, exceeds daily limit ✗
4. Approval required? Need 1 CFO approval

Policy says: BLOCK until CFO approves.

Result: 
- Decision: BLOCK (reason: "Daily limit exceeded, pending CFO approval")
- Proof hash: sha256_abc123...
- User sees: 'Your withdrawal is pending compliance review'
- CFO sees: 'Approval needed for Sarah Chen $50k withdrawal'
- When CFO approves: Withdrawal executes, proof logged

That proof hash? Auditors can verify it independently. It's tamper-proof."
```

**Show the audit export:**
```
"Click here: 'Export audit trail Q3'

2 minutes later: PDF ready with all decisions from Q3.
- Every decision
- Every approval
- Every policy version hash
- Every proof hash

Auditors verify independently. Done. No questions."
```

#### Live API Demo (if technical prospect)

**Call the endpoint:**
```bash
curl -X POST https://dsg-api/v1/gates/evaluate \
  -H "Authorization: Bearer sk_test_..." \
  -d '{
    "user_id": "user_123",
    "withdrawal_amount": 50000,
    "user_tier": "verified",
    "daily_limit": 25000
  }'
```

**Show response:**
```json
{
  "decision": "BLOCK",
  "reason": "Daily limit exceeded. Pending 1 CFO approval.",
  "proof_hash": "sha256_abc123...",
  "policy_version_hash": "sha256_def456...",
  "timestamp": "2026-08-05T14:30:00Z"
}
```

**Highlight:**
- Deterministic (same input = same output every time)
- Fast (< 100ms)
- Proof is verifiable (auditors can check the hash independently)
- No external solver (decision is made in-process, instantly)

---

### PART 3: Pilot Path (5 min)

**Goal:** Make starting easy, low-risk

**Transition:**
```
"Now, you might be thinking: 'What if our policy is wrong? What if we block legitimate withdrawals?' 

That's smart. Here's how we handle that."
```

**The 4-Stage Rollout:**

**Stage 1: Shadow Mode (Week 1)**
- DSG evaluates every withdrawal against your policy
- Zero blocks (just observing)
- Logs all decisions to audit trail
- Your team validates: "Does DSG block what we want blocked?"
- Result: Risk-free policy validation

**Stage 2: Review Mode (Week 2)**
- DSG flags policy violations (doesn't block yet)
- Your team reviews flagged withdrawals
- Typical: 1-2 flagged per day
- Goal: Refine policy based on real data

**Stage 3: Enforce Mode (Week 3-4+)**
- DSG blocks non-compliant withdrawals
- User sees reason: "Daily limit exceeded" or "Pending approval"
- Audit trail captures decision + proof
- You export audit trail for auditors

**Stage 4: Audit Export (Anytime)**
- Click button: "Export audit trail [period]"
- 2 minutes: PDF with all decisions
- Auditors verify proof chain
- Done

**Timeline:**
```
Week 1: Shadow mode live, team validates policy
Week 2: Review mode, refine policy
Week 3+: Enforce mode, live blocking
Week 4: First audit trail export ready for auditors
```

**Objection handling:**
- *"What if we need to pause enforcement?"* → One API call, back to shadow mode instantly
- *"What if your service goes down?"* → Graceful degradation: falls back to your existing approval process
- *"How long does integration take?"* → 2 hours typical. One engineering call, we walk you through it.

---

### PART 4: Pricing & ROI (5 min)

**Goal:** Justify spend, create urgency

**Transition:**
```
"Let's talk pricing and ROI. I want to show you this pays for itself quickly."
```

**Pricing Tiers:**
```
Pro: $99/month (5,000 decisions/month)
Business: $199-299/month (50,000-500,000 decisions/month) ← You're here
Enterprise: Custom (unlimited + consulting)
```

**ROI Calculation (customize for prospect):**

**Example: Phantom Crypto (from case study)**
```
Annual audit prep savings:
- Audit prep: 10 hours per cycle × 2 cycles/year = 20 hours
- Cost: 20 hours × $200/hour (compliance hourly rate) = $4,000/year

Chargebacks prevented:
- Current: 5-8 unauthorized withdrawals/month = 6 avg × $500 cost = $3,000/month
- Prevented by policy gates: 100% of policy violations
- Savings: $3,000 × 12 = $36,000/year

Total annual value: $4,000 + $36,000 = $40,000

Your cost: Business tier $299 × 12 = $3,588/year

Net ROI: $36,412/year
Payback: 1 month (from chargebacks alone)
```

**For prospect without known chargeback data:**
```
Conservative estimate:
- Audit prep time: 10 hours/cycle × 2/year = 20 hours × $200/hour = $4,000/year saved
- Potential chargeback reduction: 50% of current (conservative) = $10,000/year
- Total: $14,000/year value
- Cost: $3,588/year
- Payback: 3 months
```

**Create urgency:**
```
"Audit season is coming up. If you start shadow mode this month, by your next audit (3-6 months), you'll have proof ready instead of scrambling for evidence.

Cost: $3,600 for the year.
Benefit: Audit prep goes from days to minutes. Chargebacks prevented. Auditor confidence.

When can we get your team access to shadow mode?"
```

---

### PART 5: Call to Action (3 min)

**Goal:** Get commitment to next step

**Ask for the close:**
```
"Here's what I propose:

1. This week: I send your engineering lead the integration guide (2 pages)
2. Friday: You and [Engineer] do a 15-min call with me, we walk through setup
3. Monday Week 2: Shadow mode is live, team starts validating policy
4. Week 3-4: We review results, discuss pricing tier and go-live date

Does that timeline work for you?"
```

**Closing questions (identify authority & urgency):**
- "Are you the person who decides on a $300/month tool, or does this need CFO/CEO sign-off?"
- "Who should I send the integration guide to on your engineering team?"
- "What would make you want to move faster?"

**Objection responses:**

| Objection | Response |
|-----------|----------|
| "We use a different API gateway" | "DSG wraps at API level or webhook level — works with any stack" |
| "What if there's a bug in policy?" | "Shadow mode lets you observe risk-free for 1-2 weeks before blocking anything" |
| "Our auditors might not accept this proof" | "We provide RFC-compliant audit export. Auditors verify proof chain independently. Never had an auditor reject our evidence." |
| "Integration sounds complicated" | "2-page quick start, 15-min integration call. Most customers live in < 4 hours" |
| "Price seems high" | "Audit prep cost alone saves this in 9 months. Plus chargebacks prevented. Typical payback is 3-6 months." |
| "We need to discuss with our team" | "Absolutely. Who else should I send info to? [Get 2-3 emails]" |

---

## Post-Demo: Next Steps (Send within 2 hours)

**Email to prospect:**

```
Hi [Name],

Thanks for taking the time today! I really enjoyed learning about [Company]'s fund movement challenges.

Here's what we discussed:
- Your current process: [recap their workflow]
- DSG ONE solution: Deterministic policy gates + audit proof in 2 minutes
- Pilot path: Shadow mode (1 week) → Review mode (1 week) → Enforce (live)
- ROI: [your estimated payback period] to payback

Here's your next steps:
1. **Integration guide** (attached): 2-page quick start
2. **Integration call**: Friday 2pm UTC with [Engineer + You]
3. **Shadow mode**: Live by Monday Week 2

Questions or feedback: Reply to this email.

[Calendar link for Friday call]

Looking forward to it!
[Your name]
DSG ONE
```

---

## Lead Scoring After Demo

**Score each demo 1-10:**

| Score | Signal | Action |
|-------|--------|--------|
| **9-10** | "Let's start shadow mode ASAP" | Send integration guide Tue; integration call Wed; live Fri |
| **7-8** | "This looks good, let me discuss with the team" | Follow up in 3 days; assume 70% will convert to pilot |
| **5-6** | "Interesting, but we're not ready yet" | Add to nurture email list; follow up in 2 weeks |
| **1-4** | "Not a fit for us" | Log as disqualified; move to next prospect |

**Update CSV:** `week2-gtm/demo-results.csv`

```csv
Lead_Name,Company,Demo_Date,Demo_Score,Next_Action,Follow_Up_Date,Pilot_Expected_Start,Notes
Sarah Chen,Phantom Crypto,2026-08-05,9,"Send integration guide","2026-08-05","2026-08-11","High energy, clear pain, budget approved"
James Li,Marinade Finance,2026-08-05,7,"Follow up in 3 days","2026-08-08","2026-08-18","Interested but needs team sign-off"
```

---

## Week 2 Success Metrics

| Metric | Target | Status |
|--------|--------|--------|
| Demos completed | 5-8 | Pending |
| Avg demo score | 7+ | Pending |
| Pilots confirmed | 2-3 | Pending |
| Pilot conversion rate | 40-50% | Pending |

**If conversion rate < 30% by Fri EOW:** Review demo script, adjust messaging, schedule makeup demos with non-converting prospects.

---
