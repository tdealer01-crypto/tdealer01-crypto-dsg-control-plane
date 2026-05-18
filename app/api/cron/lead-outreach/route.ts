// Lead Outreach — daily cron that sends cold outreach to GitHub leads
// that have not yet been contacted. Skips fake social-signal emails.
// Caps at 20 emails/run to respect Resend limits.

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';
import { sendGitHubLeadOutreach } from '../../../../lib/email/sales';

export const dynamic = 'force-dynamic';

const BATCH_SIZE = 20;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  const { data: leads, error } = await (supabase as any)
    .from('leads')
    .select('id, email, framework, github_repo, github_stars')
    .eq('source', 'github-signal')
    .eq('outreach_sent', false)
    .not('email', 'like', '%@social-lead.dsg.internal')
    .order('intent_score', { ascending: false })
    .limit(BATCH_SIZE);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let sent = 0;
  const errors: string[] = [];

  for (const lead of leads ?? []) {
    try {
      await sendGitHubLeadOutreach({
        email: lead.email,
        framework: lead.framework ?? 'langchain',
        githubRepo: lead.github_repo ?? '',
        githubStars: lead.github_stars ?? 0,
      });

      const { error: updateErr } = await (supabase as any)
        .from('leads')
        .update({ outreach_sent: true, outreach_sent_at: new Date().toISOString() })
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
    emails_sent: sent,
    errors: errors.slice(0, 3),
  });
}
