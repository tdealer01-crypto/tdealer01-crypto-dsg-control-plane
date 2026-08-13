// Lead Outreach — daily cron that processes cold outreach for GitHub leads
// that have not yet been contacted. Skips fake social-signal emails.
// Caps at 20 leads/run. Default policy queues drafts for human approval.

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';
import { sendGitHubLeadOutreach } from '../../../../lib/email/sales';
import { requireCronAuth } from '../../../../lib/security/cron-auth';
import { getOutreachMode } from '../../../../lib/marketing/outreach-policy';

export const dynamic = 'force-dynamic';

const BATCH_SIZE = 20;

export async function GET(request: Request) {
  const auth = requireCronAuth(request, 'lead-outreach');
  if (!auth.ok) return auth.response;

  const mode = getOutreachMode();
  if (mode === 'off') {
    return NextResponse.json(
      { ok: true, mode, leads_found: 0, emails_sent: 0, queued: 0 },
      { headers: auth.headers },
    );
  }

  const supabase = getSupabaseAdmin();

  const { data: leads, error } = await (supabase as any)
    .from('leads')
    .select('id, email, framework, github_repo, github_stars')
    .eq('source', 'github-signal')
    .eq('outreach_sent', false)
    .neq('intent', 'unsubscribed')
    .not('email', 'like', '%@social-lead.dsg.internal')
    .not('email', 'like', '%@social-signal.dsg.internal')
    .order('intent_score', { ascending: false })
    .limit(BATCH_SIZE);

  if (error) {
    return NextResponse.json({ error: 'query failed' }, { status: 500, headers: auth.headers });
  }

  let sent = 0;
  let queued = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const lead of leads ?? []) {
    const framework = lead.framework ?? 'langchain';
    const githubRepo = lead.github_repo ?? '';
    const githubStars = Number(lead.github_stars ?? 0);

    if (!lead.email || !githubRepo) {
      skipped++;
      continue;
    }

    if (mode === 'queue') {
      const { error: queueErr } = await (supabase as any)
        .from('outreach_approvals')
        .insert({
          lead_email: lead.email,
          framework,
          github_repo: githubRepo,
          github_stars: githubStars,
        });

      if (!queueErr) {
        queued++;
      } else if (String(queueErr.code ?? '') === '23505') {
        skipped++;
      } else {
        errors.push('queue failed');
      }
      continue;
    }

    try {
      await sendGitHubLeadOutreach({
        email: lead.email,
        framework,
        githubRepo,
        githubStars,
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
    mode,
    leads_found: (leads ?? []).length,
    emails_sent: sent,
    queued,
    skipped,
    errors: errors.slice(0, 3),
  }, { headers: auth.headers });
}
