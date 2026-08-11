import { describe, expect, it } from 'vitest';
import { validateEncodingRuntimeShape } from '@/lib/dsg/deterministic/encoding-proof-validator';

describe('Encoding Proof route runtime contract', () => {
  it('accepts the documented QUBO request shape including kind', () => {
    const result = validateEncodingRuntimeShape(
      {
        kind: 'qubo-v1',
        variableCount: 10,
        constant: '0.0',
        linear: [
          { index: 0, weight: '2.5' },
          { index: 1, weight: '-1.2' },
        ],
        quadratic: [{ i: 0, j: 1, weight: '3.14' }],
        objective: 'min',
      },
      'qubo-v1',
    );
    expect(result.valid).toBe(true);
  });

  it('rejects an encoding whose kind differs from declared encodingType', () => {
    expect(
      validateEncodingRuntimeShape(
        { kind: 'ising-v1', variableCount: 2 },
        'qubo-v1',
      ).valid,
    ).toBe(false);
  });

  it('rejects null term objects rather than throwing', () => {
    expect(
      validateEncodingRuntimeShape(
        { kind: 'ising-v1', variableCount: 2, j: [null] },
        'ising-v1',
      ).valid,
    ).toBe(false);
  });
});
