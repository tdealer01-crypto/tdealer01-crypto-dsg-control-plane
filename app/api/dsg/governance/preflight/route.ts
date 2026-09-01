import { NextRequest, NextResponse } from 'next/server';
import { requireOrgRole } from '@/lib/authz';
import { governAction, type GovernancePreflightInput } from '@/lib/dsg/governance-plugin';
import {
  validateStoredUnifiedMcpKey,
  type UnifiedAuthContext,
} from '@/lib/mcp/unified-auth';

export const dynamic = 'force-dynamic';

async function resolveAuth(
  request: NextRequest,
): Promise<UnifiedAuthContext | NextResponse> {
  const stored = await validateStoredUnifiedMcpKey(request, 'dsg.governance.preflight');
  if (stored.presented) {
    if (stored.valid === false) {
      return NextResponse.json({ ok: false, error: stored.reason }, { status: 401 });
    }
    return stored.context;
  }

  const access = await requireOrgRole(
    ['operator', 'org_admin', 'reviewer', 'runtime_auditor', 'billing_admin'],
    request,
  );
  if (!access.ok) {
    return NextResponse.json(
      { ok: false, error: access.error ?? 'Unauthorized' },
      { status: access.status ?? 401 },
    );
  }

  return {
    source: 'session',
    actorId: access.userId,
    orgId: access.orgId,
    roles: access.grantedRoles,
  };
}

export async function POST(request: NextRequest) {
  const auth = await resolveAuth(request);
  if (auth instanceof NextResponse) return auth;

  const body = (await request.json().catch(() => null)) as GovernancePreflightInput | null;
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const result = await governAction(body, auth);
  if (result.ok === false) {
    return NextResponse.json(result, {
      status: result.error === 'GOVERNANCE_MODE_UNAVAILABLE' ? 503 : 400,
    });
  }

  return NextResponse.json(result, {
    status: 200,
    headers: { 'Cache-Control': 'no-store' },
  });
}
