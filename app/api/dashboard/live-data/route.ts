import { NextResponse } from 'next/server';
import { requireOrgPermission } from '../../../../lib/auth/require-org-permission';
import { handleApiError } from '../../../../lib/security/api-error';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 50;

function parseLimit(request: Request) {
  const raw = Number.parseInt(new URL(request.url).searchParams.get('limit') || String(DEFAULT_LIMIT), 10);
  if (!Number.isFinite(raw) || raw < 1) return DEFAULT_LIMIT;
  return Math.min(raw, MAX_LIMIT);
}

export async function GET(request: Request) {
  try {
    const access = await requireOrgPermission('org.view_reports');
    if (access.ok !== true) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const limit = parseLimit(request);
    const admin = getSupabaseAdmin();

    const [kpis, agents, decisions, activities] = await Promise.all([
      admin
        .from('dashboard_overview_kpis')
        .select('*')
        .eq('org_id', access.orgId)
        .maybeSingle(),
      admin
        .from('dashboard_agent_status')
        .select('*')
        .eq('org_id', access.orgId)
        .order('last_execution_at', { ascending: false, nullsFirst: false })
        .limit(limit),
      admin
        .from('dashboard_policy_decisions')
        .select('*')
        .eq('org_id', access.orgId)
        .order('decision_at', { ascending: false })
        .limit(limit),
      admin
        .from('dashboard_activity_feed')
        .select('*')
        .eq('org_id', access.orgId)
        .order('created_at', { ascending: false })
        .limit(limit),
    ]);

    if (kpis.error) throw kpis.error;
    if (agents.error) throw agents.error;
    if (decisions.error) throw decisions.error;
    if (activities.error) throw activities.error;

    return NextResponse.json(
      {
        ok: true,
        org_id: access.orgId,
        generated_at: new Date().toISOString(),
        kpis: kpis.data ?? null,
        agents: agents.data ?? [],
        decisions: decisions.data ?? [],
        activities: activities.data ?? [],
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return handleApiError('api/dashboard/live-data', error);
  }
}
