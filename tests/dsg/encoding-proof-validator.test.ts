import { describe, it, expect } from 'vitest';
import {
  validateLinearTerms,
  validateQuadraticTerms,
  validateEncoding,
  determineStatus,
} from '@/lib/dsg/deterministic/encoding-proof-validator';
import type {
  QuboEncoding,
  IsingEncoding,
  ProblemEncoding,
} from '@/lib/dsg/deterministic/encoding-proof-types';

describe('Encoding Proof Validator - Unit Tests', () => {
  describe('validateLinearTerms', () => {
    it('accepts valid linear terms for QUBO', () => {
      const encoding: QuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 3,
        linear: [
          { index: 0, weight: '1.5' },
          { index: 2, weight: '-0.5' },
        ],
      };
      const result = validateLinearTerms(encoding);
      expect(result.passed).toBe(true);
    });

    it('accepts valid linear terms for Ising', () => {
      const encoding: IsingEncoding = {
        kind: 'ising-v1',
        variableCount: 3,
        h: [
          { index: 0, weight: '-1.0' },
          { index: 2, weight: '0.5' },
        ],
      };
      const result = validateLinearTerms(encoding);
      expect(result.passed).toBe(true);
    });

    it('rejects linear terms with out-of-bounds indices', () => {
      const encoding: QuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 2,
        linear: [
          { i: 0, weight: '1.0' },
          { i: 3, weight: '2.0' }, // out of bounds
        ],
      };
      const result = validateLinearTerms(encoding);
      expect(result.passed).toBe(false);
      expect(result.reason).toBeDefined();
      expect(result.reason).toContain('out of bounds');
    });

    it('rejects linear terms with invalid weights', () => {
      const encoding: QuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 2,
        linear: [
          { i: 0, weight: 'invalid' }, // not a valid number
        ] as any,
      };
      const result = validateLinearTerms(encoding);
      expect(result.passed).toBe(false);
      expect(result.reason).toBeDefined();
    });
  });

  describe('validateQuadraticTerms', () => {
    it('accepts valid quadratic terms for QUBO', () => {
      const encoding: QuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 3,
        quadratic: [
          { i: 0, j: 1, weight: '2.0' },
          { i: 1, j: 2, weight: '-1.5' },
        ],
      };
      const result = validateQuadraticTerms(encoding);
      expect(result.passed).toBe(true);
    });

    it('accepts valid quadratic terms for Ising', () => {
      const encoding: IsingEncoding = {
        kind: 'ising-v1',
        variableCount: 3,
        j: [
          { i: 0, j: 1, weight: '-2.0' },
          { i: 1, j: 2, weight: '1.5' },
        ],
      };
      const result = validateQuadraticTerms(encoding);
      expect(result.passed).toBe(true);
    });

    it('rejects quadratic terms with out-of-bounds indices', () => {
      const encoding: QuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 2,
        quadratic: [
          { i: 0, j: 3, weight: '1.0' }, // j out of bounds
        ],
      };
      const result = validateQuadraticTerms(encoding);
      expect(result.passed).toBe(false);
      expect(result.reason).toContain('out of bounds');
    });

    it('rejects duplicate quadratic edges', () => {
      const encoding: QuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 3,
        quadratic: [
          { i: 0, j: 1, weight: '1.0' },
          { i: 0, j: 1, weight: '2.0' }, // duplicate
        ],
      };
      const result = validateQuadraticTerms(encoding);
      expect(result.passed).toBe(false);
      expect(result.reason).toContain('Duplicate');
    });

    it('rejects asymmetric edges (i,j) and (j,i)', () => {
      const encoding: QuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 3,
        quadratic: [
          { i: 0, j: 1, weight: '1.0' },
          { i: 1, j: 0, weight: '2.0' }, // same edge, reversed → caught as duplicate after normalization
        ],
      };
      const result = validateQuadraticTerms(encoding);
      expect(result.passed).toBe(false);
      // Implementation catches this as duplicate edge because edges are normalized to i:j form
      expect(result.reason).toContain('Duplicate');
    });
  });

  describe('validateEncoding', () => {
    it('validates complete valid QUBO encoding', () => {
      const encoding: QuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 5,
        constant: '0',
        linear: [
          { index: 0, weight: '1.5' },
          { index: 2, weight: '-0.5' },
        ],
        quadratic: [
          { i: 0, j: 1, weight: '2.0' },
          { i: 1, j: 3, weight: '-1.0' },
        ],
        objective: 'min',
      };

      const result = validateEncoding(encoding);
      expect(result.linear_terms_valid).toBe(true);
      expect(result.quadratic_terms_valid).toBe(true);
      expect(result.dimension_within_bounds).toBe(true);
    });

    it('validates complete valid Ising encoding', () => {
      const encoding: IsingEncoding = {
        kind: 'ising-v1',
        variableCount: 4,
        constant: '-2.5',
        h: [
          { index: 0, weight: '-1.0' },
          { index: 2, weight: '0.5' },
        ],
        j: [
          { i: 0, j: 1, weight: '-2.0' },
          { i: 1, j: 2, weight: '1.5' },
        ],
        objective: 'min',
      };

      const result = validateEncoding(encoding);
      expect(result.linear_terms_valid).toBe(true);
      expect(result.quadratic_terms_valid).toBe(true);
      expect(result.dimension_within_bounds).toBe(true);
    });

    it('rejects oversized QUBO problem', () => {
      const encoding: QuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 100, // exceeds MAX_VARIABLES (62)
      };

      const result = validateEncoding(encoding);
      expect(result.dimension_within_bounds).toBe(false);
    });

    it('rejects minimal QUBO (no variableCount)', () => {
      const encoding = {
        kind: 'qubo-v1',
        // missing variableCount - will be undefined
      } as any;

      const result = validateEncoding(encoding);
      expect(result.dimension_within_bounds).toBe(false);
    });

    it('accepts minimal QUBO with just variableCount', () => {
      const encoding: QuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 2,
      };

      const result = validateEncoding(encoding);
      expect(result.dimension_within_bounds).toBe(true);
      expect(result.linear_terms_valid).toBe(true);
      expect(result.quadratic_terms_valid).toBe(true);
    });
  });

  describe('determineStatus', () => {
    it('returns PASS when all checks pass', () => {
      const checks = {
        linear_terms_valid: true,
        quadratic_terms_valid: true,
        dimension_within_bounds: true,
        coefficient_magnitude_bounded: true,
        no_nan_or_infinity: true,
        no_duplicate_edges: true,
        variable_naming_consistent: true,
        encoding_type_matches: true,
      };

      const status = determineStatus(checks);
      expect(status).toBe('PASS');
    });

    it('returns BLOCK when critical check fails (linear_terms_valid)', () => {
      const checks = {
        linear_terms_valid: false, // CRITICAL
        quadratic_terms_valid: true,
        dimension_within_bounds: true,
        coefficient_magnitude_bounded: true,
        no_nan_or_infinity: true,
        no_duplicate_edges: true,
        variable_naming_consistent: true,
        encoding_type_matches: true,
      };

      const status = determineStatus(checks);
      expect(status).toBe('BLOCK');
    });

    it('returns BLOCK when critical check fails (NaN/Infinity)', () => {
      const checks = {
        linear_terms_valid: true,
        quadratic_terms_valid: true,
        dimension_within_bounds: true,
        coefficient_magnitude_bounded: true,
        no_nan_or_infinity: false, // CRITICAL
        no_duplicate_edges: true,
        variable_naming_consistent: true,
        encoding_type_matches: true,
      };

      const status = determineStatus(checks);
      expect(status).toBe('BLOCK');
    });

    it('returns REVIEW when single non-critical check fails', () => {
      const checks = {
        linear_terms_valid: true,
        quadratic_terms_valid: true,
        dimension_within_bounds: false, // non-critical (single failure)
        coefficient_magnitude_bounded: true,
        no_nan_or_infinity: true,
        no_duplicate_edges: true,
        variable_naming_consistent: true,
        encoding_type_matches: true,
      };

      const status = determineStatus(checks);
      expect(status).toBe('REVIEW');
    });

    it('returns BLOCK when 2+ non-critical checks fail', () => {
      const checks = {
        linear_terms_valid: true,
        quadratic_terms_valid: true,
        dimension_within_bounds: false,
        coefficient_magnitude_bounded: false,
        no_nan_or_infinity: true,
        no_duplicate_edges: true,
        variable_naming_consistent: true,
        encoding_type_matches: true,
      };

      const status = determineStatus(checks);
      expect(status).toBe('BLOCK');
    });
  });

  describe('Edge cases', () => {
    it('handles encoding without linear terms', () => {
      const encoding: QuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 2,
        // no linear field
      };

      const result = validateEncoding(encoding);
      expect(result.linear_terms_valid).toBe(true);
      expect(result.quadratic_terms_valid).toBe(true);
    });

    it('handles encoding without quadratic terms', () => {
      const encoding: QuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 2,
        linear: [{ index: 0, weight: '1.0' }],
        // no quadratic field
      };

      const result = validateEncoding(encoding);
      expect(result.linear_terms_valid).toBe(true);
      expect(result.quadratic_terms_valid).toBe(true);
    });

    it('validates zero variable count as invalid', () => {
      const encoding: QuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 0,
      };

      const result = validateEncoding(encoding);
      expect(result.dimension_within_bounds).toBe(false);
    });

    it('validates negative variable count as invalid', () => {
      const encoding: QuboEncoding = {
        kind: 'qubo-v1',
        variableCount: -5,
      };

      const result = validateEncoding(encoding);
      expect(result.dimension_within_bounds).toBe(false);
    });

    it('validates maximum allowed variable count (62)', () => {
      const encoding: QuboEncoding = {
        kind: 'qubo-v1',
        variableCount: 62,
      };

      const result = validateEncoding(encoding);
      expect(result.dimension_within_bounds).toBe(true);
    });
  });
});
