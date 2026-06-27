# Week 3-4 Customer Acquisition — Quick Reference

**Ready to execute:** June 10, 2026, 00:00 UTC

---

## Day 1 Tasks (June 10, Morning)

### ProductHunt Launch

**📤 Submit:**
- Go to ProductHunt maker dashboard
- Title: "Control AI Agents Before They Change Your Code"
- Tagline: "Gate Claude Code, approve before execution"
- URL: https://tdealer01-crypto-dsg-control-plane.vercel.app/products/agent-governance
- Upload 5 gallery images (1280×720)
- Upload 60-second demo video (YouTube link or direct)

**🐦 Tweet thread (5 tweets):**
1. Hero: "We built a gate for Claude Code"
2. Feature: "See every change before it merges"
3. Social proof: "Teams are using this in production"
4. Pricing: "Free for 10 decisions/month"
5. CTA: "Install now (30 seconds): [ProductHunt link]"

**📧 Send warm email:**
- To: 50 beta signup list
- Template: Welcome email from Email 1 (Intro variant)
- Link: ProductHunt page

---

### Cold Email Campaign (Email 1)

**📧 Send to:** 20 target companies

**Subject line:** "Claude Code needs a governor (2min read)"

**Template:** Use Email 1 (Cold Intro) from WEEK3_OUTREACH_EMAILS.md
- Personalized for company type (enterprise/finance/developer tools)
- Link to ProductHunt page
- Calendar link: https://calendly.com/t-dealer01/15min

**Track:**
- Opens: Resend dashboard
- Clicks: UTM params (utm_source=email, utm_campaign=week3_outreach_email1)
- Replies: Manual Pipedrive log

---

## Daily Monitoring (Week 3)

### ProductHunt

- [ ] 09:00 UTC — Check rank (target: top 10 by hour 6)
- [ ] 15:00 UTC — Engage comments (reply within 2h)
- [ ] 21:00 UTC — Check upvote count (target: 100 by day 2)

**Success:** 100+ upvotes, 50+ signups, comments flowing

---

### Email Campaign

- [ ] 10:00 UTC — Check email delivery (bounces <5%)
- [ ] 14:00 UTC — Monitor opens (expect 30-40% by end of day)
- [ ] 18:00 UTC — Check demo video clicks

**Success:** 6+ opens, 1+ click-through

---

### Website

- [ ] 09:00 UTC — Verify landing pages load (<2s)
- [ ] Check error rate (should be 0%)
- [ ] Monitor traffic (ProductHunt → website funnel)

**Success:** 100+ unique visitors, 0 errors

---

## Day 3 Tasks (June 12)

### Email 2: Demo + Social Proof

**📧 Send to:** 14-16 people who opened Email 1

**Subject:** "[Video] 2-min demo inside"

**Template:** Use Email 2 from WEEK3_OUTREACH_EMAILS.md
- Link to YouTube video (or placeholder)
- Include 3 user testimonials
- Calendar link
- Social proof (ProductHunt rank, upvotes)

---

### ProductHunt Engagement

- [ ] Post major update (demo video + key metrics)
- [ ] Respond to all comments
- [ ] Share user testimonials in reply thread

---

## Day 5 Tasks (June 14)

### Email 3: Interview Offer

**📧 Send to:** All 20 companies (even non-openers)

**Subject:** "Quick feedback wanted (5 questions)"

**Template:** Use Email 3 from WEEK3_OUTREACH_EMAILS.md
- 5-question survey (short form)
- Option to reply or book 15-min call
- Calendar link

---

### Demo Calls

- [ ] Schedule 1-2 demo calls (from Email 1 + 2 responses)
- [ ] Prepare demo script: install → configure → run first gate
- [ ] Record reactions for case study

---

## Day 8 Tasks (June 18)

### Email 4: Pricing Clarity

**📧 Send to:** All 20 companies

**Subject:** "Pricing breakdown (2-min read)"

**Template:** Use Email 4 from WEEK3_OUTREACH_EMAILS.md
- Simple pricing: Free 10/mo, Pro $99/mo
- ROI calculation specific to company size
- Limited offer: 3 months free (first 3 only)
- Objection handling

---

## Day 13 Tasks (June 21)

### Email 5: Limited Offer (Final)

**📧 Send to:** All 20 companies

**Subject:** "48-hour offer: 3 months free"

**Template:** Use Email 5 from WEEK3_OUTREACH_EMAILS.md
- Urgency: Expires in 48h
- Offer: 3 months Pro free
- CTA: Reply, book call, or try free
- P.S.: Offer to remove from list

**⚠️ This is the final email. After this, stop outreach for non-responders.**

---

## Success Metrics (Track Daily)

| Metric | Target | Week 1 | Week 2 | Status |
|--------|--------|--------|--------|--------|
| ProductHunt upvotes | 100+ | TBD | TBD | |
| Beta signups | 50+ | TBD | TBD | |
| Email opens | 30%+ | TBD | TBD | |
| Demo calls booked | 2+ | TBD | TBD | |
| Contracts signed | 3+ | TBD | TBD | |
| Website errors | 0 | TBD | TBD | |

---

## Key Contacts & Tools

**Resend Email Sending:**
- Dashboard: https://resend.com/dashboard
- From: t.dealer01@dsg.pics
- API key: Vercel env var `RESEND_API_KEY`

**Calendar Scheduling:**
- Calendly: https://calendly.com/t-dealer01/15min
- 15-min slots (8 per day, 9:00-17:00 UTC)

**CRM Tracking:**
- Pipedrive: Record email sends, opens, clicks, demos, contracts
- Fields: Company, Email, Opens, Clicks, Demo Date, Contract Status

**Monitoring:**
- ProductHunt rank: Dashboard (check every 6h)
- Resend metrics: Opens, clicks, bounces
- Vercel: Error rate, latency
- Google Analytics: Traffic source, conversion funnel

---

## Messaging Framework

### Problem Statement

> "When Claude Code proposes changes to your codebase, who reviews them before they're merged?"

### Solution

> "DSG installs as a GitHub App. Every agent proposal is intercepted. You approve before execution. Every decision is logged with proof."

### Why Now

> "As AI agents become production tools, governance becomes critical. Compliance audits, security, speed. We solve all three."

### Call to Action

> "Try free (10 decisions/month). No credit card. Install in 30 seconds."

---

## If Something Goes Wrong

### ProductHunt Rejected

1. Check rejection reason (usually copy/imagery issues)
2. Fix and resubmit next day
3. Meanwhile: Launch on Twitter + HackerNews (backup plan)
4. Cold email 20 companies (don't wait for ProductHunt approval)

### High Email Bounce Rate (>10%)

1. Pause Email 2-5 outreach
2. Validate company email list (are addresses correct?)
3. Find replacement contacts on LinkedIn
4. Retry with corrected addresses

### Website/API Error

1. Check Vercel deployment log (build errors? env vars?)
2. Revert last commit if recent change broke it
3. Post status update to ProductHunt
4. Fix locally, test, redeploy

### No Demo Calls Booked

1. This is OK (Email 1 → 2 → 3 are funnel steps)
2. Continue with Email 4 (pricing) — might unlock calls
3. If still nothing by Email 5, activate LinkedIn outreach

---

## Celebration Checkpoints

✅ **Hour 1 (Jun 10, 01:00 UTC)**
- ProductHunt live ✓
- Email 1 sent ✓
- Twitter thread posted ✓

✅ **Day 1 (Jun 10, 21:00 UTC)**
- 100+ ProductHunt views ✓
- 6+ email opens ✓
- 0 errors on website ✓

✅ **Day 2 (Jun 11, 21:00 UTC)**
- 100+ ProductHunt upvotes ✓
- 50+ beta signups ✓
- 20+ email opens ✓

✅ **Day 5 (Jun 14, 21:00 UTC)**
- 2+ demo calls booked ✓
- 30+ ProductHunt upvotes ✓
- 1+ Email 2 clicks ✓

✅ **End of Week 3 (Jun 16, 21:00 UTC)**
- 3+ demo calls completed ✓
- 1+ contract signed ✓
- 100 ProductHunt upvotes ✓
- 50+ beta signups ✓

---

## Document Links (Bookmark These)

| Document | Purpose | Link |
|----------|---------|------|
| ProductHunt Submission | Launch details | `/docs/PRODUCTHUNT_SUBMISSION.md` |
| Email Campaign | Cold email templates | `/docs/WEEK3_OUTREACH_EMAILS.md` |
| Go-Live Checklist | Pre-launch verification | `/docs/WEEK3_GOLIVE_CHECKLIST.md` |
| Progress Summary | Full project status | `/docs/8WEEK_PROGRESS_SUMMARY.md` |
| Contact List | 20 target companies | `/docs/TARGET_COMPANIES.md` |

---

**Execution Window Opens:** June 10, 2026, 00:00 UTC

**Good luck! 🚀**
