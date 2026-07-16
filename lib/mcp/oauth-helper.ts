import crypto from 'crypto';

/**
 * OAuth 2.0 helper utilities for MCP remote connector
 * Handles state signing, PKCE validation, and token generation
 */

const STATE_SECRET = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || '';

type StatePayload = {
  codeChallenge: string;
  nonce: string;
  actor_id?: string;
  iat: number;
};

/**
 * Generate PKCE code verifier and challenge (S256)
 */
export function generatePKCE(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');

  return { codeVerifier, codeChallenge };
}

/**
 * Validate PKCE S256: verify that SHA256(code_verifier) === code_challenge
 */
export function validatePKCE(codeVerifier: string, codeChallenge: string): boolean {
  const computed = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');

  // Timing-safe comparison
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(codeChallenge));
}

/**
 * Generate HMAC-SHA256 signed state token
 * Format: base64url(payload).signature
 */
export function generateSignedState(payload: StatePayload): string {
  if (!STATE_SECRET) {
    throw new Error('STATE_SECRET not configured');
  }

  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', STATE_SECRET)
    .update(encoded)
    .digest('base64url');

  return `${encoded}.${signature}`;
}

/**
 * Verify HMAC-SHA256 signed state token
 */
export function verifySignedState(state: string): StatePayload | null {
  if (!STATE_SECRET) {
    throw new Error('STATE_SECRET not configured');
  }

  const [encoded, signature] = state.split('.');
  if (!encoded || !signature) {
    return null;
  }

  try {
    const expected = crypto
      .createHmac('sha256', STATE_SECRET)
      .update(encoded)
      .digest('base64url');

    // Timing-safe comparison
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as StatePayload;

    // Check expiration (30 minutes)
    const ageSeconds = Math.floor(Date.now() / 1000) - payload.iat;
    if (ageSeconds < 0 || ageSeconds > 30 * 60) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Generate authorization code (random, non-sequential)
 */
export function generateAuthorizationCode(): string {
  return `code_${crypto.randomBytes(24).toString('hex')}`;
}

/**
 * Hash authorization code for storage
 * Note: This is for opaque token hashing (input is cryptographically random),
 * not password hashing. SHA-256 is appropriate for this use case.
 */
export function hashAuthorizationCode(code: string): string {
  // lgtm[js/weak-cryptographic-algorithm]: opaque token hashing, not password hashing
  return crypto.createHash('sha256').update(code).digest('hex');
}

/**
 * Generate OAuth access token (opaque format: mcp_${random})
 */
export function generateAccessToken(): string {
  return `mcp_${crypto.randomBytes(28).toString('hex')}`;
}

/**
 * Hash access token for storage
 * Note: This is for opaque token hashing (input is cryptographically random),
 * not password hashing. SHA-256 is appropriate for this use case.
 */
export function hashAccessToken(token: string): string {
  // lgtm[js/weak-cryptographic-algorithm]: opaque token hashing, not password hashing
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generate OAuth refresh token (opaque format: mcp_refresh_${random})
 */
export function generateRefreshToken(): string {
  return `mcp_refresh_${crypto.randomBytes(28).toString('hex')}`;
}

/**
 * Hash refresh token for storage
 * Note: This is for opaque token hashing (input is cryptographically random),
 * not password hashing. SHA-256 is appropriate for this use case.
 */
export function hashRefreshToken(token: string): string {
  // lgtm[js/weak-cryptographic-algorithm]: opaque token hashing, not password hashing
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generate nonce for state validation (CSRF protection)
 */
export function generateNonce(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Validate redirect URI against allowed list
 */
export function validateRedirectUri(redirectUri: string): boolean {
  const allowed = (process.env.MCP_OAUTH_REDIRECT_URIS || '').split(',').map((uri) => uri.trim());

  if (allowed.length === 0) {
    console.warn('MCP_OAUTH_REDIRECT_URIS not configured');
    return false;
  }

  return allowed.includes(redirectUri);
}

/**
 * Get OAuth client configuration
 */
export function getOAuthClientConfig() {
  return {
    clientId: process.env.MCP_OAUTH_CLIENT_ID || 'claude-ai-connector-v1',
    clientSecret: process.env.MCP_OAUTH_CLIENT_SECRET || '',
    redirectUris: (process.env.MCP_OAUTH_REDIRECT_URIS || '').split(',').map((uri) => uri.trim()),
    tokenTtl: parseInt(process.env.MCP_OAUTH_TOKEN_TTL || '3600', 10),
    codeTtl: parseInt(process.env.MCP_OAUTH_CODE_TTL || '600', 10),
    refreshTokenTtl: parseInt(process.env.MCP_OAUTH_REFRESH_TTL || '2592000', 10),
  };
}

/**
 * Validate client credentials (server-to-server)
 */
export function validateClientCredentials(clientId: string, clientSecret: string): boolean {
  const config = getOAuthClientConfig();
  return clientId === config.clientId && clientSecret === config.clientSecret;
}

/**
 * Create OAuth authorization server metadata (RFC 8414)
 */
export function getAuthorizationServerMetadata(issuer: string) {
  return {
    issuer,
    authorization_endpoint: `${issuer}/api/mcp/oauth/authorize`,
    token_endpoint: `${issuer}/api/mcp/oauth/token`,
    revocation_endpoint: `${issuer}/api/mcp/oauth/revoke`,
    userinfo_endpoint: `${issuer}/api/mcp/oauth/userinfo`,
    scopes_supported: ['mcp:execute'],
    response_types_supported: ['code'],
    response_modes_supported: ['query'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    token_endpoint_auth_methods_supported: ['client_secret_basic'],
    code_challenge_methods_supported: ['S256'],
    revocation_endpoint_auth_methods_supported: ['client_secret_basic'],
    service_documentation: 'https://tdealer01-crypto-dsg-control-plane.vercel.app/docs/mcp',
  };
}

/**
 * Create OAuth protected resource metadata (RFC 9728)
 */
export function getProtectedResourceMetadata(issuer: string) {
  return {
    resource: `${issuer}/api/mcp-server`,
    authorization_server: issuer,
    access_token_format: 'opaque',
    access_token_type: 'Bearer',
  };
}
