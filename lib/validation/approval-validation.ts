import type { Database } from '@/lib/database.types';

export interface ApprovalValidationError {
  field: string;
  message: string;
  code: 'INVALID_INPUT' | 'MISSING_REQUIRED' | 'CONSTRAINT_VIOLATED';
}

export interface ValidatedApprovalRequest {
  agentId: string;
  orgId: string;
  action: string;
  input: Record<string, unknown>;
  expiresInHours: number;
  priority: 'low' | 'medium' | 'high';
}

export function validateApprovalRequest(
  data: unknown
): { valid: boolean; errors: ApprovalValidationError[]; data?: ValidatedApprovalRequest } {
  const errors: ApprovalValidationError[] = [];

  if (!data || typeof data !== 'object') {
    return {
      valid: false,
      errors: [{ field: 'root', message: 'Request body must be a JSON object', code: 'INVALID_INPUT' }],
    };
  }

  const body = data as Record<string, unknown>;

  // Validate agentId
  if (!body.agentId || typeof body.agentId !== 'string') {
    errors.push({
      field: 'agentId',
      message: 'agentId is required and must be a string',
      code: 'MISSING_REQUIRED',
    });
  } else if (body.agentId.length < 2 || body.agentId.length > 255) {
    errors.push({
      field: 'agentId',
      message: 'agentId must be between 2 and 255 characters',
      code: 'CONSTRAINT_VIOLATED',
    });
  }

  // Validate orgId
  if (!body.orgId || typeof body.orgId !== 'string') {
    errors.push({
      field: 'orgId',
      message: 'orgId is required and must be a string (UUID)',
      code: 'MISSING_REQUIRED',
    });
  } else if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.orgId)) {
    errors.push({
      field: 'orgId',
      message: 'orgId must be a valid UUID',
      code: 'CONSTRAINT_VIOLATED',
    });
  }

  // Validate action
  if (!body.action || typeof body.action !== 'string') {
    errors.push({
      field: 'action',
      message: 'action is required and must be a string',
      code: 'MISSING_REQUIRED',
    });
  } else if (body.action.length < 5 || body.action.length > 500) {
    errors.push({
      field: 'action',
      message: 'action must be between 5 and 500 characters',
      code: 'CONSTRAINT_VIOLATED',
    });
  }

  // Validate input (optional, defaults to {})
  if (body.input && typeof body.input !== 'object') {
    errors.push({
      field: 'input',
      message: 'input must be a JSON object',
      code: 'INVALID_INPUT',
    });
  }

  // Validate expiresInHours
  const expiresInHours = body.expiresInHours ?? 24;
  if (typeof expiresInHours !== 'number') {
    errors.push({
      field: 'expiresInHours',
      message: 'expiresInHours must be a number',
      code: 'INVALID_INPUT',
    });
  } else if (expiresInHours < 1 || expiresInHours > 720) {
    errors.push({
      field: 'expiresInHours',
      message: 'expiresInHours must be between 1 and 720 hours (30 days)',
      code: 'CONSTRAINT_VIOLATED',
    });
  }

  // Validate priority
  const priority = (body.priority ?? 'medium') as string;
  if (!['low', 'medium', 'high'].includes(priority)) {
    errors.push({
      field: 'priority',
      message: 'priority must be one of: low, medium, high',
      code: 'INVALID_INPUT',
    });
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    data: {
      agentId: body.agentId as string,
      orgId: body.orgId as string,
      action: body.action as string,
      input: (body.input as Record<string, unknown>) || {},
      expiresInHours: expiresInHours as number,
      priority: priority as 'low' | 'medium' | 'high',
    },
  };
}

export function validateApprovalDecision(
  data: unknown
): { valid: boolean; errors: ApprovalValidationError[]; data?: { decision: 'approved' | 'rejected'; reason?: string } } {
  const errors: ApprovalValidationError[] = [];

  if (!data || typeof data !== 'object') {
    return {
      valid: false,
      errors: [{ field: 'root', message: 'Request body must be a JSON object', code: 'INVALID_INPUT' }],
    };
  }

  const body = data as Record<string, unknown>;

  // Validate decision
  if (!body.decision || typeof body.decision !== 'string') {
    errors.push({
      field: 'decision',
      message: 'decision is required and must be "approved" or "rejected"',
      code: 'MISSING_REQUIRED',
    });
  } else if (!['approved', 'rejected'].includes(body.decision)) {
    errors.push({
      field: 'decision',
      message: 'decision must be either "approved" or "rejected"',
      code: 'INVALID_INPUT',
    });
  }

  // Validate reason (optional but recommended for rejections)
  if (body.reason && typeof body.reason !== 'string') {
    errors.push({
      field: 'reason',
      message: 'reason must be a string',
      code: 'INVALID_INPUT',
    });
  } else if (body.reason && (body.reason as string).length > 1000) {
    errors.push({
      field: 'reason',
      message: 'reason must be less than 1000 characters',
      code: 'CONSTRAINT_VIOLATED',
    });
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    data: {
      decision: body.decision as 'approved' | 'rejected',
      reason: (body.reason as string) || undefined,
    },
  };
}

export function validatePaginationParams(
  offset?: unknown,
  limit?: unknown
): { valid: boolean; errors: ApprovalValidationError[]; offset?: number; limit?: number } {
  const errors: ApprovalValidationError[] = [];
  let parsedOffset = 0;
  let parsedLimit = 25;

  if (offset !== undefined) {
    const num = typeof offset === 'string' ? parseInt(offset, 10) : offset;
    if (!Number.isInteger(num) || num < 0) {
      errors.push({
        field: 'offset',
        message: 'offset must be a non-negative integer',
        code: 'INVALID_INPUT',
      });
    } else if (num > 10000) {
      errors.push({
        field: 'offset',
        message: 'offset must be less than 10000',
        code: 'CONSTRAINT_VIOLATED',
      });
    } else {
      parsedOffset = num;
    }
  }

  if (limit !== undefined) {
    const num = typeof limit === 'string' ? parseInt(limit, 10) : limit;
    if (!Number.isInteger(num) || num < 1) {
      errors.push({
        field: 'limit',
        message: 'limit must be a positive integer',
        code: 'INVALID_INPUT',
      });
    } else if (num > 100) {
      errors.push({
        field: 'limit',
        message: 'limit must be 100 or less',
        code: 'CONSTRAINT_VIOLATED',
      });
    } else {
      parsedLimit = num;
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, errors: [], offset: parsedOffset, limit: parsedLimit };
}
