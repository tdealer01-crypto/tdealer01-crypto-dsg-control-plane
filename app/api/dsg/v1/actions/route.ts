import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { internalErrorMessage, logApiError, toSafeErrorResponse } from '@/lib/security/api-error';
import { requireOrgRole } from '@/lib/authz';
import { requestUserConfirmation, waitForConfirmation } from '@/lib/user-confirmation-gate';
import type { AgentWorkStep } from '@/lib/delegation/types';

export const dynamic = 'force-dynamic';

type ActionType = 'DYNAMIC_SANDBOX' | 'PROVIDER_API' | 'BROWSER_AGENT';

export interface ActionPayload {
  type: ActionType;
  target: string;
  intent: string;
  generatedCodeOrPayload: string | Record<string, any>;
  metadata?: Record<string, any>;
}

type ConfirmationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'EXECUTING' | 'SUCCEEDED' | 'FAILED';

interface ActionRecord {
  action_id: string;
  org_id: string;
  user_id: string;
  type: ActionType;
  target: string;
  intent: string;
  payload: Record<string, any>;
  status: ConfirmationStatus;
  confirmation_request_id?: string;
  result?: Record<string, any>;
  error?: string;
  created_at: string;
  updated_at: string;
}

function classifyRisk(action: ActionPayload): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  if (action.type === 'DYNAMIC_SANDBOX') return 'CRITICAL';
  if (action.type === 'PROVIDER_API') {
    const highRiskTargets = ['AWS_EC2', 'AWS_LAMBDA_DELETE', 'STRIPE_REFUND', 'PAYOUT', 'BANK_TRANSFER'];
    if (highRiskTargets.some((t) => action.target.toUpperCase().includes(t))) return 'HIGH';
    return 'MEDIUM';
  }
  if (action.type === 'BROWSER_AGENT') return 'MEDIUM';
  return 'MEDIUM';
}

function requiresConfirmation(risk: string): boolean {
  return risk === 'MEDIUM' || risk === 'HIGH' || risk === 'CRITICAL';
}

async function executeBrowserAgent(target: string, intent: string, payload: Record<string, any>): Promise<Record<string, any>> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const buildResp = await fetch(`${baseUrl}/api/safe-dom/browserbase/build-manifest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: payload.sessionId || `sess_${Date.now()}`,
      frameUrl: target,
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

async function dispatchExecutor(action: ActionRecord): Promise<Record<string, any>> {
  const payload = action.payload as Record<string, any>;

  switch (action.type) {
    case 'BROWSER_AGENT': {
      return await executeBrowserAgent(action.target, action.intent, payload);
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

export async function POST(request: NextRequest) {
  const access = await requireOrgRole(['operator', 'org_admin']);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  let body: ActionPayload;
  try {
    body = (await request.json()) as ActionPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  if (!body.type || !body.target || !body.intent) {
    return NextResponse.json(
      { error: 'Missing required fields: type, target, intent' },
      { status: 400 },
    );
  }

  const validTypes: ActionType[] = ['DYNAMIC_SANDBOX', 'PROVIDER_API', 'BROWSER_AGENT'];
  if (!validTypes.includes(body.type)) {
    return NextResponse.json({ error: `Invalid action type: ${body.type}` }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const actionId = `act_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const risk = classifyRisk(body);
  const needsConfirm = requiresConfirmation(risk);

  const actionRecord: ActionRecord = {
    action_id: actionId,
    org_id: access.orgId,
    user_id: access.userId,
    type: body.type,
    target: body.target,
    intent: body.intent,
    payload: {
      generatedCodeOrPayload: body.generatedCodeOrPayload,
      ...(body.metadata ?? {}),
    },
    status: needsConfirm ? 'PENDING' : 'EXECUTING',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    const { error: insertError } = await supabase
      .from('dsg_actions' as any)
      .insert(actionRecord);

    if (insertError) {
      logApiError('api/dsg/v1/actions:insert', insertError);
      return NextResponse.json(
        { error: 'Failed to create action record' },
        { status: 500 },
      );
    }

    if (!needsConfirm) {
      actionRecord.status = 'EXECUTING';
      await (supabase.from('dsg_actions' as any).update({ status: 'EXECUTING' }).eq('action_id', actionId));

      try {
        const result = await dispatchExecutor(actionRecord);
        actionRecord.status = 'SUCCEEDED';
        actionRecord.result = result;
      } catch (err) {
        actionRecord.status = 'FAILED';
        logApiError('api/dsg/v1/actions:execute', err);
        actionRecord.error = internalErrorMessage();
      }

      await (supabase.from('dsg_actions' as any).update({
        status: actionRecord.status,
        result: actionRecord.result,
        error: actionRecord.error,
        updated_at: new Date().toISOString(),
      }).eq('action_id', actionId));

      return NextResponse.json({
        actionId,
        status: actionRecord.status,
        decision: 'ALLOW',
        risk,
        result: actionRecord.result,
        error: actionRecord.error,
      });
    }

    const confirmation = await requestUserConfirmation(
      {
        delegation_id: actionId,
        job_id: actionId,
        step: {
          stepId: actionId,
          tool: `action:${body.type.toLowerCase()}`,
          action: body.target,
          params: {
            target: body.target,
            intent: body.intent,
            payload: body.generatedCodeOrPayload,
          },
          risk,
          requiresConfirmation: true,
        } as any,
        evidence: {
          target: body.target,
          intent: body.intent,
          risk,
          actionType: body.type,
        },
      },
      supabase,
    );

    if (!confirmation) {
      return NextResponse.json(
        { error: 'Failed to create confirmation request' },
        { status: 500 },
      );
    }

    await (supabase.from('dsg_actions' as any).update({
      confirmation_request_id: confirmation.request_id,
    }).eq('action_id', actionId));

    return NextResponse.json({
      actionId,
      status: 'PENDING',
      confirmationRequestId: confirmation.request_id,
      decision: 'REVIEW',
      risk,
      message: 'Awaiting pilot confirmation',
      instructions: {
        approve: `/api/dsg/v1/actions/${actionId}/approve`,
        reject: `/api/dsg/v1/actions/${actionId}/reject`,
      },
    });
  } catch (error) {
    logApiError('api/dsg/v1/actions:dispatch', error);
    return NextResponse.json(toSafeErrorResponse(500), { status: 500 });
  }
}
