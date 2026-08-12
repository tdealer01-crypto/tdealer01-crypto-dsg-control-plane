import { createPublicKey, verify as verifySignature } from 'node:crypto';

const GITHUB_OIDC_ISSUER = 'https://token.actions.githubusercontent.com';
const GITHUB_OIDC_JWKS = `${GITHUB_OIDC_ISSUER}/.well-known/jwks`;

export type GitHubActionsOidcClaims = {
  iss?: string;
  sub?: string;
  aud?: string | string[];
  exp?: number;
  nbf?: number;
  iat?: number;
  repository?: string;
  ref?: string;
  event_name?: string;
  workflow_ref?: string;
  actor?: string;
  [key: string]: unknown;
};

export type GitHubActionsOidcOptions = {
  audience: string;
  repository: string;
  ref?: string;
  workflowPath?: string;
  allowedEvents?: string[];
  nowSeconds?: number;
};

type JwtHeader = { alg?: string; kid?: string; typ?: string };
type JsonWebKeySet = { keys?: Array<Record<string, unknown>> };

function decodeBase64UrlJson<T>(value: string): T {
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as T;
}

function audienceMatches(aud: GitHubActionsOidcClaims['aud'], expected: string): boolean {
  if (typeof aud === 'string') return aud === expected;
  return Array.isArray(aud) && aud.includes(expected);
}

export function validateGitHubActionsOidcClaims(
  claims: GitHubActionsOidcClaims,
  options: GitHubActionsOidcOptions,
): { ok: true } | { ok: false; error: string } {
  const now = options.nowSeconds ?? Math.floor(Date.now() / 1000);
  const allowedEvents = options.allowedEvents ?? ['schedule', 'workflow_dispatch'];
  const expectedRef = options.ref ?? 'refs/heads/main';
  const workflowPath = options.workflowPath ?? '.github/workflows/revenue-autopilot.yml';

  if (claims.iss !== GITHUB_OIDC_ISSUER) return { ok: false, error: 'oidc_issuer_mismatch' };
  if (!audienceMatches(claims.aud, options.audience)) return { ok: false, error: 'oidc_audience_mismatch' };
  if (typeof claims.exp !== 'number' || claims.exp <= now) return { ok: false, error: 'oidc_expired' };
  if (typeof claims.nbf === 'number' && claims.nbf > now + 30) return { ok: false, error: 'oidc_not_yet_valid' };
  if (claims.repository !== options.repository) return { ok: false, error: 'oidc_repository_mismatch' };
  if (claims.ref !== expectedRef) return { ok: false, error: 'oidc_ref_mismatch' };
  if (typeof claims.event_name !== 'string' || !allowedEvents.includes(claims.event_name)) {
    return { ok: false, error: 'oidc_event_not_allowed' };
  }

  const expectedWorkflowPrefix = `${options.repository}/${workflowPath}@${expectedRef}`;
  if (typeof claims.workflow_ref !== 'string' || claims.workflow_ref !== expectedWorkflowPrefix) {
    return { ok: false, error: 'oidc_workflow_mismatch' };
  }

  return { ok: true };
}

export async function verifyGitHubActionsOidcToken(
  token: string,
  options: GitHubActionsOidcOptions,
): Promise<
  | { ok: true; claims: GitHubActionsOidcClaims }
  | { ok: false; error: string }
> {
  const parts = token.split('.');
  if (parts.length !== 3) return { ok: false, error: 'oidc_malformed_jwt' };

  let header: JwtHeader;
  let claims: GitHubActionsOidcClaims;
  try {
    header = decodeBase64UrlJson<JwtHeader>(parts[0]);
    claims = decodeBase64UrlJson<GitHubActionsOidcClaims>(parts[1]);
  } catch {
    return { ok: false, error: 'oidc_invalid_json' };
  }

  if (header.alg !== 'RS256' || !header.kid) return { ok: false, error: 'oidc_unsupported_header' };

  const claimCheck = validateGitHubActionsOidcClaims(claims, options);
  if (!claimCheck.ok) return claimCheck;

  let jwks: JsonWebKeySet;
  try {
    const response = await fetch(GITHUB_OIDC_JWKS, {
      headers: { accept: 'application/json' },
      cache: 'force-cache',
    });
    if (!response.ok) return { ok: false, error: 'oidc_jwks_unavailable' };
    jwks = (await response.json()) as JsonWebKeySet;
  } catch {
    return { ok: false, error: 'oidc_jwks_unavailable' };
  }

  const jwk = (jwks.keys ?? []).find((key) => key.kid === header.kid);
  if (!jwk) return { ok: false, error: 'oidc_kid_not_found' };

  try {
    const publicKey = createPublicKey({ key: jwk as never, format: 'jwk' });
    const verified = verifySignature(
      'RSA-SHA256',
      Buffer.from(`${parts[0]}.${parts[1]}`),
      publicKey,
      Buffer.from(parts[2], 'base64url'),
    );
    if (!verified) return { ok: false, error: 'oidc_bad_signature' };
  } catch {
    return { ok: false, error: 'oidc_signature_verification_failed' };
  }

  return { ok: true, claims };
}
