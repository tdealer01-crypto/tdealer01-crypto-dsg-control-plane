/**
 * Cron: Usage Alert Pipeline
 *
 * Runs daily. Scans all orgs for quota consumption > 80%.
 * Sends upgrade nudge emails via Resend.
 *
 * Revenue impact: 15-25% upgrade conversion at 80% threshold
 * (industry benchmark, Metronome/Stripe 2026 pricing report).
 *
 * Schedule: set in vercel.json — runs at 07:00 UTC daily.
 */

import { NextResponse } from 'next/server';
import { scanOrgsForNudge, type UsageSnapshot } from '../../../../lib/revenue/upgrade-nudge';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';
import { getResend } from '../../../../lib/resend';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type NudgeEmailPayload = {
  to: string;
  orgId: string;
  snapshot: UsageSnapshot;
};

function buildNudgeEmail(payload: NudgeEmailPayload): { subject: string; html: string } {
  const { snapshot } = payload;
  const urgency = snapshot.nudge === 'hard' ? '⚠️ Action Required' : '📊 Usage Update';
  const pctBar  = '█'.repeat(Math.floor(snapshot.pct / 10)) + '░'.repeat(10 - Math.floor(snapshot.pct / 10));

  const subject = snapshot.nudge === 'hard'
    ? `[DSG ONE] You've used ${snapshot.pct}% of your ${snapshot.plan} quota`
    : `[DSG ONE] ${snapshot.pct}% of your monthly quota used`;

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #111;">
  <h2 style="color: ${snapshot.nudge === 'hard' ? '#dc2626' : '#1d4ed8'};">${urgency}</h2>

  <p>Your organization has used <strong>${snapshot.used.toLocaleString()}</strong> of
  <strong>${snapshot.limit.toLocaleString()}</strong> executions this month.</p>

  <div style="background: #f1f5f9; border-radius: 8px; padding: 16px; margin: 20px 0; font-family: monospace;">
    <div style="font-size: 13px; color: #64748b; margin-bottom: 4px;">
      Quota Usage — ${snapshot.pct}%
    </div>
    <div style="font-size: 18px; color: ${snapshot.pct >= 95 ? '#dc2626' : '#1d4ed8'};">
      ${pctBar} ${snapshot.pct}%
    </div>
  </div>

  ${snapshot.nextPlan ? `
  <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 20px 0;">
    <strong>Upgrade to ${snapshot.nextPlan}</strong><br>
    Get <strong>${snapshot.nextPlanQuota?.toLocaleString()} executions/month</strong>
    ${snapshot.savingsVsMonthly ? `(${snapshot.savingsVsMonthly})` : ''}<br><br>
    <a href="${snapshot.upgradeUrl}"
       style="background: #1d4ed8; color: white; padding: 10px 20px; border-radius: 6px;
              text-decoration: none; display: inline-block; font-weight: 600;">
      Upgrade Now →
    </a>
  </div>
  ` : '<p>You are on our highest plan. Contact us for custom enterprise volumes.</p>'}

  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
  <p style="color: #64748b; font-size: 13px;">
    DSG ONE Control Plane · Quota resets on the 1st of each month ·
    <a href="${process.env.NEXT_PUBLIC_APP_URL}/settings/notifications">Manage notifications</a>
  </p>
</body>
</html>`;

  return { subject, html };
}

async function getOrgAdminEmails(orgIds: string[]): Promise<Map<string, string[]>> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from('users')
    .select('org_id, email')
    .in('org_id', orgIds)
    .eq('is_active', true)
    .not('email', 'is', null);

  const map = new Map<string, string[]>();
  for (const row of data ?? []) {
    if (!row.org_id || !row.email) continue;
    const existing = map.get(row.org_id) ?? [];
    existing.push(row.email);
    map.set(row.org_id, existing);
  }
  return map;
}

function authorizeCron(request: Request): NextResponse | null {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null;
}

export async function GET(request: Request) {
  const authError = authorizeCron(request);
  if (authError) return authError;

  try {
    const snapshots = await scanOrgsForNudge(['soft', 'hard']);

    if (snapshots.length === 0) {
      return NextResponse.json({ ok: true, nudged: 0, message: 'No orgs above threshold' });
    }

    const orgIds     = snapshots.map(s => s.orgId);
    const emailMap   = await getOrgAdminEmails(orgIds);
    const resend     = getResend();

    let sent    = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const snapshot of snapshots) {
      const emails = emailMap.get(snapshot.orgId) ?? [];
      if (emails.length === 0) { skipped++; continue; }

      for (const to of emails) {
        const { subject, html } = buildNudgeEmail({ to, orgId: snapshot.orgId, snapshot });

        if (!resend.configured) {
          console.log(`[usage-alerts] SKIP (Resend not configured): ${to} — ${subject}`);
          skipped++;
          continue;
        }

        try {
          const result = await (resend as any).send({
            to,
            subject,
            html,
          });
          if (result.ok) {
            sent++;
          } else {
            errors.push(`${to}: ${result.error}`);
          }
        } catch (err) {
          errors.push(`${to}: ${String(err)}`);
        }
      }
    }

    return NextResponse.json({
      ok: true,
      scanned: snapshots.length,
      nudged: sent,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
      distribution: {
        soft: snapshots.filter(s => s.nudge === 'soft').length,
        hard: snapshots.filter(s => s.nudge === 'hard').length,
      },
    });
  } catch (err) {
    console.error('[usage-alerts] cron failed:', err);
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
