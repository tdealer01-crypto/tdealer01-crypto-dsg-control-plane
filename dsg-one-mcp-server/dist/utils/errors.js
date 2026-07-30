export class DSGMCPError extends Error {
    constructor(code, message, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'DSGMCPError';
    }
}
export class AuthenticationError extends DSGMCPError {
    constructor(message, details) {
        super('AUTH_ERROR', message, details);
        this.name = 'AuthenticationError';
    }
}
export class ValidationError extends DSGMCPError {
    constructor(message, details) {
        super('VALIDATION_ERROR', message, details);
        this.name = 'ValidationError';
    }
}
export class QuotaExceededError extends DSGMCPError {
    constructor(message, details) {
        super('QUOTA_EXCEEDED', message, details);
        this.name = 'QuotaExceededError';
    }
}
export class ConformanceError extends DSGMCPError {
    constructor(message, details) {
        super('CONFORMANCE_ERROR', message, details);
        this.name = 'ConformanceError';
    }
}
export function formatError(error) {
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
