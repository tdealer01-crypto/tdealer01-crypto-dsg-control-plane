// Autonomous Marketing MCP Tools
// Tool definitions + implementations callable by the marketing AI agent

import { getSupabaseAdmin } from '../supabase-server';
import { sendGitHubLeadOutreach } from '../email/sales';

// ─── Tool schema definitions (Claude tool_use format) ────────────────────────

export const MARKETING_TOOL_DEFINITIONS = [
  {
    name: 'get_pipeline_metrics',
    description:
      'Get current lead pipeline metrics: total leads, emailed, follow-up sent, unsubscribed, avg intent score, leads waiting for first outreach.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'get_top_uncontacted_leads',
    description:
      'Get the highest-intent leads that have not been emailed yet. Use to decide who to reach out to next.',
    input_schema: {
      type: 'object' as const,
      properties: {
        limit: { type: 'number', description: 'Max leads to return (1-5)' },
      },
      required: [],
    },
  },
  {
    name: 'send_outreach_to_lead',
    description:
      'Send a cold outreach email to one specific lead. Only use for leads not yet contacted. Returns ok/error.',
    input_schema: {
      type: 'object' as const,
      properties: {
        email: { type: 'string' },
        framework: { type: 'string', description: 'AI framework: langchain, crewai, openai-agents, pydantic-ai, autogen, langchain-js, openai-agents-js' },
        github_repo: { type: 'string', description: 'Full repo name e.g. acme/ai-agent' },
        github_stars: { type: 'number' },
      },
      required: ['email', 'framework', 'github_repo'],
    },
  },
  {
    name: 'get_outreach_performance',
    description:
      'Get outreach performance: emails sent today/this week, follow-ups due, unsubscribes, lead quality breakdown.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'generate_linkedin_post',
    description:
      'Generate a ready-to-publish LinkedIn post about AI governance, EU AI Act compliance, or a DSG ONE use case. Returns post text.',
    input_schema: {
      type: 'object' as const,
      properties: {
        angle: {
          type: 'string',
          description:
            'One of: eu-ai-act-enforcement | prevention-vs-detection | fintech-use-case | audit-trail-explainer | developer-story',
        },
      },
      required: ['angle'],
    },
  },
  {
    name: 'generate_seo_article',
    description:
      'Generate a 500-800 word SEO article targeting AI governance or EU AI Act keywords. Returns title, meta description, and markdown body.',
    input_schema: {
      type: 'object' as const,
      properties: {
        keyword: {
          type: 'string',
          description: 'Target keyword e.g. "EU AI Act compliance for AI agents"',
        },
      },
      required: ['keyword'],
    },
  },
  {
    name: 'notify_founder',
    description:
      'Send a real-time Telegram notification to the founder. Use after completing an outreach, hitting a milestone, or when the pipeline needs urgent attention.',
    input_schema: {
      type: 'object' as const,
      properties: {
        message: { type: 'string', description: 'Short message to send (max 300 chars)' },
      },
      required: ['message'],
    },
  },
];

// ─── Tool implementations ─────────────────────────────────────────────────────

export async function executeTool(
  name: string,
  params: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const admin = getSupabaseAdmin();

  switch (name) {
    case 'get_pipeline_metrics': {
      const { data, error } = await (admin as any)
        .from('leads')
        .select('source, intent, outreach_sent, intent_score');
      if (error) return { error: error.message };
      const rows = (data as Array<{ source: string; intent: string; outreach_sent: boolean; intent_score: number }>) ?? [];
      const total = rows.length;
      const github = rows.filter(r => r.source === 'github-signal').length;
      const emailed = rows.filter(r => r.outreach_sent).length;
      const unsubscribed = rows.filter(r => r.intent === 'unsubscribed').length;
      const waitingOutreach = rows.filter(r => !r.outreach_sent && r.intent !== 'unsubscribed').length;
      const scores = rows.map(r => r.intent_score).filter(Boolean);
      const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
      return { total, github, emailed, unsubscribed, waiting_for_outreach: waitingOutreach, avg_intent_score: avgScore };
    }

    case 'get_top_uncontacted_leads': {
      const limit = Math.min(Number(params.limit) || 3, 5);
      const { data, error } = await (admin as any)
        .from('leads')
        .select('email, framework, github_repo, github_stars, intent_score, source')
        .eq('outreach_sent', false)
        .neq('intent', 'unsubscribed')
        .eq('source', 'github-signal')
        .not('email', 'like', '%@social-signal.dsg.internal')
        .order('intent_score', { ascending: false })
        .limit(limit);
      if (error) return { error: error.message };
      return { leads: data ?? [], count: (data ?? []).length };
    }

    case 'send_outreach_to_lead': {
      const { email, framework, github_repo, github_stars } = params as {
        email: string; framework: string; github_repo: string; github_stars?: number;
      };
      if (!email || !framework || !github_repo) return { error: 'Missing required params' };
      try {
        await sendGitHubLeadOutreach({
          email,
          framework,
          githubRepo: github_repo,
          githubStars: Number(github_stars) || 0,
        });
        await (admin as any)
          .from('leads')
          .update({ outreach_sent: true, outreach_sent_at: new Date().toISOString() })
          .eq('email', email)
          .eq('source', 'github-signal');
        return { ok: true, email, sent_at: new Date().toISOString() };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Send failed' };
      }
    }

    case 'get_outreach_performance': {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const weekStart = new Date(now.getTime() - 7 * 86_400_000).toISOString();
      const { data } = await (admin as any)
        .from('leads')
        .select('outreach_sent, outreach_sent_at, intent, messages');
      const rows = (data as Array<{ outreach_sent: boolean; outreach_sent_at: string | null; intent: string; messages: Array<{ role: string }> | null }>) ?? [];
      const sentToday = rows.filter(r => r.outreach_sent_at && r.outreach_sent_at >= todayStart).length;
      const sentThisWeek = rows.filter(r => r.outreach_sent_at && r.outreach_sent_at >= weekStart).length;
      const followupDue = rows.filter(r => {
        if (!r.outreach_sent_at) return false;
        const sentMs = new Date(r.outreach_sent_at).getTime();
        const daysSince = (Date.now() - sentMs) / 86_400_000;
        const hasFollowup = (r.messages ?? []).some((m: { role: string }) => m.role === 'followup');
        return daysSince >= 3 && daysSince <= 10 && !hasFollowup;
      }).length;
      return { sent_today: sentToday, sent_this_week: sentThisWeek, followup_due: followupDue, unsubscribed: rows.filter(r => r.intent === 'unsubscribed').length };
    }

    case 'generate_linkedin_post': {
      const { angle } = params as { angle: string };
      return await callClaudeContent(
        `You are a B2B LinkedIn copywriter for DSG ONE — a pre-execution AI agent governance platform.

Write ONE LinkedIn post (150-250 words) with angle: "${angle}"

DSG ONE facts:
- Blocks AI agent actions BEFORE they execute (not logging after)
- Cryptographic audit trail (SHA-256 hash on every decision)
- Maps to EU AI Act Articles 9, 12, 14
- REST API, no SDK required, connects in one line
- Target: Fintech CTOs, AI compliance leads, regulated industries

Style: Direct, technical credibility, no buzzword bingo, end with clear CTA.
Return only the post text, no preamble.`,
        512
      ).then(text => ({ post: text, angle, generated_at: new Date().toISOString() }));
    }

    case 'generate_seo_article': {
      const { keyword } = params as { keyword: string };
      const content = await callClaudeContent(
        `You are a technical SEO writer for DSG ONE — a pre-execution AI governance platform.

Write a 600-word SEO article targeting keyword: "${keyword}"

Structure:
1. H1 title (include keyword)
2. Meta description (150 chars)
3. Introduction (2 paragraphs, include keyword naturally)
4. 3 sections with H2 headers
5. Conclusion with CTA to /quickstart

DSG ONE facts (use accurately):
- Pre-execution blocking, not post-logging
- REST API: POST /api/try/gate with session_id + action
- EU AI Act Art.9 (prevention), Art.12 (records), Art.14 (human oversight)
- No SDK required

Return as markdown. Start with: # [title]`,
        1500
      );
      const titleMatch = content.match(/^# (.+)/m);
      const metaMatch = content.match(/Meta description[:\s]+(.{20,160})/i);
      return {
        title: titleMatch?.[1] ?? keyword,
        meta_description: metaMatch?.[1]?.slice(0, 160) ?? '',
        body: content,
        keyword,
        generated_at: new Date().toISOString(),
      };
    }

    case 'notify_founder': {
      const { message } = params as { message: string };
      const sent = await sendTelegram(String(message ?? '').slice(0, 300));
      return sent ? { ok: true, sent_at: new Date().toISOString() } : { ok: false, reason: 'TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not configured' };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// ─── Internal: send Telegram notification to founder ─────────────────────────

export async function sendTelegram(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: `[DSG Marketing Agent]\n\n${text}` }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ─── Internal: call Claude for content generation (no tools) ─────────────────

async function callClaudeContent(prompt: string, maxTokens: number): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) throw new Error(`Claude API error: ${res.status}`);
  const data = await res.json() as { content: Array<{ type: string; text: string }> };
  return data.content.find(c => c.type === 'text')?.text ?? '';
}
