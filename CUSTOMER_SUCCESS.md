# Customer Success Playbook — Post-Marketplace Launch

Operational playbook for the first weeks after DSG Control Plane goes live on GitHub Marketplace and Stripe App Marketplace.

---

## Overview

This playbook covers the monitoring, support, and growth activities needed to convert marketplace installs into paying customers and maintain high satisfaction.

---

## Week 1: Monitor Marketplace Submissions

### Goals
- Confirm listing is live and discoverable
- Catch and fix any install-flow issues
- Respond to early feedback within 24 hours

### Daily Checklist

- [ ] Check GitHub Marketplace listing status at `https://github.com/marketplace/<app-name>`
- [ ] Review GitHub App install events in **Settings → GitHub Apps → Insights**
- [ ] Check Vercel logs for any 500 errors on install-related endpoints
- [ ] Review Supabase `auth.users` for new signups
- [ ] Check `revenue_events` table for any new trial activations
- [ ] Respond to any GitHub Discussions or Issues within 24 hours

### Monitoring Stripe

- [ ] Open Stripe Dashboard → Webhooks → Verify events are arriving
- [ ] Check for failed webhook deliveries (retry if needed)
- [ ] Confirm no checkout errors in Stripe logs
- [ ] Verify subscription state matches app state for new trials

### Review Response Template

If GitHub Marketplace asks for changes during review:

```
Thank you for the feedback. We've addressed the following:

1. [Issue raised] → [Fix applied]
2. [Issue raised] → [Fix applied]

Updated listing is ready for re-review. Please let us know if anything 
else is needed.
```

---

## Week 2: Launch Day Prep

### Goals
- Prepare marketing materials for public announcement
- Set up support channels for increased volume
- Create FAQ document (see FAQ_MARKETPLACE.md)

### Marketing Copy Checklist

- [ ] Finalize Twitter/X announcement thread
- [ ] Draft LinkedIn post
- [ ] Prepare GitHub Discussions welcome post for new users
- [ ] Create a "Getting Started" pinned discussion
- [ ] Update README.md with marketplace badge and install link

### Support Channel Setup

| Channel | Purpose | Response SLA |
|---------|---------|-------------|
| GitHub Discussions | General questions, feature requests | 24 hours |
| GitHub Issues | Bug reports, installation problems | 12 hours |
| Email (support@) | Billing questions, enterprise inquiries | 24 hours |

### Escalation Path

1. User reports an issue via GitHub Issues
2. Acknowledge within 12 hours with a tracking label
3. Reproduce locally or in staging
4. Fix → PR → Deploy within 48 hours for critical bugs
5. Update the issue with fix details and close

### FAQ Document

Publish `FAQ_MARKETPLACE.md` to GitHub Discussions as a pinned post before launch day. Include links to:
- Pricing page
- Quickstart guide
- Support contact

---

## Week 3+: Growth Phase

### Goals
- Monitor install and conversion metrics
- Optimize pricing and messaging based on data
- Engage with early customers

### Weekly Review Checklist

- [ ] Review install count (GitHub App Insights)
- [ ] Review trial activation count (Supabase `revenue_events`)
- [ ] Review trial-to-paid conversion rate (Stripe Dashboard → Subscriptions)
- [ ] Review churn rate (Stripe → Canceled subscriptions this week)
- [ ] Review average revenue per user (ARPU) from KPI dashboard
- [ ] Review support ticket volume and common themes
- [ ] Review any product feedback in GitHub Discussions

### Conversion Optimization

If trial-to-paid conversion is below 15%:

1. Review the trial experience — are users reaching the "aha moment"?
2. Check if upgrade CTA is visible at the right moment
3. Consider adding an in-app onboarding checklist (see `components/OnboardingChecklist.tsx`)
4. Add trial expiry reminder emails (Stripe can trigger these)
5. Survey trial users who didn't convert

If install rate is low:

1. Improve marketplace description clarity
2. Add more screenshots showing key value
3. Optimize pricing tier positioning
4. Run a GitHub Discussions announcement to reach existing GitHub users
5. Submit to relevant GitHub collections / curated lists

### Customer Engagement

For customers who have been on Pro or Business for 30+ days:

1. Send a check-in message in GitHub Discussions
2. Ask for feedback on what's working and what isn't
3. Invite them to test new features (beta access)
4. Request a testimonial or case study (see `docs/CASE_STUDY_TEMPLATE.md`)

---

## KPIs to Track

### Primary KPIs

| KPI | Description | Target (Month 1) | Where to Find |
|-----|-------------|-----------------|---------------|
| **Marketplace Views** | Listing page views | 500+ | GitHub Marketplace Analytics |
| **Install Rate** | Installs ÷ Views | ≥5% | GitHub App Insights |
| **Trial Activations** | New trial signups | 20+ | Supabase `revenue_events` |
| **Trial-to-Paid Conversion** | Paid upgrades ÷ Trials | ≥15% | Stripe Dashboard |
| **MRR** | Monthly Recurring Revenue | $500+ | `/dashboard/revenue` |
| **Churn Rate** | Canceled ÷ Active subscriptions | <10%/mo | Stripe → Subscriptions |

### Secondary KPIs

| KPI | Description | Where to Find |
|-----|-------------|---------------|
| **Customer LTV** | Avg revenue per customer lifetime | Stripe → Customers |
| **ARPU** | Average revenue per user | Stripe + `revenue_events` |
| **Support Ticket Volume** | Issues opened per week | GitHub Issues |
| **Time to First Value** | Minutes from install to first governed exec | Supabase `job_executions` |
| **Feature Adoption** | % of users using Trinity, Finance Gov, Delivery Proof | Supabase analytics |

---

## Escalation and Incident Response

### Critical Bug (Production Down)

1. Immediately check Vercel deployment status
2. Check `/api/health` and `/api/agent/status` endpoints
3. Check Supabase database health (Schema → API → Health)
4. If Stripe webhooks are failing: check Stripe → Webhooks → Retry failed events
5. Post a status update in GitHub Discussions within 30 minutes
6. Deploy a hotfix PR with tests
7. Post-incident review within 48 hours

### Billing Issue

1. Locate the customer's Stripe customer record
2. Review subscription history and invoice timeline
3. Issue refund if applicable via Stripe Dashboard → Refunds
4. Update `revenue_events` if Supabase state is stale
5. Respond to customer within 4 hours

---

## References

- [MARKETPLACE.md](./MARKETPLACE.md) — Full listing documentation
- [FAQ_MARKETPLACE.md](./FAQ_MARKETPLACE.md) — Common questions and answers
- [GITHUB_MARKETPLACE_SETUP.md](./GITHUB_MARKETPLACE_SETUP.md) — Listing setup guide
- [STRIPE_APP_MARKETPLACE.md](./STRIPE_APP_MARKETPLACE.md) — Stripe integration details
- [docs/MARKETPLACE_ASSETS.md](./docs/MARKETPLACE_ASSETS.md) — Asset creation guide
