import { NextResponse } from 'next/server';
import { buildPublicProofReport } from '../../../../lib/enterprise/proof-public';
import { handleApiError } from '../../../../lib/security/api-error';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json(buildPublicProofReport());
  } catch (error) {
    return handleApiError('api/enterprise-proof/report', error);
  }
}
