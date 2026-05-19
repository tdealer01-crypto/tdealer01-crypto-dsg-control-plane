// AI-powered email personalization — generates subject + opening line per user.
// Falls back to static defaults when no AI key is configured.

type UserContext = {
  email: string;
  workspaceName?: string | null;
  daysInTrial: number;
  daysLeft: number;
  milestones: Set<string>;
  executions?: number;
};

type PersonalizedEmail = {
  subject: string;
  openingLine: string;
  ai: boolean;
};

const FALLBACKS: Record<string, { subject: string; openingLine: string }> = {
  no_agent_connected: {
    subject: 'DSG is waiting for your agent — takes only 5 minutes',
    openingLine: 'Hi — noticed no actions have passed through the gate yet. Try connecting your agent to DSG today:',
  },
  no_first_execution: {
    subject: 'Your gate is still empty — try sending your first action',
    openingLine: 'Hi — DSG is ready, but we haven\'t seen any traffic through the gate yet. Go ahead and send an action:',
  },
  first_block_founder: {
    subject: '🛂 gate just blocked an action from {{workspace}} — want to chat?',
    openingLine: '{{workspace}} just saw DSG block their first action. Great time to reach out.',
  },
  enable_block_mode: {
    subject: 'You\'re in audit mode — try block mode to see DSG in action',
    openingLine: 'Hi — you\'ve had executions pass through, but you\'re still in audit mode. Try enabling the gate to block unauthorized actions:',
  },
  high_usage_upgrade: {
    subject: 'You\'re using DSG heavily — upgrade before you hit quota',
    openingLine: 'Hi — we\'re seeing a lot of executions through the gate, which means DSG is working hard for you. If you want more quota and team features, check out the Business plan:',
  },
  stuck_offer_call: {
    subject: 'Still stuck on something? — book 15 minutes with the founder',
    openingLine: 'Hi — I\'m the founder of DSG. I noticed you started a trial but haven\'t fully set things up yet. Happy to help — book a 15-minute call anytime:',
  },
};

function applyTemplate(text: string, ctx: UserContext): string {
  return text
    .replace(/{{workspace}}/g, ctx.workspaceName ?? ctx.email.split('@')[0])
    .replace(/{{email}}/g, ctx.email)
    .replace(/{{days_left}}/g, String(ctx.daysLeft));
}

async function callAnthropic(prompt: string): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 120,
        system: 'You are a B2B SaaS growth expert writing marketing emails for DSG ONE, an AI agent governance platform. Write in English. Be concise, friendly, founder-tone. Reply with ONLY the requested content, no preamble.',
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json() as { content?: Array<{ type: string; text: string }> };
    return data.content?.find(c => c.type === 'text')?.text?.trim() ?? null;
  } catch {
    return null;
  }
}

export async function personalizeEmail(
  emailType: keyof typeof FALLBACKS,
  ctx: UserContext,
): Promise<PersonalizedEmail> {
  const fallback = FALLBACKS[emailType];
  const subject = applyTemplate(fallback.subject, ctx);
  const openingLine = applyTemplate(fallback.openingLine, ctx);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { subject, openingLine, ai: false };
  }

  const prompt = `Write a personalized email subject line for a B2B SaaS trial user.
Workspace: "${ctx.workspaceName ?? 'unknown'}"
Days in trial: ${ctx.daysInTrial}
Days left: ${ctx.daysLeft}
Completed milestones: ${[...ctx.milestones].join(', ') || 'none'}
Email type: ${emailType}
Base subject: "${subject}"

Reply with ONLY the new subject line, in English, max 60 chars.`;

  const aiSubject = await callAnthropic(prompt);
  return {
    subject: aiSubject ?? subject,
    openingLine,
    ai: Boolean(aiSubject),
  };
}
