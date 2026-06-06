import { StructuredLogger, createLogger } from '../security/structured-logger';

export type DatabaseErrorType =
  | 'connection_error'
  | 'query_error'
  | 'unique_constraint_violation'
  | 'foreign_key_violation'
  | 'invalid_input_error'
  | 'permission_denied'
  | 'timeout'
  | 'unknown_error';

export interface DatabaseErrorInfo {
  type: DatabaseErrorType;
  message: string;
  retryable: boolean;
  statusCode: number;
  originalError?: Error;
}

/**
 * Parse database error and return structured info
 */
export function parseDatabaseError(error: unknown): DatabaseErrorInfo {
  const logger = createLogger();

  if (!(error instanceof Error)) {
    return {
      type: 'unknown_error',
      message: 'An unknown database error occurred',
      retryable: false,
      statusCode: 500,
    };
  }

  const message = error.message.toLowerCase();
  const code = (error as Error & { code?: string }).code;

  // PostgreSQL specific error codes
  if (code) {
    if (code === '23505') {
      logger.logSecurityEvent(
        'Database unique constraint violation',
        'warn',
        { code }
      );
      return {
        type: 'unique_constraint_violation',
        message: 'This resource already exists',
        retryable: false,
        statusCode: 409,
        originalError: error,
      };
    }

    if (code === '23503') {
      logger.logSecurityEvent(
        'Database foreign key violation',
        'warn',
        { code }
      );
      return {
        type: 'foreign_key_violation',
        message: 'Referenced resource does not exist',
        retryable: false,
        statusCode: 400,
        originalError: error,
      };
    }

    if (code === '42501') {
      logger.logSecurityEvent(
        'Database permission denied',
        'error',
        { code }
      );
      return {
        type: 'permission_denied',
        message: 'Permission denied for this operation',
        retryable: false,
        statusCode: 403,
        originalError: error,
      };
    }

    if (code === '08006' || code === '08003' || code === '08000') {
      logger.logSecurityEvent(
        'Database connection error',
        'warn',
        { code }
      );
      return {
        type: 'connection_error',
        message: 'Database connection failed',
        retryable: true,
        statusCode: 503,
        originalError: error,
      };
    }
  }

  // Check error message patterns
  if (message.includes('connection') || message.includes('connect timeout')) {
    return {
      type: 'connection_error',
      message: 'Database connection failed',
      retryable: true,
      statusCode: 503,
      originalError: error,
    };
  }

  if (message.includes('timeout')) {
    return {
      type: 'timeout',
      message: 'Database operation timed out',
      retryable: true,
      statusCode: 504,
      originalError: error,
    };
  }

  if (message.includes('syntax error') || message.includes('invalid')) {
    return {
      type: 'query_error',
      message: 'Invalid database query',
      retryable: false,
      statusCode: 400,
      originalError: error,
    };
  }

  // Default to query error for other database errors
  return {
    type: 'query_error',
    message: 'Database operation failed',
    retryable: false,
    statusCode: 500,
    originalError: error,
  };
}

/**
 * Handle database error in API response
 */
export function handleDatabaseError(
  error: unknown,
  context?: {
    operation: string;
    table?: string;
    requestId?: string;
    orgId?: string;
  }
): {
  statusCode: number;
  body: Record<string, unknown>;
} {
  const errorInfo = parseDatabaseError(error);
  const logger = createLogger({
    requestId: context?.requestId,
    orgId: context?.orgId,
  });

  if (errorInfo.retryable) {
    logger.warn(
      `Retryable database error in ${context?.operation || 'unknown'}`,
      {
        errorType: errorInfo.type,
        table: context?.table,
      }
    );
  } else {
    logger.error(
      `Database error in ${context?.operation || 'unknown'}`,
      error,
      {
        errorType: errorInfo.type,
        table: context?.table,
      }
    );
  }

  return {
    statusCode: errorInfo.statusCode,
    body: {
      error: {
        message: errorInfo.message,
        type: errorInfo.type,
        retryable: errorInfo.retryable,
      },
    },
  };
}

/**
 * Check if a database error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  const errorInfo = parseDatabaseError(error);
  return errorInfo.retryable;
}

/**
 * Retry database operation with exponential backoff
 */
export async function retryDatabaseOperation<T>(
  operation: () => Promise<T>,
  options?: {
    maxAttempts?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    requestId?: string;
  }
): Promise<T> {
  const maxAttempts = options?.maxAttempts ?? 3;
  const initialDelayMs = options?.initialDelayMs ?? 100;
  const maxDelayMs = options?.maxDelayMs ?? 5000;

  const logger = createLogger({
    requestId: options?.requestId,
  });

  let lastError: unknown;
  let delay = initialDelayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (!isRetryableError(error)) {
        throw error;
      }

      if (attempt < maxAttempts) {
        logger.warn(`Database operation retry attempt ${attempt}/${maxAttempts}`, {
          delayMs: Math.min(delay, maxDelayMs),
        });

        await new Promise(resolve =>
          setTimeout(resolve, Math.min(delay, maxDelayMs))
        );

        delay *= 2; // Exponential backoff
      }
    }
  }

  logger.error(
    `Database operation failed after ${maxAttempts} attempts`,
    lastError
  );

  throw lastError;
}

/**
 * Wrapper for database operations with error handling and retry logic
 */
export async function withDatabaseErrorHandling<T>(
  operation: () => Promise<T>,
  context?: {
    name: string;
    retryable?: boolean;
    maxAttempts?: number;
    requestId?: string;
    orgId?: string;
  }
): Promise<T> {
  const logger = createLogger({
    requestId: context?.requestId,
    orgId: context?.orgId,
  });

  try {
    if (context?.retryable ?? true) {
      return await retryDatabaseOperation(operation, {
        maxAttempts: context?.maxAttempts ?? 3,
        requestId: context?.requestId,
      });
    } else {
      return await operation();
    }
  } catch (error) {
    logger.error(
      `Database operation failed: ${context?.name || 'unknown'}`,
      error
    );
    throw error;
  }
}
