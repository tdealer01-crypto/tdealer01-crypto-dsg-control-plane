import type {
  ProblemEncoding,
  EncodingChecks,
  LinearTerm,
  QuadraticTerm,
  EncodingType,
  Coefficient,
} from './encoding-proof-types';

export const MAX_ENCODING_VARIABLES = 62;
export const MAX_ENCODING_COEFFICIENT_MAGNITUDE = 1e6;

// Complete JSON-style decimal grammar. No prefix parsing and no whitespace
// coercion: "1junk", " 1", null, false, NaN and Infinity are all rejected.
const DECIMAL_GRAMMAR = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function isStrictCoefficient(value: unknown): value is Coefficient {
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value !== 'string' || value.length === 0 || value !== value.trim()) return false;
  if (!DECIMAL_GRAMMAR.test(value)) return false;
  return Number.isFinite(Number(value));
}

function coefficientNumber(value: Coefficient): number {
  return typeof value === 'number' ? value : Number(value);
}

function isLinearTermShape(value: unknown): value is LinearTerm {
  return (
    isRecord(value) &&
    Number.isInteger(value.index) &&
    isStrictCoefficient(value.weight)
  );
}

function isQuadraticTermShape(value: unknown): value is QuadraticTerm {
  return (
    isRecord(value) &&
    Number.isInteger(value.i) &&
    Number.isInteger(value.j) &&
    isStrictCoefficient(value.weight)
  );
}

/**
 * Route-level runtime shape validation. This is intentionally stricter than
 * TypeScript types because JSON callers can send nulls, booleans and malformed
 * strings that the compiler never sees.
 */
export function validateEncodingRuntimeShape(
  value: unknown,
  expectedType?: EncodingType,
): { valid: true; encoding: ProblemEncoding } | { valid: false; error: string } {
  if (!isRecord(value)) return { valid: false, error: 'encoding must be an object' };

  const kind = value.kind;
  if (kind !== 'qubo-v1' && kind !== 'ising-v1') {
    return { valid: false, error: 'encoding.kind must be "qubo-v1" or "ising-v1"' };
  }
  if (expectedType && kind !== expectedType) {
    return { valid: false, error: 'encoding.kind must match encodingType' };
  }
  if (!Number.isInteger(value.variableCount) || Number(value.variableCount) <= 0) {
    return { valid: false, error: 'variableCount must be a positive integer' };
  }
  if (value.objective !== undefined && value.objective !== 'min' && value.objective !== 'max') {
    return { valid: false, error: 'objective must be "min" or "max" when provided' };
  }
  if (value.constant !== undefined && !isStrictCoefficient(value.constant)) {
    return { valid: false, error: 'constant must be a finite number or canonical numeric string' };
  }

  const linear = kind === 'qubo-v1' ? value.linear : value.h;
  const quadratic = kind === 'qubo-v1' ? value.quadratic : value.j;

  if (linear !== undefined) {
    if (!Array.isArray(linear)) {
      return { valid: false, error: `${kind === 'qubo-v1' ? 'linear' : 'h'} must be an array` };
    }
    for (let index = 0; index < linear.length; index += 1) {
      if (!isLinearTermShape(linear[index])) {
        return {
          valid: false,
          error: `${kind === 'qubo-v1' ? 'linear' : 'h'}[${index}] must contain integer index and finite numeric weight`,
        };
      }
    }
  }

  if (quadratic !== undefined) {
    if (!Array.isArray(quadratic)) {
      return { valid: false, error: `${kind === 'qubo-v1' ? 'quadratic' : 'j'} must be an array` };
    }
    for (let index = 0; index < quadratic.length; index += 1) {
      if (!isQuadraticTermShape(quadratic[index])) {
        return {
          valid: false,
          error: `${kind === 'qubo-v1' ? 'quadratic' : 'j'}[${index}] must contain integer i/j and finite numeric weight`,
        };
      }
    }
  }

  if (kind === 'qubo-v1' && (value.h !== undefined || value.j !== undefined)) {
    return { valid: false, error: 'QUBO encoding must not contain Ising fields h/j' };
  }
  if (kind === 'ising-v1' && (value.linear !== undefined || value.quadratic !== undefined)) {
    return { valid: false, error: 'Ising encoding must not contain QUBO fields linear/quadratic' };
  }

  return { valid: true, encoding: value as unknown as ProblemEncoding };
}

function linearTerms(encoding: ProblemEncoding): unknown[] {
  return encoding.kind === 'qubo-v1' ? encoding.linear ?? [] : encoding.h ?? [];
}

function quadraticTerms(encoding: ProblemEncoding): unknown[] {
  return encoding.kind === 'qubo-v1' ? encoding.quadratic ?? [] : encoding.j ?? [];
}

export function validateLinearTerms(
  encoding: ProblemEncoding,
): { passed: boolean; reason?: string } {
  for (const raw of linearTerms(encoding)) {
    if (!isLinearTermShape(raw)) {
      return { passed: false, reason: 'Linear term must contain integer index and finite numeric weight' };
    }
    if (raw.index < 0 || raw.index >= encoding.variableCount) {
      return {
        passed: false,
        reason: `Linear term index ${raw.index} out of bounds [0, ${encoding.variableCount - 1}]`,
      };
    }
  }
  return { passed: true };
}

export function validateQuadraticTerms(
  encoding: ProblemEncoding,
): { passed: boolean; reason?: string } {
  for (const raw of quadraticTerms(encoding)) {
    if (!isQuadraticTermShape(raw)) {
      return { passed: false, reason: 'Quadratic term must contain integer i/j and finite numeric weight' };
    }
    if (raw.i < 0 || raw.i >= encoding.variableCount) {
      return {
        passed: false,
        reason: `Quadratic term index i=${raw.i} out of bounds [0, ${encoding.variableCount - 1}]`,
      };
    }
    if (raw.j < 0 || raw.j >= encoding.variableCount) {
      return {
        passed: false,
        reason: `Quadratic term index j=${raw.j} out of bounds [0, ${encoding.variableCount - 1}]`,
      };
    }
  }
  return { passed: true };
}

export function validateDimensionWithinBounds(
  encoding: ProblemEncoding,
): { passed: boolean; reason?: string } {
  const count = encoding.variableCount;
  if (!Number.isInteger(count) || count <= 0) {
    return { passed: false, reason: `Variable count must be a positive integer, got ${String(count)}` };
  }
  if (count > MAX_ENCODING_VARIABLES) {
    return {
      passed: false,
      reason: `Variable count (${count}) exceeds maximum allowed (${MAX_ENCODING_VARIABLES})`,
    };
  }
  return { passed: true };
}

export function validateCoefficientMagnitudeBounded(
  encoding: ProblemEncoding,
): { passed: boolean; reason?: string } {
  const values: Array<{ label: string; value: unknown }> = [];
  if (encoding.constant !== undefined) values.push({ label: 'constant', value: encoding.constant });

  for (const raw of linearTerms(encoding)) {
    if (!isLinearTermShape(raw)) return { passed: false, reason: 'Malformed linear coefficient' };
    values.push({ label: `linear[${raw.index}]`, value: raw.weight });
  }
  for (const raw of quadraticTerms(encoding)) {
    if (!isQuadraticTermShape(raw)) return { passed: false, reason: 'Malformed quadratic coefficient' };
    values.push({ label: `quadratic[${raw.i},${raw.j}]`, value: raw.weight });
  }

  for (const item of values) {
    if (!isStrictCoefficient(item.value)) {
      return { passed: false, reason: `${item.label} is not a valid finite coefficient` };
    }
    const magnitude = Math.abs(coefficientNumber(item.value));
    if (magnitude > MAX_ENCODING_COEFFICIENT_MAGNITUDE) {
      return {
        passed: false,
        reason: `${item.label} magnitude (${magnitude}) exceeds maximum (${MAX_ENCODING_COEFFICIENT_MAGNITUDE})`,
      };
    }
  }
  return { passed: true };
}

export function validateNoNanOrInfinity(
  encoding: ProblemEncoding,
): { passed: boolean; reason?: string } {
  if (encoding.constant !== undefined && !isStrictCoefficient(encoding.constant)) {
    return { passed: false, reason: `Invalid constant value: ${String(encoding.constant)}` };
  }
  for (const raw of linearTerms(encoding)) {
    if (!isLinearTermShape(raw)) return { passed: false, reason: 'Invalid linear term value' };
  }
  for (const raw of quadraticTerms(encoding)) {
    if (!isQuadraticTermShape(raw)) return { passed: false, reason: 'Invalid quadratic term value' };
  }
  return { passed: true };
}

export function validateNoDuplicateEdges(
  encoding: ProblemEncoding,
): { passed: boolean; reason?: string } {
  const seen = new Set<string>();
  for (const raw of quadraticTerms(encoding)) {
    if (!isQuadraticTermShape(raw)) return { passed: false, reason: 'Malformed quadratic term' };
    const key = raw.i <= raw.j ? `${raw.i}:${raw.j}` : `${raw.j}:${raw.i}`;
    if (seen.has(key)) {
      return { passed: false, reason: `Duplicate edge detected: (${raw.i}, ${raw.j})` };
    }
    seen.add(key);
  }
  return { passed: true };
}

export function validateVariableNamingConsistent(
  encoding: ProblemEncoding,
): { passed: boolean; reason?: string } {
  const linear = validateLinearTerms(encoding);
  if (!linear.passed) return linear;
  const quadratic = validateQuadraticTerms(encoding);
  if (!quadratic.passed) return quadratic;
  return { passed: true };
}

export function validateEncodingTypeMatches(
  encoding: ProblemEncoding,
): { passed: boolean; reason?: string } {
  const runtime = encoding as unknown as Record<string, unknown>;
  if (encoding.kind !== 'qubo-v1' && encoding.kind !== 'ising-v1') {
    return { passed: false, reason: `Unsupported encoding kind: ${String(runtime.kind)}` };
  }
  if (runtime.objective !== undefined && runtime.objective !== 'min' && runtime.objective !== 'max') {
    return { passed: false, reason: `Unsupported objective: ${String(runtime.objective)}` };
  }
  if (encoding.kind === 'qubo-v1') {
    if (runtime.h !== undefined || runtime.j !== undefined) {
      return { passed: false, reason: 'QUBO encoding contains Ising fields' };
    }
    if (runtime.linear !== undefined && !Array.isArray(runtime.linear)) {
      return { passed: false, reason: 'QUBO linear must be an array' };
    }
    if (runtime.quadratic !== undefined && !Array.isArray(runtime.quadratic)) {
      return { passed: false, reason: 'QUBO quadratic must be an array' };
    }
  } else {
    if (runtime.linear !== undefined || runtime.quadratic !== undefined) {
      return { passed: false, reason: 'Ising encoding contains QUBO fields' };
    }
    if (runtime.h !== undefined && !Array.isArray(runtime.h)) {
      return { passed: false, reason: 'Ising h must be an array' };
    }
    if (runtime.j !== undefined && !Array.isArray(runtime.j)) {
      return { passed: false, reason: 'Ising j must be an array' };
    }
  }
  return { passed: true };
}

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

export function determineStatus(checks: EncodingChecks): 'PASS' | 'BLOCK' | 'REVIEW' {
  if (Object.values(checks).every(Boolean)) return 'PASS';

  const criticalFailed =
    !checks.linear_terms_valid ||
    !checks.quadratic_terms_valid ||
    !checks.no_nan_or_infinity;
  if (criticalFailed) return 'BLOCK';

  return Object.values(checks).filter((value) => !value).length >= 2 ? 'BLOCK' : 'REVIEW';
}

export function getFailureReasons(
  encoding: ProblemEncoding,
  checks: EncodingChecks,
): string[] {
  const validators: Array<[keyof EncodingChecks, () => { passed: boolean; reason?: string }]> = [
    ['linear_terms_valid', () => validateLinearTerms(encoding)],
    ['quadratic_terms_valid', () => validateQuadraticTerms(encoding)],
    ['dimension_within_bounds', () => validateDimensionWithinBounds(encoding)],
    ['coefficient_magnitude_bounded', () => validateCoefficientMagnitudeBounded(encoding)],
    ['no_nan_or_infinity', () => validateNoNanOrInfinity(encoding)],
    ['no_duplicate_edges', () => validateNoDuplicateEdges(encoding)],
    ['variable_naming_consistent', () => validateVariableNamingConsistent(encoding)],
    ['encoding_type_matches', () => validateEncodingTypeMatches(encoding)],
  ];

  const reasons: string[] = [];
  for (const [name, validate] of validators) {
    if (!checks[name]) {
      const result = validate();
      reasons.push(result.reason ?? `${name} failed`);
    }
  }
  return reasons;
}
