# DSG ONE GTM Execution Toolkit
## Complete Infrastructure for 4-Week $5-10K MRR Plan

---

## 📦 What You Have

### 1. **MCP Server** (Centralized Pipeline Management)
**File**: `/mcp/dsg-gtm-pipeline-server.ts`

Manages all GTM data in one place:
- Leads (source, status, follow-ups)
- Demo calls (scheduling, scoring, feedback)
- Pilots (launch, monitoring, metrics)
- Customers (tier, MRR, start date)
- Case studies (published, impact metrics)
- Weekly metrics (checkpoint tracking)

**Usage**: 
```bash
# Start the server
npm run mcp:gtm-pipeline
```

**Available Tools**:
- `add_lead` → Track new prospect
- `update_lead_status` → "new" → "contacted" → "qualified"
- `schedule_demo` → Book discovery call
- `complete_demo` → Score 1-10, capture feedback
- `launch_pilot` → Deploy to customer
- `update_pilot` → Log decisions, blocks, feedback
- `convert_to_customer` → Move pilot to paid
- `create_case_study` → Record customer impact
- `log_weekly_metrics` → Track checkpoint progress
- `check_contingency_triggers` → Activate fail-safes

**Data Persistence**: All data saved to `.gtm-data/pipeline.json`

---

### 2. **Four Custom Skills** (Operational Guidance)

#### **Skill 1: dsg-sales-outreach**
**When to use**: Week 1, daily during outreach blitz

Generates:
- LinkedIn messages (personalized, 15-20 per day)
- Cold email sequences (20 per day, staggered)
- Community posts (Solana Discord, DeFi Slack, Twitter)
- Follow-up templates
- Lead scoring guidance

**Invoke**: `/dsg-sales-outreach` when planning outreach campaigns

#### **Skill 2: dsg-demo-discovery**
**When to use**: Week 2, before/after each discovery call or demo

Provides:
- 4-Question Framework (proven discovery script)
- Live demo script (tailored for crypto/fintech)
- Call notes template
- Objection handlers
- Lead scoring matrix

**Invoke**: `/dsg-demo-discovery` before calling prospects or demoing

#### **Skill 3: dsg-case-study-builder**
**When to use**: Week 4, after best pilot completes

Guides:
- Customer interview (30 min structure, key questions)
- Story writing (template with impact metrics)
- LinkedIn post + thread generation
- Blog post adaptation
- Publishing workflow

**Invoke**: `/dsg-case-study-builder` when converting pilot to case study

#### **Skill 4: dsg-metrics-dashboard**
**When to use**: Daily (Week 1-2), EOW (Week 3-4)

Tracks:
- Weekly checkpoint metrics (leads, demos, pilots, customers)
- Contingency triggers (auto-activation when metrics miss)
- Revenue dashboards
- Velocity tracking

**Invoke**: `/dsg-metrics-dashboard` when logging weekly progress or checking if contingencies activate

---

### 3. **Stripe Billing Setup** (Revenue Automation)
**File**: `/config/stripe-setup.md`

Implements:
- **Pro tier**: $99/month (5,000 decisions/mo)
- **Business tier**: $199-299/month (50K-500K decisions/mo)
- **Enterprise**: Custom per deal
- Automatic invoicing (3 days before due)
- Webhook sync with MCP server
- Payment retry logic
- Customer self-service billing portal

**Execution**:
1. Create products in Stripe Dashboard
2. Test subscription flow
3. When customer signs → Create Stripe subscription + log to MCP
4. Automatic invoicing starts

---

## 🚀 WEEK-BY-WEEK EXECUTION

### **WEEK 1: Lead Generation Blitz**

**Daily routine**:
1. **Morning (30 min)**: Review `/mcp/dsg-gtm-pipeline-server.ts` leads
2. **Mid-morning (2 hrs)**: Use `/dsg-sales-outreach` skill to generate messages
3. **Afternoon (2 hrs)**: Execute LinkedIn, email, community outreach
4. **EOD (15 min)**: Log leads in MCP via `add_lead` tool
5. **EOW Friday (30 min)**: Use `/dsg-metrics-dashboard` to log weekly metrics

**Success checkpoint**:
- ✅ 20+ conversations started (check via `list_leads`)
- ✅ 5-8 demo calls scheduled
- ✅ MRR dashboard shows "Week 1 Green" (conversations on pace)

**If metrics miss** → `/dsg-metrics-dashboard` auto-flags contingency
- Expand target list (add 50+ more prospects)
- Switch messaging angle ("prevent chargebacks" instead of "compliance proof")
- Sponsor crypto Discord community

---

### **WEEK 2: Discovery Calls & Demos**

**Daily routine**:
1. **Morning (30 min)**: Review scheduled calls (MCP: `list_demos`)
2. **Before each call (15 min)**: Use `/dsg-demo-discovery` skill for 4-Question Framework
3. **During call (30-45 min)**: Follow discovery script + take notes
4. **After call (15 min)**: Score in MCP via `complete_demo` (1-10 scale)
5. **Before demo (30 min)**: Review live demo script from `/dsg-demo-discovery`
6. **During demo (30-45 min)**: Deliver crypto-focused demo
7. **EOW Friday (30 min)**: Log week 2 metrics + check contingency status

**Success checkpoint**:
- ✅ 5-8 discovery calls completed (avg score 7+)
- ✅ 3-5 live demos delivered (avg score 6.5+)
- ✅ 2-3 pilots ready to launch
- ✅ Dashboard shows "Week 2 on pace"

**If metrics miss** → Contingency auto-triggers
- Simplify demo (cut deep-dive, focus on ROI)
- Offer 30-day free trial instead of 2 weeks
- Pivot to DeFi/staking segment

---

### **WEEK 3: Pilot Launch & Monitoring**

**Daily routine**:
1. **Monday morning (1 hr)**: Launch 3-5 pilots via `launch_pilot` tool
   - Provide SDK, API docs, Slack channel
   - Start in shadow mode
2. **Daily (15 min)**: Check pilot progress via `list_pilots`
   - Monitor decisions logged
   - Any integration issues?
   - Send Slack update to customer
3. **2-3x per week (30 min)**: Update pilot metrics via `update_pilot`
   - Log decisions captured
   - Log blocked transactions
   - Customer feedback
4. **Parallel**: Start case study interviews (best-performing pilot)
5. **EOW Friday (30 min)**: Log week 3 metrics, flag ready-for-payment customers

**Success checkpoint**:
- ✅ 3-5 pilots live (decisions being logged)
- ✅ 50+ total decisions captured
- ✅ 1-2 ready to convert to paying customers
- ✅ Case study interview scheduled

**If metrics miss** → Contingency auto-triggers
- Root cause: Are pilots using DSG? Is policy blocking too much?
- Simplify policy (logging-only, no blocking)
- Assign engineer 20 hrs/week support to each pilot

---

### **WEEK 4: Case Study & Revenue**

**Daily routine**:
1. **Monday-Tuesday (1-2 hrs)**: Conduct case study interview via `/dsg-case-study-builder`
   - 30-min structured interview
   - Quantify impact (audit time saved, chargebacks prevented, decisions logged)
   - Get quote + permission to publish
2. **Wednesday (2 hrs)**: Write case study using template
   - Problem (before state)
   - Solution (DSG ONE how it works)
   - Result (quantified metrics)
   - Quote (customer testimonial)
3. **Parallel**: Schedule conversion calls
   - "Shadow mode showed us 50 decisions. Ready to move to paid?"
   - Send Stripe invoice or payment link
   - Collect payment method
4. **Thursday (30 min)**: Publish case study
   - Blog post
   - LinkedIn post + thread
   - Email to waitlist
5. **EOW Friday (30 min)**: Log week 4 metrics, celebrate revenue

**Success checkpoint**:
- ✅ 3-5 customers signed + paying
- ✅ $2-5K MRR achieved (on pace for $5-10K with spillover)
- ✅ 1-2 case studies published
- ✅ 20+ warm inbound leads from case study

**If metrics miss** → Contingency auto-triggers
- Founder/CEO 1-on-1 call with hesitant pilots
- Offer 30-day money-back guarantee
- Annual prepay discount (10% off)
- Reach out to 3 backup prospects immediately

---

## 🔗 TOOL INTEGRATION MAP

```
MCP Server (Pipeline Data)
    ↓ (Log events)
Weekly Metrics & Contingencies
    ↓ (Dashboard reports)
Skill: dsg-metrics-dashboard
    ↓ (When metrics miss)
Activate Contingency Actions
    ↓ (Use specific skill)
Skill: dsg-sales-outreach (if Week 1 low)
Skill: dsg-demo-discovery (if Week 2 low)
Skill: dsg-case-study-builder (if Week 4 low)
    ↓ (Execute recommendations)
Back to MCP Server
```

---

## 📊 DAILY WORKFLOWS

### **Week 1: Outreach Execution**

```
Morning Standup (10 min)
├─ Open MCP: Check leads from yesterday (`list_leads status=responded`)
├─ Review responses (% response rate tracking)
└─ Plan today's outreach

Outreach (2-3 hrs)
├─ Use `/dsg-sales-outreach` skill to generate 5-10 messages
├─ Send LinkedIn messages (personalized, 1 per hour)
├─ Send cold emails (staggered, 1-2 per hour)
├─ Post to 1-2 crypto communities (Slack/Discord)
├─ Follow up with non-responders from previous days

Logging (15 min)
├─ MCP: Add each outreach as lead via `add_lead`
├─ Note: channel (linkedin/email/community), source, pain point
└─ Track response rate in spreadsheet

EOW Summary (30 min)
└─ `/dsg-metrics-dashboard`: Log Week 1 metrics
   ├─ Conversations initiated: 22/20 ✅
   ├─ Demos scheduled: 6/5 ✅
   ├─ Response rate: 8.5% ✅
   └─ Free tier signups: 12/10 ✅
```

### **Week 2: Discovery & Demos**

```
Morning Prep (30 min per call)
├─ Open MCP: Get lead details (`list_leads status=qualified`)
├─ Review call at 10:00 AM with Sarah @ Phantom
├─ Use `/dsg-demo-discovery` to load 4-Question Framework
└─ Print notes template

Discovery Call (30-45 min)
├─ Ask Q1: "Walk me through current approval process"
├─ Ask Q2: "What happens when auditors ask for proof?"
├─ Ask Q3: "What's ROI of cutting audit prep 80%?"
├─ Ask Q4: "Do you use Stripe/Solana?"
└─ Score 1-10

Post-Call (15 min)
├─ Fill notes template
├─ MCP: Log via `complete_demo`
   ├─ company: "Phantom Crypto"
   ├─ score: 8/10
   ├─ nextStep: "pilot"
   └─ pilotReady: true
└─ Send follow-up: "Here's the integration guide, let's do 15-min tech call Friday"

Live Demo (30-45 min)
├─ Use `/dsg-demo-discovery` live demo script
├─ Show: API call → Decision → Audit export
├─ Walk through: Shadow → Review → Enforce mode
├─ Close: "Ready to start a 2-week pilot?"
├─ Get: Company email for invoice, technical contact
└─ Promise: "Integration guide + 15-min call tomorrow"

EOW Summary (30 min)
└─ `/dsg-metrics-dashboard`: Log Week 2 metrics
   ├─ Discovery calls: 7/8 ✅
   ├─ Demos delivered: 5/5 ✅
   ├─ Pilot conversions: 3/3 ✅
   └─ Dashboard status: "Week 2 Strong"
```

### **Week 3: Pilot Monitoring**

```
Monday Launch (1 hr total, 3-5 pilots)
├─ MCP: `launch_pilot` for each
│  ├─ Company: Phantom Crypto
│  ├─ Lead ID: [from mcp]
│  ├─ Start: 2024-08-12
│  ├─ End: 2024-08-26 (2 weeks)
│  └─ Initial mode: shadow
├─ Send customer: SDK, API docs, Slack channel invite
└─ Schedule 15-min integration call

Daily Check-in (10 min)
├─ Slack message to each pilot: "How's it going? Any questions?"
├─ Monitor API logs: Are decisions being logged?
├─ If < 1 decision logged: Do emergency integration call

EOW Pilot Review (30 min)
├─ MCP: `update_pilot` for each
│  ├─ Phantom: decisions=45, blocked=0, feedback="Going great"
│  ├─ Magic Eden: decisions=52, blocked=1, feedback="Policy needs tuning"
│  └─ [Others]: Log progress
├─ Identify 1-2 ready to convert
└─ Start case study interview with best performer

EOW Summary (30 min)
└─ `/dsg-metrics-dashboard`: Log Week 3 metrics
   ├─ Pilots live: 4/5 ✅
   ├─ Decisions captured: 127/50 ✅
   ├─ Ready for payment: 2/2 ✅
   └─ Dashboard status: "Week 3 Tracking"
```

### **Week 4: Revenue & Celebration**

```
Monday: Case Study Interview (1 hr)
├─ Use `/dsg-case-study-builder` interview guide
├─ Ask: "Before/after challenge, turning point, impact, quote"
├─ Capture: Metrics (audit time, chargebacks, decisions)
├─ Get: Permission to publish + LinkedIn share commitment

Wednesday: Write & Publish (2 hrs)
├─ Use `/dsg-case-study-builder` templates
├─ Write: 2-page case study
├─ Customer review: (30 min, they approve)
├─ Publish: Blog + LinkedIn post + thread
├─ Email: Send to waitlist with CTA

Thursday: Conversions (1 hr)
├─ MCP: `convert_to_customer` for each ready pilot
│  ├─ Company: Phantom Crypto
│  ├─ Tier: Business
│  ├─ MRR: 299
│  └─ Invoice email: [customer]
├─ Stripe: Create subscription (link to `/config/stripe-setup.md`)
├─ Send: Welcome email + billing portal link

Friday: Celebration & Planning (30 min)
├─ `/dsg-metrics-dashboard`: Log Week 4 metrics
│  ├─ Customers signed: 3/3 ✅
│  ├─ MRR: $2,097 ✅
│  ├─ Case studies: 1/1 ✅
│  └─ Warm inbound leads: 18 ✅
├─ Celebrate with team (Slack announcement)
└─ Plan Phase 2: 20+ more customers, $20K+ MRR target
```

---

## 🎯 CONTINGENCY QUICK-START

When `/dsg-metrics-dashboard` flags a contingency:

### **Week 1: Conversations < 10 by Wed EOD**

```bash
# ACTIVATE: Same-day (don't wait for EOW)
1. Expand prospect list: Add 50 from Crunchbase (30 min)
2. Message VCs: "Looking for crypto treasury intros" (20 min)
3. Sponsor Discord: $500 to reach 10k Solana devs (1 hr setup)
4. Switch angle: "Prevent chargebacks" vs "compliance proof" (30 min)

Check metrics Friday EOW: Did this get us to 15+ conversations?
```

### **Week 2: Demos < 3 by Wed EOD**

```bash
# ACTIVATE: Same-day
1. Simplify offer: "5-min intro call" vs "15-min demo"
2. Lower price: First pilot gets 50% off ($149 Business vs $299)
3. Direct outreach: Call 5 top prospects directly (vs email/LinkedIn)
4. Demo format: Cut to 15 min (just ROI + integration ease)

Check: Can you book 3 demos by Thursday EOD?
```

### **Week 3: Pilots < 50 decisions by Wed EOD**

```bash
# ACTIVATE: Same-day
1. Root cause: Which pilots aren't using? Why?
2. Simplify: Switch to logging-only (no blocking/enforcement)
3. Support: Assign engineer to each pilot 20 hrs/week
4. Extend: Give pilots 1 more week to reach 50 decisions

Check: Can pilots reach 50+ by Friday?
```

### **Week 4: Customers < 1 by Thu EOD**

```bash
# ACTIVATE: Same-day
1. Founder call: CEO joins 1-on-1 with hesitant pilots
2. Money-back: "30-day refund guarantee, no questions"
3. Annual prepay: "Commit 12 months, 10% discount"
4. Backup prospects: Call 3 non-converting pilots immediately

Check: Can you close at least 1 customer or book 2+ Week 5 demos?
```

---

## ✅ LAUNCH CHECKLIST

### **Before Week 1 Starts**

- [ ] MCP server tested locally (`npm run mcp:gtm-pipeline`)
- [ ] 4 skills loaded and tested
- [ ] Stripe products created (Pro, Business, Enterprise)
- [ ] 100-company prospect list built
- [ ] LinkedIn Sales Navigator access verified
- [ ] Email templates drafted
- [ ] Demo video (90 sec, crypto variant) recorded
- [ ] Slack #customers channel created
- [ ] CRM or spreadsheet ready for lead tracking
- [ ] Calendar booking link ready (Calendly or similar)

### **Before Week 2 Starts**

- [ ] 5-8 discovery calls confirmed on calendar
- [ ] Discovery call script printed/bookmarked
- [ ] Demo script tested internally
- [ ] Customer onboarding docs ready (SDK, API docs, Slack invite)

### **Before Week 3 Starts**

- [ ] 3-5 pilots ready to launch Monday
- [ ] Shadow mode confirmed working
- [ ] Pilot monitoring dashboards set up
- [ ] Case study interview questions prepared

### **Before Week 4 Starts**

- [ ] Best pilot identified for case study
- [ ] Case study interview booked
- [ ] Blog publishing access confirmed
- [ ] LinkedIn post draft templates ready
- [ ] Stripe subscription flow tested with real customer

---

## 📞 SUPPORT & TROUBLESHOOTING

### **MCP Server Issues**

```bash
# Server won't start
npm run mcp:gtm-pipeline
# If fails: Check Node version (need 18+), reinstall dependencies

# Data not saving
# Check: .gtm-data/pipeline.json exists and writable
ls -la .gtm-data/
```

### **Skill Questions**

Each skill has detailed guidance:
- `/dsg-sales-outreach` - Use for message generation
- `/dsg-demo-discovery` - Use before calls
- `/dsg-case-study-builder` - Use for case study workflow
- `/dsg-metrics-dashboard` - Use to check status & contingencies

### **Stripe Issues**

See `/config/stripe-setup.md` for:
- Product creation
- Subscription testing
- Webhook setup
- Invoice troubleshooting

### **Revenue Projection Questions**

Use `/dsg-metrics-dashboard` to run projections:
- Conservative case: 2.5K MRR
- On-pace case: 4.7K MRR
- Optimistic case: 7.5K MRR

---

## 🎓 SUCCESS STORIES TEMPLATE

Use this after first customer pays:

```markdown
# Case Study: [Customer Name]

## The Challenge
[Describe their before state in 2-3 sentences]

## The Solution
[How DSG ONE solved it in 2-3 sentences]

## The Results
[Quantified impact: time saved, risk prevented, revenue impact]

**Quote**: "[Customer testimonial]"

---

Read the full case study: [link]
Try DSG ONE free: [link to free tier]
```

---

## 🚀 PHASE 2 PLANNING (After Week 4)

Once you hit $5-10K MRR:

1. **Warm inbound**: Case studies + word-of-mouth drive inbound leads
2. **Expand outreach**: Broaden to broader fintech segment (vs. just crypto)
3. **Scale team**: Hire CSM + Sales rep to handle 50+ customers
4. **Expand features**: Customer requests drive product roadmap
5. **Enterprise GTM**: Start targeted outreach to $10B+ finance companies

---

## 📋 FINAL CHECKLIST

- [ ] Reviewed entire GTM_EXECUTION_TOOLKIT.md
- [ ] Confirmed all 4 skills installed and working
- [ ] MCP server running and tested
- [ ] Stripe products created
- [ ] Week 1 prospect list (100 companies) built
- [ ] First outreach message queued (send Monday)
- [ ] Shared toolkit with team
- [ ] Added weekly metric review to calendar

**Ready to launch Week 1 tomorrow morning?** → START OUTREACH BLITZ 🚀

