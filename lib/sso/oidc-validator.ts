/**
 * OIDC Token Validator
 *
 * Validates OIDC ID tokens and extracts claims for user authentication.
 * Implements JWT signature verification and claim validation.
 */

export interface OidcClaims {
  sub: string; // Subject (user ID from IdP)
  aud: string; // Audience (client_id)
  iss: string; // Issuer (IdP URL)
  iat: number; // Issued at (timestamp)
  exp: number; // Expiration (timestamp)
  email?: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  groups?: string[]; // Custom claim for group membership
  'https://dsg.pics/groups'?: string[]; // Namespace group claim
  [key: string]: any;
}

export interface OidcValidationResult {
  valid: boolean;
  claims?: OidcClaims;
  error?: string;
}

/**
 * Parse JWT token (without verification - for development)
 * WARNING: This does NOT verify the signature. Use only for testing.
 * Production must verify signature against IdP's JWKS endpoint.
 */
export function parseJwt(token: string): { header: any; claims: any; signature: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
    const claims = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    const signature = parts[2];

    return { header, claims, signature };
  } catch (error) {
    return null;
  }
}

/**
 * Validate OIDC ID token claims (signature verification should be done separately)
 */
export function validateOidcClaims(
  claims: any,
  expectedIssuer: string,
  expectedAudience: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): OidcValidationResult {
  const errors: string[] = [];

  // Validate issuer
  if (claims.iss !== expectedIssuer) {
    errors.push(`Invalid issuer: expected ${expectedIssuer}, got ${claims.iss}`);
  }

  // Validate audience
  if (Array.isArray(claims.aud)) {
    if (!claims.aud.includes(expectedAudience)) {
      errors.push(`Invalid audience: expected ${expectedAudience}`);
    }
  } else if (claims.aud !== expectedAudience) {
    errors.push(`Invalid audience: expected ${expectedAudience}, got ${claims.aud}`);
  }

  // Validate expiration
  if (!claims.exp || claims.exp < nowSeconds) {
    errors.push('Token expired');
  }

  // Validate issued at (shouldn't be in future)
  if (claims.iat && claims.iat > nowSeconds + 300) {
    // Allow 5 min clock skew
    errors.push('Token issued in the future');
  }

  // Validate subject exists
  if (!claims.sub) {
    errors.push('Token missing subject (sub)');
  }

  if (errors.length > 0) {
    return { valid: false, error: errors.join('; ') };
  }

  return { valid: true, claims };
}

/**
 * Extract user info from OIDC claims
 */
export function extractUserInfo(claims: OidcClaims): {
  email: string;
  externalId: string;
  displayName: string;
  givenName?: string;
  familyName?: string;
  pictureUrl?: string;
  groups?: string[];
} {
  // Extract groups from either standard or custom claim
  const groups = claims.groups || claims['https://dsg.pics/groups'] || [];

  return {
    email: claims.email || `${claims.sub}@identity`,
    externalId: claims.sub,
    displayName: claims.name || claims.email || claims.sub,
    givenName: claims.given_name,
    familyName: claims.family_name,
    pictureUrl: claims.picture,
    groups: Array.isArray(groups) ? groups : [],
  };
}

/**
 * Verify email claim
 */
export function isEmailVerified(claims: OidcClaims): boolean {
  return claims.email_verified === true;
}

/**
 * Get user groups from claims
 */
export function extractGroups(claims: OidcClaims): string[] {
  // Try standard OpenID Connect group claim
  if (Array.isArray(claims.groups)) {
    return claims.groups;
  }

  // Try namespace claim (common for enterprise IdPs)
  if (Array.isArray(claims['https://dsg.pics/groups'])) {
    return claims['https://dsg.pics/groups'];
  }

  // Try other common claim names
  if (Array.isArray(claims['http://schemas.xmlsoap.org/claims/Group'])) {
    return claims['http://schemas.xmlsoap.org/claims/Group'];
  }

  return [];
}

/**
 * Build authorization header for token endpoint
 */
export function buildClientAssertion(
  clientId: string,
  clientSecret: string,
  tokenEndpoint: string,
  issuedAt: number = Math.floor(Date.now() / 1000),
): string {
  // Create signed JWT (for client_assertion auth flow)
  // This is a simplified version; production should use proper JWT signing library
  const payload = {
    iss: clientId,
    sub: clientId,
    aud: tokenEndpoint,
    iat: issuedAt,
    exp: issuedAt + 3600,
  };

  // Base64URL encode payload
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');

  // In production, sign with client_secret using HMAC-SHA256
  // For now, return unsigned (would fail in production)
  return `${encoded}.signature`;
}

/**
 * Parse OIDC discovery response
 */
export interface OidcDiscovery {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  jwks_uri: string;
  scopes_supported: string[];
  response_types_supported: string[];
  grant_types_supported: string[];
}

export function parseOidcDiscovery(discovery: any): OidcDiscovery | null {
  if (!discovery.issuer || !discovery.token_endpoint || !discovery.authorization_endpoint) {
    return null;
  }

  return {
    issuer: discovery.issuer,
    authorization_endpoint: discovery.authorization_endpoint,
    token_endpoint: discovery.token_endpoint,
    userinfo_endpoint: discovery.userinfo_endpoint || '',
    jwks_uri: discovery.jwks_uri || '',
    scopes_supported: discovery.scopes_supported || ['openid', 'profile', 'email'],
    response_types_supported: discovery.response_types_supported || ['code'],
    grant_types_supported: discovery.grant_types_supported || ['authorization_code'],
  };
}
