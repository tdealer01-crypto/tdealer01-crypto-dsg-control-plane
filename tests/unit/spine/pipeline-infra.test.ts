import { describe, it, expect } from 'vitest';
import { SpineInfraError } from '../../../lib/spine/pipeline';
import { registry } from '../../../lib/spine/plugin';
import type { DSGPlugin } from '../../../lib/spine/plugin';
import type { PluginOutput } from '../../../lib/spine/types';

describe('SpineInfraError', () => {
  it('is an instance of Error', () => {
    const err = new SpineInfraError('test message');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(SpineInfraError);
  });

  it('has correct name property', () => {
    const err = new SpineInfraError('GATE_PLUGIN_NOT_FOUND');
    expect(err.name).toBe('SpineInfraError');
  });

  it('carries the message through', () => {
    const err = new SpineInfraError('GATE_PLUGIN_INVALID_KIND');
    expect(err.message).toBe('GATE_PLUGIN_INVALID_KIND');
  });
});

describe('runPipeline — SpineInfraError cases', () => {
  it('throws SpineInfraError when gate plugin is not found', async () => {
    const { runPipeline } = await import('../../../lib/spine/pipeline');
    const saved = process.env.DSG_SPINE_GATE_PLUGIN;
    process.env.DSG_SPINE_GATE_PLUGIN = 'nonexistent-plugin-xyz';
    try {
      await expect(
        runPipeline({
          org_id: 'org_1', agent_id: 'agt_1', action: 'test', payload: {},
          truth_state: null, approval: null,
          spine: { request_id: 'req_infra_1', received_at: new Date().toISOString(), billing_period: '2026-05' },
        }),
      ).rejects.toBeInstanceOf(SpineInfraError);
    } finally {
      if (saved === undefined) delete process.env.DSG_SPINE_GATE_PLUGIN;
      else process.env.DSG_SPINE_GATE_PLUGIN = saved;
    }
  });

  it('throws SpineInfraError when registered plugin has wrong kind', async () => {
    const wrongKindPlugin: DSGPlugin = {
      id: 'test-wrong-kind-gate',
      name: 'Wrong Kind Plugin',
      kind: 'arbiter',
      verification: { verified: true, solver: null, properties: [] },
      health: async () => ({ ok: true }),
      evaluate: async (): Promise<PluginOutput> => ({
        decision: 'ALLOW', reason: 'ok', policy_version: 'v1', latency_ms: 0,
        proof: { proof_hash: null, proof_version: null, theorem_set_id: null, solver: null },
        metrics: {},
      }),
    };

    registry.registerIfAbsent(wrongKindPlugin);
    const { runPipeline } = await import('../../../lib/spine/pipeline');
    const saved = process.env.DSG_SPINE_GATE_PLUGIN;
    process.env.DSG_SPINE_GATE_PLUGIN = 'test-wrong-kind-gate';
    try {
      await expect(
        runPipeline({
          org_id: 'org_1', agent_id: 'agt_1', action: 'test', payload: {},
          truth_state: null, approval: null,
          spine: { request_id: 'req_infra_2', received_at: new Date().toISOString(), billing_period: '2026-05' },
        }),
      ).rejects.toBeInstanceOf(SpineInfraError);
    } finally {
      if (saved === undefined) delete process.env.DSG_SPINE_GATE_PLUGIN;
      else process.env.DSG_SPINE_GATE_PLUGIN = saved;
    }
  });
});

describe('runPipeline — initial string literal state', () => {
  it('ALLOW gate with no arbiters: final_decision is ALLOW, final_reason is gate reason', async () => {
    const allowGate2: DSGPlugin = {
      id: 'test-allow-gate-2',
      name: 'Allow Gate 2',
      kind: 'gate',
      verification: { verified: true, solver: null, properties: [] },
      health: async () => ({ ok: true }),
      evaluate: async (): Promise<PluginOutput> => ({
        decision: 'ALLOW',
        reason: 'gate:CLEAR',
        policy_version: 'test-policy-v2',
        latency_ms: 1,
        proof: { proof_hash: null, proof_version: null, theorem_set_id: null, solver: null },
        metrics: {},
      }),
    };

    registry.registerIfAbsent(allowGate2);
    const { runPipeline } = await import('../../../lib/spine/pipeline');
    const saved = process.env.DSG_SPINE_GATE_PLUGIN;
    process.env.DSG_SPINE_GATE_PLUGIN = 'test-allow-gate-2';

    try {
      const result = await runPipeline({
        org_id: 'org_1', agent_id: 'agt_1', action: 'read', payload: {},
        truth_state: null, approval: null,
        spine: { request_id: 'req_str_1', received_at: new Date().toISOString(), billing_period: '2026-05' },
      });

      expect(result.final_decision).toBe('ALLOW');
      expect(result.final_reason).toBe('gate:CLEAR');
      expect(result.final_policy_version).toBe('test-policy-v2');
      expect(result.authoritative_plugin_id).toBe('test-allow-gate-2');
    } finally {
      if (saved === undefined) delete process.env.DSG_SPINE_GATE_PLUGIN;
      else process.env.DSG_SPINE_GATE_PLUGIN = saved;
    }
  });
});
