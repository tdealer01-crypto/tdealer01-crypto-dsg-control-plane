/**
 * Customer Acquisition Email Sequence
 * 5-email drip campaign for targeting top 20 companies
 */

export const emailSequence = {
  email1_intro: {
    subject: '{{firstName}}, your AI agents need a control plane',
    delay: 0, // Send immediately
    template: `
Hi {{firstName}},

I saw {{companyName}} is using Claude Code and OpenHands for development. That's awesome — your team is ahead of the curve.

But here's the thing: without governance, AI agents can make changes you didn't intend. They might skip code review, bypass migrations, or touch protected files.

We built DSG ONE to solve this. It's a control plane that gates AI agents BEFORE they act:

✓ See every code change the agent proposes
✓ Approve or reject in seconds
✓ Full audit trail with cryptographic proofs
✓ Works with Claude Code, OpenHands, Aider, Kimi

It takes 30 seconds to install on GitHub. You get 10 free gate decisions to try it.

Want to see a 2-minute demo?

Best,
{{senderName}}
DSG ONE
{{senderEmail}}

P.S. — EU AI Act deadline is August 2026. Compliance-ready governance isn't optional anymore.
`,
  },

  email2_demo: {
    subject: '2-min demo: how {{firstName}} can control AI agents',
    delay: 2, // 2 days
    template: `
Hi {{firstName}},

I realized I should show you, not tell you.

Here's a 2-minute demo of DSG ONE in action:
→ AI proposes code change
→ Gate evaluates against your policy
→ You approve/reject on PR
→ Decision logged with proof

[DEMO VIDEO LINK]

The value:
- Peace of mind: no surprise code changes
- Audit trail: who approved what, when, why
- Compliance ready: EU AI Act, ISO 42001, NIST RMF
- Takes 30 seconds to install

Want to run it yourself? I can set up a 15-minute call to walk you through it.

Free tier includes 10 gate decisions/month. Enough to try on your main repos.

Your choice:
👉 [Install free on GitHub](https://github.com/apps/dsg-agent-governance)
👉 [Book a 15-min demo](https://cal.com/dsg-one/demo)

Best,
{{senderName}}
`,
  },

  email3_interview: {
    subject: 'Quick question about {{companyName}}\'s AI workflow',
    delay: 5, // 5 days
    template: `
Hi {{firstName}},

I've been reaching out to engineering teams using AI agents, and I'm curious about {{companyName}}'s setup.

A few quick questions:
- Who reviews AI agent code changes today?
- Do you have concerns about unapproved deployments?
- Is compliance (EU AI Act, ISO 42001) on your roadmap?

I'm asking because we're building features based on real team feedback. Your answers would help a lot.

15 minutes, zero pressure. We can even do async via email if that's easier.

[Book 15 min](https://cal.com/dsg-one/interview)

Or just reply to this email with your thoughts.

Best,
{{senderName}}
`,
  },

  email4_pricing: {
    subject: 'Pricing clarity: how much does AI governance cost?',
    delay: 8, // 8 days
    template: `
Hi {{firstName}},

I realized I might have left you wondering about pricing.

Here's the simple breakdown:

**Freemium (Free)**
- 10 gate decisions/month
- GitHub App installation
- Basic audit log
- Perfect for trying it out

**Pro ($99/month)**
- Unlimited gate decisions
- Approval workflows
- Slack/email notifications
- Advanced audit logs
- Email support

**Enterprise (Custom)**
- For teams at {{companyName}}'s scale
- Dedicated support, SLA, white-label
- Contact us

Most teams start with Freemium, upgrade to Pro when they're evaluating 100+ gates/month.

Is pricing a blocker, or are you still evaluating fit?

Best,
{{senderName}}

P.S. — First 3 customers get Pro pricing at $49/month for life. That's a limited offer.
`,
  },

  email5_limited_offer: {
    subject: '{{firstName}}, limited offer inside (48h)',
    delay: 12, // 12 days
    template: `
Hi {{firstName}},

You've been on my radar for a while. I think DSG ONE is a great fit for {{companyName}}'s workflow.

Here's what I'm offering:
- 3 months of Pro ($99/mo) completely free
- 1-on-1 onboarding call (30 min)
- Direct access to our team for questions

This is a limited offer. I'm making it for exactly 3 customers who commit by end of week.

If {{companyName}} wants in:
👉 [Claim your spot](https://cal.com/dsg-one/limited-offer)

If not, no worries. But if you're on the fence, this might be the push.

Best,
{{senderName}}

---
Questions? Reply to this email. I read every message.
`,
  },
};

/**
 * Target companies list (example)
 * Replace with real company database
 */
export const targetCompanies = [
  {
    id: 'company_001',
    name: 'Acme Tech',
    website: 'acme-tech.com',
    contacts: [
      {
        firstName: 'Alice',
        lastName: 'Johnson',
        email: 'alice@acme-tech.com',
        title: 'Engineering Manager',
        isAi: true, // Uses Claude Code or similar
      },
    ],
  },
  // ... more companies
];

/**
 * Helper: Format email with variables
 */
export function formatEmail(
  template: string,
  variables: Record<string, string>,
): string {
  let formatted = template;
  for (const [key, value] of Object.entries(variables)) {
    formatted = formatted.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  return formatted;
}

/**
 * Helper: Send email via Resend
 */
export async function sendAcquisitionEmail(
  toEmail: string,
  emailKey: keyof typeof emailSequence,
  variables: Record<string, string>,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const emailTemplate = emailSequence[emailKey];
  if (!emailTemplate) {
    return { success: false, error: `Email template ${emailKey} not found` };
  }

  const subject = formatEmail(emailTemplate.subject, variables);
  const body = formatEmail(emailTemplate.template, variables);

  try {
    // Send via Resend (or your email service)
    // const response = await resend.emails.send({
    //   from: 'sales@dsg-platform.com',
    //   to: toEmail,
    //   subject,
    //   html: body,
    // });

    console.log(`[Email] ${emailKey} to ${toEmail}: ${subject}`);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Helper: Calculate email delay
 */
export function getEmailDelayMs(delayDays: number): number {
  return delayDays * 24 * 60 * 60 * 1000;
}
