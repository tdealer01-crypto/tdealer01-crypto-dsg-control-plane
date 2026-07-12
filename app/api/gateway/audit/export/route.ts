import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../../lib/supabase-server';
import { createClient } from '../../../../../lib/supabase/server';
import { captureEvent } from '../../../../../lib/telemetry/capture-event';

export const dynamic = 'force-dynamic';

function header(request: Request, name: string) {
  return request.headers.get(name)?.trim() ?? '';
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orgId = header(request, 'x-org-id') || searchParams.get('orgId')?.trim() || '';
  const auditToken = searchParams.get('auditToken')?.trim() || '';

  if (!orgId) {
    return NextResponse.json({ ok: false, error: 'missing_org_id' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin() as any;
  let query = supabase
    .from('gateway_monitor_events')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (auditToken) {
    query = query.eq('audit_token', auditToken).limit(1);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }

  // Get current user for telemetry
  let userId = 'unknown';
  try {
    const supabaseAuth = await createClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    userId = user?.id || 'unknown';
  } catch {
    // Continue without user ID
  }

  // Capture evidence_exported event
  const eventCount = Array.isArray(data) ? data.length : 0;
  void captureEvent('evidence_exported', {
    userId,
    organizationId: orgId,
  }, {
    organization_id: orgId,
    export_type: 'gateway-monitor-audit',
    event_count: eventCount,
    audit_token: auditToken || null,
    exported_by_user_id: userId,
  }).catch((error) => {
    console.error('[gateway-audit-export] Failed to capture event:', error);
  });

  return NextResponse.json(
    {
      ok: true,
      type: 'gateway-monitor-audit-export',
      exportedAt: new Date().toISOString(),
      orgId,
      count: eventCount,
      events: data ?? [],
    },
    {
      status: 200,
      headers: {
        'content-disposition': 'attachment; filename="gateway-monitor-audit-export.json"',
      },
    }
  );
}
