// Autonomous Marketing Agent — runs daily at 7 AM UTC
// Uses Claude + MCP tools to decide and execute the highest-value marketing action.
// Pattern: get context → call Claude with tools → execute tool → log → repeat (max 4 steps)

import { NextResponse } from 'next/server';
import { MARKETING_TOOL_DEFINITIONS, executeTool } from '../../../../lib/marketing/mcp-tools';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

const MAX_STEPS = 6;

type ClaudeMessage = { role: 'user' | 'assistant'; content: string | ClaudeContent[] };
type ClaudeContent =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: string };

type ClaudeResponse = {
  stop_reason: string;
  content: ClaudeContent[];
};

async function callClaude(messages: ClaudeMessage[]): Promise<ClaudeResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: `You are the autonomous marketing agent for DSG ONE — a pre-execution AI governance platform that blocks AI agent actions before they execute (not logging after).

Your goal: execute the single highest-value marketing action available RIGHT NOW.

DSG ONE ICP: Fintech CTOs, AI compliance officers, regulated-industry engineering leads building AI agents.
Core message: "Other tools tell you AFTER. DSG ONE blocks BEFORE."
Key differentiators: pre-execution blocking, cryptographic audit trail, EU AI Act Art.9/12/14, REST API (no SDK).

Instructions (call ONE tool at a time, wait for result before calling the next):
1. Call get_pipeline_metrics to understand current state
2. Call get_outreach_performance to understand email performance
3. Identify the single most impactful action using this priority:
   a. Uncontacted high-intent leads → get_top_uncontacted_leads → send_outreach_to_lead
   b. Replied leads need follow-up → get_lead_replies → notify_founder with list
   c. Hot social signals → get_social_signals → generate_linkedin_post addressing that topic
   d. Content only if outreach queue < 5 → generate_linkedin_post or generate_seo_article
4. Execute ONE action
5. Call notify_founder with a 1-line result summary
6. End with a 2-sentence summary of what you did and why

Never call more than one tool in a single step.`,
      tools: MARKETING_TOOL_DEFINITIONS,
      messages,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Anthropic API ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<ClaudeResponse>;
}

async function logAgentRun(
  summary: string,
  actions: string[],
  status: 'ok' | 'error',
  error?: string
) {
  try {
    const admin = getSupabaseAdmin();
    await (admin as any).from('marketing_agent_runs').insert({
      run_at: new Date().toISOString(),
      summary,
      actions_taken: actions,
      status,
      error: error ?? null,
    });
  } catch {
    // Table may not exist yet — log to console only
    console.log('[marketing-agent] run logged to console (table not found)', { summary, actions, status });
  }
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ ok: false, error: 'ANTHROPIC_API_KEY not configured' }, { status: 200 });
  }

  const messages: ClaudeMessage[] = [
    {
      role: 'user',
      content: `Today is ${new Date().toISOString().split('T')[0]}. Review the pipeline and execute the most impactful marketing action available. Start by checking current metrics.`,
    },
  ];

  const actionsLog: string[] = [];
  let finalSummary = '';
  let steps = 0;

  try {
    while (steps < MAX_STEPS) {
      const response = await callClaude(messages);
      steps++;

      if (response.stop_reason === 'end_turn') {
        const textBlock = response.content.find(c => c.type === 'text') as { type: 'text'; text: string } | undefined;
        finalSummary = textBlock?.text ?? 'Agent completed without summary.';
        break;
      }

      if (response.stop_reason === 'tool_use') {
        const toolBlocks = response.content.filter(c => c.type === 'tool_use') as Array<
          { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
        >;

        if (!toolBlocks.length) break;

        const toolResults: ClaudeContent[] = [];
        for (const toolBlock of toolBlocks) {
          const toolResult = await executeTool(toolBlock.name, toolBlock.input);
          actionsLog.push(`${toolBlock.name}(${JSON.stringify(toolBlock.input)}) → ${JSON.stringify(toolResult).slice(0, 200)}`);
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolBlock.id,
            content: JSON.stringify(toolResult),
          });
        }

        messages.push({ role: 'assistant', content: response.content });
        messages.push({ role: 'user', content: toolResults });
        continue;
      }

      break;
    }

    await logAgentRun(finalSummary, actionsLog, 'ok');

    return NextResponse.json({
      ok: true,
      steps,
      actions_taken: actionsLog.length,
      actions: actionsLog,
      summary: finalSummary,
      run_at: new Date().toISOString(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    await logAgentRun('Agent run failed', actionsLog, 'error', msg);
    return NextResponse.json({ ok: false, error: msg, actions: actionsLog }, { status: 200 });
  }
}
