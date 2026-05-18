import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';
import { getMilestones, hasSent, recordSend } from '../../../../lib/marketing/milestones';
import { personalizeEmail } from '../../../../lib/marketing/ai-email';
import { internalErrorMessage, logApiError } from '../../../../lib/security/api-error';
import {
  sendBehavioralNoAgent,
  sendBehavioralEnableBlock,
  sendBehavioralStuckOffer,
  sendBehavioralHighUsage,
} from '../../../../lib/email/sales';

export const dynamic = 'force-dynamic';

function daysBetween(a: Date, b: Date) {
  return Math.floor((b.getTime() - a.getTime()) / 86_400_000);
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  const now = new Date();

  const { data: trials, error } = await (admin as any)
    .from('billing_subscriptions')
    .select('org_id, customer_email, plan_key, trial_start, trial_end')
    .eq('status', 'trialing')
    .not('trial_start', 'is', null)
    .not('customer_email', 'is', null);

  if (error) {
    logApiError('api/cron/smart-drip', error, { stage: 'load-trials' });
    return NextResponse.json({ error: internalErrorMessage() }, { status: 500 });
  }

  const results: string[] = [];

  for (const sub of trials ?? []) {
    const email = sub.customer_email as string;
    const orgId = sub.org_id as string;
    if (!email || !orgId) continue;

    const trialStart = new Date(sub.trial_start as string);
    const trialEnd = new Date(sub.trial_end as string);
    const daysIn = daysBetween(trialStart, now);
    const daysLeft = Math.max(0, daysBetween(now, trialEnd));

    const { count: execCount } = await (admin as any)
      .from('dsg_agent_ledger')
      .select('seq', { count: 'exact', head: true })
      .eq('org_id', orgId);
    const executions = Number(execCount ?? 0);

    const milestones = await getMilestones(orgId);
    const { data: org } = await (admin as any)
      .from('organizations')
      .select('name')
      .eq('id', orgId)
      .maybeSingle();

    const ctx = {
      email,
      workspaceName: org?.name ?? null,
      daysInTrial: daysIn,
      daysLeft,
      milestones,
      executions,
    };

    if (daysIn >= 1 && !milestones.has('agent_connected') && !(await hasSent(orgId, 'no_agent_d1'))) {
      const { subject, openingLine } = await personalizeEmail('no_agent_connected', ctx);
      void sendBehavioralNoAgent({ email, subject, openingLine });
      void recordSend(orgId, email, 'no_agent_d1');
      results.push(`${email}: no_agent_d1`);
      continue;
    }

    if (daysIn >= 3 && executions === 0 && !(await hasSent(orgId, 'no_execution_d3'))) {
      const { subject, openingLine } = await personalizeEmail('no_first_execution', ctx);
      void sendBehavioralNoAgent({ email, subject, openingLine });
      void recordSend(orgId, email, 'no_execution_d3');
      results.push(`${email}: no_execution_d3`);
      continue;
    }

    if (executions > 0 && !milestones.has('first_block') && !(await hasSent(orgId, 'enable_block'))) {
      const { subject, openingLine } = await personalizeEmail('enable_block_mode', ctx);
      void sendBehavioralEnableBlock({ email, subject, openingLine, executions });
      void recordSend(orgId, email, 'enable_block');
      results.push(`${email}: enable_block`);
      continue;
    }

    if (daysIn >= 10 && executions < 5 && !(await hasSent(orgId, 'stuck_offer_d10'))) {
      const { subject, openingLine } = await personalizeEmail('stuck_offer_call', ctx);
      void sendBehavioralStuckOffer({ email, subject, openingLine, daysLeft });
      void recordSend(orgId, email, 'stuck_offer_d10');
      results.push(`${email}: stuck_offer_d10`);
      continue;
    }

    if (executions > 50 && daysLeft < 5 && !(await hasSent(orgId, 'high_usage_upgrade'))) {
      const { subject, openingLine } = await personalizeEmail('high_usage_upgrade', ctx);
      void sendBehavioralHighUsage({ email, subject, openingLine, executions, daysLeft });
      void recordSend(orgId, email, 'high_usage_upgrade');
      results.push(`${email}: high_usage_upgrade`);
    }
  }

  return NextResponse.json({ ok: true, processed: trials?.length ?? 0, sent: results });
}
