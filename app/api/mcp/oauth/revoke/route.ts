import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getDsgSupabaseRpcConfig, callDsgRpc } from '@/lib/dsg/server/supabase-rpc';
import { hashAccessToken, validateClientCredentials } from '@/lib/mcp/oauth-helper';

// ERROR_HANDLER_EXEMPT: OAuth 2.0 revocation endpoint (RFC 7009) requires always-200 response
export const dynamic = 'force-dynamic';

type RevokeRequest = {
  token?: string;
  token_type_hint?: string;
  client_id?: string;
  client_secret?: string;
};

/**
 * POST /api/mcp/oauth/revoke
 *
 * OAuth 2.0 Token Revocation Endpoint (RFC 7009)
 * Allows clients and resource owners to revoke issued tokens
 *
 * Request (application/x-www-form-urlencoded):
 * - token: The token to revoke
 * - token_type_hint: 'access_token' | 'refresh_token' (optional)
 * - client_id: OAuth client ID (optional, used for client authentication)
 * - client_secret: OAuth client secret (optional, for server-to-server revocation)
 *
 * Response:
 * - 200 OK (always, even if token doesn't exist or is invalid)
 *
 * Note: Authenticated users can revoke their own tokens via Authorization header
 */
export async function POST(request: NextRequest) {
  try {
    // Parse form data
    const contentType = request.headers.get('content-type');
    let revokeRequest: RevokeRequest = {};

    if (contentType?.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      revokeRequest = {
        token: formData.get('token') as string,
        token_type_hint: formData.get('token_type_hint') as string,
        client_id: formData.get('client_id') as string,
        client_secret: formData.get('client_secret') as string,
      };
    } else if (contentType?.includes('application/json')) {
      revokeRequest = await request.json();
    } else {
      // Treat as form-urlencoded by default
      const text = await request.text();
      const params = new URLSearchParams(text);
      revokeRequest = Object.fromEntries(params);
    }

    // Validate token parameter
    if (!revokeRequest.token) {
      // Per RFC 7009: return 200 even if token is missing
      return NextResponse.json({}, { status: 200 });
    }

    // Determine authentication method
    let actorId: string | null = null;

    // Method 1: Authorization header (Bearer token or authenticated user)
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      if (token === revokeRequest.token) {
        // User is revoking their own token using Bearer authentication
        const supabase = await createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          actorId = user.id;
        }
      }
    } else {
      // Method 2: Client credentials (server-to-server)
      if (revokeRequest.client_id && revokeRequest.client_secret) {
        if (!validateClientCredentials(revokeRequest.client_id, revokeRequest.client_secret)) {
          // Invalid credentials; still return 200 per RFC 7009
          return NextResponse.json({}, { status: 200 });
        }
        // For server-to-server revocation, we allow revocation without actor_id
        // (could be used by admin tools)
      }
    }

    // Revoke the token
    try {
      const tokenHash = hashAccessToken(revokeRequest.token);
      const dsgConfig = getDsgSupabaseRpcConfig();

      if (actorId) {
        // User-initiated revocation
        await callDsgRpc(dsgConfig, 'revoke_mcp_oauth_token', {
          p_token_hash: tokenHash,
          p_actor_id: actorId,
        });
      } else if (revokeRequest.client_secret) {
        // Admin/client-initiated revocation (no actor_id validation)
        // This would require a different RPC or direct database access
        // For now, we skip if no actor_id
      }
    } catch (error) {
      console.error('[revoke POST] RPC error:', error);
      // Per RFC 7009: return 200 even on errors
    }

    // Always return 200 OK per RFC 7009
    // This prevents token/secret detection through HTTP status codes
    return NextResponse.json({}, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
        'Pragma': 'no-cache',
      },
    });
  } catch (error) {
    console.error('[revoke POST] Error:', error);
    // Always return 200 OK per RFC 7009
    return NextResponse.json({}, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
        'Pragma': 'no-cache',
      },
    });
  }
}
