import { NextResponse } from 'next/server';
import { getAuthorizationServerMetadata } from '@/lib/mcp/oauth-helper';

export const dynamic = 'force-dynamic';

/**
 * GET /.well-known/oauth-authorization-server
 *
 * Returns RFC 8414 OAuth 2.0 Authorization Server Metadata
 * Used by OAuth clients (including claude.ai) to discover endpoints
 *
 * Standard endpoints:
 * - authorization_endpoint: /api/mcp/oauth/authorize
 * - token_endpoint: /api/mcp/oauth/token
 * - revocation_endpoint: /api/mcp/oauth/revoke
 *
 * Capabilities:
 * - PKCE S256 support
 * - Authorization code grant type
 * - Client secret basic authentication
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const issuer = `${url.protocol}//${url.host}`;

  const metadata = getAuthorizationServerMetadata(issuer);

  return NextResponse.json(metadata, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
    },
  });
}
