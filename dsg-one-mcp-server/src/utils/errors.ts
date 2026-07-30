export class DSGMCPError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'DSGMCPError';
  }
}

export class AuthenticationError extends DSGMCPError {
  constructor(message: string, details?: Record<string, any>) {
    super('AUTH_ERROR', message, details);
    this.name = 'AuthenticationError';
  }
}

export class ValidationError extends DSGMCPError {
  constructor(message: string, details?: Record<string, any>) {
    super('VALIDATION_ERROR', message, details);
    this.name = 'ValidationError';
  }
}

export class QuotaExceededError extends DSGMCPError {
  constructor(message: string, details?: Record<string, any>) {
    super('QUOTA_EXCEEDED', message, details);
    this.name = 'QuotaExceededError';
  }
}

export class ConformanceError extends DSGMCPError {
  constructor(message: string, details?: Record<string, any>) {
    super('CONFORMANCE_ERROR', message, details);
    this.name = 'ConformanceError';
  }
}

export function formatError(error: unknown): { message: string; code: string; details?: Record<string, any> } {
  if (error instanceof DSGMCPError) {
    return {
      message: error.message,
      code: error.code,
      details: error.details,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      code: 'UNKNOWN_ERROR',
    };
  }

  return {
    message: String(error),
    code: 'UNKNOWN_ERROR',
  };
}
