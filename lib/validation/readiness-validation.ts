import type { ReadinessConfig } from '@/lib/readiness/check-engine';

export interface ReadinessValidationError {
  field: string;
  message: string;
  code: 'INVALID_INPUT' | 'MISSING_REQUIRED' | 'CONSTRAINT_VIOLATED';
}

export function validateReadinessConfig(
  data: unknown
): { valid: boolean; errors: ReadinessValidationError[]; data?: Partial<ReadinessConfig> } {
  const errors: ReadinessValidationError[] = [];

  if (!data || typeof data !== 'object') {
    return {
      valid: false,
      errors: [{ field: 'root', message: 'Request body must be a JSON object', code: 'INVALID_INPUT' }],
    };
  }

  const body = data as Record<string, unknown>;
  const validated: Partial<ReadinessConfig> = {};

  // Validate minTestCoveragePercent
  if (body.minTestCoveragePercent !== undefined) {
    if (typeof body.minTestCoveragePercent !== 'number') {
      errors.push({
        field: 'minTestCoveragePercent',
        message: 'minTestCoveragePercent must be a number',
        code: 'INVALID_INPUT',
      });
    } else if (body.minTestCoveragePercent < 0 || body.minTestCoveragePercent > 100) {
      errors.push({
        field: 'minTestCoveragePercent',
        message: 'minTestCoveragePercent must be between 0 and 100',
        code: 'CONSTRAINT_VIOLATED',
      });
    } else if (!Number.isInteger(body.minTestCoveragePercent)) {
      errors.push({
        field: 'minTestCoveragePercent',
        message: 'minTestCoveragePercent must be a whole number',
        code: 'INVALID_INPUT',
      });
    } else {
      validated.minTestCoveragePercent = body.minTestCoveragePercent;
    }
  }

  // Validate requireNApprovals
  if (body.requireNApprovals !== undefined) {
    if (typeof body.requireNApprovals !== 'number') {
      errors.push({
        field: 'requireNApprovals',
        message: 'requireNApprovals must be a number',
        code: 'INVALID_INPUT',
      });
    } else if (body.requireNApprovals < 1 || body.requireNApprovals > 10) {
      errors.push({
        field: 'requireNApprovals',
        message: 'requireNApprovals must be between 1 and 10',
        code: 'CONSTRAINT_VIOLATED',
      });
    } else if (!Number.isInteger(body.requireNApprovals)) {
      errors.push({
        field: 'requireNApprovals',
        message: 'requireNApprovals must be a whole number',
        code: 'INVALID_INPUT',
      });
    } else {
      validated.requireNApprovals = body.requireNApprovals;
    }
  }

  // Validate blockOnSecrets
  if (body.blockOnSecrets !== undefined) {
    if (typeof body.blockOnSecrets !== 'boolean') {
      errors.push({
        field: 'blockOnSecrets',
        message: 'blockOnSecrets must be a boolean',
        code: 'INVALID_INPUT',
      });
    } else {
      validated.blockOnSecrets = body.blockOnSecrets;
    }
  }

  // Validate blockOnFailedCI
  if (body.blockOnFailedCI !== undefined) {
    if (typeof body.blockOnFailedCI !== 'boolean') {
      errors.push({
        field: 'blockOnFailedCI',
        message: 'blockOnFailedCI must be a boolean',
        code: 'INVALID_INPUT',
      });
    } else {
      validated.blockOnFailedCI = body.blockOnFailedCI;
    }
  }

  // Validate autoMergeOnPass
  if (body.autoMergeOnPass !== undefined) {
    if (typeof body.autoMergeOnPass !== 'boolean') {
      errors.push({
        field: 'autoMergeOnPass',
        message: 'autoMergeOnPass must be a boolean',
        code: 'INVALID_INPUT',
      });
    } else {
      validated.autoMergeOnPass = body.autoMergeOnPass;
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, errors: [], data: validated };
}

export function validateReadinessCheckRequest(
  data: unknown
): { valid: boolean; errors: ReadinessValidationError[]; data?: { repoUrl: string; coveragePercent?: number; approvalCount?: number } } {
  const errors: ReadinessValidationError[] = [];

  if (!data || typeof data !== 'object') {
    return {
      valid: false,
      errors: [{ field: 'root', message: 'Request body must be a JSON object', code: 'INVALID_INPUT' }],
    };
  }

  const body = data as Record<string, unknown>;

  // Validate repoUrl
  if (!body.repoUrl || typeof body.repoUrl !== 'string') {
    errors.push({
      field: 'repoUrl',
      message: 'repoUrl is required and must be a string',
      code: 'MISSING_REQUIRED',
    });
  } else if (!/^https?:\/\/.+/.test(body.repoUrl)) {
    errors.push({
      field: 'repoUrl',
      message: 'repoUrl must be a valid HTTP/HTTPS URL',
      code: 'INVALID_INPUT',
    });
  }

  // Validate coveragePercent
  let coveragePercent = 82;
  if (body.coveragePercent !== undefined) {
    if (typeof body.coveragePercent !== 'number') {
      errors.push({
        field: 'coveragePercent',
        message: 'coveragePercent must be a number',
        code: 'INVALID_INPUT',
      });
    } else if (body.coveragePercent < 0 || body.coveragePercent > 100) {
      errors.push({
        field: 'coveragePercent',
        message: 'coveragePercent must be between 0 and 100',
        code: 'CONSTRAINT_VIOLATED',
      });
    } else {
      coveragePercent = body.coveragePercent;
    }
  }

  // Validate approvalCount
  let approvalCount = 1;
  if (body.approvalCount !== undefined) {
    if (typeof body.approvalCount !== 'number') {
      errors.push({
        field: 'approvalCount',
        message: 'approvalCount must be a number',
        code: 'INVALID_INPUT',
      });
    } else if (body.approvalCount < 0 || body.approvalCount > 20) {
      errors.push({
        field: 'approvalCount',
        message: 'approvalCount must be between 0 and 20',
        code: 'CONSTRAINT_VIOLATED',
      });
    } else if (!Number.isInteger(body.approvalCount)) {
      errors.push({
        field: 'approvalCount',
        message: 'approvalCount must be a whole number',
        code: 'INVALID_INPUT',
      });
    } else {
      approvalCount = body.approvalCount;
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    data: {
      repoUrl: body.repoUrl as string,
      coveragePercent,
      approvalCount,
    },
  };
}
