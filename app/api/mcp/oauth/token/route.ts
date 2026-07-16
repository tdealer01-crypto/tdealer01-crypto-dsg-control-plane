import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { getDsgSupabaseRpcConfig, callDsgRpc } from '@/lib/dsg/server/supabase-rpc';
import {
  validateClientCredentials,
  validatePKCE,
  generateAccessToken,
  hashAccessToken,
  generateAuthorizationCode,
  hashAuthorizationCode,
  getOAuthClientConfig,
} from '@/lib/mcp/oauth-helper';

export const dynamic = 'force-dynamic';

type TokenRequest = {
  grant_type?: string;
  code?: string;
  code_verifier?: string;
  client_id?: string;
  client_secret?: string;
  redirect_uri?: string;
  refresh_token?: string;
};

type McpApiKey = {
  key_id: string;
  actor_id: string;
  key_hash: string;
  key_prefix: string;
  status: string;
  stripe_subscription_id?: string;
  plan_id: string;
  calls_limit: number;
};

/**
 * POST /api/mcp/oauth/token
 *
 * OAuth 2.0 Token Endpoint (RFC 6749, RFC 7636)
 * Exchanges authorization code + PKCE verifier for access token
 *
 * Request (application/x-www-form-urlencoded):
 * - grant_type: 'authorization_code'
 * - code: authorization code from /authorize
 * - code_verifier: PKCE code verifier (43-128 chars)
 * - client_id: 'claude-ai-connector-v1'
 * - client_secret: (server-to-server only)
 * - redirect_uri: must match authorization request
 *
 * Response:
 * {
 *   access_token: "mcp_...",
 *   token_type: "Bearer",
 *   expires_in: 3600,
 *   scope: "mcp:execute",
 *   subscription_status: "active" | "expired" | "not_found"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Parse form data
    const contentType = request.headers.get('content-type');
    let tokenRequest: TokenRequest = {};

    if (contentType?.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      tokenRequest = {
        grant_type: formData.get('grant_type') as string,
        code: formData.get('code') as string,
        code_verifier: formData.get('code_verifier') as string,
        client_id: formData.get('client_id') as string,
        client_secret: formData.get('client_secret') as string,
        redirect_uri: formData.get('redirect_uri') as string,
        refresh_token: formData.get('refresh_token') as string,
      };
    } else if (contentType?.includes('application/json')) {
      tokenRequest = await request.json();
    } else {
      return errorResponse('unsupported_media_type', 'Content-Type must be application/x-www-form-urlencoded or application/json');
    }

    // Validate grant_type
    if (tokenRequest.grant_type === 'authorization_code') {
      return handleAuthorizationCodeGrant(tokenRequest);
    } else if (tokenRequest.grant_type === 'refresh_token') {
      return handleRefreshTokenGrant(tokenRequest);
    } else {
      return errorResponse('unsupported_grant_type', `grant_type ${tokenRequest.grant_type} is not supported`);
    }
  } catch (error) {
    console.error('[token POST] Error:', error);
    return errorResponse('server_error', 'An internal error occurred');
  }
}

/**
 * Handle authorization_code grant type
 */
async function handleAuthorizationCodeGrant(req: TokenRequest) {
  // Validate required parameters
  if (!req.code || !req.code_verifier || !req.client_id || !req.client_secret) {
    return errorResponse('invalid_request', 'Missing required parameters');
  }

  // Validate client credentials
  if (!validateClientCredentials(req.client_id, req.client_secret)) {
    return errorResponse('invalid_client', 'Client authentication failed');
  }

  try {
    // Lookup authorization code
    const supabaseAdmin = getSupabaseAdmin();
    const codeHash = hashAuthorizationCode(req.code);

    const codeResult = await (supabaseAdmin as any)
      .from('mcp_oauth_codes')
      .select('*')
      .eq('code_hash', codeHash)
      .is('exchanged_at', null)
      .gt('expires_at', 'now()')
      .single();

    if (codeResult.error || !codeResult.data) {
      return errorResponse('invalid_grant', 'Authorization code is invalid or expired');
    }

    const code = codeResult.data;

    // Validate redirect_uri
    if (code.redirect_uri !== req.redirect_uri) {
      return errorResponse('invalid_grant', 'redirect_uri mismatch');
    }

    // Validate PKCE code_verifier
    try {
      if (!validatePKCE(req.code_verifier, code.code_challenge)) {
        return errorResponse('invalid_grant', 'PKCE verification failed');
      }
    } catch {
      return errorResponse('invalid_grant', 'Invalid code_verifier');
    }

    // Get or create MCP API key for user
    const actorId = code.actor_id;
    let mcpKey = await getMcpApiKeyForUser(actorId);

    if (!mcpKey) {
      // Create new MCP API key
      mcpKey = await createMcpApiKey(actorId);
      if (!mcpKey) {
        return errorResponse('server_error', 'Failed to create API key');
      }
    }

    // Check subscription status
    const subscriptionStatus = mcpKey.stripe_subscription_id ? 'active' : 'not_found';

    // Generate access token
    const config = getOAuthClientConfig();
    const accessToken = generateAccessToken();
    const tokenHash = hashAccessToken(accessToken);

    // Store token in database
    const dsgConfig = getDsgSupabaseRpcConfig();
    const tokenId = await callDsgRpc(dsgConfig, 'create_mcp_oauth_token', {
      p_actor_id: actorId,
      p_key_id: mcpKey.key_id,
      p_token_hash: tokenHash,
      p_scope: 'mcp:execute',
      p_expires_in_seconds: config.tokenTtl,
    });

    if (!tokenId) {
      return errorResponse('server_error', 'Failed to create token');
    }

    // Mark code as exchanged
    await (supabaseAdmin as any)
      .from('mcp_oauth_codes')
      .update({ exchanged_at: new Date().toISOString(), exchanged_token_id: tokenId })
      .eq('code_id', code.code_id);

    // Return token response
    return NextResponse.json(
      {
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: config.tokenTtl,
        scope: code.scope,
        subscription_status: subscriptionStatus,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
          'Pragma': 'no-cache',
        },
      },
    );
  } catch (error) {
    console.error('[handleAuthorizationCodeGrant] Error:', error);
    return errorResponse('server_error', 'Token exchange failed');
  }
}

/**
 * Handle refresh_token grant type (placeholder for future implementation)
 */
async function handleRefreshTokenGrant(req: TokenRequest) {
  return errorResponse('unsupported_grant_type', 'refresh_token grant is not yet supported');
}

/**
 * Get MCP API key for user
 */
async function getMcpApiKeyForUser(actorId: string): Promise<McpApiKey | null> {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const result = await (supabaseAdmin as any)
      .from('dsg_mcp_api_keys')
      .select('*')
      .eq('actor_id', actorId)
      .eq('status', 'ACTIVE')
      .gt('period_end', 'now()')
      .single();

    return result.data || null;
  } catch {
    return null;
  }
}

/**
 * Create new MCP API key for user
 */
async function createMcpApiKey(actorId: string): Promise<McpApiKey | null> {
  try {
    const crypto = await import('crypto');
    const randomBytes = crypto.getRandomValues(new Uint8Array(20));
    const hex = Array.from(randomBytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const rawKey = `dsg_${hex}`;
    const keyHash = await hashMcpApiKey(rawKey);
    const keyPrefix = rawKey.slice(0, 8);

    const dsgConfig = getDsgSupabaseRpcConfig();
    const keyId = await callDsgRpc(dsgConfig, 'create_mcp_api_key', {
      p_actor_id: actorId,
      p_key_hash: keyHash,
      p_key_prefix: keyPrefix,
      p_label: 'OAuth Token (claude.ai)',
    });

    if (!keyId) return null;

    // Fetch created key
    return await getMcpApiKeyForUser(actorId);
  } catch (error) {
    console.error('[createMcpApiKey] Error:', error);
    return null;
  }
}

/**
 * Hash MCP API key (SHA-256)
 */
async function hashMcpApiKey(rawKey: string): Promise<string> {
  const encoded = new TextEncoder().encode(rawKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Return OAuth error response (RFC 6749)
 */
function errorResponse(
  error: string,
  errorDescription?: string,
  status: number = 400,
): NextResponse {
  return NextResponse.json(
    {
      error,
      error_description: errorDescription,
    },
    {
      status,
      headers: {
        'Cache-Control': 'no-store',
        'Pragma': 'no-cache',
      },
    },
  );
}
