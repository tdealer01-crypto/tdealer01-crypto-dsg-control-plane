// Lead Follow-up — daily cron that sends one follow-up email to GitHub leads
// that received outreach 3-10 days ago and haven't been followed up yet.
// Tracks follow-up state in the messages JSONB array (role='followup').

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';
import { sendGitHubLeadFollowup } from '../../../../lib/email/sales';

export const dynamic = 'force-dynamic';

const BATCH_SIZE = 20;
const FOLLOWUP_AFTER_DAYS = 3;
const FOLLOWUP_WINDOW_DAYS = 10;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const now = new Date();
  const windowStart = new Date(now.getTime() - FOLLOWUP_WINDOW_DAYS * 86_400_000).toISOString();
  const windowEnd = new Date(now.getTime() - FOLLOWUP_AFTER_DAYS * 86_400_000).toISOString();

  // Leads that were outreached 3-10 days ago, not unsubscribed, real emails only
  const { data: leads, error } = await (supabase as any)
    .from('leads')
    .select('id, email, framework, github_repo, messages')
    .eq('source', 'github-signal')
    .eq('outreach_sent', true)
    .neq('intent', 'unsubscribed')
    .not('email', 'like', '%@social-lead.dsg.internal')
    .gte('outreach_sent_at', windowStart)
    .lte('outreach_sent_at', windowEnd)
    .order('intent_score', { ascending: false })
    .limit(BATCH_SIZE);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const lead of leads ?? []) {
    const messages: Array<{ role: string }> = lead.messages ?? [];

    // Skip if follow-up already sent
    if (messages.some((m) => m.role === 'followup')) {
      skipped++;
      continue;
    }

    try {
      await sendGitHubLeadFollowup({
        email: lead.email,
        framework: lead.framework ?? 'langchain',
        githubRepo: lead.github_repo ?? '',
      });

      const updatedMessages = [
        ...messages,
        { role: 'followup', sent_at: new Date().toISOString() },
      ];

      const { error: updateErr } = await (supabase as any)
        .from('leads')
        .update({ messages: updatedMessages })
        .eq('id', lead.id);

      if (!updateErr) sent++;
      else errors.push(updateErr.message);
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }

  return NextResponse.json({
    ok: true,
    leads_found: (leads ?? []).length,
    followups_sent: sent,
    skipped,
    errors: errors.slice(0, 3),
  });
}
