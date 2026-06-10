/**
 * Safe DOM Redact
 * Detects and redacts secrets from DOM element values
 */

const SECRET_PATTERNS = [
  // Stripe keys
  { pattern: /sk_(live|test)_[a-zA-Z0-9_]{20,}/, name: 'Stripe Secret Key' },
  { pattern: /pk_(live|test)_[a-zA-Z0-9_]{20,}/, name: 'Stripe Public Key' },
  
  // GitHub tokens
  { pattern: /ghp_[a-zA-Z0-9_]{36,255}/, name: 'GitHub Personal Access Token' },
  { pattern: /github_pat_[a-zA-Z0-9_]{20,}/, name: 'GitHub Token' },
  
  // Slack tokens
  { pattern: /xox[baprs]-[a-zA-Z0-9_]{40,}/, name: 'Slack Token' },
  
  // AWS access keys
  { pattern: /AKIA[0-9A-Z]{16}/, name: 'AWS Access Key' },
  
  // Private key headers
  { pattern: /-----BEGIN (PRIVATE|RSA) KEY-----/, name: 'Private Key' },
  
  // Generic secret patterns
  { pattern: /api[_-]?key[=:]\s*([a-zA-Z0-9_\-]{20,})/i, name: 'API Key' },
  { pattern: /secret[=:]\s*([a-zA-Z0-9_\-]{20,})/i, name: 'Secret' },
  { pattern: /password[=:]\s*([a-zA-Z0-9_\-!@#$%^&*]{8,})/i, name: 'Password' },
  { pattern: /token[=:]\s*([a-zA-Z0-9_\-]{20,})/i, name: 'Token' },
];

/**
 * Check if a string appears to contain secrets
 */
export function containsSecret(value?: string): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }

  for (const { pattern } of SECRET_PATTERNS) {
    if (pattern.test(value)) {
      return true;
    }
  }

  // Heuristic: values > 128 chars are often secrets/tokens
  if (value.length > 128) {
    return true;
  }

  return false;
}

/**
 * Redact a string value
 */
export function redactValue(value?: string): string {
  if (!value || typeof value !== 'string') {
    return '';
  }

  if (containsSecret(value)) {
    return '[REDACTED]';
  }

  return value;
}

/**
 * Get human-readable description of what was redacted
 */
export function getRedactionReason(value?: string): string | null {
  if (!value || typeof value !== 'string') {
    return null;
  }

  for (const { pattern, name } of SECRET_PATTERNS) {
    if (pattern.test(value)) {
      return `Redacted: ${name}`;
    }
  }

  if (value.length > 128) {
    return 'Redacted: Long value (potential secret)';
  }

  return null;
}
