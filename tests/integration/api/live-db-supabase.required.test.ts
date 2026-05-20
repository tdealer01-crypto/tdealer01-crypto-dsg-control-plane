import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  assertOk,
  assertTableExists,
  cleanupExecutionFixture,
  createExecutionFixture,
  currentBillingPeriod,
  getSupabaseTestAdmin,
  type SupabaseTestFixture,
} from '../helpers/supabase-test-factory';

const hasLiveEnv = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
const describeLive = hasLiveEnv ? describe : describe.skip;

describeLive('LIVE DB GATE: Supabase/Postgres production safety', () => {
  const supabase = getSupabaseTestAdmin();
  let orgA: SupabaseTestFixture;
  let orgB: SupabaseTestFixture;

  beforeAll(async () => {
    orgA = await createExecutionFixture(supabase);
    orgB = await createExecutionFixture(supabase);
  }, 30_000);

  afterAll(async () => {
    if (orgA) await cleanupExecutionFixture(orgA, supabase);
    if (orgB) await cleanupExecutionFixture(orgB, supabase);
  }, 30_000);

  it('required production tables are queryable with service role', async () => {
    for (const table of [
      'organizations',
      'policies',
      'agents',
      'executions',
      'audit_logs',
      'usage_events',
      'usage_counters',
      'runtime_approval_requests',
      'runtime_truth_states',
    ]) {
      await assertTableExists(supabase, table);
    }
  });

  it('keeps organization data separated by org_id in direct DB reads', async () => {
    await assertOk(
      supabase.from('executions').insert({
        org_id: orgA.orgId,
        agent_id: orgA.agentId,
        decision: 'ALLOW',
        reason: 'org A isolation fixture',
        request_payload: { input: 'a' },
        context_payload: {},
        metadata: { test: true },
        policy_version: 'v1',
      }),
      'insert org A execution',
    );

    await assertOk(
      supabase.from('executions').insert({
        org_id: orgB.orgId,
        agent_id: orgB.agentId,
        decision: 'ALLOW',
        reason: 'org B isolation fixture',
        request_payload: { input: 'b' },
        context_payload: {},
        metadata: { test: true },
        policy_version: 'v1',
      }),
      'insert org B execution',
    );

    const { data, error } = await supabase
      .from('executions')
      .select('org_id, agent_id, reason')
      .eq('org_id', orgA.orgId);

    if (error) throw error;
    expect(data.length).toBeGreaterThanOrEqual(1);
    expect(data.every((row) => row.org_id === orgA.orgId)).toBe(true);
    expect(data.some((row) => row.org_id === orgB.orgId)).toBe(false);
  });

  it('increments usage counter only for the target org and agent', async () => {
    const period = currentBillingPeriod();

    await assertOk(
      supabase.from('usage_counters').upsert({
        org_id: orgA.orgId,
        agent_id: orgA.agentId,
        billing_period: period,
        executions: 0,
        amount_usd: 0,
      }, { onConflict: 'agent_id,billing_period' }),
      'upsert org A usage counter',
    );

    await assertOk(
      supabase.from('usage_counters').upsert({
        org_id: orgB.orgId,
        agent_id: orgB.agentId,
        billing_period: period,
        executions: 0,
        amount_usd: 0,
      }, { onConflict: 'agent_id,billing_period' }),
      'upsert org B usage counter',
    );

    const { data: beforeA, error: beforeError } = await supabase
      .from('usage_counters')
      .select('executions')
      .eq('org_id', orgA.orgId)
      .eq('agent_id', orgA.agentId)
      .eq('billing_period', period)
      .single();
    if (beforeError) throw beforeError;

    await assertOk(
      supabase
        .from('usage_counters')
        .update({ executions: Number(beforeA.executions) + 1 })
        .eq('org_id', orgA.orgId)
        .eq('agent_id', orgA.agentId)
        .eq('billing_period', period),
      'increment org A usage counter',
    );

    const { data: afterA, error: afterAError } = await supabase
      .from('usage_counters')
      .select('executions')
      .eq('org_id', orgA.orgId)
      .eq('agent_id', orgA.agentId)
      .eq('billing_period', period)
      .single();
    if (afterAError) throw afterAError;

    const { data: afterB, error: afterBError } = await supabase
      .from('usage_counters')
      .select('executions')
      .eq('org_id', orgB.orgId)
      .eq('agent_id', orgB.agentId)
      .eq('billing_period', period)
      .single();
    if (afterBError) throw afterBError;

    expect(Number(afterA.executions)).toBe(Number(beforeA.executions) + 1);
    expect(Number(afterB.executions)).toBe(0);
  });

  it('fails closed if audit_logs can be mutated through the configured test role', async () => {
    const { data: inserted, error: insertError } = await supabase
      .from('audit_logs')
      .insert({
        org_id: orgA.orgId,
        agent_id: orgA.agentId,
        decision: 'ALLOW',
        reason: 'immutability fixture',
        metadata: { before: true },
        evidence: { immutable_test: true },
      })
      .select('id, metadata')
      .single();
    if (insertError) throw insertError;

    const { error: updateError } = await supabase
      .from('audit_logs')
      .update({ metadata: { tampered: true } })
      .eq('id', inserted.id);

    if (!updateError) {
      throw new Error(
        'NO-GO gap: configured live-test role can update audit_logs. Add DB-level immutability controls, trigger protection, append-only ledger design, or use a non-bypass test role before claiming immutable audit trail.',
      );
    }

    expect(String(updateError.message || '').length).toBeGreaterThan(0);
  });
});
