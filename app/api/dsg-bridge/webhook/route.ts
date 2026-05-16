import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';
import { writeFinanceGovernanceAuditLedger } from '../../../../lib/finance-governance/audit-ledger';

export const dynamic = 'force-dynamic';

// Verify webhook signature from dsg-one-v1
// Set DSG_ONE_WEBHOOK_SECRET in both Vercel projects (same value)
function verifySignature(body: string, signature: string | null): boolean {
  const secret = process.env.DSG_ONE_WEBHOOK_SECRET;
  if (!secret) return true; // skip verification if secret not configured
  if (!signature) return false;
  // Simple HMAC-SHA256 check — dsg-one-v1 must send x-dsg-signature: sha256=<hmac>
  const expected = `sha256=${require('crypto').createHmac('sha256', secret).update(body).digest('hex')}`;
  return signature === expected;
}

type DsgOneEvent = {
  event: string;           // e.g. 'job.completed', 'job.failed', 'tool.called', 'agent.step'
  jobId?: string;
  workspaceId?: string;
  orgId?: string;
  actor?: string;
  result?: string;
  message?: string;
  payload?: Record<string, unknown>;
  timestamp?: string;
};

async function handleEvent(event: DsgOneEvent) {
  const supabase = getSupabaseAdmin();
  const orgId = event.orgId ?? event.workspaceId ?? 'dsg-one-v1';
  const jobId = event.jobId ?? null;

  // Map dsg-one-v1 event → finance governance audit action
  const actionMap: Record<string, 'approve' | 'submit' | 'escalate' | 'reject'> = {
    'job.completed': 'approve',
    'job.failed':    'reject',
    'job.created':   'submit',
    'tool.called':   'submit',
    'agent.step':    'submit',
  };
  const action = actionMap[event.event] ?? 'submit';
  const result = event.event.includes('failed') ? 'error' : 'ok';

  await writeFinanceGovernanceAuditLedger(supabase, {
    orgId,
    caseId: jobId,
    approvalId: null,
    action,
    actor: event.actor ?? 'dsg-one-v1',
    result: result as 'ok' | 'error' | 'denied',
    target: 'dsg-one-v1',
    message: event.message ?? `${event.event} received`,
    nextStatus: event.result ?? event.event,
    payload: {
      ok: true,
      action,
      message: event.message ?? event.event,
      nextStatus: event.result ?? event.event,
      caseId: jobId ?? '',
    },
  });
}

// POST /api/dsg-bridge/webhook
// Receives job/agent events from dsg-one-v1 and writes them to the audit ledger.
// Set CONTROL_PLANE_WEBHOOK_URL = https://<this-domain>/api/dsg-bridge/webhook
// in the dsg-one-v1 Vercel project.
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-dsg-signature');

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 });
  }

  let event: DsgOneEvent;
  try {
    event = JSON.parse(rawBody) as DsgOneEvent;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!event.event) {
    return NextResponse.json({ error: 'event field is required' }, { status: 400 });
  }

  // Handle async — respond 200 immediately, process in background
  void handleEvent(event).catch((err) => {
    console.error('[dsg-bridge/webhook]', err);
  });

  return NextResponse.json({
    ok: true,
    received: event.event,
    timestamp: new Date().toISOString(),
  });
}
