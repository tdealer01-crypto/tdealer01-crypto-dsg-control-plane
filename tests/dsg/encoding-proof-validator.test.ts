import { describe, it, expect } from 'vitest';
import {
  validateLinearTerms,
  validateQuadraticTerms,
  validateVariableConsistency,
  validateProblemSize,
  validateEncodingStructure,
} from '@/lib/dsg/deterministic/encoding-proof-validator';
import type { AimoQuboEncoding, AimoIsingEncoding } from '@/lib/dsg/deterministic/encoding-proof-types';

describe('Encoding Proof Validator - Unit Tests', () => {
  describe('validateLinearTerms', () => {
    it('accepts valid linear terms with numeric weights', () => {
      const encoding: AimoQuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 3,
        linear: [
          { i: 0, weight: 1.5 },
          { i: 1, weight: -2.0 },
          { i: 2, weight: 0 },
        ],
      };
      const result = validateLinearTerms(encoding);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('accepts valid linear terms with string weights', () => {
      const encoding: AimoQuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 2,
        linear: [
          { i: 0, weight: '3.14' },
          { i: 1, weight: '-100' },
        ],
      };
      const result = validateLinearTerms(encoding);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('rejects linear terms with NaN weights', () => {
      const encoding: AimoQuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 2,
        linear: [
          { i: 0, weight: NaN },
          { i: 1, weight: 1 },
        ],
      };
      const result = validateLinearTerms(encoding);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('NaN');
    });

    it('rejects linear terms with Infinity weights', () => {
      const encoding: AimoQuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 2,
        linear: [
          { i: 0, weight: Infinity },
          { i: 1, weight: 1 },
        ],
      };
      const result = validateLinearTerms(encoding);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('rejects linear terms with out-of-range indices', () => {
      const encoding: AimoQuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 2,
        linear: [
          { i: 0, weight: 1 },
          { i: 2, weight: 2 }, // out of range
        ],
      };
      const result = validateLinearTerms(encoding);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('rejects linear terms with negative indices', () => {
      const encoding: AimoQuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 2,
        linear: [
          { i: -1, weight: 1 },
        ],
      };
      const result = validateLinearTerms(encoding);
      expect(result.valid).toBe(false);
    });

    it('rejects linear terms exceeding magnitude bounds', () => {
      const encoding: AimoQuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 2,
        linear: [
          { i: 0, weight: 1e10 }, // exceeds typical bounds
        ],
      };
      const result = validateLinearTerms(encoding);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateQuadraticTerms', () => {
    it('accepts valid quadratic terms', () => {
      const encoding: AimoQuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 3,
        quadratic: [
          { i: 0, j: 1, weight: 2.0 },
          { i: 1, j: 2, weight: -1.5 },
        ],
      };
      const result = validateQuadraticTerms(encoding);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('rejects quadratic terms with NaN weights', () => {
      const encoding: AimoQuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 3,
        quadratic: [
          { i: 0, j: 1, weight: NaN },
        ],
      };
      const result = validateQuadraticTerms(encoding);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('rejects quadratic terms with out-of-range indices', () => {
      const encoding: AimoQuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 2,
        quadratic: [
          { i: 0, j: 3, weight: 1 }, // j out of range
        ],
      };
      const result = validateQuadraticTerms(encoding);
      expect(result.valid).toBe(false);
    });

    it('rejects duplicate quadratic edges (i,j) and (j,i)', () => {
      const encoding: AimoQuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 3,
        quadratic: [
          { i: 0, j: 1, weight: 1 },
          { i: 1, j: 0, weight: 2 }, // duplicate edge
        ],
      };
      const result = validateQuadraticTerms(encoding);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('rejects self-loops (i == j)', () => {
      const encoding: AimoQuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 2,
        quadratic: [
          { i: 0, j: 0, weight: 1 }, // self-loop
        ],
      };
      const result = validateQuadraticTerms(encoding);
      expect(result.valid).toBe(false);
    });

    it('rejects quadratic terms exceeding magnitude bounds', () => {
      const encoding: AimoQuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 2,
        quadratic: [
          { i: 0, j: 1, weight: 1e10 },
        ],
      };
      const result = validateQuadraticTerms(encoding);
      expect(result.valid).toBe(false);
    });

    it('rejects negative indices in quadratic terms', () => {
      const encoding: AimoQuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 2,
        quadratic: [
          { i: -1, j: 0, weight: 1 },
        ],
      };
      const result = validateQuadraticTerms(encoding);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateVariableConsistency', () => {
    it('accepts consistent variable counts across linear terms', () => {
      const encoding: AimoQuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 3,
        linear: [
          { i: 0, weight: 1 },
          { i: 2, weight: 2 },
        ],
      };
      const result = validateVariableConsistency(encoding);
      expect(result.valid).toBe(true);
    });

    it('accepts consistent variable counts across quadratic terms', () => {
      const encoding: AimoQuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 4,
        quadratic: [
          { i: 0, j: 3, weight: 1 },
          { i: 1, j: 2, weight: 2 },
        ],
      };
      const result = validateVariableConsistency(encoding);
      expect(result.valid).toBe(true);
    });

    it('rejects inconsistent variable count in linear terms', () => {
      const encoding: AimoQuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 2,
        linear: [
          { i: 0, weight: 1 },
          { i: 3, weight: 2 }, // index 3 exceeds variableCount
        ],
      };
      const result = validateVariableConsistency(encoding);
      expect(result.valid).toBe(false);
    });

    it('rejects inconsistent variable count in quadratic terms', () => {
      const encoding: AimoQuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 2,
        quadratic: [
          { i: 0, j: 2, weight: 1 }, // j exceeds variableCount
        ],
      };
      const result = validateVariableConsistency(encoding);
      expect(result.valid).toBe(false);
    });

    it('validates both linear and quadratic consistency together', () => {
      const encoding: AimoQuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 3,
        linear: [
          { i: 0, weight: 1 },
          { i: 2, weight: 2 },
        ],
        quadratic: [
          { i: 1, j: 2, weight: 3 },
        ],
      };
      const result = validateVariableConsistency(encoding);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateProblemSize', () => {
    it('accepts small problems within variable limits', () => {
      const encoding: AimoQuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 10,
      };
      const result = validateProblemSize(encoding);
      expect(result.valid).toBe(true);
    });

    it('accepts problems at maximum variable limit (62)', () => {
      const encoding: AimoQuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 62,
      };
      const result = validateProblemSize(encoding);
      expect(result.valid).toBe(true);
    });

    it('rejects problems exceeding maximum variable limit', () => {
      const encoding: AimoQuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 63,
      };
      const result = validateProblemSize(encoding);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('62');
    });

    it('rejects problems with zero variables', () => {
      const encoding: AimoQuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 0,
      };
      const result = validateProblemSize(encoding);
      expect(result.valid).toBe(false);
    });

    it('rejects problems with negative variable count', () => {
      const encoding: AimoQuboEncoding = {
        kind: 'qubo-v1',
        variableCount: -5,
      };
      const result = validateProblemSize(encoding);
      expect(result.valid).toBe(false);
    });

    it('rejects problems with non-integer variable count', () => {
      const encoding = {
        kind: 'qubo-v1',
        variableCount: 3.5,
      } as unknown as AimoQuboEncoding;
      const result = validateProblemSize(encoding);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateEncodingStructure', () => {
    it('accepts valid QUBO encoding with all fields', () => {
      const encoding: AimoQuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 5,
        constant: '10.5',
        linear: [
          { i: 0, weight: '2.0' },
          { i: 1, weight: '-1.0' },
        ],
        quadratic: [
          { i: 0, j: 1, weight: '3.5' },
        ],
        objective: 'min',
      };
      const result = validateEncodingStructure(encoding);
      expect(result.valid).toBe(true);
    });

    it('accepts valid Ising encoding with h and j fields', () => {
      const encoding: AimoIsingEncoding = {
        kind: 'ising-v1',
        variableCount: 4,
        constant: '0',
        h: [
          { i: 0, weight: '-2.0' },
          { i: 2, weight: '1.5' },
        ],
        j: [
          { i: 0, j: 1, weight: '-1.0' },
          { i: 1, j: 3, weight: '0.5' },
        ],
        objective: 'min',
      };
      const result = validateEncodingStructure(encoding);
      expect(result.valid).toBe(true);
    });

    it('rejects encoding with missing variableCount', () => {
      const encoding = {
        kind: 'qubo-v1',
      } as unknown as AimoQuboEncoding;
      const result = validateEncodingStructure(encoding);
      expect(result.valid).toBe(false);
    });

    it('rejects encoding with invalid kind', () => {
      const encoding = {
        kind: 'invalid-v1',
        variableCount: 5,
      } as unknown as AimoQuboEncoding;
      const result = validateEncodingStructure(encoding);
      expect(result.valid).toBe(false);
    });

    it('rejects QUBO encoding using h/j fields instead of linear/quadratic', () => {
      const encoding = {
        kind: 'qubo-v1',
        variableCount: 3,
        h: [{ i: 0, weight: '1.0' }],
      } as unknown as AimoQuboEncoding;
      const result = validateEncodingStructure(encoding);
      expect(result.valid).toBe(false);
    });

    it('rejects Ising encoding using linear/quadratic fields instead of h/j', () => {
      const encoding = {
        kind: 'ising-v1',
        variableCount: 3,
        linear: [{ i: 0, weight: '1.0' }],
      } as unknown as AimoIsingEncoding;
      const result = validateEncodingStructure(encoding);
      expect(result.valid).toBe(false);
    });

    it('accepts QUBO encoding with only variableCount (minimal)', () => {
      const encoding: AimoQuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 2,
      };
      const result = validateEncodingStructure(encoding);
      expect(result.valid).toBe(true);
    });

    it('accepts Ising encoding with only variableCount (minimal)', () => {
      const encoding: AimoIsingEncoding = {
        kind: 'ising-v1',
        variableCount: 2,
      };
      const result = validateEncodingStructure(encoding);
      expect(result.valid).toBe(true);
    });
  });

  describe('Cross-constraint integration tests', () => {
    it('validates complex QUBO with all constraints satisfied', () => {
      const encoding: AimoQuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 5,
        constant: '0',
        linear: [
          { i: 0, weight: '1.5' },
          { i: 2, weight: '-0.5' },
          { i: 4, weight: '2.0' },
        ],
        quadratic: [
          { i: 0, j: 1, weight: '3.0' },
          { i: 1, j: 2, weight: '-1.5' },
          { i: 3, j: 4, weight: '2.5' },
        ],
        objective: 'min',
      };

      expect(validateEncodingStructure(encoding).valid).toBe(true);
      expect(validateLinearTerms(encoding).valid).toBe(true);
      expect(validateQuadraticTerms(encoding).valid).toBe(true);
      expect(validateVariableConsistency(encoding).valid).toBe(true);
      expect(validateProblemSize(encoding).valid).toBe(true);
    });

    it('fails on any single constraint violation in complex QUBO', () => {
      const encoding: AimoQuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 100, // violates size constraint
        linear: [
          { i: 0, weight: '1.5' },
        ],
        quadratic: [
          { i: 0, j: 1, weight: '3.0' },
        ],
      };

      expect(validateProblemSize(encoding).valid).toBe(false);
    });

    it('validates complex Ising with all constraints satisfied', () => {
      const encoding: AimoIsingEncoding = {
        kind: 'ising-v1',
        variableCount: 4,
        constant: '-2.5',
        h: [
          { i: 0, weight: '-1.0' },
          { i: 1, weight: '0.5' },
          { i: 3, weight: '1.5' },
        ],
        j: [
          { i: 0, j: 1, weight: '-0.5' },
          { i: 1, j: 2, weight: '1.0' },
          { i: 2, j: 3, weight: '-1.5' },
        ],
        objective: 'max',
      };

      expect(validateEncodingStructure(encoding).valid).toBe(true);
      // h is equivalent to linear for Ising
      // j is equivalent to quadratic for Ising
      expect(validateVariableConsistency(encoding).valid).toBe(true);
      expect(validateProblemSize(encoding).valid).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('handles empty linear array', () => {
      const encoding: AimoQuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 3,
        linear: [],
      };
      const result = validateLinearTerms(encoding);
      expect(result.valid).toBe(true);
    });

    it('handles empty quadratic array', () => {
      const encoding: AimoQuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 3,
        quadratic: [],
      };
      const result = validateQuadraticTerms(encoding);
      expect(result.valid).toBe(true);
    });

    it('handles undefined linear array', () => {
      const encoding: AimoQuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 3,
      };
      const result = validateLinearTerms(encoding);
      expect(result.valid).toBe(true);
    });

    it('handles constant as string', () => {
      const encoding: AimoQuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 2,
        constant: '999.999',
      };
      const result = validateEncodingStructure(encoding);
      expect(result.valid).toBe(true);
    });

    it('handles constant as number', () => {
      const encoding: AimoQuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 2,
        constant: 42,
      };
      const result = validateEncodingStructure(encoding);
      expect(result.valid).toBe(true);
    });

    it('rejects constant as NaN', () => {
      const encoding: AimoQuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 2,
        constant: NaN,
      };
      const result = validateEncodingStructure(encoding);
      expect(result.valid).toBe(false);
    });
  });
});
