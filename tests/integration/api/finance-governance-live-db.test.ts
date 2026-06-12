import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getSupabaseAdmin } from '../../../lib/supabase-server';
import { FinanceGovernanceRepository } from '../../../lib/finance-governance/repository';

const hasSupabaseEnv = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
const describeLive = hasSupabaseEnv ? describe : describe.skip;
const writeHeaders = {
  'Content-Type': 'application/json',
  'x-actor-role': 'finance_approver',
  'x-org-plan': 'enterprise',
};

function orgHeaders(orgId: string, extra: Record<string, string> = {}) {
  return { ...writeHeaders, 'x-org-id': orgId, ...extra };
}

async function cleanupOrg(orgId: string) {
  const supabase = getSupabaseAdmin() as any;
  // Control-layer tables may or may not exist on the target DB — delete
  // best-effort and ignore per-table errors.
  for (const table of [
    'finance_evidence_bundles',
    'finance_exceptions',
    'finance_approval_decisions',
    'finance_approval_steps',
    'finance_approval_requests',
    'finance_transactions',
  ]) {
    await supabase.from(table).delete().eq('org_id', orgId);
  }
  await supabase.from('finance_workflow_action_events').delete().eq('org_id', orgId);
  await supabase.from('finance_workflow_approvals').delete().eq('org_id', orgId);
  await supabase.from('finance_workflow_cases').delete().eq('org_id', orgId);
}

describeLive('finance governance API + repository + supabase (live)', () => {
  const run = Date.now();
  const orgA = `it-live-org-a-${run}`;
  const orgB = `it-live-org-b-${run}`;
  // The repository requires the case and approvals to already exist —
  // submit/approve/reject/escalate mutate seeded rows, they do not create them.
  const caseId = `IT-CASE-${run}`;
  const aprApprove = `IT-APR-${run}-1`;
  const aprReject = `IT-APR-${run}-2`;
  const aprEscalate = `IT-APR-${run}-3`;

  async function seedWorkflowFixtures(orgId: string) {
    const supabase = getSupabaseAdmin() as any;

    const { error: caseError } = await supabase.from('finance_workflow_cases').upsert({
      id: caseId,
      org_id: orgId,
      status: 'pending',
      export_status: 'Not ready',
      vendor: 'Integration Test Vendor',
      amount: 1280,
      currency: 'USD',
      workflow: 'Invoice approval governance',
    });
    if (caseError) throw new Error(`seed case failed: ${JSON.stringify(caseError)}`);

    for (const aprId of [aprApprove, aprReject, aprEscalate]) {
      const { error: approvalError } = await supabase.from('finance_workflow_approvals').upsert({
        id: aprId,
        org_id: orgId,
        case_id: caseId,
        vendor: 'Integration Test Vendor',
        amount: '1280',
        status: 'Needs approver',
        risk: 'Medium',
      });
      if (approvalError) throw new Error(`seed approval failed: ${JSON.stringify(approvalError)}`);
    }

    // Mirror the seed into the control layer when those tables exist, since
    // the repository prefers them for approval actions. workflow_case_id is
    // left null so case-detail reads resolve through the legacy tables, where
    // the submit/approve audit timeline lives.
    const { error: probeError } = await supabase.from('finance_transactions').select('id').limit(1);
    if (!probeError) {
      for (const aprId of [aprApprove, aprReject, aprEscalate]) {
        const txnId = `TXN-${aprId}`;
        const { error: txnError } = await supabase.from('finance_transactions').upsert({
          id: txnId,
          org_id: orgId,
          workflow_case_id: null,
          vendor: 'Integration Test Vendor',
          amount: 1280,
          currency: 'USD',
          status: 'pending',
        });
        if (txnError) throw new Error(`seed transaction failed: ${JSON.stringify(txnError)}`);

        const { error: requestError } = await supabase.from('finance_approval_requests').upsert({
          id: aprId,
          org_id: orgId,
          transaction_id: txnId,
          status: 'pending',
          risk: 'Medium',
        });
        if (requestError) throw new Error(`seed approval request failed: ${JSON.stringify(requestError)}`);
      }
    }
  }

  beforeEach(async () => {
    await cleanupOrg(orgA);
    await cleanupOrg(orgB);
    await seedWorkflowFixtures(orgA);
  });

  afterEach(async () => {
    await cleanupOrg(orgA);
    await cleanupOrg(orgB);
  });

  it('keeps org data isolated: org A submit does not leak to org B', async () => {
    const { POST: submit } = await import('../../../app/api/finance-governance/submit/route');

    const submitResponse = await submit(
      new Request('http://localhost/api/finance-governance/submit', {
        method: 'POST',
        headers: orgHeaders(orgA),
        body: JSON.stringify({ caseId }),
      })
    );

    expect(submitResponse.status).toBe(200);

    const repository = new FinanceGovernanceRepository();
    const orgASummary = await repository.getWorkspaceSummary(orgA);
    const orgBSummary = await repository.getWorkspaceSummary(orgB);

    expect(orgASummary.counts.readyExports).toBe(1);
    expect(orgBSummary.counts.readyExports).toBe(0);
  });

  it('writes audit trail timeline for submit → approve flow', async () => {
    const { POST: submit } = await import('../../../app/api/finance-governance/submit/route');
    const { POST: approve } = await import('../../../app/api/finance-governance/approvals/[id]/approve/route');
    const { GET: caseDetail } = await import('../../../app/api/finance-governance/cases/[id]/route');

    const submitResponse = await submit(
      new Request('http://localhost/api/finance-governance/submit', {
        method: 'POST',
        headers: orgHeaders(orgA),
        body: JSON.stringify({ caseId }),
      })
    );
    expect(submitResponse.status).toBe(200);

    const approveResponse = await approve(new Request(`http://localhost/api/finance-governance/approvals/${aprApprove}/approve`, { method: 'POST', headers: orgHeaders(orgA) }), {
      params: Promise.resolve({ id: aprApprove }),
    });
    expect(approveResponse.status).toBe(200);

    const caseResponse = await caseDetail(new Request(`http://localhost/api/finance-governance/cases/${caseId}`, { headers: { 'x-org-id': orgA } }), {
      params: Promise.resolve({ id: caseId }),
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
            headers: orgHeaders(orgA),
            body: JSON.stringify({ caseId }),
          })
        )
      ).status
    ).toBe(200);

    expect((await approve(new Request(`http://localhost/api/finance-governance/approvals/${aprApprove}/approve`, { method: 'POST', headers: orgHeaders(orgA) }), { params: Promise.resolve({ id: aprApprove }) })).status).toBe(200);
    expect((await reject(new Request(`http://localhost/api/finance-governance/approvals/${aprReject}/reject`, { method: 'POST', headers: orgHeaders(orgA) }), { params: Promise.resolve({ id: aprReject }) })).status).toBe(200);
    expect((await escalate(new Request(`http://localhost/api/finance-governance/approvals/${aprEscalate}/escalate`, { method: 'POST', headers: orgHeaders(orgA) }), { params: Promise.resolve({ id: aprEscalate }) })).status).toBe(200);

    const { data: events } = await supabase
      .from('finance_workflow_action_events')
      .select('action,org_id')
      .eq('org_id', orgA)
      .order('created_at', { ascending: true });
    const { data: approvals } = await supabase
      .from('finance_workflow_approvals')
      .select('id,status,org_id')
      .eq('org_id', orgA)
      .in('id', [aprApprove, aprReject, aprEscalate]);

    expect((events ?? []).map((item: { action: string }) => item.action)).toEqual(
      expect.arrayContaining(['submit', 'approve', 'reject', 'escalate'])
    );

    const statusById = new Map((approvals ?? []).map((item: { id: string; status: string }) => [item.id, item.status]));
    expect(statusById.get(aprApprove)).toBe('approved');
    expect(statusById.get(aprReject)).toBe('rejected');
    expect(statusById.get(aprEscalate)).toBe('escalated');
  });
});
