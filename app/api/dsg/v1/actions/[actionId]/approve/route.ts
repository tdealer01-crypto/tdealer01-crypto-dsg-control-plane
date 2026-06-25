import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { logApiError } from '@/lib/security/api-error';
import { requireOrgRole } from '@/lib/authz';
import { getConfirmationStatus, approveConfirmation } from '@/lib/user-confirmation-gate';

export const dynamic = 'force-dynamic';

interface ActionRow {
  action_id: string;
  org_id: string;
  confirmation_request_id: string | null;
  status: string;
  type: string;
  target: string;
  intent: string;
  payload: Record<string, any>;
  result?: Record<string, any>;
  error?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ actionId: string }> },
) {
  const access = await requireOrgRole(['operator', 'org_admin']);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { actionId } = await params;
  const supabase: any = getSupabaseAdmin();

  const { data, error: fetchError } = await supabase
    .from('dsg_actions')
    .select('*')
    .eq('action_id', actionId)
    .single() as { data: ActionRow | null; error: any };

  if (fetchError || !data) {
    return NextResponse.json({ error: 'Action not found' }, { status: 404 });
  }

  if (data.org_id !== access.orgId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!data.confirmation_request_id) {
    return NextResponse.json(
      { error: 'Action does not require confirmation' },
      { status: 400 },
    );
  }

  const confirmStatus = await getConfirmationStatus(data.confirmation_request_id, supabase);
  if (!confirmStatus) {
    return NextResponse.json({ error: 'Confirmation request not found' }, { status: 404 });
  }

  if (confirmStatus.status === 'APPROVED') {
    return NextResponse.json({ status: 'APPROVED', message: 'Already approved' });
  }
  if (confirmStatus.status === 'REJECTED') {
    return NextResponse.json({ status: 'REJECTED', message: 'Already rejected' });
  }

  const approved = await approveConfirmation(data.confirmation_request_id, access.userId, supabase);

  if (!approved) {
    return NextResponse.json({ error: 'Failed to approve action' }, { status: 500 });
  }

  await (supabase.from('dsg_actions' as any).update({ status: 'EXECUTING' }).eq('action_id', actionId));

  try {
    const result = await dispatchExecutor(data);
    await (supabase.from('dsg_actions' as any).update({
      status: 'SUCCEEDED',
      result,
      updated_at: new Date().toISOString(),
    }).eq('action_id', actionId));

    return NextResponse.json({ actionId, status: 'SUCCEEDED', result });
  } catch (err) {
    const errorMessage = String(err);
    logApiError(`api/dsg/v1/actions:${actionId}:execute`, err);

    await (supabase.from('dsg_actions' as any).update({
      status: 'FAILED',
      error: errorMessage,
      updated_at: new Date().toISOString(),
    }).eq('action_id', actionId));

    return NextResponse.json({ actionId, status: 'FAILED', error: 'Internal server error' }, { status: 500 });
  }
}

async function dispatchExecutor(action: ActionRow): Promise<Record<string, any>> {
  const payload = action.payload as Record<string, any>;

  switch (action.type) {
    case 'BROWSER_AGENT': {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

      const buildResp = await fetch(`${baseUrl}/api/safe-dom/browserbase/build-manifest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: payload.sessionId || `sess_${Date.now()}`,
          frameUrl: action.target,
        }),
      });

      if (!buildResp.ok) {
        const text = await buildResp.text();
        throw new Error(`Safe DOM manifest build failed: ${buildResp.status} ${text}`);
      }

      const manifest = await buildResp.json();
      const command = {
        action: payload.command?.action || 'navigate',
        elementId: payload.command?.elementId,
        elementPath: payload.command?.elementPath,
        value: payload.command?.value,
        frameId: manifest.frameId,
      };

      const execResp = await fetch(`${baseUrl}/api/safe-dom/browserbase/execute-command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: manifest.sessionId || manifest.manifestId,
          frameId: manifest.frameId,
          command,
        }),
      });

      if (!execResp.ok) {
        const text = await execResp.text();
        throw new Error(`Browser execute failed: ${execResp.status} ${text}`);
      }

      return {
        ...(await execResp.json()),
        safeDom: {
          manifestId: manifest.manifestId,
          frameId: manifest.frameId,
          elementsCaptured: manifest.view?.length ?? 0,
        },
      };
    }

    case 'PROVIDER_API': {
      return {
        target: action.target,
        status: 'dispatched',
        message: `Provider API call routed to ${action.target}`,
        note: 'Real provider dispatch requires registry mapping target → SDK/config',
      };
    }

    case 'DYNAMIC_SANDBOX': {
      return {
        target: action.target,
        status: 'dispatched',
        message: 'Sandbox execution queued',
        note: 'Real sandbox runtime not implemented in this route',
      };
    }

    default:
      throw new Error(`Unsupported action type: ${action.type}`);
  }
}
