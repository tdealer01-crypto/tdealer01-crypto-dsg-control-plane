// Lead Outreach — daily cron that sends cold outreach to GitHub leads
// that have not yet been contacted. Skips fake social-signal emails.
// Caps at 20 emails/run to respect Resend limits.

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';
import { sendGitHubLeadOutreach } from '../../../../lib/email/sales';
import { requireCronAuth } from '../../../../lib/security/cron-auth';

export const dynamic = 'force-dynamic';

const BATCH_SIZE = 20;

export async function GET(request: Request) {
  const auth = requireCronAuth(request, 'lead-outreach');
  if (!auth.ok) return auth.response;

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
    return NextResponse.json({ error: 'query failed' }, { status: 500, headers: auth.headers });
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
      else errors.push('update failed');
    } catch {
      errors.push('send failed');
    }
  }

  return NextResponse.json({
    ok: true,
    leads_found: (leads ?? []).length,
    emails_sent: sent,
    errors: errors.slice(0, 3),
  }, { headers: auth.headers });
}
