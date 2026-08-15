import { describe, expect, it } from 'vitest';
import { buildMakk8Smt2, verifyMakk8WithZ3 } from '@/lib/runtime/makk8-z3-verifier';

const validAction = {
  value: 1,
  is_grounded: true,
  intent_score: 1,
  is_api_clean: true,
  source_verified: true,
  compute_cost: 10,
  has_audit_trail: true,
  nonce_lock: true,
};

describe('Makk-8 Z3 verifier', () => {
  it('returns SAT/ALLOW when all eight invariants are true', async () => {
    const result = await verifyMakk8WithZ3(validAction);

    expect(result.status).toBe('SAT');
    expect(result.ok).toBe(true);
    expect(result.decision).toBe('ALLOW');
    expect(result.reason).toBe('SAMMA_Z3_VERIFIED');
    expect(result.proofHash).toMatch(/^[0-9a-f]{64}$/);
    expect(result.constraintsHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('returns UNSAT/BLOCK when a required path invariant is false', async () => {
    const result = await verifyMakk8WithZ3({ ...validAction, source_verified: false });

    expect(result.status).toBe('UNSAT');
    expect(result.ok).toBe(false);
    expect(result.decision).toBe('BLOCK');
    expect(result.artifact.rightLivelihood).toBe(false);
  });

  it('builds the conjunction of all eight named invariants', () => {
    const smt2 = buildMakk8Smt2({
      rightView: true,
      rightResolve: true,
      rightSpeech: true,
      rightConduct: true,
      rightLivelihood: true,
      rightEffort: true,
      rightMindfulness: true,
      rightSamadhi: true,
    });

    expect(smt2).toContain('(declare-const rightView Bool)');
    expect(smt2).toContain('(declare-const rightSamadhi Bool)');
    expect(smt2).toContain('(assert (and rightView rightResolve rightSpeech rightConduct rightLivelihood rightEffort rightMindfulness rightSamadhi))');
  });
});
