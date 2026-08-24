import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { requireOrgPermission } from '@/lib/auth/require-org-permission';
import { createClient } from '@/lib/supabase/server';
import { sealRemoteEndpoint } from '@/lib/remote-action/crypto';
import { validateRemoteEndpoint } from '@/lib/remote-action/relay';
import { handleApiError } from '@/lib/security/api-error';

export const dynamic = 'force-dynamic';

interface ConnectBody {
  endpointUrl: string;
  executionId: string;
  planHash: string;
  expiresInMinutes?: number;
}

export async function POST(request: NextRequest) {
  const auth = await requireOrgPermission('org.execute');
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: (auth as { error: string }).error }, { status: 401 });
  }

  try {
    const body = (await request.json()) as ConnectBody;
    if (!body.endpointUrl || !body.executionId || !body.planHash) {
      return NextResponse.json(
        { ok: false, error: 'endpointUrl, executionId, and planHash are required' },
        { status: 400 },
      );
    }

    validateRemoteEndpoint(body.endpointUrl);
    const sealed = sealRemoteEndpoint(body.endpointUrl);
    const ttlMinutes = Math.min(Math.max(body.expiresInMinutes ?? 120, 5), 1440);
    const id = randomUUID();
    const expiresAt = new Date(Date.now() + ttlMinutes * 60_000).toISOString();

    const supabase = await createClient();
    const db = supabase as any;
    const { error } = await db.from('remote_action_sessions').insert({
      id,
      org_id: auth.orgId,
      user_id: auth.userId,
      endpoint_ciphertext: sealed.ciphertext,
      endpoint_iv: sealed.iv,
      status: 'ACTIVE',
      plan_hash: body.planHash,
      execution_id: body.executionId,
      expires_at: expiresAt,
    });

    if (error) {
      return NextResponse.json({ ok: false, error: 'remote_session_insert_failed' }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      session: {
        id,
        status: 'ACTIVE',
        executionId: body.executionId,
        planHash: body.planHash,
        expiresAt,
      },
      semantics: {
        userController: 'always_available',
        agentController: 'concurrent_while_remote_active',
        takeoverRequired: false,
        pauseResumeRequired: false,
      },
    });
  } catch (error) {
    return handleApiError('POST /api/remote/sessions', error);
  }
}

export async function GET() {
  const auth = await requireOrgPermission('org.execute');
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: (auth as { error: string }).error }, { status: 401 });
  }

  try {
    const supabase = await createClient();
    const db = supabase as any;
    const { data, error } = await db
      .from('remote_action_sessions')
      .select('id,status,plan_hash,execution_id,created_at,updated_at,expires_at')
      .eq('user_id', auth.userId)
      .eq('org_id', auth.orgId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ ok: false, error: 'remote_session_list_failed' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, sessions: data ?? [] });
  } catch (error) {
    return handleApiError('GET /api/remote/sessions', error);
  }
}
