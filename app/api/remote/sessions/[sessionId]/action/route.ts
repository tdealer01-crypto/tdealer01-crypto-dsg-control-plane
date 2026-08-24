import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { requireOrgPermission } from '@/lib/auth/require-org-permission';
import { createClient } from '@/lib/supabase/server';
import { evaluateAction } from '@/lib/dsg/evaluate-action';
import { openRemoteEndpoint } from '@/lib/remote-action/crypto';
import { relayRemoteAction } from '@/lib/remote-action/relay';
import type { RemoteAction, RemoteActionKind, RemoteSessionRecord } from '@/lib/remote-action/types';
import { handleApiError } from '@/lib/security/api-error';

export const dynamic = 'force-dynamic';

const ACTION_KINDS = new Set<RemoteActionKind>([
  'observe',
  'navigate',
  'pointer.move',
  'pointer.click',
  'pointer.scroll',
  'keyboard.type',
  'keyboard.press',
  'browser.screenshot',
]);

function actionType(kind: RemoteActionKind): 'observe' | 'read' | 'write' {
  if (kind === 'observe' || kind === 'pointer.move' || kind === 'pointer.scroll') return 'observe';
  if (kind === 'navigate' || kind === 'browser.screenshot') return 'read';
  return 'write';
}

function sha256(value: unknown): string {
  return `sha256:${createHash('sha256').update(JSON.stringify(value)).digest('hex')}`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const auth = await requireOrgPermission('org.execute');
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: (auth as { error: string }).error }, { status: 401 });
  }

  try {
    const { sessionId } = await params;
    const body = (await request.json()) as {
      executionId?: string;
      planHash?: string;
      agentId?: string;
      action?: RemoteAction;
    };

    if (!body.executionId || !body.planHash || !body.agentId || !body.action) {
      return NextResponse.json(
        { ok: false, error: 'executionId, planHash, agentId, and action are required' },
        { status: 400 },
      );
    }
    if (!ACTION_KINDS.has(body.action.kind)) {
      return NextResponse.json({ ok: false, error: 'unsupported_remote_action' }, { status: 400 });
    }

    const supabase = await createClient();
    const db = supabase as any;
    const { data, error } = await db
      .from('remote_action_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', auth.userId)
      .eq('org_id', auth.orgId)
      .single();

    if (error || !data) {
      return NextResponse.json({ ok: false, error: 'remote_session_not_found' }, { status: 404 });
    }

    const session = data as RemoteSessionRecord;
    if (session.status !== 'ACTIVE') {
      return NextResponse.json({ ok: false, error: 'remote_channel_disabled' }, { status: 409 });
    }
    if (new Date(session.expires_at).getTime() <= Date.now()) {
      await db.from('remote_action_sessions').update({ status: 'EXPIRED', updated_at: new Date().toISOString() }).eq('id', sessionId);
      return NextResponse.json({ ok: false, error: 'remote_session_expired' }, { status: 410 });
    }
    if (session.execution_id !== body.executionId || session.plan_hash !== body.planHash) {
      return NextResponse.json(
        { ok: false, error: 'remote_action_outside_bound_execution' },
        { status: 403 },
      );
    }

    // Approved-plan binding supplies the execution contract. Ordinary browser input
    // is not forced through a second per-click approval cycle.
    const gate = evaluateAction({
      workspaceId: auth.orgId,
      agentId: body.agentId,
      sessionId,
      action: `remote.${body.action.kind}`,
      actionType: actionType(body.action.kind),
      targetSystemId: 'user-shared-browser',
      riskLevel: 'low',
      actorId: auth.userId,
      actorRole: (auth.role as 'viewer' | 'operator' | 'approver' | 'admin' | 'owner') ?? 'operator',
      planHash: body.planHash,
      payload: body.action,
      idempotencyKey: request.headers.get('idempotency-key') ?? undefined,
    });

    if (!gate.canExecute) {
      return NextResponse.json(
        { ok: false, gated: true, decision: gate.decision, reasons: gate.reasons, decisionHash: gate.decisionHash },
        { status: 403 },
      );
    }

    const endpoint = openRemoteEndpoint(session.endpoint_ciphertext, session.endpoint_iv);
    const relayed = await relayRemoteAction({
      endpoint,
      sessionId,
      execution: {
        executionId: body.executionId,
        planHash: body.planHash,
        agentId: body.agentId,
      },
      action: body.action,
    });

    const { data: previous } = await db
      .from('remote_action_events')
      .select('event_hash')
      .eq('remote_session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const previousHash = previous?.event_hash ?? null;
    const eventCore = {
      remoteSessionId: sessionId,
      requestId: relayed.envelope.requestId,
      agentId: body.agentId,
      actionKind: body.action.kind,
      decision: 'ALLOW',
      decisionHash: gate.decisionHash,
      resultOk: relayed.result.ok,
      resultError: relayed.result.error ?? null,
      evidence: relayed.result.evidence ?? {},
      previousHash,
      issuedAt: relayed.envelope.issuedAt,
    };
    const eventHash = sha256(eventCore);

    await db.from('remote_action_events').insert({
      remote_session_id: sessionId,
      org_id: auth.orgId,
      user_id: auth.userId,
      request_id: relayed.envelope.requestId,
      agent_id: body.agentId,
      action_kind: body.action.kind,
      decision: 'ALLOW',
      decision_hash: gate.decisionHash,
      result_json: {
        ok: relayed.result.ok,
        error: relayed.result.error ?? null,
        evidence: relayed.result.evidence ?? {},
      },
      previous_hash: previousHash,
      event_hash: eventHash,
    });

    return NextResponse.json({
      ok: relayed.result.ok,
      requestId: relayed.envelope.requestId,
      action: body.action.kind,
      state: relayed.result.state ?? null,
      evidence: relayed.result.evidence ?? null,
      error: relayed.result.error ?? null,
      decisionHash: gate.decisionHash,
      eventHash,
      concurrency: 'USER_AND_AGENT_INPUT_CHANNELS_REMAIN_INDEPENDENT',
    });
  } catch (error) {
    return handleApiError('POST /api/remote/sessions/[sessionId]/action', error);
  }
}
