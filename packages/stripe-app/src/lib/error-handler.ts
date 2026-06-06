/**
 * Error handling utilities for Stripe App
 *
 * Provides standardized error classes and safe error responses
 * that don't leak sensitive information.
 */

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super('VALIDATION_ERROR', message, 400, context);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Unauthorized', context?: Record<string, unknown>) {
    super('AUTHENTICATION_ERROR', message, 401, context);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Forbidden', context?: Record<string, unknown>) {
    super('AUTHORIZATION_ERROR', message, 403, context);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, context?: Record<string, unknown>) {
    super('NOT_FOUND', `${resource} not found`, 404, context);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super('CONFLICT', message, 409, context);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests', retryAfter?: number) {
    super('RATE_LIMIT_EXCEEDED', message, 429, { retryAfter });
    this.name = 'RateLimitError';
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = 'Internal server error', context?: Record<string, unknown>) {
    super('INTERNAL_SERVER_ERROR', message, 500, context);
    this.name = 'InternalServerError';
  }
}

export interface SafeErrorResponse {
  error: {
    code: string;
    message: string;
    requestId?: string;
  };
  details?: Record<string, unknown>;
}

/**
 * Create a safe error response that doesn't leak sensitive information
 *
 * In production, returns a generic error message.
 * In development, includes the full error message.
 */
export function createSafeErrorResponse(
  err: unknown,
  isDevelopment: boolean = false,
  requestId?: string
): SafeErrorResponse {
  if (err instanceof AppError) {
    return {
      error: {
        code: err.code,
        message: isDevelopment ? err.message : getPublicMessage(err.code),
        requestId,
      },
      details: isDevelopment ? err.context : undefined,
    };
  }

  if (err instanceof Error) {
    return {
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: isDevelopment ? err.message : 'An error occurred',
        requestId,
      },
      details: isDevelopment ? { stack: err.stack } : undefined,
    };
  }

  return {
    error: {
      code: 'UNKNOWN_ERROR',
      message: isDevelopment ? String(err) : 'An unknown error occurred',
      requestId,
    },
  };
}

/**
 * Get a public-safe error message for a given error code
 */
function getPublicMessage(code: string): string {
  const publicMessages: Record<string, string> = {
    VALIDATION_ERROR: 'Invalid request',
    AUTHENTICATION_ERROR: 'Authentication failed',
    AUTHORIZATION_ERROR: 'Access denied',
    NOT_FOUND: 'Resource not found',
    CONFLICT: 'Conflict with existing resource',
    RATE_LIMIT_EXCEEDED: 'Too many requests',
    INTERNAL_SERVER_ERROR: 'An error occurred',
    CONFIGURATION_ERROR: 'Service misconfigured',
    MISSING_SIGNATURE: 'Invalid request signature',
    EMPTY_PAYLOAD: 'Empty request body',
    INVALID_SIGNATURE: 'Signature verification failed',
    INVALID_EVENT: 'Invalid event structure',
    UNKNOWN_ERROR: 'An error occurred',
  };

  return publicMessages[code] || 'An error occurred';
}

/**
 * Check if an error is expected/recoverable
 */
export function isRecoverableError(err: unknown): boolean {
  if (err instanceof AppError) {
    // Rate limit and timeouts are recoverable
    return [429, 408, 503].includes(err.statusCode);
  }
  return false;
}

/**
 * Format error for logging
 */
export function formatErrorForLogging(err: unknown): Record<string, unknown> {
  if (err instanceof AppError) {
    return {
      code: err.code,
      message: err.message,
      statusCode: err.statusCode,
      context: err.context,
    };
  }

  if (err instanceof Error) {
    return {
      code: 'UNKNOWN_ERROR',
      message: err.message,
      name: err.name,
      stack: err.stack,
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: String(err),
  };
}
