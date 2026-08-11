/**
 * Tests for Encoding Proof Validator
 */

import { describe, it, expect } from 'vitest';
import {
  validateLinearTerms,
  validateQuadraticTerms,
  validateDimensionWithinBounds,
  validateCoefficientMagnitudeBounded,
  validateNoNanOrInfinity,
  validateNoDuplicateEdges,
  validateVariableNamingConsistent,
  validateEncodingTypeMatches,
  validateEncoding,
  determineStatus,
} from '@/lib/dsg/deterministic/encoding-proof-validator';
import { ProblemEncoding } from '@/lib/dsg/deterministic/encoding-proof-types';

describe('Encoding Proof Validator', () => {
  describe('validateLinearTerms', () => {
    it('should pass valid linear terms', () => {
      const encoding: ProblemEncoding = {
        kind: 'qubo-v1',
        variableCount: 5,
        linear: [
          { index: 0, weight: '2.5' },
          { index: 4, weight: '-1.2' },
        ],
      };
      expect(validateLinearTerms(encoding).passed).toBe(true);
    });

    it('should fail on NaN weight', () => {
      const encoding: ProblemEncoding = {
        kind: 'qubo-v1',
        variableCount: 5,
        linear: [{ index: 0, weight: 'NaN' }],
      };
      const result = validateLinearTerms(encoding);
      expect(result.passed).toBe(false);
      expect(result.reason).toContain('finite numeric weight');
    });

    it('should fail on index out of bounds', () => {
      const encoding: ProblemEncoding = {
        kind: 'qubo-v1',
        variableCount: 5,
        linear: [{ index: 10, weight: '1.0' }],
      };
      const result = validateLinearTerms(encoding);
      expect(result.passed).toBe(false);
      expect(result.reason).toContain('out of bounds');
    });

    it('should fail on negative index', () => {
      const encoding: ProblemEncoding = {
        kind: 'qubo-v1',
        variableCount: 5,
        linear: [{ index: -1, weight: '1.0' }],
      };
      const result = validateLinearTerms(encoding);
      expect(result.passed).toBe(false);
    });
  });

  describe('validateQuadraticTerms', () => {
    it('should pass valid quadratic terms', () => {
      const encoding: ProblemEncoding = {
        kind: 'qubo-v1',
        variableCount: 5,
        quadratic: [
          { i: 0, j: 1, weight: '3.14' },
          { i: 2, j: 3, weight: '-0.5' },
        ],
      };
      expect(validateQuadraticTerms(encoding).passed).toBe(true);
    });

    it('should allow diagonal terms', () => {
      const encoding: ProblemEncoding = {
        kind: 'qubo-v1',
        variableCount: 5,
        quadratic: [{ i: 0, j: 0, weight: '1.0' }],
      };
      expect(validateQuadraticTerms(encoding).passed).toBe(true);
    });

    it('should fail on duplicate edges', () => {
      const encoding: ProblemEncoding = {
        kind: 'qubo-v1',
        variableCount: 5,
        quadratic: [
          { i: 0, j: 1, weight: '1.0' },
          { i: 0, j: 1, weight: '2.0' },
        ],
      };
      const result = validateQuadraticTerms(encoding);
      expect(result.passed).toBe(false);
      expect(result.reason).toContain('Duplicate');
    });

    it('should fail on asymmetric edges', () => {
      const encoding: ProblemEncoding = {
        kind: 'qubo-v1',
        variableCount: 5,
        quadratic: [
          { i: 0, j: 1, weight: '1.0' },
          { i: 1, j: 0, weight: '1.0' },
        ],
      };
      const result = validateQuadraticTerms(encoding);
      expect(result.passed).toBe(false);
      // Asymmetry is detected as duplicate since both normalize to same canonical edge
      expect(result.reason).toMatch(/Duplicate|Asymmetric/);
    });

    it('should fail on out of bounds indices', () => {
      const encoding: ProblemEncoding = {
        kind: 'qubo-v1',
        variableCount: 5,
        quadratic: [{ i: 0, j: 10, weight: '1.0' }],
      };
      const result = validateQuadraticTerms(encoding);
      expect(result.passed).toBe(false);
    });
  });

  describe('validateDimensionWithinBounds', () => {
    it('should pass valid dimension', () => {
      const encoding: ProblemEncoding = {
        kind: 'qubo-v1',
        variableCount: 10,
      };
      expect(validateDimensionWithinBounds(encoding).passed).toBe(true);
    });

    it('should pass at maximum dimension', () => {
      const encoding: ProblemEncoding = {
        kind: 'qubo-v1',
        variableCount: 62,
      };
      expect(validateDimensionWithinBounds(encoding).passed).toBe(true);
    });

    it('should fail when variableCount exceeds limit', () => {
      const encoding: ProblemEncoding = {
        kind: 'qubo-v1',
        variableCount: 63,
      };
      const result = validateDimensionWithinBounds(encoding);
      expect(result.passed).toBe(false);
      expect(result.reason).toContain('exceeds');
    });

    it('should fail on zero or negative dimension', () => {
      const encoding: ProblemEncoding = {
        kind: 'qubo-v1',
        variableCount: 0,
      };
      const result = validateDimensionWithinBounds(encoding);
      expect(result.passed).toBe(false);
    });
  });

  describe('validateCoefficientMagnitudeBounded', () => {
    it('should pass coefficients within limit', () => {
      const encoding: ProblemEncoding = {
        kind: 'qubo-v1',
        variableCount: 5,
        constant: '1000.5',
        linear: [{ index: 0, weight: '999999' }],
        quadratic: [{ i: 0, j: 1, weight: '500000' }],
      };
      expect(validateCoefficientMagnitudeBounded(encoding).passed).toBe(true);
    });

    it('should fail when coefficient exceeds limit', () => {
      const encoding: ProblemEncoding = {
        kind: 'qubo-v1',
        variableCount: 5,
        linear: [{ index: 0, weight: '1.5e7' }],
      };
      const result = validateCoefficientMagnitudeBounded(encoding);
      expect(result.passed).toBe(false);
      expect(result.reason).toContain('exceeds');
    });

    it('should handle negative coefficients', () => {
      const encoding: ProblemEncoding = {
        kind: 'qubo-v1',
        variableCount: 5,
        linear: [{ index: 0, weight: '-999999.9' }],
      };
      expect(validateCoefficientMagnitudeBounded(encoding).passed).toBe(true);
    });
  });

  describe('validateNoNanOrInfinity', () => {
    it('should pass valid numbers', () => {
      const encoding: ProblemEncoding = {
        kind: 'qubo-v1',
        variableCount: 5,
        constant: '0',
        linear: [{ index: 0, weight: '1e-6' }],
      };
      expect(validateNoNanOrInfinity(encoding).passed).toBe(true);
    });

    it('should fail on NaN constant', () => {
      const encoding: ProblemEncoding = {
        kind: 'qubo-v1',
        variableCount: 5,
        constant: 'NaN',
      };
      const result = validateNoNanOrInfinity(encoding);
      expect(result.passed).toBe(false);
    });

    it('should fail on Infinity', () => {
      const encoding: ProblemEncoding = {
        kind: 'qubo-v1',
        variableCount: 5,
        constant: 'Infinity',
      };
      const result = validateNoNanOrInfinity(encoding);
      expect(result.passed).toBe(false);
    });

    it('should fail on -Infinity', () => {
      const encoding: ProblemEncoding = {
        kind: 'qubo-v1',
        variableCount: 5,
        linear: [{ index: 0, weight: '-Infinity' }],
      };
      const result = validateNoNanOrInfinity(encoding);
      expect(result.passed).toBe(false);
    });
  });

  describe('validateNoDuplicateEdges', () => {
    it('should pass unique edges', () => {
      const encoding: ProblemEncoding = {
        kind: 'qubo-v1',
        variableCount: 5,
        quadratic: [
          { i: 0, j: 1, weight: '1.0' },
          { i: 2, j: 3, weight: '2.0' },
        ],
      };
      expect(validateNoDuplicateEdges(encoding).passed).toBe(true);
    });

    it('should fail on duplicate edge', () => {
      const encoding: ProblemEncoding = {
        kind: 'qubo-v1',
        variableCount: 5,
        quadratic: [
          { i: 0, j: 1, weight: '1.0' },
          { i: 0, j: 1, weight: '2.0' },
        ],
      };
      const result = validateNoDuplicateEdges(encoding);
      expect(result.passed).toBe(false);
      expect(result.reason).toContain('Duplicate');
    });
  });

  describe('validateVariableNamingConsistent', () => {
    it('should pass consistent naming', () => {
      const encoding: ProblemEncoding = {
        kind: 'qubo-v1',
        variableCount: 5,
        linear: [
          { index: 0, weight: '1.0' },
          { index: 4, weight: '1.0' },
        ],
        quadratic: [{ i: 2, j: 3, weight: '1.0' }],
      };
      expect(validateVariableNamingConsistent(encoding).passed).toBe(true);
    });

    it('should fail on index >= variableCount', () => {
      const encoding: ProblemEncoding = {
        kind: 'qubo-v1',
        variableCount: 5,
        linear: [{ index: 7, weight: '1.0' }],
      };
      const result = validateVariableNamingConsistent(encoding);
      expect(result.passed).toBe(false);
    });
  });

  describe('validateEncodingTypeMatches', () => {
    it('should pass valid QUBO encoding', () => {
      const encoding: ProblemEncoding = {
        kind: 'qubo-v1',
        variableCount: 5,
        linear: [],
        quadratic: [],
      };
      expect(validateEncodingTypeMatches(encoding).passed).toBe(true);
    });

    it('should pass valid Ising encoding', () => {
      const encoding: ProblemEncoding = {
        kind: 'ising-v1',
        variableCount: 5,
        h: [],
        j: [],
      };
      expect(validateEncodingTypeMatches(encoding).passed).toBe(true);
    });

    it('should fail when QUBO uses Ising fields', () => {
      const encoding = {
        kind: 'qubo-v1',
        variableCount: 5,
        h: [], // Wrong field for QUBO
      } as any;
      const result = validateEncodingTypeMatches(encoding);
      expect(result.passed).toBe(false);
      expect(result.reason).toContain('Ising fields');
    });
  });

  describe('validateEncoding (orchestration)', () => {
    it('should run all 8 checks', () => {
      const encoding: ProblemEncoding = {
        kind: 'qubo-v1',
        variableCount: 10,
        constant: '0',
        linear: [{ index: 0, weight: '1.0' }],
        quadratic: [{ i: 0, j: 1, weight: '1.0' }],
      };
      const checks = validateEncoding(encoding);
      expect(checks.linear_terms_valid).toBe(true);
      expect(checks.quadratic_terms_valid).toBe(true);
      expect(checks.dimension_within_bounds).toBe(true);
      expect(checks.coefficient_magnitude_bounded).toBe(true);
      expect(checks.no_nan_or_infinity).toBe(true);
      expect(checks.no_duplicate_edges).toBe(true);
      expect(checks.variable_naming_consistent).toBe(true);
      expect(checks.encoding_type_matches).toBe(true);
    });
  });

  describe('determineStatus', () => {
    it('should return PASS when all checks pass', () => {
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
      expect(determineStatus(checks)).toBe('PASS');
    });

    it('should return BLOCK when critical check fails', () => {
      const checks = {
        linear_terms_valid: false,
        quadratic_terms_valid: true,
        dimension_within_bounds: true,
        coefficient_magnitude_bounded: true,
        no_nan_or_infinity: true,
        no_duplicate_edges: true,
        variable_naming_consistent: true,
        encoding_type_matches: true,
      };
      expect(determineStatus(checks)).toBe('BLOCK');
    });

    it('should return BLOCK when two non-critical checks fail', () => {
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
      expect(determineStatus(checks)).toBe('BLOCK');
    });

    it('should return REVIEW when single non-critical check fails', () => {
      const checks = {
        linear_terms_valid: true,
        quadratic_terms_valid: true,
        dimension_within_bounds: false,
        coefficient_magnitude_bounded: true,
        no_nan_or_infinity: true,
        no_duplicate_edges: true,
        variable_naming_consistent: true,
        encoding_type_matches: true,
      };
      expect(determineStatus(checks)).toBe('REVIEW');
    });
  });
});
