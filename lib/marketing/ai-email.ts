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
    subject: 'DSG รอต่อกับ agent อยู่ครับ — ใช้เวลาแค่ 5 นาที',
    openingLine: 'สวัสดีครับ — สังเกตว่ายังไม่มี action ผ่าน gate เลย วันนี้ลองต่อ agent กับ DSG ดูได้เลย:',
  },
  no_first_execution: {
    subject: 'Gate ของคุณยังว่างอยู่ — ลองส่ง action แรก',
    openingLine: 'สวัสดีครับ — DSG พร้อมแล้ว แต่ยังไม่เห็น traffic ผ่าน gate เลย ลองส่ง action ดูได้เลยครับ:',
  },
  first_block_founder: {
    subject: '🛂 gate เพิ่ง block action ของ {{workspace}} — อยากคุย?',
    openingLine: 'ลูกค้า {{workspace}} เพิ่งได้เห็น DSG block action แรก ถึงเวลาดี ๆ ที่จะ reach out ครับ',
  },
  enable_block_mode: {
    subject: 'คุณใช้ audit mode อยู่ — ลอง block mode เพื่อเห็น DSG ทำงานจริง',
    openingLine: 'สวัสดีครับ — เห็นว่ามี execution ผ่านแล้ว แต่ยังอยู่ใน audit mode ลอง enable gate เพื่อ block action ที่ไม่ได้รับอนุญาตดูครับ:',
  },
  high_usage_upgrade: {
    subject: 'คุณใช้งานหนักมาก — อัปเกรดก่อน quota หมด',
    openingLine: 'สวัสดีครับ — เห็น execution ผ่าน gate เยอะมาก นั่นหมายความว่า DSG ทำงานได้ดี ถ้าอยากมี quota เพิ่มและฟีเจอร์ team ลองดู plan Business ครับ:',
  },
  stuck_offer_call: {
    subject: 'ยังติดอะไรอยู่ไหมครับ? — นัด 15 นาทีกับ founder ได้เลย',
    openingLine: 'สวัสดีครับ — ผมเป็น founder ของ DSG สังเกตว่าเริ่ม trial ไปแล้วแต่ยังไม่ได้ใช้งานจริง อยากรู้ว่ามีอะไรที่ยังไม่ชัดหรือเปล่า นัดคุย 15 นาทีได้เลยครับ:',
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
        system: 'You are a B2B SaaS growth expert writing marketing emails for DSG ONE, an AI agent governance platform. Write in Thai unless specified. Be concise, friendly, founder-tone. Reply with ONLY the requested content, no preamble.',
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

Reply with ONLY the new subject line, in Thai, max 60 chars.`;

  const aiSubject = await callAnthropic(prompt);
  return {
    subject: aiSubject ?? subject,
    openingLine,
    ai: Boolean(aiSubject),
  };
}
