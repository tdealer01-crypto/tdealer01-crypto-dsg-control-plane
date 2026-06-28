import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  assertOk,
  cleanupExecutionFixture,
  countRows,
  createExecutionFixture,
  waitForCountRows,
  getSupabaseTestAdmin,
  type SupabaseTestFixture,
} from '../helpers/supabase-test-factory';

const hasLiveEnv = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
// Live-DB suites only run when explicitly opted in (dedicated test:live:db scripts).
const runLiveDb = process.env.RUN_LIVE_DB_TESTS === 'true';
const describeLive = hasLiveEnv && runLiveDb ? describe : describe.skip;

function executeRequest(fixture: SupabaseTestFixture, input: unknown = { message: 'live-db-test' }) {
  return new Request('http://localhost/api/execute', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${fixture.apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      agent_id: fixture.agentId,
      action: 'live_db_execute_test',
      input,
      context: { test_run: fixture.orgId },
    }),
  });
}

describeLive('/api/execute live Supabase required gate', () => {
  let supabase: ReturnType<typeof getSupabaseTestAdmin>;
  let fixture: SupabaseTestFixture;

  beforeAll(async () => {
    supabase = getSupabaseTestAdmin();
    fixture = await createExecutionFixture(supabase);
  }, 30_000);

  afterAll(async () => {
    if (fixture && supabase) await cleanupExecutionFixture(fixture, supabase);
  }, 30_000);

  it('resolves an active Supabase agent from SHA-256 API key hash', async () => {
    const { resolveAgentFromApiKey } = await import('../../../lib/agent-auth');

    const agent = await resolveAgentFromApiKey(fixture.agentId, fixture.apiKey);

    expect(agent).toMatchObject({
      id: fixture.agentId,
      org_id: fixture.orgId,
      status: 'active',
    });
  });

  it('executes through the real route and writes runtime evidence', async () => {
    const { POST } = await import('../../../app/api/execute/route');

    const response = await POST(executeRequest(fixture));
    const body = await response.json();

    if (response.status !== 200) {
      throw new Error(
        `Expected /api/execute live DB to return 200. Got ${response.status}: ${JSON.stringify(body)}. ` +
          'This usually means staging migrations, runtime_commit_execution RPC, plugin config, or Supabase env is not ready.',
      );
    }

    expect(body).toEqual(
      expect.objectContaining({
        request_id: expect.any(String),
        decision: expect.any(String),
      }),
    );

    const executionCount = await waitForCountRows(supabase, 'executions', { org_id: fixture.orgId, agent_id: fixture.agentId });
    const auditCount = await waitForCountRows(supabase, 'audit_logs', { org_id: fixture.orgId, agent_id: fixture.agentId });
    const usageCount = await waitForCountRows(supabase, 'usage_events', { org_id: fixture.orgId, agent_id: fixture.agentId });

    expect(executionCount).toBeGreaterThanOrEqual(1);
    expect(auditCount).toBeGreaterThanOrEqual(1);
    expect(usageCount).toBeGreaterThanOrEqual(1);
  }, 30_000);

  it('does not resolve cross-agent api key pairs', async () => {
    const other = await createExecutionFixture(supabase);
    try {
      const { resolveAgentFromApiKey } = await import('../../../lib/agent-auth');
      const crossAgent = await resolveAgentFromApiKey(fixture.agentId, other.apiKey);
      const crossKey = await resolveAgentFromApiKey(other.agentId, fixture.apiKey);

      expect(crossAgent).toBeNull();
      expect(crossKey).toBeNull();
    } finally {
      await cleanupExecutionFixture(other, supabase);
    }
  });

  it('blocks inactive agents at the route boundary', async () => {
    await assertOk(
      supabase.from('agents').update({ status: 'revoked' }).eq('id', fixture.agentId),
      'mark test agent revoked',
    );

    const { POST } = await import('../../../app/api/execute/route');
    const response = await POST(executeRequest(fixture, { message: 'revoked-agent-test' }));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ error: 'Agent is not active' });

    await assertOk(
      supabase.from('agents').update({ status: 'active' }).eq('id', fixture.agentId),
      'restore test agent active',
    );
  });
});
