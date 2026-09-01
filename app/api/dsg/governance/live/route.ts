import { NextRequest, NextResponse } from 'next/server';
import { requireOrgRole } from '@/lib/authz';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const access = await requireOrgRole(
    ['operator', 'org_admin', 'runtime_auditor', 'reviewer'],
    request,
  );
  if (!access.ok) {
    return NextResponse.json(
      { ok: false, error: access.error ?? 'Unauthorized' },
      { status: access.status },
    );
  }

  const rawLimit = Number(request.nextUrl.searchParams.get('limit') ?? '30');
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(Math.trunc(rawLimit), 1), 100) : 30;

  try {
    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from('dsg_audit_events')
      .select(
        'id, execution_id, event_type, agent_id, adapter_kind, action_kind, decision, status, policy_version, evidence_hash, previous_hash, current_hash, metadata, occurred_at, created_at',
      )
      .eq('event_type', 'governance_preflight')
      .contains('metadata', { org_id: access.orgId })
      .order('occurred_at', { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json(
        { ok: false, error: 'GOVERNANCE_FEED_UNAVAILABLE' },
        { status: 503 },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        refresh: 'poll-2s',
        truthBoundary: 'Feed contains persisted governance_preflight audit rows only; no synthetic events.',
        items: data ?? [],
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: 'GOVERNANCE_FEED_UNAVAILABLE' },
      { status: 503 },
    );
  }
}
