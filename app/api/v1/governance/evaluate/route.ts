import { NextRequest, NextResponse } from 'next/server';
import { createDSGClient } from '@/packages/ai-firstify-plugin/src/lib/dsg-client';
import { getConfig } from '@/packages/ai-firstify-plugin/src/lib/config';
import { handleApiError } from '@/lib/security/api-error';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request
    if (!body.modelId || !body.action) {
      return NextResponse.json(
        { error: 'Missing required fields: modelId, action' },
        { status: 400 }
      );
    }

    const config = getConfig();
    const dsgClient = createDSGClient(config.apiBase, config.apiKey);

    // Evaluate governance
    const decision = await dsgClient.evaluateGovernance(body);

    return NextResponse.json(decision);
  } catch (error) {
    return handleApiError('app/api/v1/governance/evaluate/route.ts', error);
  }
}
