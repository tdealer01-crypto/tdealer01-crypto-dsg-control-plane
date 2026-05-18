import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getSupabaseAdmin } from '../../../lib/supabase-server';

const hasEnv = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
const describeLive = hasEnv ? describe : describe.skip;
const orgId = 'it-live-audit-evidence';
const caseId = 'audit-evidence-case';

async function cleanupOrg() {
  const supabase = getSupabaseAdmin() as any;
  await supabase.from('finance_workflow_action_events').delete().eq('org_id', orgId);
  await supabase.from('finance_workflow_approvals').delete().eq('org_id', orgId);
  await supabase.from('finance_workflow_cases').delete().eq('org_id', orgId);
}

describeLive('audit evidence fields', () => {
  beforeEach(async () => {
    await cleanupOrg();
  });

  afterEach(async () => {
    await cleanupOrg();
  });

  it('action events contain required audit fields after a live submit', async () => {
    const { POST: submit } = await import('../../../app/api/finance-governance/submit/route');
    const supabase = getSupabaseAdmin() as any;

    const submitResponse = await submit(
      new Request('http://localhost/api/finance-governance/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-org-id': orgId,
          'x-actor-role': 'finance_approver',
          'x-org-plan': 'enterprise',
        },
        body: JSON.stringify({ caseId }),
      })
    );

    expect(submitResponse.status).toBe(200);

    const { data, error } = await supabase
      .from('finance_workflow_action_events')
      .select('action, actor, result, target, created_at')
      .eq('org_id', orgId)
      .eq('action', 'submit')
      .limit(1);

    expect(error).toBeFalsy();
    expect(data).toHaveLength(1);

    const event = data[0];
    expect(event.action).toBe('submit');
    expect(event.actor).toBeTruthy();
    expect(event.result).toBeTruthy();
    expect(event.target).toBeTruthy();
    expect(event.created_at).toBeTruthy();
  });
});
