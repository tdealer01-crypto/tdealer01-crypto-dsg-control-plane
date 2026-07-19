/**
 * SAML Metadata Endpoint
 *
 * GET /api/auth/saml/metadata
 * Serves SAML 2.0 service provider metadata
 */

import { NextResponse } from 'next/server';
import { generateSamlMetadata } from '@/lib/sso/saml-handler';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const orgId = url.searchParams.get('org_id');

    if (!orgId) {
      return NextResponse.json({ ok: false, error: 'org_id parameter required' }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tdealer01-crypto-dsg-control-plane.vercel.app';
    const entityId = `${baseUrl}/saml/${orgId}`;
    const assertionConsumerServiceUrl = `${baseUrl}/api/auth/saml/callback?org_id=${orgId}`;
    const singleLogoutServiceUrl = `${baseUrl}/api/auth/saml/logout?org_id=${orgId}`;

    const metadata = generateSamlMetadata(entityId, assertionConsumerServiceUrl, singleLogoutServiceUrl);

    return new Response(metadata, {
      headers: {
        'Content-Type': 'application/xml',
        'Content-Disposition': `attachment; filename="metadata-${orgId}.xml"`,
      },
    });
  } catch (error) {
    console.error('[saml-metadata] Exception:', error);
    return NextResponse.json({ ok: false, error: 'internal_error' }, { status: 500 });
  }
}
