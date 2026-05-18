// Weekly Metrics Report — runs Monday at 8 AM UTC
// Aggregates all marketing + product metrics and emails founder

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';
import { getResend } from '../../../../lib/resend';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const founderEmail = process.env.FOUNDER_EMAIL;
  if (!founderEmail) {
    return NextResponse.json({ ok: false, error: 'FOUNDER_EMAIL not set' }, { status: 200 });
  }

  const admin = getSupabaseAdmin();
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const now = new Date().toISOString();

  // ── Lead pipeline metrics ────────────────────────────────────────────────
  const { data: allLeads } = await (admin as any).from('leads').select('source, intent, outreach_sent, outreach_sent_at, intent_score, created_at, messages');
  const leads = (allLeads ?? []) as Array<{
    source: string; intent: string; outreach_sent: boolean; outreach_sent_at: string | null;
    intent_score: number; created_at: string; messages: Array<{ role: string }> | null;
  }>;

  const totalLeads = leads.length;
  const newLeadsThisWeek = leads.filter(l => l.created_at >= weekAgo).length;
  const githubLeads = leads.filter(l => l.source === 'github-signal').length;
  const emailedTotal = leads.filter(l => l.outreach_sent).length;
  const emailedThisWeek = leads.filter(l => l.outreach_sent_at && l.outreach_sent_at >= weekAgo).length;
  const followupSent = leads.filter(l => (l.messages ?? []).some(m => m.role === 'followup')).length;
  const unsubscribed = leads.filter(l => l.intent === 'unsubscribed').length;
  const waitingOutreach = leads.filter(l => !l.outreach_sent && l.intent !== 'unsubscribed').length;
  const avgScore = leads.length
    ? Math.round(leads.map(l => l.intent_score || 0).reduce((a, b) => a + b, 0) / leads.length)
    : 0;

  // ── Trial signups ────────────────────────────────────────────────────────
  const { data: signups } = await (admin as any)
    .from('trial_signups')
    .select('status, created_at')
    .gte('created_at', weekAgo);
  const signupRows = (signups ?? []) as Array<{ status: string; created_at: string }>;
  const newSignups = signupRows.length;
  const completedSignups = signupRows.filter(s => s.status === 'completed').length;

  // ── Organizations ────────────────────────────────────────────────────────
  const { count: totalOrgs } = await (admin as any)
    .from('organizations')
    .select('id', { count: 'exact', head: true });
  const { count: newOrgs } = await (admin as any)
    .from('organizations')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', weekAgo);

  // ── Marketing agent runs ─────────────────────────────────────────────────
  let agentRuns: Array<{ run_at: string; summary: string; actions_taken: string[]; status: string }> = [];
  try {
    const { data } = await (admin as any)
      .from('marketing_agent_runs')
      .select('run_at, summary, actions_taken, status')
      .gte('run_at', weekAgo)
      .order('run_at', { ascending: false })
      .limit(7);
    agentRuns = data ?? [];
  } catch {
    // table may not exist yet
  }

  // ── Build email HTML ─────────────────────────────────────────────────────
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tdealer01-crypto-dsg-control-plane.vercel.app';
  const dateRange = `${new Date(weekAgo).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(now).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  const stat = (label: string, value: string | number, sub?: string) =>
    `<td style="text-align:center;padding:12px 16px;border-right:1px solid #e2e8f0">
      <div style="font-size:28px;font-weight:800;color:#1e293b">${value}</div>
      <div style="font-size:12px;color:#64748b;margin-top:2px">${label}</div>
      ${sub ? `<div style="font-size:11px;color:#94a3b8">${sub}</div>` : ''}
    </td>`;

  const agentRunsHtml = agentRuns.length
    ? agentRuns.map(r =>
        `<tr>
          <td style="padding:8px;font-size:12px;color:#64748b">${new Date(r.run_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</td>
          <td style="padding:8px;font-size:12px">${r.summary?.slice(0, 120) ?? '—'}</td>
          <td style="padding:8px;text-align:center"><span style="color:${r.status === 'ok' ? '#10b981' : '#ef4444'}">${r.status === 'ok' ? '✓' : '✗'}</span></td>
        </tr>`
      ).join('')
    : '<tr><td colspan="3" style="padding:8px;color:#94a3b8;font-size:12px">No agent runs this week</td></tr>';

  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:700px;margin:auto;background:#f8fafc;padding:0">
  <div style="background:#0f172a;padding:32px;border-radius:16px 16px 0 0">
    <p style="color:#94a3b8;font-size:11px;text-transform:uppercase;letter-spacing:0.15em;margin:0">DSG ONE</p>
    <h1 style="color:#f1f5f9;font-size:24px;margin:8px 0 4px">Weekly Marketing Report</h1>
    <p style="color:#64748b;margin:0;font-size:14px">${dateRange}</p>
  </div>

  <div style="background:#fff;padding:24px">

    <h2 style="font-size:14px;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;margin-bottom:16px">Lead Pipeline</h2>
    <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
      <tr style="background:#f8fafc">
        ${stat('Total Leads', totalLeads)}
        ${stat('New This Week', newLeadsThisWeek, 'from GitHub + social')}
        ${stat('GitHub Signal', githubLeads)}
        ${stat('Emailed (All)', emailedTotal)}
        ${stat('Emailed This Week', emailedThisWeek)}
      </tr>
      <tr style="background:#f8fafc">
        ${stat('Follow-ups Sent', followupSent)}
        ${stat('Waiting Outreach', waitingOutreach, 'not yet emailed')}
        ${stat('Unsubscribed', unsubscribed)}
        ${stat('Avg Intent Score', avgScore, 'out of 95')}
        <td></td>
      </tr>
    </table>

    <h2 style="font-size:14px;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;margin:28px 0 16px">Trial Signups</h2>
    <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
      <tr style="background:#f8fafc">
        ${stat('New Signups', newSignups, 'this week')}
        ${stat('Completed', completedSignups, 'org provisioned')}
        ${stat('Total Orgs', totalOrgs ?? 0, 'all time')}
        ${stat('New Orgs', newOrgs ?? 0, 'this week')}
        <td></td>
      </tr>
    </table>

    <h2 style="font-size:14px;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;margin:28px 0 16px">Marketing Agent Runs</h2>
    <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
      <thead>
        <tr style="background:#f8fafc;font-size:11px;text-transform:uppercase;color:#94a3b8">
          <th style="padding:8px;text-align:left">Date</th>
          <th style="padding:8px;text-align:left">Summary</th>
          <th style="padding:8px;text-align:center">Status</th>
        </tr>
      </thead>
      <tbody>${agentRunsHtml}</tbody>
    </table>

    <div style="margin-top:28px;padding:16px;background:#f0fdf4;border-radius:12px;border:1px solid #bbf7d0">
      <p style="margin:0;font-size:13px;color:#166534">
        <strong>Action needed if waiting_for_outreach > 20:</strong> check /admin/leads and manually trigger lead-outreach cron.<br/>
        <strong>Action needed if completed_signups > 0:</strong> reach out personally within 24h.
      </p>
    </div>

    <div style="margin-top:20px;text-align:center">
      <a href="${appUrl}/admin/leads" style="background:#f59e0b;color:#1e293b;padding:12px 24px;border-radius:8px;font-weight:700;text-decoration:none;font-size:14px;margin-right:8px">View Lead Pipeline →</a>
      <a href="${appUrl}/dashboard" style="background:#1e293b;color:#f1f5f9;padding:12px 24px;border-radius:8px;font-weight:700;text-decoration:none;font-size:14px">Dashboard →</a>
    </div>
  </div>
  <div style="padding:16px;text-align:center">
    <p style="font-size:11px;color:#94a3b8;margin:0">DSG ONE autonomous weekly report · ${appUrl}</p>
  </div>
</div>`;

  // ── Send email ───────────────────────────────────────────────────────────
  const resend = getResend();
  let emailed = false;
  if (resend.configured) {
    await resend.send({
      to: founderEmail,
      subject: `[DSG ONE] Weekly Report — ${newLeadsThisWeek} new leads, ${emailedThisWeek} emails sent`,
      html,
    });
    emailed = true;
  }

  return NextResponse.json({
    ok: true,
    period: dateRange,
    metrics: {
      total_leads: totalLeads,
      new_leads_this_week: newLeadsThisWeek,
      emailed_this_week: emailedThisWeek,
      waiting_outreach: waitingOutreach,
      new_signups: newSignups,
      completed_signups: completedSignups,
      total_orgs: totalOrgs,
      agent_runs_this_week: agentRuns.length,
    },
    emailed_to: emailed ? founderEmail : null,
  });
}
