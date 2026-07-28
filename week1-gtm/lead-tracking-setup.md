# Week 1 Lead Tracking & Real-Time Metrics Setup

## Overview

Track all Week 1 outreach responses, lead quality, and conversion progress in real-time. This guide sets up a simple CSV-based tracking system that feeds into metrics dashboards.

---

## Files to Track

### 1. `week1-leads-responses.csv` (Real-time tracking)

Create this file and update continuously as responses come in (Tue-Fri):

```csv
Lead_Name,Company,Contact,Title,Email,Outreach_Date,Outreach_Channel,Outreach_Message,Response_Received_Date,Response_Text,Response_Score,Next_Action,Demo_Scheduled,Demo_Date,Demo_Time_UTC,Status,Notes
Sarah Chen,Phantom Crypto,Sarah Chen,CFO,sarah@phantom.com,2026-07-29,LinkedIn,"Noticed Phantom at Series B managing $50M+ withdrawals...",2026-07-29,"Yes, let's do a demo","9","Schedule demo","YES","2026-08-05","2:00 PM","Confirmed","High-intent, compliance pain clear"
James Li,Marinade Finance,James Li,Operations,james@marinade.com,2026-07-29,Email,"Audit-ready withdrawal governance — Marinade Finance",2026-07-30,"Tell me more about pricing and integration","7","Send use-case guide","NO","","","Warm lead","Showed interest, evaluating budget"
```

**Update frequency:** After each response received (same-day if possible)

**Key columns:**
- `Outreach_Date`: When you sent the message
- `Response_Received_Date`: When you got a reply (same day or next day)
- `Response_Score`: 1-10 (9-10 = demo, 7-8 = warm, 5-6 = nurture, 1-4 = disqualify)
- `Demo_Scheduled`: YES/NO
- `Status`: Confirmed / Pending / Warm Lead / Nurture / Disqualified

**Files to save in `week1-gtm/`:**
- `week1-leads-responses.csv` (real-time, update as responses come)

---

### 2. `week1-daily-metrics.csv` (EOD summary)

Update each evening (5-6 PM UTC) with daily cumulative metrics:

```csv
Date,Day,Outreach_Sent_Today,Outreach_Sent_Total,Responses_Today,Responses_Total,Response_Rate_%,Demo_Calls_Booked_Today,Demo_Calls_Total,Free_Signups_Today,Free_Signups_Total,Top_Angle_Today,Engagement_Notes
2026-07-29,Tuesday,15,15,1,1,6.7%,1,1,2,2,"Compliance-Proof","LinkedIn performing well; Email slow start"
2026-07-30,Wednesday,22,37,2,3,8.1%,0,1,3,5,"Prevent-Chargebacks","Email responses increasing; Community posts live"
2026-07-31,Thursday,8,45,3,6,13.3%,2,3,4,9,"Audit-Ready Angle","Strong day; follow-ups working"
2026-08-01,Friday,5,50,2,8,16%,2,5,3,12,"Solana Integration","Final push successful"
```

**Update frequency:** Every day at 5-6 PM UTC (before bed or end of business)

**Key metrics tracked:**
- `Outreach_Sent_Total`: Cumulative (must reach 20+ by Fri)
- `Response_Rate_%`: (Responses Total / Outreach Sent Total) × 100
- `Demo_Calls_Total`: Cumulative (target 5-8 by Fri)
- `Top_Angle_Today`: Which messaging angle got best response rate today?
- `Engagement_Notes`: Quick observation (what worked, what didn't)

**File to save:** `week1-gtm/week1-daily-metrics.csv`

---

### 3. `week1-contingency-log.csv` (Contingency trigger tracking)

If any metric misses daily targets, log the contingency action taken:

```csv
Date,Metric_Missed,Target,Actual,Contingency_Triggered,Action_Taken,Result,Status
2026-07-30,Email_Response_Rate,3-5%,0%,"YES — Pivot angle","Switched to Prevent-Chargebacks angle, sent 5 more emails","2 responses by 5 PM","Resolved"
2026-07-31,Demo_Calls,1+,"0 on Wed","YES — Direct outreach","DMed top 10 warm leads with urgent message","2 demos booked Thu morning","Resolved"
```

**Update frequency:** Only when contingency is triggered (not needed every day)

**File to save:** `week1-gtm/week1-contingency-log.csv`

---

## Daily Execution Tracking

### Tuesday Evening (After first day outreach)

**Checklist:**
- [ ] Created `week1-leads-responses.csv`
- [ ] Added all leads from LinkedIn/Email outreach
- [ ] Entered all responses received
- [ ] Scored all responses (1-10)
- [ ] Created `week1-daily-metrics.csv` with Tuesday EOD numbers
- [ ] Noted top-performing message angle
- [ ] Checked if any contingency needed (outreach < 5, response rate < 2%)

**Example entry:**
```
Outreach sent: 15 (Target: 20+ by Fri, on pace ✓)
Responses: 1 (Response rate: 6.7%, Target: 3-8% ✓)
Demos: 1 (Target: 5-8 by Fri, on pace ✓)
Top angle: Compliance-Proof (40% response rate)
Contingency: None needed
```

### Wednesday Evening

**Checklist:**
- [ ] Updated `week1-leads-responses.csv` with Wed responses
- [ ] Updated `week1-daily-metrics.csv` with cumulative metrics
- [ ] Analyzed which channel performing best (LinkedIn vs Email vs Community)
- [ ] Noted response quality trend (average score rising/falling)
- [ ] Checked demo booking pace

**Metrics check:**
```
Outreach total: 37/20 ✅ (190% of pace)
Response rate: 8.1% ✅ (above 3-8% target)
Demos booked: 1/5 ⚠️ (Below pace, need 2 more by Fri)
Contingency: None needed yet, but monitor demo bookings
```

### Thursday Evening

**Checklist:**
- [ ] Updated `week1-leads-responses.csv` with Thu responses
- [ ] Updated `week1-daily-metrics.csv`
- [ ] Activated contingencies if needed (follow-ups to non-demo leads)
- [ ] Confirmed all scheduled demo dates/times
- [ ] Analyzed best messaging angle and best channel

**Critical check:**
```
Demos booked: 3/5 ✅ (on pace for 5-8 by Fri)
If demos < 3 at this point → Activate contingency
Action: Direct message top 10 warm leads (score 8-9)
Message: "Audit season is here. 15-min demo Fri or Mon?"
```

### Friday EOD

**Checklist:**
- [ ] Updated `week1-leads-responses.csv` with all final responses
- [ ] Updated `week1-daily-metrics.csv` with final EOW numbers
- [ ] Finalized demo schedule for Week 2 (all dates confirmed)
- [ ] Documented contingencies used and results
- [ ] Prepared handoff to Week 2 demo execution

**Final metrics report:**
```
WEEK 1 FINAL SUMMARY
====================
Outreach: 50/20+ ✅ (250% of target)
Response rate: 16% ✅ (exceeded 3-8%)
Demos booked: 5-8 ✅ (on target)
Free signups: 12/10+ ✅ (exceeded target)
Top angle: Solana Integration (25% response)
Best channel: LinkedIn (28% response rate)
Contingencies: 2 used (email pivot Wed, direct outreach Thu)

WEEK 2 READY
============
- 5-8 demo calls confirmed (dates/times locked)
- 3-5 top prospects for pilot phase
- Use-case guides queued for warm leads
- dsg-demo-discovery skill ready for live calls
```

---

## Quick Daily Check Template

Copy and fill this in each evening (5 min):

```
=== WEEK 1 GTM — DAILY CHECK ===
Date: [TODAY]
Day: [TUE/WED/THU/FRI]

OUTREACH SENT TODAY
LinkedIn: __ messages
Email: __ emails
Community: __ posts
Total today: __
Cumulative: __/20+ (TARGET)

RESPONSES RECEIVED TODAY
Count: __
Average score: __/10
Response rate today: __%
Cumulative rate: __%/target 3-8%

DEMOS BOOKED TODAY
New demos: __
Total booked: __/5-8 (TARGET)

CONTINGENCY CHECK
[ ] Outreach on pace (20+ by Fri)?
[ ] Response rate on pace (3-8%)?
[ ] Demo bookings on pace (5-8 by Fri)?
Contingencies triggered: __/3
Actions taken: _______________

NOTES
Top angle today: ___________
Best channel: __________
Key win: ________________
```

---

## Handoff to Week 2 (Monday 2026-08-05)

When Week 1 completes, prepare this for Week 2 execution:

**File:** `week2-gtm/demo-schedule.csv`

```csv
Demo_Number,Lead_Name,Company,Contact_Name,Title,Email,Demo_Date,Demo_Time_UTC,Contact_Method,Timezone,Notes,Confirmed_Status
1,Sarah Chen,Phantom Crypto,Sarah Chen,CFO,sarah@phantom.com,2026-08-05,2:00 PM UTC,LinkedIn DM,UTC,"High intent, compliance pain clear, Series B","CONFIRMED"
2,James Li,Marinade Finance,James Li,Ops Lead,james@marinade.com,2026-08-05,3:30 PM UTC,Email,"UTC+2","Warm lead, evaluating budget","CONFIRMED"
3,Unknown,Magic Eden,Finance TBD,VP Finance,finance@magiceden.com,2026-08-06,10:00 AM UTC,"Email","UTC+2","Series C, high volume, needs compliance proof","PENDING CONFIRMATION"
```

**File:** `week2-gtm/demo-prep-checklist.md`

```markdown
# Week 2 Demo Prep Checklist

## For Each Scheduled Demo

- [ ] Send 24-hour reminder with:
  - [ ] Calendar link (same link they used to book)
  - [ ] 2-min intro: "Here's what we'll cover..."
  - [ ] Prep question: "Can you tell me about your current approval process?"

- [ ] Prepare demo script (from dsg-demo-discovery skill):
  - [ ] Problem recap (2 min) — their specific pain
  - [ ] Solution walkthrough (10 min) — live demo
  - [ ] Pilot path (5 min) — shadow/review/enforce stages
  - [ ] Pricing + ROI (5 min) — their potential savings
  - [ ] CTA (2 min) — "Ready to start shadow mode?"

- [ ] Technical prep:
  - [ ] Test internet connection
  - [ ] Have demo environment ready (/api/dsg/v1/gates/evaluate)
  - [ ] Load customer financial data for their scenario
  - [ ] Have pricing calculator ready

- [ ] After demo:
  - [ ] Score lead 1-10 (9-10 = pilot ready)
  - [ ] Send follow-up with:
    - [ ] Recording link (if allowed)
    - [ ] Integration guide for shadow mode
    - [ ] Pricing tier recommendation
    - [ ] Next steps (start shadow mode or questions call)
```

---

## Metrics Dashboard Quick Reference

**Monday EOW Check (after research):**
- Prospect list: 100+ ✅

**Tuesday-Friday Check (daily):**
- Outreach pace: 20+ by Fri ✅ (4+ per day minimum)
- Response pace: 3-8% ✅ (1+ response every 12-24 hrs)
- Demo pace: 5-8 by Fri ✅ (1 demo every 1-2 days)

**Friday EOW Report:**
- Demos confirmed: 5-8 ✅
- Free signups: 10+ ✅
- Best angle: [identified] ✅
- Best channel: [identified] ✅

---

## Files to Create This Week

1. `week1-gtm/week1-leads-responses.csv` — **Create Tue morning, update daily**
2. `week1-gtm/week1-daily-metrics.csv` — **Create Tue evening, update daily**
3. `week1-gtm/week1-contingency-log.csv` — **Create only if contingency triggered**
4. `week1-gtm/WEEK1-FINAL-REPORT.md` — **Create Friday EOD**

All three CSV files should be committed to the branch at end of Friday for Week 2 handoff.

---
