import { NextRequest, NextResponse } from 'next/server';
import { requireOrgRole } from '@/lib/authz';
import {
  getGovernanceMode,
  setGovernanceMode,
  type GovernanceMode,
} from '@/lib/dsg/governance-settings';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const access = await requireOrgRole(
    ['operator', 'org_admin', 'runtime_auditor', 'reviewer'],
    request,
  );
  if (!access.ok) {
    return NextResponse.json(
      { ok: false, error: access.error ?? 'Unauthorized' },
      { status: access.status },
    );
  }

  try {
    const mode = await getGovernanceMode(access.orgId);
    return NextResponse.json(
      { ok: true, mode, mutableBy: 'org_admin' },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: 'GOVERNANCE_MODE_UNAVAILABLE' },
      { status: 503 },
    );
  }
}

export async function POST(request: NextRequest) {
  const access = await requireOrgRole(['org_admin'], request);
  if (!access.ok) {
    return NextResponse.json(
      { ok: false, error: access.error ?? 'Unauthorized' },
      { status: access.status },
    );
  }

  const body = (await request.json().catch(() => null)) as { mode?: GovernanceMode } | null;
  if (!body || (body.mode !== 'observe' && body.mode !== 'enforce')) {
    return NextResponse.json(
      { ok: false, error: 'mode must be observe or enforce' },
      { status: 400 },
    );
  }

  try {
    await setGovernanceMode(access.orgId, access.userId, body.mode);
    return NextResponse.json({ ok: true, mode: body.mode });
  } catch {
    return NextResponse.json(
      { ok: false, error: 'GOVERNANCE_MODE_UPDATE_FAILED' },
      { status: 503 },
    );
  }
}
