import { describe, expect, it } from 'vitest';
import {
  createEncodingProof,
  computeEncodingHash,
  validateProofHash,
} from '@/lib/dsg/deterministic/encoding-proof-engine';
import {
  isStrictCoefficient,
  validateEncoding,
  validateEncodingRuntimeShape,
} from '@/lib/dsg/deterministic/encoding-proof-validator';
import { getDeterministicPolicyManifest } from '@/lib/dsg/deterministic/policy-manifest';
import type { QuboEncoding } from '@/lib/dsg/deterministic/encoding-proof-types';

const valid: QuboEncoding = {
  kind: 'qubo-v1',
  variableCount: 3,
  constant: '0',
  linear: [{ index: 0, weight: '1.5' }],
  quadratic: [{ i: 0, j: 1, weight: '-2e0' }],
  objective: 'min',
};

const subject = {
  problemId: 'problem-123',
  encodingType: 'qubo-v1' as const,
  requestHash: '1'.repeat(64),
  nonceHash: '2'.repeat(64),
  idempotencyKeyHash: '3'.repeat(64),
};

describe('Encoding Proof hardening regressions', () => {
  it('rejects coercible or partially parsed coefficient values', () => {
    for (const value of [null, false, true, '', ' 1', '1 ', '1junk', 'NaN', 'Infinity', '-Infinity']) {
      expect(isStrictCoefficient(value)).toBe(false);
    }
    expect(isStrictCoefficient(1)).toBe(true);
    expect(isStrictCoefficient(-1.25)).toBe(true);
    expect(isStrictCoefficient('1')).toBe(true);
    expect(isStrictCoefficient('-1.25e+3')).toBe(true);
  });

  it('returns deterministic client-shape failure for null terms', () => {
    const result = validateEncodingRuntimeShape(
      { kind: 'qubo-v1', variableCount: 2, linear: [null] },
      'qubo-v1',
    );
    expect(result.valid).toBe(false);
  });

  it('rejects malformed runtime coefficients even if force-cast through TS', () => {
    const checks = validateEncoding({
      kind: 'qubo-v1',
      variableCount: 2,
      linear: [{ index: 0, weight: '1junk' }],
    } as unknown as QuboEncoding);
    expect(checks.linear_terms_valid).toBe(false);
    expect(checks.no_nan_or_infinity).toBe(false);
  });

  it('rejects unsupported objective values', () => {
    const result = validateEncodingRuntimeShape(
      { kind: 'qubo-v1', variableCount: 2, objective: 'sideways' },
      'qubo-v1',
    );
    expect(result.valid).toBe(false);
  });

  it('rejects declared encoding type mismatch', () => {
    const result = validateEncodingRuntimeShape(
      { kind: 'ising-v1', variableCount: 2 },
      'qubo-v1',
    );
    expect(result.valid).toBe(false);
  });

  it('canonicalizes object property order before hashing', () => {
    const reordered = {
      objective: 'min',
      quadratic: [{ weight: '-2e0', j: 1, i: 0 }],
      linear: [{ weight: '1.5', index: 0 }],
      constant: '0',
      variableCount: 3,
      kind: 'qubo-v1',
    } as unknown as QuboEncoding;
    expect(computeEncodingHash(reordered)).toBe(computeEncodingHash(valid));
  });

  it('binds every trusted proof field into the proof hash', () => {
    const proof = createEncodingProof(valid, '0'.repeat(64), subject, '2026-08-11T00:00:00.000Z');
    expect(validateProofHash(proof)).toBe(true);

    const mutations = [
      { ...proof, encodingHash: 'a'.repeat(64) },
      { ...proof, timestamp: '2026-08-12T00:00:00.000Z' },
      { ...proof, subject: { ...proof.subject, problemId: 'tampered' } },
      { ...proof, metadata: { ...proof.metadata, dimensionCount: 99 } },
      {
        ...proof,
        evidenceBoundary: {
          ...proof.evidenceBoundary,
          statement: 'tampered boundary',
        },
      },
    ];

    for (const mutated of mutations) {
      expect(validateProofHash(mutated)).toBe(false);
    }
  });

  it('binds proof identity to problem/request context, not encoding alone', () => {
    const timestamp = '2026-08-11T00:00:00.000Z';
    const first = createEncodingProof(valid, '0'.repeat(64), subject, timestamp);
    const second = createEncodingProof(
      valid,
      '0'.repeat(64),
      { ...subject, problemId: 'another-problem', requestHash: '4'.repeat(64) },
      timestamp,
    );
    expect(first.encodingHash).toBe(second.encodingHash);
    expect(first.proofId).not.toBe(second.proofId);
    expect(first.proofHash).not.toBe(second.proofHash);
  });

  it('exposes encoding constraints through the public policy manifest object', () => {
    const manifest = getDeterministicPolicyManifest();
    expect(manifest.encodingPolicy.policyRef).toBe('dsg.encoding.default');
    expect(manifest.encodingPolicy.constraints).toHaveLength(8);
    expect(manifest.encodingPolicy.constraintSetHash).toMatch(/^[0-9a-f]{64}$/);
  });
});
