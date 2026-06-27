// Trial Invite — daily cron that sends a trial invite to leads that received
// follow-up 7+ days ago, haven't unsubscribed, and haven't been invited yet.
// Caps at 20 emails/run.

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';
import { sendLeadTrialInvite } from '../../../../lib/email/sales';
import { requireCronAuth } from '../../../../lib/security/cron-auth';

export const dynamic = 'force-dynamic';

const BATCH_SIZE = 20;
const INVITE_AFTER_FOLLOWUP_DAYS = 7;

export async function GET(request: Request) {
  const auth = requireCronAuth(request, 'trial-invite');
  if (!auth.ok) return auth.response;

  const supabase = getSupabaseAdmin();
  const cutoff = new Date(Date.now() - INVITE_AFTER_FOLLOWUP_DAYS * 86_400_000).toISOString();

  const { data: leads, error } = await (supabase as any)
    .from('leads')
    .select('id, email, framework, github_repo, messages')
    .eq('source', 'github-signal')
    .eq('outreach_sent', true)
    .neq('intent', 'unsubscribed')
    .not('email', 'like', '%@social-lead.dsg.internal')
    .lte('outreach_sent_at', cutoff)
    .order('intent_score', { ascending: false })
    .limit(BATCH_SIZE);

  if (error) {
    return NextResponse.json({ error: 'query failed' }, { status: 500, headers: auth.headers });
  }

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const lead of leads ?? []) {
    const messages: Array<{ role: string }> = Array.isArray(lead.messages) ? lead.messages : [];

    if (messages.some((m) => m.role === 'trial_invite')) {
      skipped++;
      continue;
    }

    try {
      await sendLeadTrialInvite({
        email: lead.email,
        framework: lead.framework ?? 'langchain',
        githubRepo: lead.github_repo ?? '',
      });

      const updatedMessages = [
        ...messages,
        { role: 'trial_invite', sent_at: new Date().toISOString() },
      ];

      const { error: updateErr } = await (supabase as any)
        .from('leads')
        .update({ messages: updatedMessages })
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
    invites_sent: sent,
    skipped,
    errors: errors.slice(0, 3),
  }, { headers: auth.headers });
}
