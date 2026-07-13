import { NextRequest, NextResponse } from 'next/server';
import { createDSGClient } from '@/packages/ai-firstify-plugin/src/lib/dsg-client';
import { getConfig } from '@/packages/ai-firstify-plugin/src/lib/config';
import { handleApiError } from '@/lib/security/api-error';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const config = getConfig();
    const dsgClient = createDSGClient(config.apiBase, config.apiKey);

    const manifest = await dsgClient.getPolicyManifest();
    return NextResponse.json(manifest);
  } catch (error) {
    return handleApiError('app/api/v1/governance/manifest/route.ts', error);
  }
}
