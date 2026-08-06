# Phase 4C Training Schedule Template

**Use this template to coordinate team training**

---

## Quick Start: Schedule Training Now

**Option 1: Intensive (One day, 2.5 hours)**
```
Date: [SELECT DATE]
Time: 9:00 AM - 11:30 AM [TIMEZONE]
Format: Live workshop with all team members
Instructor: Analytics lead or DevOps engineer
Location: [MEETING URL]
```

**Option 2: Weekly (5 sessions, 30 min each)**
```
Session 1: Monday [DATE] 10:00 AM
Session 2: Tuesday [DATE] 10:00 AM
Session 3: Wednesday [DATE] 10:00 AM
Session 4: Thursday [DATE] 10:00 AM
Session 5: Friday [DATE] 10:00 AM
```

**Option 3: Self-paced (No scheduled meetings)**
```
Week 1: Read Session 1 & 2 materials
Week 2: Read Session 3 & 4 materials
Week 3: Read Session 5 & complete exercises
Week 4: Team Q&A session (1 hour)
```

---

## Detailed Schedule Template

### Pre-Training Setup (1 day before)

**Instructor Tasks:**
- [ ] Confirm all attendees have PostHog access
- [ ] Test dashboard URLs (all 3 dashboards)
- [ ] Prepare laptop for screen sharing
- [ ] Print or digital copy of slides
- [ ] Have example queries ready
- [ ] Test video/audio (if remote)

**Attendee Tasks:**
- [ ] Join PostHog project (link sent via email)
- [ ] Log into https://us.posthog.com/project/479488
- [ ] Try accessing each dashboard
- [ ] Read overview section of training guide
- [ ] Note any questions for Q&A

### Session 1: Telemetry Basics (Monday, 30 min)

**Time:** [10:00 AM - 10:30 AM]

**Pre-Session (5 min before):**
- Start recording (if needed)
- Share screen
- Display slide deck

**Agenda:**

| Time | Topic | Lead | Notes |
|------|-------|------|-------|
| 0:00-0:05 | Welcome & Agenda | Instructor | Go over 5 sessions total |
| 0:05-0:10 | What is Telemetry? | Instructor | Definition + why it matters |
| 0:10-0:15 | PostHog Tour | Instructor | Screen share, live demo |
| 0:15-0:20 | Understanding Events | Instructor | Event anatomy, properties |
| 0:20-0:27 | The 21 Events | Instructor | Overview of 3 phases |
| 0:27-0:30 | Q&A | All | Take questions |

**Exercise Homework:**
- [ ] Find `organization_created` event in PostHog
- [ ] Expand its properties
- [ ] Identify organization_id and timestamp
- [ ] Take screenshot for verification

**Recording:** [Save as: `phase4c-session1-basics.mp4`]

**Attendee Checklist:**
- [ ] I can access PostHog dashboard
- [ ] I understand what events are
- [ ] I can find events in the Events tab
- [ ] I know the 3 phases of telemetry
- [ ] I have questions answered

---

### Session 2: Operational Dashboards (Tuesday, 30 min)

**Time:** [10:00 AM - 10:30 AM]

**Prerequisites:**
- Watched Session 1
- Can access PostHog

**Agenda:**

| Time | Topic | Lead | Notes |
|------|-------|------|-------|
| 0:00-0:03 | Recap: What is Telemetry? | Instructor | 30-second refresher |
| 0:03-0:08 | Conversion Funnel Dashboard | Instructor | Demo all 4 widgets |
| 0:08-0:13 | Operational Metrics Dashboard | Instructor | Demo all 6 widgets |
| 0:13-0:22 | Dashboard Interaction | Instructor | Filters, date ranges, exports |
| 0:22-0:27 | Live Q&A | All | Answer questions |
| 0:27-0:30 | Exercise: Policy Analysis | Attendees | Do analysis together |

**Exercise (During session):**
1. Go to Conversion Funnel dashboard
2. Filter by: policy_type = deterministic
3. Compare: This week vs Last week
4. Question: Which type is more popular?

**Recording:** [Save as: `phase4c-session2-dashboards.mp4`]

**Attendee Checklist:**
- [ ] I understand Conversion Funnel purpose
- [ ] I understand Operational Metrics purpose
- [ ] I can filter dashboards by date
- [ ] I can compare time periods
- [ ] I can export data to CSV

---

### Session 3: Compliance & Audit (Wednesday, 30 min)

**Time:** [10:00 AM - 10:30 AM]

**Prerequisites:**
- Watched Sessions 1-2
- Can navigate dashboards

**Agenda:**

| Time | Topic | Lead | Notes |
|------|-------|------|-------|
| 0:00-0:03 | Why Compliance Matters | Instructor | Regulatory + customer needs |
| 0:03-0:10 | Compliance Dashboard Widgets | Instructor | Demo 4 widgets |
| 0:10-0:18 | Evidence & Audit Export | Instructor | Live demo: filter & export |
| 0:18-0:25 | Common Compliance Queries | Instructor | 4 example queries |
| 0:25-0:30 | Q&A + Exercise | Attendees | Questions + hands-on |

**Exercise (During session):**
1. Go to Events tab
2. Filter: `team_member_invited` events (last 7 days)
3. Export as CSV
4. Verify: Column headers, data complete

**Recording:** [Save as: `phase4c-session3-compliance.mp4`]

**Attendee Checklist:**
- [ ] I understand audit trail purpose
- [ ] I can export events as CSV
- [ ] I know how to generate compliance reports
- [ ] I understand proof verification
- [ ] I can identify audit concerns

---

### Session 4: Alert Management (Thursday, 30 min)

**Time:** [10:00 AM - 10:30 AM]

**Prerequisites:**
- Watched Sessions 1-3
- Familiar with dashboards

**Agenda:**

| Time | Topic | Lead | Notes |
|------|-------|------|-------|
| 0:00-0:03 | Alert Strategy | Instructor | Principles, why they matter |
| 0:03-0:10 | 4 DSG ONE Alerts | Instructor | What each does, thresholds |
| 0:10-0:18 | Alert Incident Response | Instructor | Step-by-step workflow |
| 0:18-0:24 | Custom Alert Creation | Instructor | Live demo: create alert |
| 0:24-0:30 | Exercise + Q&A | Attendees | Hands-on + questions |

**Exercise (During session):**
1. Go to PostHog Alerts section
2. Create: "High Execution Volume" alert
   - Event: execution_submitted
   - Condition: > 10 per hour
   - Severity: Warning
3. Save alert
4. Test notification

**Recording:** [Save as: `phase4c-session4-alerts.mp4`]

**Attendee Checklist:**
- [ ] I know what each alert does
- [ ] I understand alert thresholds
- [ ] I can respond to alerts properly
- [ ] I can create a custom alert
- [ ] I know escalation paths

---

### Session 5: Case Studies & Best Practices (Friday, 30 min)

**Time:** [10:00 AM - 10:30 AM]

**Prerequisites:**
- Watched Sessions 1-4
- Completed exercises

**Agenda:**

| Time | Topic | Lead | Notes |
|------|-------|------|-------|
| 0:00-0:03 | Quick Recap | Instructor | Sessions 1-4 summary |
| 0:03-0:10 | Case Study 1: Adoption Analysis | Instructor | How telemetry revealed issue |
| 0:10-0:17 | Case Study 2: Queue Backlog | Instructor | Root cause analysis |
| 0:17-0:25 | Best Practices | Instructor | 6 key practices |
| 0:25-0:30 | Capstone + Wrap-up | All | Mini-investigation + Q&A |

**Capstone Exercise (Group):**
- **Scenario:** "50 policies created, only 5 executed. Why?"
- **Task:** Work together to investigate
- **Method:** Use dashboards, filters, drill-down
- **Report:** Post findings to #analysis Slack channel

**Recording:** [Save as: `phase4c-session5-cases.mp4`]

**Attendee Checklist:**
- [ ] I can analyze user behavior via telemetry
- [ ] I understand drill-down analysis
- [ ] I follow best practices
- [ ] I can investigate bottlenecks
- [ ] I'm ready to use dashboards independently

---

## Post-Training

### Same Day: Debrief (30 min)

**Time:** [4:00 PM - 4:30 PM] (day after last session)

**Format:** Team retrospective

**Questions:**
1. What was most useful?
2. What was confusing?
3. What's missing from training?
4. When will you use this?
5. What follow-up is needed?

**Outcomes:**
- [ ] Collect feedback
- [ ] Identify knowledge gaps
- [ ] Plan follow-up sessions
- [ ] Update training materials

### Week 1 After: Dashboard Assignment

**Assign ownership:**
- [ ] Conversion Funnel → [PERSON/TEAM]
- [ ] Operational Metrics → [PERSON/TEAM]
- [ ] Compliance & Audit → [PERSON/TEAM]

**Responsibilities:**
- Monitor weekly
- Share insights
- Alert team to anomalies
- Suggest improvements

### Month 1: First Metrics Review

**Time:** First Monday of next month, 2:00 PM

**Duration:** 1 hour

**Agenda:**
1. Review all 3 dashboards (15 min)
2. Discuss key metrics (15 min)
3. Review alert performance (15 min)
4. Plan adjustments (15 min)

**Outcome:** Team is confident using telemetry

---

## Roles & Responsibilities

### Instructor Role

**Who:** Analytics lead, DevOps engineer, or product manager  
**When:** Each session (30 min + 15 min prep)  
**Duties:**
- Present content
- Live demos
- Answer questions
- Record session
- Send follow-ups

### Attendee Role

**Who:** Engineering, Operations, Product, Analytics teams  
**When:** All 5 sessions  
**Duties:**
- Attend or watch recording
- Complete exercises
- Ask questions
- Apply learnings
- Provide feedback

### Coordinator Role

**Who:** Program or HR coordinator  
**When:** Throughout training  
**Duties:**
- Schedule meetings
- Send calendar invites
- Track attendance
- Collect feedback
- Organize recordings

---

## Materials Checklist

**Before Session 1:**
- [ ] `/docs/PHASE_4C_TRAINING.md` (main guide)
- [ ] Dashboard access for all attendees
- [ ] PostHog project login instructions
- [ ] Calendar invites sent (all 5 sessions)
- [ ] Recording setup tested

**For Each Session:**
- [ ] Slides printed or available digitally
- [ ] Example queries prepared
- [ ] Live demo tested
- [ ] Backup laptop ready
- [ ] Recording device working

**After Each Session:**
- [ ] Recording saved with timestamp
- [ ] Transcript generated (if available)
- [ ] Q&A notes documented
- [ ] Exercise solutions posted
- [ ] Follow-up email sent

---

## Feedback & Iteration

### Collect Feedback

**After Session 1:**
- What's confusing about events?
- PostHog navigation clear?
- Pace too fast/slow?

**After Session 2:**
- Can you use dashboards?
- Filter/export features working?
- Dashboard design clear?

**After Session 3:**
- Compliance concepts understood?
- Export process clear?
- Any compliance scenarios missing?

**After Session 4:**
- Alert types clear?
- Response workflow documented?
- Incident response practical?

**After Session 5:**
- Case studies relevant?
- Best practices applicable?
- Ready to work independently?

### Update Materials

**If feedback indicates:**
- "Confusing explanation" → Rewrite that section
- "Missing example" → Add case study
- "Dashboard changed" → Update screenshots
- "New alert rule" → Add to Section 4

**Version bumps:**
- Minor updates → 1.0 → 1.1
- Major rewrite → 1.0 → 2.0

---

## FAQ: Training Logistics

**Q: What if someone can't make a session?**
A: Recording provided within 24 hours. They watch and complete exercise asynchronously.

**Q: Do we need to do all 5 sessions?**
A: Minimum: Sessions 1 & 2. Sessions 3-5 by role (Ops → 3&4, Compliance → 3, Product → 1&5).

**Q: Can we combine sessions?**
A: Not recommended (pacing suffers). Keep 30-min sessions as designed.

**Q: When should we do follow-up training?**
A: Month 2: Advanced dashboard customization  
Month 3: Alert tuning deep-dive  
Month 6: New feature training

**Q: What if we find bugs during training?**
A: Document, take screenshot, file GitHub issue in repo.

---

## Success Criteria

After Phase 4C training, team should be able to:

- ✅ Log into PostHog independently
- ✅ Navigate all 3 dashboards
- ✅ Filter by date, property, event type
- ✅ Interpret widget data correctly
- ✅ Export data for reporting
- ✅ Respond to alerts appropriately
- ✅ Create custom alerts
- ✅ Understand compliance requirements
- ✅ Export audit trails
- ✅ Use best practices for analysis

---

**Ready to schedule training? Use the template above and send calendar invites to team!**

For questions: Check `/docs/PHASE_4C_TRAINING.md` for detailed content.
