// Internal milestone event endpoint — called by agents/SDK when key events occur.
// Auth: INTERNAL_SERVICE_TOKEN header OR org_admin JWT (for dashboard calls).
// Records milestone idempotently and fires immediate alerts (e.g. founder on first_block).

import { NextResponse } from 'next/server';
import { handleApiError } from '../../../../lib/security/api-error';
import { recordMilestone, recordSend } from '../../../../lib/marketing/milestones';
import { sendFounderAlertFirstBlock } from '../../../../lib/email/sales';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

const VALID_MILESTONES = new Set([
  'agent_connected',
  'first_execution',
  'first_block',
  'team_invited',
  'integration_connected',
]);

export async function POST(request: Request) {
  try {
    // Auth: internal service token OR skip check in dev
    const token = request.headers.get('x-internal-token') ?? request.headers.get('authorization')?.replace('Bearer ', '');
    const expectedToken = process.env.INTERNAL_SERVICE_TOKEN;
    if (expectedToken && token !== expectedToken) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null) as {
      org_id?: string;
      email?: string;
      milestone?: string;
      metadata?: Record<string, unknown>;
    } | null;

    if (!body?.org_id || !body?.milestone) {
      return NextResponse.json({ error: 'org_id and milestone required' }, { status: 400 });
    }

    if (!VALID_MILESTONES.has(body.milestone)) {
      return NextResponse.json({ error: 'invalid milestone', valid: [...VALID_MILESTONES] }, { status: 400 });
    }

    const { isNew } = await recordMilestone(
      body.org_id,
      body.milestone as Parameters<typeof recordMilestone>[1],
      { email: body.email, metadata: body.metadata },
    );

    // Immediate actions on wow moments
    if (isNew && body.milestone === 'first_block') {
      const admin = getSupabaseAdmin();
      const { data: org } = await (admin as any)
        .from('organizations')
        .select('name')
        .eq('id', body.org_id)
        .maybeSingle();

      const workspaceName = org?.name ?? body.org_id;
      const email = body.email ?? '';
      const action = String(body.metadata?.action ?? 'unknown action');
      const reason = String(body.metadata?.reason ?? '');

      if (email && !(await import('../../../../lib/marketing/milestones').then(m => m.hasSent(body.org_id!, 'founder_alert_first_block')))) {
        void sendFounderAlertFirstBlock({ orgId: body.org_id, workspaceName, email, action, reason });
        void recordSend(body.org_id, email, 'founder_alert_first_block');
      }
    }

    return NextResponse.json({ ok: true, milestone: body.milestone, isNew });
  } catch (error) {
    return handleApiError('api/milestone/event', error);
  }
}
