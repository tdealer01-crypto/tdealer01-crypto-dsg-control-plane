import { NextResponse } from 'next/server';
import { getProtectedResourceMetadata } from '@/lib/mcp/oauth-helper';

export const dynamic = 'force-dynamic';

/**
 * GET /.well-known/oauth-protected-resource
 *
 * Returns RFC 9728 OAuth 2.0 Demonstrating Proof-of-Possession (DPoP) Protected Resource Metadata
 * Enables resource servers to advertise their authorization server location and token format
 *
 * Used by OAuth clients to:
 * 1. Identify the authorization server for this resource
 * 2. Determine access token format (opaque vs JWT)
 * 3. Discover token endpoint and other related endpoints
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const issuer = `${url.protocol}//${url.host}`;

  const metadata = getProtectedResourceMetadata(issuer);

  return NextResponse.json(metadata, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
    },
  });
}
