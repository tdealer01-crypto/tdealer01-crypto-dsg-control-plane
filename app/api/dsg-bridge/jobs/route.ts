import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { dsgOneClient } from '../../../../lib/dsg-one/client';
import { writeFinanceGovernanceAuditLedger } from '../../../../lib/finance-governance/audit-ledger';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

// GET /api/dsg-bridge/jobs — list jobs from dsg-one-v1
export async function GET() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const result = await dsgOneClient.jobs.list(session.access_token);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status || 502 });

  return NextResponse.json(result.data);
}

// POST /api/dsg-bridge/jobs — create job in dsg-one-v1 + audit trail in control-plane
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body?.goal) return NextResponse.json({ error: 'goal is required' }, { status: 400 });

  const result = await dsgOneClient.jobs.create(session.access_token, {
    goal: body.goal,
    successCriteria: body.successCriteria ?? [],
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status || 502 });

  // Best-effort audit entry in control-plane ledger
  const jobId = (result.data as any)?.jobId ?? (result.data as any)?.id ?? 'unknown';
  const orgId = (session.user.user_metadata?.org_id as string | undefined) ?? 'unknown';
  await writeFinanceGovernanceAuditLedger(getSupabaseAdmin(), {
    orgId,
    caseId: jobId,
    approvalId: null,
    action: 'submit',
    actor: session.user.email ?? session.user.id,
    result: 'ok',
    target: 'dsg-one-v1',
    message: `DSG job created via bridge: ${body.goal}`,
    nextStatus: 'running',
    payload: { ok: true, action: 'submit', message: body.goal, nextStatus: 'running', caseId: jobId },
  }).catch(() => null);

  return NextResponse.json({ ...result.data, _bridge: 'dsg-one-v1' });
}
