import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SpineInfraError, runPipeline } from '../../lib/spine/pipeline';
import { registry } from '../../lib/spine/plugin';
import * as registerDefaults from '../../lib/spine/register-defaults';
import type { Plugin, PluginInput } from '../../lib/spine/types';

describe('Arbiter Count Validation', () => {
  let savedRegistry: Map<string, Plugin>;
  let savedEnv: string | undefined;

  beforeEach(() => {
    // Save current registry state
    savedRegistry = new Map(registry.plugins);
    // Save and set gate plugin env var
    savedEnv = process.env.DSG_SPINE_GATE_PLUGIN;
    process.env.DSG_SPINE_GATE_PLUGIN = 'test-gate';
    // Mock ensureSpinePluginsRegistered to prevent default plugins from interfering
    vi.spyOn(registerDefaults, 'ensureSpinePluginsRegistered').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore registry to saved state
    registry.plugins.clear();
    for (const [key, plugin] of savedRegistry) {
      registry.plugins.set(key, plugin);
    }
    // Restore env var
    if (savedEnv) {
      process.env.DSG_SPINE_GATE_PLUGIN = savedEnv;
    } else {
      delete process.env.DSG_SPINE_GATE_PLUGIN;
    }
    // Restore mocks
    vi.restoreAllMocks();
  });

  const mockGatePlugin: Plugin = {
    id: 'test-gate',
    kind: 'gate',
    evaluate: async () => ({
      decision: 'ALLOW',
      reason: 'gate_allow',
      policy_version: 'test-v1',
      latency_ms: 10,
      proof: {
        proof_hash: 'test-hash',
        proof_version: 'v1',
        theorem_set_id: 'test-set',
        solver: 'test-solver',
      },
      metrics: {},
    }),
  };

  const mockArbiterPlugin = (id: string): Plugin => ({
    id,
    kind: 'arbiter',
    evaluate: async () => ({
      decision: 'ALLOW',
      reason: 'arbiter_allow',
      policy_version: 'test-v1',
      latency_ms: 5,
      proof: {
        proof_hash: `hash-${id}`,
        proof_version: 'v1',
        theorem_set_id: `set-${id}`,
        solver: `solver-${id}`,
      },
      metrics: {},
    }),
  });

  it('should BLOCK when no arbiters available and minArbiterCount > 0', async () => {
    registry.plugins.clear();
    registry.plugins.set('test-gate', mockGatePlugin);

    const input: PluginInput = {
      agent_id: 'test-agent',
      context: {},
      input: {},
    };

    const result = await runPipeline(input, { minArbiterCount: 1 });

    expect(result.final_decision).toBe('BLOCK');
    expect(result.final_reason).toContain('ARBITER_COUNT_INSUFFICIENT');
    expect(result.final_reason).toContain('got 0');
    expect(result.final_reason).toContain('need 1');
    expect(result.authoritative_plugin_id).toBe('spine:arbiter-validator');
  });

  it('should ALLOW when arbiter count meets minimum requirement', async () => {
    registry.plugins.clear();
    registry.plugins.set('test-gate', mockGatePlugin);
    registry.plugins.set('arbiter-1', mockArbiterPlugin('arbiter-1'));

    const input: PluginInput = {
      agent_id: 'test-agent',
      context: {},
      input: {},
    };

    const result = await runPipeline(input, { minArbiterCount: 1 });

    expect(result.final_decision).toBe('ALLOW');
    // When gate and arbiter both return ALLOW, gate reason persists (no severity change)
    expect(result.final_reason).toBe('gate_allow');
    expect(result.stages.length).toBeGreaterThanOrEqual(2); // gate + arbiter
  });

  it('should BLOCK when arbiter count is below minimum (multiple arbiters needed)', async () => {
    registry.plugins.clear();
    registry.plugins.set('test-gate', mockGatePlugin);
    registry.plugins.set('arbiter-1', mockArbiterPlugin('arbiter-1'));

    const input: PluginInput = {
      agent_id: 'test-agent',
      context: {},
      input: {},
    };

    const result = await runPipeline(input, { minArbiterCount: 3 });

    expect(result.final_decision).toBe('BLOCK');
    expect(result.final_reason).toContain('ARBITER_COUNT_INSUFFICIENT');
    expect(result.final_reason).toContain('got 1');
    expect(result.final_reason).toContain('need 3');
  });

  it('should ALLOW when arbiter count equals minimum exactly', async () => {
    registry.plugins.clear();
    registry.plugins.set('test-gate', mockGatePlugin);
    registry.plugins.set('arbiter-1', mockArbiterPlugin('arbiter-1'));
    registry.plugins.set('arbiter-2', mockArbiterPlugin('arbiter-2'));
    registry.plugins.set('arbiter-3', mockArbiterPlugin('arbiter-3'));

    const input: PluginInput = {
      agent_id: 'test-agent',
      context: {},
      input: {},
    };

    const result = await runPipeline(input, { minArbiterCount: 3 });

    expect(result.final_decision).toBe('ALLOW');
    expect(result.stages.length).toBeGreaterThanOrEqual(4); // gate + 3 arbiters
  });

  it('should ALLOW when arbiter count exceeds minimum', async () => {
    registry.plugins.clear();
    registry.plugins.set('test-gate', mockGatePlugin);
    registry.plugins.set('arbiter-1', mockArbiterPlugin('arbiter-1'));
    registry.plugins.set('arbiter-2', mockArbiterPlugin('arbiter-2'));
    registry.plugins.set('arbiter-3', mockArbiterPlugin('arbiter-3'));
    registry.plugins.set('arbiter-4', mockArbiterPlugin('arbiter-4'));

    const input: PluginInput = {
      agent_id: 'test-agent',
      context: {},
      input: {},
    };

    const result = await runPipeline(input, { minArbiterCount: 2 });

    expect(result.final_decision).toBe('ALLOW');
    expect(result.stages.length).toBeGreaterThanOrEqual(5); // gate + 4 arbiters
  });

  it('should use default minArbiterCount from env when not provided in config', async () => {
    registry.plugins.clear();
    registry.plugins.set('test-gate', mockGatePlugin);

    // Save original env and set to 0 for this test
    const originalEnv = process.env.DSG_SPINE_MIN_ARBITER_COUNT;
    process.env.DSG_SPINE_MIN_ARBITER_COUNT = '0';

    const input: PluginInput = {
      agent_id: 'test-agent',
      context: {},
      input: {},
    };

    // Run without config override - should use env-based default
    const result = await runPipeline(input);

    // With default minArbiterCount of 0, ALLOW is expected
    expect(result.final_decision).toBe('ALLOW');

    // Restore original env
    if (originalEnv) {
      process.env.DSG_SPINE_MIN_ARBITER_COUNT = originalEnv;
    } else {
      delete process.env.DSG_SPINE_MIN_ARBITER_COUNT;
    }
  });

  it('should respect arbiter sort order (deterministic decision making)', async () => {
    registry.plugins.clear();
    registry.plugins.set('test-gate', mockGatePlugin);

    // Create arbiters with different decision severities
    const blockArbiter: Plugin = {
      id: 'arbiter-block',
      kind: 'arbiter',
      evaluate: async () => ({
        decision: 'BLOCK',
        reason: 'arbiter_block',
        policy_version: 'test-v1',
        latency_ms: 5,
        proof: {
          proof_hash: 'hash-block',
          proof_version: 'v1',
          theorem_set_id: 'set-block',
          solver: 'solver-block',
        },
        metrics: {},
      }),
    };

    const stabilizeArbiter: Plugin = {
      id: 'arbiter-stabilize',
      kind: 'arbiter',
      evaluate: async () => ({
        decision: 'STABILIZE',
        reason: 'arbiter_stabilize',
        policy_version: 'test-v1',
        latency_ms: 5,
        proof: {
          proof_hash: 'hash-stabilize',
          proof_version: 'v1',
          theorem_set_id: 'set-stabilize',
          solver: 'solver-stabilize',
        },
        metrics: {},
      }),
    };

    registry.plugins.set('arbiter-block', blockArbiter);
    registry.plugins.set('arbiter-stabilize', stabilizeArbiter);

    const input: PluginInput = {
      agent_id: 'test-agent',
      context: {},
      input: {},
    };

    const result = await runPipeline(input, { minArbiterCount: 1 });

    // Final decision should reflect highest severity (BLOCK > STABILIZE > ALLOW)
    expect(result.final_decision).toBe('BLOCK');
    expect(result.final_reason).toBe('arbiter_block');
  });

  it('should preserve stage history even when arbiter count check fails', async () => {
    registry.plugins.clear();
    registry.plugins.set('test-gate', mockGatePlugin);

    const input: PluginInput = {
      agent_id: 'test-agent',
      context: {},
      input: {},
    };

    const result = await runPipeline(input, { minArbiterCount: 2 });

    // Gate stage should still be recorded
    expect(result.stages.length).toBeGreaterThanOrEqual(1);
    expect(result.stages[0].plugin_id).toBe('test-gate');
    expect(result.stages[0].decision).toBe('ALLOW');
    expect(result.total_latency_ms).toBeGreaterThanOrEqual(10);
  });

  it('should skip arbiter validation if gate decision is BLOCK', async () => {
    process.env.DSG_SPINE_GATE_PLUGIN = 'test-gate-block';
    const blockGatePlugin: Plugin = {
      id: 'test-gate-block',
      kind: 'gate',
      evaluate: async () => ({
        decision: 'BLOCK',
        reason: 'gate_block',
        policy_version: 'test-v1',
        latency_ms: 10,
        proof: {
          proof_hash: 'test-hash',
          proof_version: 'v1',
          theorem_set_id: 'test-set',
          solver: 'test-solver',
        },
        metrics: {},
      }),
    };

    registry.plugins.clear();
    registry.plugins.set('test-gate-block', blockGatePlugin);

    const input: PluginInput = {
      agent_id: 'test-agent',
      context: {},
      input: {},
    };

    const result = await runPipeline(input, { minArbiterCount: 5 });

    // Should BLOCK from gate, not from arbiter count
    expect(result.final_decision).toBe('BLOCK');
    expect(result.final_reason).toBe('gate_block');
    expect(result.authoritative_plugin_id).toBe('test-gate-block');
  });
});
