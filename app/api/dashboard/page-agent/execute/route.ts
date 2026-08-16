import { NextResponse } from 'next/server';
import { requireOrgPermission } from '../../../../../lib/auth/require-org-permission';

export const dynamic = 'force-dynamic';

const unavailable = () =>
  NextResponse.json(
    {
      success: false,
      available: false,
      error: 'page_agent_provider_not_configured',
      truthBoundary:
        'No browser action is reported as executed until a verified browser provider is connected.',
      timestamp: new Date().toISOString(),
    },
    { status: 503 },
  );

async function requirePageAgentAccess() {
  const access = await requireOrgPermission('org.execute');
  if (access.ok !== true) {
    return NextResponse.json(
      { success: false, error: access.error },
      { status: access.status },
    );
  }
  return null;
}

export async function POST() {
  const denied = await requirePageAgentAccess();
  if (denied) return denied;
  return unavailable();
}

export async function GET() {
  const denied = await requirePageAgentAccess();
  if (denied) return denied;
  return unavailable();
}
