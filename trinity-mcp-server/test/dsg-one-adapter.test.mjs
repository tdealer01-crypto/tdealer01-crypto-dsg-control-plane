import assert from 'node:assert/strict';
import test from 'node:test';
import { TrinityClient } from '../dist/client.js';

test('DSG ONE mode maps agent listing and governed execution to native routes', async () => {
  const previous = process.env.DSG_ONE_API_URL;
  process.env.DSG_ONE_API_URL = 'https://dsg-one.example';
  const calls = [];
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });

    if (String(url).endsWith('/api/agents?per_page=50')) {
      return new Response(
        JSON.stringify({
          items: [
            {
              agent_id: 'agent-1',
              name: 'Hermes',
              status: 'active',
              usage_this_month: 7,
            },
          ],
          pagination: { total: 1 },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }

    if (String(url).endsWith('/api/dsg/brain/execute')) {
      return new Response(
        JSON.stringify({
          success: true,
          planHash: 'plan-hash',
          gateDecision: 'ALLOW',
          gateDecisionHash: 'gate-hash',
          violations: [],
          result: {
            success: true,
            executedCommands: [{ command: 'echo', args: ['verified'] }],
            evidence: [
              { type: 'execution', id: 'ev-1', hash: 'proof-hash', timestamp: 1 },
            ],
          },
          message: 'Execution completed within constraints',
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }

    return new Response('not found', { status: 404 });
  };

  try {
    const client = new TrinityClient({
      apiUrl: 'https://dsg-one.example',
      jwtToken: 'test-token',
    });

    const status = await client.getAgentStatus();
    assert.equal(status.total, 1);
    assert.equal(status.healthy, 1);
    assert.equal(status.agents[0].jobsProcessed, 7);

    const execution = await client.executeTask('agent-1', 'verify deployment');
    assert.equal(execution.success, true);
    assert.equal(execution.planHash, 'plan-hash');
    assert.equal(execution.gateDecision, 'ALLOW');
    assert.equal(execution.result, 'echo verified');
    assert.equal(execution.evidence?.[0]?.hash, 'proof-hash');

    assert.equal(calls[0].url, 'https://dsg-one.example/api/agents?per_page=50');
    assert.equal(calls[1].url, 'https://dsg-one.example/api/dsg/brain/execute');
    assert.equal(calls[1].options.method, 'POST');
    assert.deepEqual(JSON.parse(calls[1].options.body), { input: 'verify deployment' });
    assert.equal(calls[1].options.headers.Authorization, 'Bearer test-token');
  } finally {
    globalThis.fetch = originalFetch;
    if (previous === undefined) delete process.env.DSG_ONE_API_URL;
    else process.env.DSG_ONE_API_URL = previous;
  }
});

test('DSG ONE mode refuses to fake unmapped mutation routes', async () => {
  const previous = process.env.DSG_ONE_API_URL;
  process.env.DSG_ONE_API_URL = 'https://dsg-one.example';

  try {
    const client = new TrinityClient({ apiUrl: 'https://dsg-one.example' });
    await assert.rejects(
      client.setAgentMode('agent-1', 'live'),
      /not mapped to a verified DSG ONE route yet/,
    );
  } finally {
    if (previous === undefined) delete process.env.DSG_ONE_API_URL;
    else process.env.DSG_ONE_API_URL = previous;
  }
});
