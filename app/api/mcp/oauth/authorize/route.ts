import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import {
  validateRedirectUri,
  generateNonce,
  generateSignedState,
  getOAuthClientConfig,
  validatePKCE,
} from '@/lib/mcp/oauth-helper';

export const dynamic = 'force-dynamic';

type AuthorizeParams = {
  client_id?: string;
  redirect_uri?: string;
  response_type?: string;
  scope?: string;
  code_challenge?: string;
  code_challenge_method?: string;
  state?: string;
};

/**
 * GET /api/mcp/oauth/authorize
 *
 * OAuth 2.0 Authorization Endpoint (RFC 6749, RFC 7636)
 * Initiates the authorization code flow with PKCE support
 *
 * Parameters:
 * - client_id: Must be 'claude-ai-connector-v1'
 * - redirect_uri: Must be in allowed list (MCP_OAUTH_REDIRECT_URIS)
 * - response_type: Must be 'code'
 * - scope: Requested scopes (currently 'mcp:execute')
 * - code_challenge: Base64url-encoded SHA256 hash of code_verifier
 * - code_challenge_method: Must be 'S256'
 * - state: Opaque value for CSRF protection (will be verified on callback)
 *
 * Response:
 * - 302 redirect to /api/mcp/oauth/consent with signed state
 * - Sets httpOnly cookie with state for additional validation
 * - Or 302 redirect to redirect_uri with authorization code (if pre-approved)
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams) as AuthorizeParams;

  // Validate required parameters
  if (!params.client_id || !params.redirect_uri || !params.response_type) {
    return NextResponse.json(
      {
        error: 'invalid_request',
        error_description: 'Missing required parameters: client_id, redirect_uri, response_type',
      },
      { status: 400 },
    );
  }

  const config = getOAuthClientConfig();

  // Validate client_id
  if (params.client_id !== config.clientId) {
    return NextResponse.json(
      {
        error: 'invalid_client',
        error_description: `Client ID ${params.client_id} is not registered`,
      },
      { status: 400 },
    );
  }

  // Validate response_type
  if (params.response_type !== 'code') {
    return NextResponse.json(
      {
        error: 'unsupported_response_type',
        error_description: 'Only response_type=code is supported',
      },
      { status: 400 },
    );
  }

  // Validate redirect_uri
  if (!validateRedirectUri(params.redirect_uri)) {
    return NextResponse.json(
      {
        error: 'invalid_request',
        error_description: `Redirect URI ${params.redirect_uri} is not allowed`,
      },
      { status: 400 },
    );
  }

  // Validate code_challenge and code_challenge_method (PKCE)
  if (!params.code_challenge || !params.code_challenge_method) {
    return NextResponse.json(
      {
        error: 'invalid_request',
        error_description: 'PKCE is required: code_challenge and code_challenge_method are mandatory',
      },
      { status: 400 },
    );
  }

  if (params.code_challenge_method !== 'S256') {
    return NextResponse.json(
      {
        error: 'invalid_request',
        error_description: 'Only code_challenge_method=S256 is supported',
      },
      { status: 400 },
    );
  }

  // Validate code_challenge format (base64url, 43-128 chars)
  if (!/^[A-Za-z0-9_-]{43,128}$/.test(params.code_challenge)) {
    return NextResponse.json(
      {
        error: 'invalid_request',
        error_description: 'Invalid code_challenge format',
      },
      { status: 400 },
    );
  }

  // Validate state parameter
  if (!params.state) {
    return NextResponse.json(
      {
        error: 'invalid_request',
        error_description: 'State parameter is required for CSRF protection',
      },
      { status: 400 },
    );
  }

  // Check if user is authenticated
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.id) {
    // Redirect to login with return_to
    const loginUrl = new URL('/auth/login', url.origin);
    const returnTo = new URL(request.url);
    loginUrl.searchParams.set('return_to', returnTo.toString());
    return NextResponse.redirect(loginUrl);
  }

  // Generate nonce for state validation
  const nonce = generateNonce();

  // Create signed state payload (includes code_challenge for later validation)
  const statePayload = {
    codeChallenge: params.code_challenge,
    nonce,
    actor_id: user.id,
    iat: Math.floor(Date.now() / 1000),
  };

  const signedState = generateSignedState(statePayload);

  // Store authorization request details in Redis for consent screen
  // (In production, would use Redis or Supabase session store)
  // For now, encode in signed state

  // Redirect to consent screen
  const consentUrl = new URL('/api/mcp/oauth/consent', url.origin);
  consentUrl.searchParams.set('signed_state', signedState);
  consentUrl.searchParams.set('client_id', params.client_id);
  consentUrl.searchParams.set('redirect_uri', params.redirect_uri);
  consentUrl.searchParams.set('scope', params.scope || 'mcp:execute');
  consentUrl.searchParams.set('state', params.state);

  // Set httpOnly cookie for additional state validation
  const response = NextResponse.redirect(consentUrl);
  response.cookies.set('mcp_oauth_state_signed', signedState, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 60, // 30 minutes
    path: '/',
  });

  return response;
}
