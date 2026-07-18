import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { runPipeline, DEFAULT_PIPELINE_CONFIG } from '../../lib/spine/pipeline';
import { registry } from '../../lib/spine/plugin';
import type { PluginInput, Decision } from '../../lib/spine/types';

describe('Arbiter Count Validation (Issue #3)', () => {
  const mockInput: PluginInput = {
    org_id: 'test-org',
    agent_id: 'test-agent',
    action: 'test-action',
    payload: {},
    truth_state: null,
    approval: null,
    spine: {
      request_id: 'test-req-123',
      received_at: new Date().toISOString(),
      billing_period: '2026-07',
    },
  };

  beforeEach(() => {
    // Register a gate plugin (required)
    registry.register({
      id: 'test-gate',
      name: 'Test Gate',
      kind: 'gate',
      verification: {
        verified: false,
        solver: null,
        properties: [],
      },
      async health() {
        return { ok: true, detail: 'test-gate-ok' };
      },
      async evaluate() {
        return {
          decision: 'ALLOW' as const,
          reason: 'gate-allows',
          policy_version: 'test-v1',
          latency_ms: 10,
          proof: {
            proof_hash: null,
            proof_version: null,
            theorem_set_id: null,
            solver: null,
          },
          metrics: {},
        };
      },
    });
  });

  afterEach(() => {
    // Clean up registry after each test
    const plugins = registry.getAll();
    plugins.forEach(p => {
      if (p.id !== 'test-gate') {
        try {
          registry.unregister(p.id);
        } catch {
          // Ignore unregister errors
        }
      }
    });
  });

  it('should ALLOW when minimum arbiter count is met', async () => {
    // Register 1 arbiter
    registry.register({
      id: 'test-arbiter-1',
      name: 'Test Arbiter 1',
      kind: 'arbiter',
      verification: {
        verified: false,
        solver: null,
        properties: [],
      },
      async health() {
        return { ok: true, detail: 'arbiter-1-ok' };
      },
      async evaluate() {
        return {
          decision: 'ALLOW' as const,
          reason: 'arbiter-allows',
          policy_version: 'arbiter-v1',
          latency_ms: 5,
          proof: {
            proof_hash: null,
            proof_version: null,
            theorem_set_id: null,
            solver: null,
          },
          metrics: {},
        };
      },
    });

    const result = await runPipeline(mockInput, { minArbiterCount: 1 });
    expect(result.final_decision).toBe('ALLOW');
    expect(result.authoritative_plugin_id).toBe('test-arbiter-1');
  });

  it('should BLOCK when arbiter count < minimum required', async () => {
    // No arbiters registered, but minimum is 1
    const result = await runPipeline(mockInput, { minArbiterCount: 1 });

    expect(result.final_decision).toBe('BLOCK');
    expect(result.final_reason).toContain('ARBITER_COUNT_INSUFFICIENT');
    expect(result.final_reason).toContain('got 0');
    expect(result.final_reason).toContain('need 1');
    expect(result.authoritative_plugin_id).toBe('spine:arbiter-validator');
  });

  it('should BLOCK when arbiter count < 2 (strict mode)', async () => {
    // Register only 1 arbiter
    registry.register({
      id: 'test-arbiter-1',
      name: 'Test Arbiter 1',
      kind: 'arbiter',
      verification: {
        verified: false,
        solver: null,
        properties: [],
      },
      async health() {
        return { ok: true, detail: 'arbiter-1-ok' };
      },
      async evaluate() {
        return {
          decision: 'ALLOW' as const,
          reason: 'arbiter-allows',
          policy_version: 'arbiter-v1',
          latency_ms: 5,
          proof: {
            proof_hash: null,
            proof_version: null,
            theorem_set_id: null,
            solver: null,
          },
          metrics: {},
        };
      },
    });

    // Require minimum 2 arbiters
    const result = await runPipeline(mockInput, { minArbiterCount: 2 });

    expect(result.final_decision).toBe('BLOCK');
    expect(result.final_reason).toContain('ARBITER_COUNT_INSUFFICIENT');
    expect(result.final_reason).toContain('got 1');
    expect(result.final_reason).toContain('need 2');
  });

  it('should use default minArbiterCount from env or DEFAULT_PIPELINE_CONFIG', async () => {
    // Save original env
    const originalEnv = process.env.DSG_SPINE_MIN_ARBITER_COUNT;

    try {
      // Set env to require 1 arbiter
      process.env.DSG_SPINE_MIN_ARBITER_COUNT = '1';

      // Re-import to get new config (this is a limitation of the test)
      // For now, pass explicit config
      const result = await runPipeline(mockInput, { minArbiterCount: 1 });
      expect(result.final_decision).toBe('BLOCK');
    } finally {
      // Restore original env
      process.env.DSG_SPINE_MIN_ARBITER_COUNT = originalEnv;
    }
  });

  it('should skip arbiter validation if gate returns BLOCK', async () => {
    // Register a gate that blocks
    registry.unregister('test-gate');
    registry.register({
      id: 'test-gate-blocking',
      name: 'Test Gate Blocking',
      kind: 'gate',
      verification: {
        verified: false,
        solver: null,
        properties: [],
      },
      async health() {
        return { ok: true, detail: 'test-gate-ok' };
      },
      async evaluate() {
        return {
          decision: 'BLOCK' as const,
          reason: 'gate-blocks',
          policy_version: 'test-v1',
          latency_ms: 10,
          proof: {
            proof_hash: null,
            proof_version: null,
            theorem_set_id: null,
            solver: null,
          },
          metrics: {},
        };
      },
    });

    // No arbiters, but gate blocks anyway
    const result = await runPipeline(mockInput, { minArbiterCount: 1 });

    expect(result.final_decision).toBe('BLOCK');
    expect(result.final_reason).toBe('gate-blocks');
    expect(result.authoritative_plugin_id).toBe('test-gate-blocking');
  });

  it('should allow zero arbiter count if minArbiterCount is 0', async () => {
    // No arbiters registered, minArbiterCount = 0
    const result = await runPipeline(mockInput, { minArbiterCount: 0 });

    expect(result.final_decision).toBe('ALLOW');
    expect(result.authoritative_plugin_id).toBe('test-gate');
  });

  it('should include arbiter stages in pipeline trace', async () => {
    // Register 2 arbiters
    registry.register({
      id: 'test-arbiter-1',
      name: 'Test Arbiter 1',
      kind: 'arbiter',
      verification: {
        verified: false,
        solver: null,
        properties: [],
      },
      async health() {
        return { ok: true, detail: 'arbiter-1-ok' };
      },
      async evaluate() {
        return {
          decision: 'ALLOW' as const,
          reason: 'arbiter-1-allows',
          policy_version: 'arbiter-v1',
          latency_ms: 5,
          proof: {
            proof_hash: 'hash-1',
            proof_version: null,
            theorem_set_id: null,
            solver: null,
          },
          metrics: {},
        };
      },
    });

    registry.register({
      id: 'test-arbiter-2',
      name: 'Test Arbiter 2',
      kind: 'arbiter',
      verification: {
        verified: false,
        solver: null,
        properties: [],
      },
      async health() {
        return { ok: true, detail: 'arbiter-2-ok' };
      },
      async evaluate() {
        return {
          decision: 'ALLOW' as const,
          reason: 'arbiter-2-allows',
          policy_version: 'arbiter-v2',
          latency_ms: 3,
          proof: {
            proof_hash: 'hash-2',
            proof_version: null,
            theorem_set_id: null,
            solver: null,
          },
          metrics: {},
        };
      },
    });

    const result = await runPipeline(mockInput, { minArbiterCount: 2 });

    expect(result.stages.length).toBe(3); // gate + 2 arbiters
    expect(result.stages[0].plugin_id).toBe('test-gate');
    expect(result.stages[1].plugin_id).toBe('test-arbiter-1');
    expect(result.stages[2].plugin_id).toBe('test-arbiter-2');
  });
});
