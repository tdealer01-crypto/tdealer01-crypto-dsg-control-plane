import Stripe from 'stripe';
import { StructuredLogger, createLogger } from '../security/structured-logger';

export type StripeErrorType =
  | 'card_error'
  | 'rate_limit_error'
  | 'authentication_error'
  | 'api_connection_error'
  | 'invalid_request_error'
  | 'api_error'
  | 'unknown_error';

export interface StripeErrorInfo {
  type: StripeErrorType;
  message: string;
  statusCode?: number;
  retryable: boolean;
  requestId?: string;
}

/**
 * Parse Stripe error and return structured info
 */
export function parseStripeError(error: unknown): StripeErrorInfo {
  const logger = createLogger();

  if (error instanceof Stripe.errors.StripeCardError) {
    logger.logSecurityEvent(
      'Stripe card error detected',
      'warn',
      {
        code: (error as any).code,
        declineCode: (error as any).decline_code,
        message: error.message,
      }
    );

    return {
      type: 'card_error',
      message: error.message,
      statusCode: (error as any).statusCode,
      retryable: false,
      requestId: (error as any).requestId,
    };
  }

  if (error instanceof Stripe.errors.StripeRateLimitError) {
    logger.logSecurityEvent('Stripe rate limit exceeded', 'warn');

    return {
      type: 'rate_limit_error',
      message: 'Stripe API rate limit exceeded. Please try again later.',
      statusCode: (error as any).statusCode,
      retryable: true,
      requestId: (error as any).requestId,
    };
  }

  if (error instanceof Stripe.errors.StripeAuthenticationError) {
    logger.logSecurityEvent('Stripe authentication error', 'error', {
      message: error.message,
    });

    return {
      type: 'authentication_error',
      message: 'Stripe authentication failed',
      statusCode: (error as any).statusCode,
      retryable: false,
      requestId: (error as any).requestId,
    };
  }

  if (error instanceof Stripe.errors.StripeConnectionError) {
    logger.logSecurityEvent('Stripe API connection error', 'warn');

    return {
      type: 'api_connection_error',
      message: 'Connection to Stripe failed. Please try again later.',
      statusCode: (error as any).statusCode,
      retryable: true,
      requestId: (error as any).requestId,
    };
  }

  if (error instanceof Stripe.errors.StripeInvalidRequestError) {
    logger.logSecurityEvent(
      'Stripe invalid request error',
      'warn',
      { message: error.message }
    );

    return {
      type: 'invalid_request_error',
      message: error.message,
      statusCode: (error as any).statusCode,
      retryable: false,
      requestId: (error as any).requestId,
    };
  }

  if (error instanceof Stripe.errors.StripeAPIError) {
    logger.logSecurityEvent('Stripe API error', 'error', {
      statusCode: (error as any).statusCode,
      message: error.message,
    });

    return {
      type: 'api_error',
      message: 'An error occurred while processing your request. Please try again.',
      statusCode: (error as any).statusCode,
      retryable: ((error as any).statusCode === 500 || (error as any).statusCode === 503),
      requestId: (error as any).requestId,
    };
  }

  logger.error('Unknown Stripe error', error);

  return {
    type: 'unknown_error',
    message: 'An unexpected error occurred',
    retryable: false,
  };
}

/**
 * Get appropriate HTTP status code for Stripe error
 */
export function getStripeErrorStatusCode(errorInfo: StripeErrorInfo): number {
  switch (errorInfo.type) {
    case 'card_error':
      return 402; // Payment required
    case 'rate_limit_error':
      return 429; // Too many requests
    case 'authentication_error':
      return 401; // Unauthorized
    case 'api_connection_error':
      return 503; // Service unavailable
    case 'invalid_request_error':
      return 400; // Bad request
    case 'api_error':
      return 500; // Internal server error
    default:
      return 500; // Internal server error
  }
}

/**
 * Handle Stripe error in API response
 */
export function handleStripeError(
  error: unknown,
  options?: {
    requestId?: string;
    orgId?: string;
    userId?: string;
  }
): {
  statusCode: number;
  body: Record<string, unknown>;
} {
  const errorInfo = parseStripeError(error);
  const logger = createLogger({
    requestId: options?.requestId,
    orgId: options?.orgId,
    userId: options?.userId,
  });

  logger.error('Stripe operation failed', error, {
    errorType: errorInfo.type,
    retryable: errorInfo.retryable,
  });

  const statusCode = getStripeErrorStatusCode(errorInfo);

  return {
    statusCode,
    body: {
      error: {
        type: errorInfo.type,
        message: errorInfo.message,
        retryable: errorInfo.retryable,
        ...(options?.requestId && { requestId: options.requestId }),
      },
    },
  };
}

/**
 * Wrapper for Stripe API operations with error handling
 */
export async function withStripeErrorHandling<T>(
  operation: string,
  fn: () => Promise<T>,
  options?: {
    requestId?: string;
    orgId?: string;
    userId?: string;
  }
): Promise<T> {
  const logger = createLogger({
    requestId: options?.requestId,
    orgId: options?.orgId,
    userId: options?.userId,
  });

  try {
    return await fn();
  } catch (error) {
    const errorInfo = parseStripeError(error);

    if (errorInfo.retryable) {
      logger.warn(`Retryable Stripe error in ${operation}`, {
        errorType: errorInfo.type,
        message: errorInfo.message,
      });
    } else {
      logger.error(`Non-retryable Stripe error in ${operation}`, error, {
        errorType: errorInfo.type,
      });
    }

    throw error;
  }
}
