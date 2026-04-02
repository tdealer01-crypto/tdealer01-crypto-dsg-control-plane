import { describe, it, expect, afterEach, vi } from 'vitest';

describe('gate registry', () => {
  afterEach(() => {
    delete process.env.DSG_GATE_PLUGIN;
    delete process.env.DSG_CORE_MODE;
    delete process.env.DSG_CORE_URL;
    vi.resetModules();
  });

  it('resolves risk-gate by default', async () => {
    process.env.DSG_CORE_MODE = 'internal';
    const { resolveGate } = await import('../../../lib/gate');
    const gate = resolveGate();
    expect(gate.id).toBe('risk-gate');
    expect(gate.verified).toBe(true);
  });

  it('risk-gate returns BLOCK with proof_hash for high risk', async () => {
    process.env.DSG_CORE_MODE = 'internal';
    const { resolveGate } = await import('../../../lib/gate');
    const gate = resolveGate();
    const result = await gate.evaluate({
      agent_id: 'test',
      action: 'scan',
      payload: { context: { risk_score: 0.95 } },
    });
    expect(result.decision).toBe('BLOCK');
    expect(result.proof_hash).toBeTruthy();
    expect(typeof result.proof_hash).toBe('string');
    expect(result.proof_hash!.length).toBe(64);
    expect(result.source).toBe('internal');
  });

  it('risk-gate returns ALLOW with proof_hash for low risk', async () => {
    process.env.DSG_CORE_MODE = 'internal';
    const { resolveGate } = await import('../../../lib/gate');
    const gate = resolveGate();
    const result = await gate.evaluate({
      agent_id: 'test',
      action: 'scan',
      payload: { context: { risk_score: 0.1 } },
    });
    expect(result.decision).toBe('ALLOW');
    expect(result.proof_hash).toBeTruthy();
  });

  it('proof_hash is deterministic', async () => {
    process.env.DSG_CORE_MODE = 'internal';
    const { resolveGate } = await import('../../../lib/gate');
    const gate = resolveGate();
    const input = { agent_id: 'test', action: 'scan', payload: { context: { risk_score: 0.5 } } };
    const a = await gate.evaluate(input);
    const b = await gate.evaluate(input);
    expect(a.proof_hash).toBe(b.proof_hash);
  });

  it('throws for unknown plugin id', async () => {
    process.env.DSG_GATE_PLUGIN = 'nonexistent';
    const { resolveGate } = await import('../../../lib/gate');
    expect(() => resolveGate()).toThrow('not found');
  });
});
