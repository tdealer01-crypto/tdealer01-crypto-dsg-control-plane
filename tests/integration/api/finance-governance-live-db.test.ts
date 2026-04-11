import { beforeEach, describe, expect, it } from 'vitest';
import { getSupabaseAdmin } from '../../../lib/supabase-server';

const hasSupabaseEnv = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
const describeLive = hasSupabaseEnv ? describe : describe.skip;

async function cleanupOrg(orgId: string) {
  const supabase = getSupabaseAdmin() as any;
  await supabase.from('finance_workflow_action_events').delete().eq('org_id', orgId);
  await supabase.from('finance_workflow_approvals').delete().eq('org_id', orgId);
  await supabase.from('finance_workflow_cases').delete().eq('org_id', orgId);
}

describeLive('finance governance API + repository + supabase (live)', () => {
  const orgA = `it-live-org-a-${Date.now()}`;
  const orgB = `it-live-org-b-${Date.now()}`;

  beforeEach(async () => {
    await cleanupOrg(orgA);
    await cleanupOrg(orgB);
  });

  it('keeps org data isolated: org A submit does not leak to org B', async () => {
    const { POST: submit } = await import('../../../app/api/finance-governance/submit/route');
    const { GET: workspaceSummary } = await import('../../../app/api/finance-governance/workspace/summary/route');

    const submitResponse = await submit(
      new Request('http://localhost/api/finance-governance/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-org-id': orgA },
        body: JSON.stringify({ caseId: 'sample-case' }),
      })
    );

    expect(submitResponse.status).toBe(200);

    const orgAResponse = await workspaceSummary(new Request('http://localhost/api/finance-governance/workspace/summary', { headers: { 'x-org-id': orgA } }));
    const orgABody = await orgAResponse.json();

    const orgBResponse = await workspaceSummary(new Request('http://localhost/api/finance-governance/workspace/summary', { headers: { 'x-org-id': orgB } }));
    const orgBBody = await orgBResponse.json();

    expect(orgAResponse.status).toBe(200);
    expect(orgABody.workspace.counts.readyExports).toBe(1);
    expect(orgBResponse.status).toBe(200);
    expect(orgBBody.workspace.counts.readyExports).toBe(0);
  });

  it('writes audit trail timeline for submit → approve flow', async () => {
    const { POST: submit } = await import('../../../app/api/finance-governance/submit/route');
    const { POST: approve } = await import('../../../app/api/finance-governance/approvals/[id]/approve/route');
    const { GET: caseDetail } = await import('../../../app/api/finance-governance/cases/[id]/route');

    const submitResponse = await submit(
      new Request('http://localhost/api/finance-governance/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-org-id': orgA },
        body: JSON.stringify({ caseId: 'sample-case' }),
      })
    );
    expect(submitResponse.status).toBe(200);

    const approveResponse = await approve(new Request('http://localhost/api/finance-governance/approvals/APR-1001/approve', { method: 'POST', headers: { 'x-org-id': orgA } }), {
      params: { id: 'APR-1001' },
    });
    expect(approveResponse.status).toBe(200);

    const caseResponse = await caseDetail(new Request('http://localhost/api/finance-governance/cases/sample-case', { headers: { 'x-org-id': orgA } }), {
      params: { id: 'sample-case' },
    });
    const caseBody = await caseResponse.json();

    expect(caseResponse.status).toBe(200);
    expect(caseBody.case.timeline.some((entry: string) => entry.startsWith('submit:'))).toBe(true);
    expect(caseBody.case.timeline.some((entry: string) => entry.startsWith('approve:'))).toBe(true);
  });

  it('persists submit/approve/reject/escalate actions to database', async () => {
    const { POST: submit } = await import('../../../app/api/finance-governance/submit/route');
    const { POST: approve } = await import('../../../app/api/finance-governance/approvals/[id]/approve/route');
    const { POST: reject } = await import('../../../app/api/finance-governance/approvals/[id]/reject/route');
    const { POST: escalate } = await import('../../../app/api/finance-governance/approvals/[id]/escalate/route');
    const supabase = getSupabaseAdmin() as any;

    expect(
      (
        await submit(
          new Request('http://localhost/api/finance-governance/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-org-id': orgA },
            body: JSON.stringify({ caseId: 'sample-case' }),
          })
        )
      ).status
    ).toBe(200);

    expect((await approve(new Request('http://localhost/api/finance-governance/approvals/APR-1001/approve', { method: 'POST', headers: { 'x-org-id': orgA } }), { params: { id: 'APR-1001' } })).status).toBe(200);
    expect((await reject(new Request('http://localhost/api/finance-governance/approvals/APR-1002/reject', { method: 'POST', headers: { 'x-org-id': orgA } }), { params: { id: 'APR-1002' } })).status).toBe(200);
    expect((await escalate(new Request('http://localhost/api/finance-governance/approvals/APR-1003/escalate', { method: 'POST', headers: { 'x-org-id': orgA } }), { params: { id: 'APR-1003' } })).status).toBe(200);

    const { data: events } = await supabase
      .from('finance_workflow_action_events')
      .select('action,org_id')
      .eq('org_id', orgA)
      .order('created_at', { ascending: true });
    const { data: approvals } = await supabase
      .from('finance_workflow_approvals')
      .select('id,status,org_id')
      .eq('org_id', orgA)
      .in('id', ['APR-1001', 'APR-1002', 'APR-1003']);

    expect((events ?? []).map((item: { action: string }) => item.action)).toEqual(
      expect.arrayContaining(['submit', 'approve', 'reject', 'escalate'])
    );

    const statusById = new Map((approvals ?? []).map((item: { id: string; status: string }) => [item.id, item.status]));
    expect(statusById.get('APR-1001')).toBe('approved');
    expect(statusById.get('APR-1002')).toBe('rejected');
    expect(statusById.get('APR-1003')).toBe('escalated');
  });
});
