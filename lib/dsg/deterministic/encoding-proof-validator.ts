/**
 * Encoding Proof Validator
 *
 * Implements the 8 validation checks for QUBO and Ising encodings.
 */

import {
  ProblemEncoding,
  EncodingChecks,
  QuboEncoding,
  IsingEncoding,
  LinearTerm,
  QuadraticTerm,
  EncodingType,
} from './encoding-proof-types';

const MAX_VARIABLES = 62;
const MAX_COEFFICIENT_MAGNITUDE = 1e6;

/**
 * Check if a value is a valid number (not NaN, not Infinity)
 */
function isValidNumber(value: string | number): boolean {
  if (typeof value === 'string') {
    if (value === 'NaN' || value === 'Infinity' || value === '-Infinity') {
      return false;
    }
    const num = parseFloat(value);
    return !isNaN(num) && isFinite(num);
  }
  return !isNaN(value) && isFinite(value);
}

/**
 * Parse a coefficient value to a number
 */
function parseCoefficient(value: string | number): number {
  if (typeof value === 'string') {
    return parseFloat(value);
  }
  return value;
}

/**
 * Check 1: Linear terms are valid
 */
export function validateLinearTerms(
  encoding: ProblemEncoding
): { passed: boolean; reason?: string } {
  const variableCount = encoding.variableCount;

  // Get linear terms based on encoding type
  let linearTerms: LinearTerm[] = [];
  if (encoding.kind === 'qubo-v1' && encoding.linear) {
    linearTerms = encoding.linear;
  } else if (encoding.kind === 'ising-v1' && encoding.h) {
    linearTerms = encoding.h;
  }

  // Check each linear term
  for (const term of linearTerms) {
    // Check index validity
    if (!Number.isInteger(term.index) || term.index < 0 || term.index >= variableCount) {
      return {
        passed: false,
        reason: `Linear term index ${term.index} out of bounds [0, ${variableCount - 1}]`,
      };
    }

    // Check weight validity
    if (!isValidNumber(term.weight)) {
      return {
        passed: false,
        reason: `Linear term weight is not a valid number: ${term.weight}`,
      };
    }
  }

  return { passed: true };
}

/**
 * Check 2: Quadratic terms are valid and symmetric
 */
export function validateQuadraticTerms(
  encoding: ProblemEncoding
): { passed: boolean; reason?: string } {
  const variableCount = encoding.variableCount;

  // Get quadratic terms
  let quadraticTerms: QuadraticTerm[] = [];
  if (encoding.kind === 'qubo-v1' && encoding.quadratic) {
    quadraticTerms = encoding.quadratic;
  } else if (encoding.kind === 'ising-v1' && encoding.j) {
    quadraticTerms = encoding.j;
  }

  // Track seen edges for duplicate detection
  const seenEdges = new Set<string>();

  for (const term of quadraticTerms) {
    const { i, j, weight } = term;

    // Check index validity
    if (!Number.isInteger(i) || i < 0 || i >= variableCount) {
      return {
        passed: false,
        reason: `Quadratic term index i=${i} out of bounds [0, ${variableCount - 1}]`,
      };
    }
    if (!Number.isInteger(j) || j < 0 || j >= variableCount) {
      return {
        passed: false,
        reason: `Quadratic term index j=${j} out of bounds [0, ${variableCount - 1}]`,
      };
    }

    // Check weight validity
    if (!isValidNumber(weight)) {
      return {
        passed: false,
        reason: `Quadratic term weight is not a valid number: ${weight}`,
      };
    }

    // Check for duplicates and asymmetry
    const edgeKey = i <= j ? `${i}:${j}` : `${j}:${i}`;
    if (seenEdges.has(edgeKey)) {
      return {
        passed: false,
        reason: `Duplicate quadratic edge detected: (${i}, ${j})`,
      };
    }
    seenEdges.add(edgeKey);

    // Check for asymmetry (both (i,j) and (j,i))
    const reverseEdgeKey = i > j ? `${i}:${j}` : `${j}:${i}`;
    if (i !== j && seenEdges.has(reverseEdgeKey)) {
      return {
        passed: false,
        reason: `Asymmetric quadratic terms detected: both (${i}, ${j}) and (${j}, ${i})`,
      };
    }
  }

  return { passed: true };
}

/**
 * Check 3: Problem size within bounds
 */
export function validateDimensionWithinBounds(
  encoding: ProblemEncoding
): { passed: boolean; reason?: string } {
  const { variableCount } = encoding;

  if (!Number.isInteger(variableCount) || variableCount <= 0) {
    return {
      passed: false,
      reason: `Variable count must be a positive integer, got ${variableCount}`,
    };
  }

  if (variableCount > MAX_VARIABLES) {
    return {
      passed: false,
      reason: `Variable count (${variableCount}) exceeds maximum allowed (${MAX_VARIABLES})`,
    };
  }

  return { passed: true };
}

/**
 * Check 4: Coefficient magnitudes bounded
 */
export function validateCoefficientMagnitudeBounded(
  encoding: ProblemEncoding
): { passed: boolean; reason?: string } {
  // Check constant
  if (encoding.constant !== undefined) {
    if (!isValidNumber(encoding.constant)) {
      return {
        passed: false,
        reason: `Constant is not a valid number: ${encoding.constant}`,
      };
    }
    const constantValue = Math.abs(parseCoefficient(encoding.constant));
    if (constantValue > MAX_COEFFICIENT_MAGNITUDE) {
      return {
        passed: false,
        reason: `Constant magnitude (${constantValue}) exceeds maximum (${MAX_COEFFICIENT_MAGNITUDE})`,
      };
    }
  }

  // Check linear terms
  let linearTerms: LinearTerm[] = [];
  if (encoding.kind === 'qubo-v1' && encoding.linear) {
    linearTerms = encoding.linear;
  } else if (encoding.kind === 'ising-v1' && encoding.h) {
    linearTerms = encoding.h;
  }

  for (const term of linearTerms) {
    const magnitude = Math.abs(parseCoefficient(term.weight));
    if (magnitude > MAX_COEFFICIENT_MAGNITUDE) {
      return {
        passed: false,
        reason: `Linear term weight (${magnitude}) exceeds maximum (${MAX_COEFFICIENT_MAGNITUDE}) at index ${term.index}`,
      };
    }
  }

  // Check quadratic terms
  let quadraticTerms: QuadraticTerm[] = [];
  if (encoding.kind === 'qubo-v1' && encoding.quadratic) {
    quadraticTerms = encoding.quadratic;
  } else if (encoding.kind === 'ising-v1' && encoding.j) {
    quadraticTerms = encoding.j;
  }

  for (const term of quadraticTerms) {
    const magnitude = Math.abs(parseCoefficient(term.weight));
    if (magnitude > MAX_COEFFICIENT_MAGNITUDE) {
      return {
        passed: false,
        reason: `Quadratic term weight (${magnitude}) exceeds maximum (${MAX_COEFFICIENT_MAGNITUDE}) at (${term.i}, ${term.j})`,
      };
    }
  }

  return { passed: true };
}

/**
 * Check 5: No NaN or Infinity values
 */
export function validateNoNanOrInfinity(
  encoding: ProblemEncoding
): { passed: boolean; reason?: string } {
  // Check constant
  if (encoding.constant !== undefined) {
    if (!isValidNumber(encoding.constant)) {
      const strVal = String(encoding.constant);
      return {
        passed: false,
        reason: `Invalid constant value: ${strVal}`,
      };
    }
  }

  // Check linear terms
  let linearTerms: LinearTerm[] = [];
  if (encoding.kind === 'qubo-v1' && encoding.linear) {
    linearTerms = encoding.linear;
  } else if (encoding.kind === 'ising-v1' && encoding.h) {
    linearTerms = encoding.h;
  }

  for (const term of linearTerms) {
    if (!isValidNumber(term.weight)) {
      return {
        passed: false,
        reason: `Invalid linear term weight: ${term.weight} at index ${term.index}`,
      };
    }
  }

  // Check quadratic terms
  let quadraticTerms: QuadraticTerm[] = [];
  if (encoding.kind === 'qubo-v1' && encoding.quadratic) {
    quadraticTerms = encoding.quadratic;
  } else if (encoding.kind === 'ising-v1' && encoding.j) {
    quadraticTerms = encoding.j;
  }

  for (const term of quadraticTerms) {
    if (!isValidNumber(term.weight)) {
      return {
        passed: false,
        reason: `Invalid quadratic term weight: ${term.weight} at (${term.i}, ${term.j})`,
      };
    }
  }

  return { passed: true };
}

/**
 * Check 6: No duplicate edges
 */
export function validateNoDuplicateEdges(
  encoding: ProblemEncoding
): { passed: boolean; reason?: string } {
  let quadraticTerms: QuadraticTerm[] = [];
  if (encoding.kind === 'qubo-v1' && encoding.quadratic) {
    quadraticTerms = encoding.quadratic;
  } else if (encoding.kind === 'ising-v1' && encoding.j) {
    quadraticTerms = encoding.j;
  }

  const seenEdges = new Set<string>();

  for (const term of quadraticTerms) {
    const { i, j } = term;
    const edgeKey = i <= j ? `${i}:${j}` : `${j}:${i}`;

    if (seenEdges.has(edgeKey)) {
      return {
        passed: false,
        reason: `Duplicate edge detected: (${i}, ${j})`,
      };
    }
    seenEdges.add(edgeKey);
  }

  return { passed: true };
}

/**
 * Check 7: Variable naming consistency
 */
export function validateVariableNamingConsistent(
  encoding: ProblemEncoding
): { passed: boolean; reason?: string } {
  const { variableCount } = encoding;

  // Check linear terms
  let linearTerms: LinearTerm[] = [];
  if (encoding.kind === 'qubo-v1' && encoding.linear) {
    linearTerms = encoding.linear;
  } else if (encoding.kind === 'ising-v1' && encoding.h) {
    linearTerms = encoding.h;
  }

  for (const term of linearTerms) {
    if (term.index >= variableCount || term.index < 0) {
      return {
        passed: false,
        reason: `Linear term index ${term.index} outside range [0, ${variableCount - 1}]`,
      };
    }
  }

  // Check quadratic terms
  let quadraticTerms: QuadraticTerm[] = [];
  if (encoding.kind === 'qubo-v1' && encoding.quadratic) {
    quadraticTerms = encoding.quadratic;
  } else if (encoding.kind === 'ising-v1' && encoding.j) {
    quadraticTerms = encoding.j;
  }

  for (const term of quadraticTerms) {
    if (term.i >= variableCount || term.i < 0) {
      return {
        passed: false,
        reason: `Quadratic term i=${term.i} outside range [0, ${variableCount - 1}]`,
      };
    }
    if (term.j >= variableCount || term.j < 0) {
      return {
        passed: false,
        reason: `Quadratic term j=${term.j} outside range [0, ${variableCount - 1}]`,
      };
    }
  }

  return { passed: true };
}

/**
 * Check 8: Encoding type matches declared type
 */
export function validateEncodingTypeMatches(
  encoding: ProblemEncoding
): { passed: boolean; reason?: string } {
  if (encoding.kind === 'qubo-v1') {
    const qubo = encoding as any;

    // Check that QUBO has correct field names
    if (!Array.isArray(qubo.linear) && qubo.linear !== undefined) {
      return {
        passed: false,
        reason: `QUBO encoding must have linear array, got ${typeof qubo.linear}`,
      };
    }
    if (!Array.isArray(qubo.quadratic) && qubo.quadratic !== undefined) {
      return {
        passed: false,
        reason: `QUBO encoding must have quadratic array, got ${typeof qubo.quadratic}`,
      };
    }

    // Reject Ising field names in QUBO encoding
    if (qubo.h !== undefined) {
      return {
        passed: false,
        reason: `QUBO encoding uses wrong field name 'h' (Ising-style); use 'linear' instead`,
      };
    }
    if (qubo.j !== undefined) {
      return {
        passed: false,
        reason: `QUBO encoding uses wrong field name 'j' (Ising-style); use 'quadratic' instead`,
      };
    }
  } else if (encoding.kind === 'ising-v1') {
    const ising = encoding as any;

    // Check that Ising has correct field names
    if (!Array.isArray(ising.h) && ising.h !== undefined) {
      return {
        passed: false,
        reason: `Ising encoding must have h array, got ${typeof ising.h}`,
      };
    }
    if (!Array.isArray(ising.j) && ising.j !== undefined) {
      return {
        passed: false,
        reason: `Ising encoding must have j array, got ${typeof ising.j}`,
      };
    }

    // Reject QUBO field names in Ising encoding
    if (ising.linear !== undefined) {
      return {
        passed: false,
        reason: `Ising encoding uses wrong field name 'linear' (QUBO-style); use 'h' instead`,
      };
    }
    if (ising.quadratic !== undefined) {
      return {
        passed: false,
        reason: `Ising encoding uses wrong field name 'quadratic' (QUBO-style); use 'j' instead`,
      };
    }
  } else {
    return {
      passed: false,
      reason: `Unsupported encoding kind: ${(encoding as any).kind}`,
    };
  }

  return { passed: true };
}

/**
 * Run all 8 validation checks
 */
export function validateEncoding(encoding: ProblemEncoding): EncodingChecks {
  return {
    linear_terms_valid: validateLinearTerms(encoding).passed,
    quadratic_terms_valid: validateQuadraticTerms(encoding).passed,
    dimension_within_bounds: validateDimensionWithinBounds(encoding).passed,
    coefficient_magnitude_bounded: validateCoefficientMagnitudeBounded(encoding).passed,
    no_nan_or_infinity: validateNoNanOrInfinity(encoding).passed,
    no_duplicate_edges: validateNoDuplicateEdges(encoding).passed,
    variable_naming_consistent: validateVariableNamingConsistent(encoding).passed,
    encoding_type_matches: validateEncodingTypeMatches(encoding).passed,
  };
}

/**
 * Determine validation status based on checks
 */
export function determineStatus(checks: EncodingChecks): 'PASS' | 'BLOCK' | 'REVIEW' {
  const allPassed = Object.values(checks).every(v => v === true);
  if (allPassed) {
    return 'PASS';
  }

  // CRITICAL checks: 1, 2, 5 (indices: linear_terms_valid, quadratic_terms_valid, no_nan_or_infinity)
  const criticalChecks = [
    checks.linear_terms_valid,
    checks.quadratic_terms_valid,
    checks.no_nan_or_infinity,
  ];

  if (criticalChecks.some(c => !c)) {
    return 'BLOCK';
  }

  // If multiple other checks fail, also BLOCK
  const failedCount = Object.values(checks).filter(v => !v).length;
  if (failedCount >= 2) {
    return 'BLOCK';
  }

  // Otherwise REVIEW
  return 'REVIEW';
}

/**
 * Get reasons for failed checks
 */
export function getFailureReasons(encoding: ProblemEncoding, checks: EncodingChecks): string[] {
  const reasons: string[] = [];

  if (!checks.linear_terms_valid) {
    const result = validateLinearTerms(encoding);
    if (result.reason) reasons.push(result.reason);
  }
  if (!checks.quadratic_terms_valid) {
    const result = validateQuadraticTerms(encoding);
    if (result.reason) reasons.push(result.reason);
  }
  if (!checks.dimension_within_bounds) {
    const result = validateDimensionWithinBounds(encoding);
    if (result.reason) reasons.push(result.reason);
  }
  if (!checks.coefficient_magnitude_bounded) {
    const result = validateCoefficientMagnitudeBounded(encoding);
    if (result.reason) reasons.push(result.reason);
  }
  if (!checks.no_nan_or_infinity) {
    const result = validateNoNanOrInfinity(encoding);
    if (result.reason) reasons.push(result.reason);
  }
  if (!checks.no_duplicate_edges) {
    const result = validateNoDuplicateEdges(encoding);
    if (result.reason) reasons.push(result.reason);
  }
  if (!checks.variable_naming_consistent) {
    const result = validateVariableNamingConsistent(encoding);
    if (result.reason) reasons.push(result.reason);
  }
  if (!checks.encoding_type_matches) {
    const result = validateEncodingTypeMatches(encoding);
    if (result.reason) reasons.push(result.reason);
  }

  return reasons;
}
