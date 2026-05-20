import { NextResponse } from 'next/server';
import { requireActiveProfile } from '../../../lib/auth/require-active-profile';
import { buildEnterpriseProofReport } from '../../../lib/enterprise/proof';
import { internalErrorMessage, logApiError } from '../../../lib/security/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const access = await requireActiveProfile();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get('agent_id') ?? '';
  if (!agentId) {
    return NextResponse.json({ error: 'agent_id required' }, { status: 400 });
  }

  try {
    const report = await buildEnterpriseProofReport({ orgId: access.orgId, agentId });
    return NextResponse.json(report);
  } catch (error) {
    logApiError('api/enterprise-proof', error, { orgId: access.orgId, agentId });
    return NextResponse.json(
      { error: internalErrorMessage() },
      { status: 500 }
    );
  }
}