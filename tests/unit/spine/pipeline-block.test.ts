import { describe, it, expect } from 'vitest';
import { evaluateGate, detectOscillation } from '../../../lib/runtime/gate';
import { registry } from '../../../lib/spine/plugin';
import type { DSGPlugin } from '../../../lib/spine/plugin';
import type { PluginInput, PluginOutput } from '../../../lib/spine/types';

describe('evaluateGate — decision boundaries', () => {
  it('BLOCK when riskScore >= 0.8', () => {
    expect(evaluateGate({ riskScore: 0.8 }).decision).toBe('BLOCK');
    expect(evaluateGate({ riskScore: 0.95 }).decision).toBe('BLOCK');
    expect(evaluateGate({ riskScore: 1.0 }).decision).toBe('BLOCK');
  });

  it('STABILIZE when riskScore >= 0.4 but < 0.8', () => {
    expect(evaluateGate({ riskScore: 0.4 }).decision).toBe('STABILIZE');
    expect(evaluateGate({ riskScore: 0.79 }).decision).toBe('STABILIZE');
  });

  it('ALLOW when riskScore < 0.4 and no oscillation', () => {
    expect(evaluateGate({ riskScore: 0.1 }).decision).toBe('ALLOW');
    expect(evaluateGate({ riskScore: 0.39 }).decision).toBe('ALLOW');
  });

  it('STABILIZE on oscillation even with low riskScore', () => {
    const result = evaluateGate({
      riskScore: 0.1,
      recentRiskScores: [0.1, 0.6, 0.15, 0.55],
    });
    expect(result.decision).toBe('STABILIZE');
    expect(result.reason).toContain('oscillation');
  });

  it('no oscillation when window too small', () => {
    expect(detectOscillation([0.1, 0.9])).toBe(false);
    expect(detectOscillation([])).toBe(false);
  });

  it('oscillation when spread >= 0.35 in last 4 scores', () => {
    expect(detectOscillation([0.1, 0.5, 0.1, 0.5])).toBe(true);
  });

  it('no oscillation when spread < 0.35', () => {
    expect(detectOscillation([0.1, 0.2, 0.15, 0.25])).toBe(false);
  });
});

describe('runPipeline — gate BLOCK short-circuits arbiters', () => {
  it('returns BLOCK from gate and skips arbiters', async () => {
    const blockGate: DSGPlugin = {
      id: 'test-block-gate',
      name: 'Test Block Gate',
      kind: 'gate',
      verification: { verified: true, solver: null, properties: [] },
      health: async () => ({ ok: true }),
      evaluate: async (): Promise<PluginOutput> => ({
        decision: 'BLOCK',
        reason: 'test:HIGH_RISK',
        policy_version: 'test-v1',
        latency_ms: 1,
        proof: { proof_hash: 'block-proof', proof_version: 'v1', theorem_set_id: null, solver: null },
        metrics: {},
      }),
    };

    const arbiterCalled = { called: false };
    const testArbiter: DSGPlugin = {
      id: 'test-arbiter',
      name: 'Test Arbiter',
      kind: 'arbiter',
      verification: { verified: true, solver: null, properties: [] },
      health: async () => ({ ok: true }),
      evaluate: async (): Promise<PluginOutput> => {
        arbiterCalled.called = true;
        return {
          decision: 'ALLOW', reason: 'ok', policy_version: 'v1', latency_ms: 0,
          proof: { proof_hash: null, proof_version: null, theorem_set_id: null, solver: null },
          metrics: {},
        };
      },
    };

    registry.registerIfAbsent(blockGate);
    registry.registerIfAbsent(testArbiter);

    const originalEnv = process.env.DSG_SPINE_GATE_PLUGIN;
    process.env.DSG_SPINE_GATE_PLUGIN = 'test-block-gate';

    try {
      const input: PluginInput = {
        org_id: 'org_1',
        agent_id: 'agt_1',
        action: 'dangerous-action',
        payload: {},
        truth_state: null,
        approval: null,
        spine: { request_id: 'req_1', received_at: new Date().toISOString(), billing_period: '2026-04' },
      };

      const { runPipeline } = await import('../../../lib/spine/pipeline');
      const result = await runPipeline(input);

      expect(result.final_decision).toBe('BLOCK');
      expect(result.final_reason).toBe('test:HIGH_RISK');
      expect(result.stages).toHaveLength(1);
      expect(result.stages[0].plugin_id).toBe('test-block-gate');
      expect(result.proof.proof_hash).toBe('block-proof');
      expect(arbiterCalled.called).toBe(false);
    } finally {
      if (originalEnv === undefined) delete process.env.DSG_SPINE_GATE_PLUGIN;
      else process.env.DSG_SPINE_GATE_PLUGIN = originalEnv;
    }
  });

  it('ALLOW from gate lets arbiter escalate to STABILIZE', async () => {
    const allowGate: DSGPlugin = {
      id: 'test-allow-gate',
      name: 'Test Allow Gate',
      kind: 'gate',
      verification: { verified: true, solver: null, properties: [] },
      health: async () => ({ ok: true }),
      evaluate: async (): Promise<PluginOutput> => ({
        decision: 'ALLOW', reason: 'gate:OK', policy_version: 'v1', latency_ms: 1,
        proof: { proof_hash: null, proof_version: null, theorem_set_id: null, solver: null },
        metrics: {},
      }),
    };

    const stabilizeArbiter: DSGPlugin = {
      id: 'test-stabilize-arbiter',
      name: 'Test Stabilize Arbiter',
      kind: 'arbiter',
      verification: { verified: true, solver: null, properties: [] },
      health: async () => ({ ok: true }),
      evaluate: async (): Promise<PluginOutput> => ({
        decision: 'STABILIZE', reason: 'arbiter:OSCILLATION', policy_version: 'v1', latency_ms: 2,
        proof: { proof_hash: 'stab-proof', proof_version: 'v1', theorem_set_id: null, solver: null },
        metrics: {},
      }),
    };

    registry.registerIfAbsent(allowGate);
    registry.registerIfAbsent(stabilizeArbiter);

    const originalEnv = process.env.DSG_SPINE_GATE_PLUGIN;
    process.env.DSG_SPINE_GATE_PLUGIN = 'test-allow-gate';

    try {
      const { runPipeline } = await import('../../../lib/spine/pipeline');
      const result = await runPipeline({
        org_id: 'org_1', agent_id: 'agt_1', action: 'scan', payload: {},
        truth_state: null, approval: null,
        spine: { request_id: 'req_2', received_at: new Date().toISOString(), billing_period: '2026-04' },
      });

      expect(result.final_decision).toBe('STABILIZE');
      expect(result.authoritative_plugin_id).toBe('test-stabilize-arbiter');
      expect(result.stages.length).toBeGreaterThanOrEqual(2);
    } finally {
      if (originalEnv === undefined) delete process.env.DSG_SPINE_GATE_PLUGIN;
      else process.env.DSG_SPINE_GATE_PLUGIN = originalEnv;
    }
  });
});
