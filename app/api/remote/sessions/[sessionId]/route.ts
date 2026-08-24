import { NextRequest, NextResponse } from 'next/server';
import { requireOrgPermission } from '@/lib/auth/require-org-permission';
import { createClient } from '@/lib/supabase/server';
import { handleApiError } from '@/lib/security/api-error';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const auth = await requireOrgPermission('org.execute');
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: (auth as { error: string }).error }, { status: 401 });
  }

  try {
    const { sessionId } = await params;
    const supabase = await createClient();
    const db = supabase as any;
    const { data, error } = await db
      .from('remote_action_sessions')
      .select('id,status,plan_hash,execution_id,created_at,updated_at,expires_at')
      .eq('id', sessionId)
      .eq('user_id', auth.userId)
      .eq('org_id', auth.orgId)
      .single();

    if (error || !data) {
      return NextResponse.json({ ok: false, error: 'remote_session_not_found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, session: data });
  } catch (error) {
    return handleApiError('GET /api/remote/sessions/[sessionId]', error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const auth = await requireOrgPermission('org.execute');
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: (auth as { error: string }).error }, { status: 401 });
  }

  try {
    const { sessionId } = await params;
    const body = (await request.json()) as { remoteEnabled?: boolean };
    if (typeof body.remoteEnabled !== 'boolean') {
      return NextResponse.json({ ok: false, error: 'remoteEnabled boolean is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const db = supabase as any;
    const { data: current, error: readError } = await db
      .from('remote_action_sessions')
      .select('id,status,expires_at')
      .eq('id', sessionId)
      .eq('user_id', auth.userId)
      .eq('org_id', auth.orgId)
      .single();

    if (readError || !current) {
      return NextResponse.json({ ok: false, error: 'remote_session_not_found' }, { status: 404 });
    }

    if (new Date(current.expires_at).getTime() <= Date.now()) {
      await db.from('remote_action_sessions').update({ status: 'EXPIRED', updated_at: new Date().toISOString() }).eq('id', sessionId);
      return NextResponse.json({ ok: false, error: 'remote_session_expired' }, { status: 410 });
    }

    const status = body.remoteEnabled ? 'ACTIVE' : 'DISABLED';
    const { error } = await db
      .from('remote_action_sessions')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', sessionId)
      .eq('user_id', auth.userId)
      .eq('org_id', auth.orgId);

    if (error) {
      return NextResponse.json({ ok: false, error: 'remote_session_update_failed' }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      session: { id: sessionId, status },
      userBrowserUnaffected: true,
      agentRemoteChannel: status === 'ACTIVE' ? 'CONNECTED_ALLOWED' : 'REVOKED',
    });
  } catch (error) {
    return handleApiError('PATCH /api/remote/sessions/[sessionId]', error);
  }
}
