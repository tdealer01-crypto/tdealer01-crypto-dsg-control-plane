import { NextResponse } from 'next/server';
import { requireOrgRole } from '../../../../lib/authz';
import {
  disableOpenRouterProviderKey,
  getOpenRouterProviderStatus,
  saveOpenRouterProviderKey,
} from '../../../../lib/agent-v2/openrouter-provider';

export const dynamic = 'force-dynamic';

export async function GET() {
  const access = await requireOrgRole(['org_admin', 'operator']);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const status = await getOpenRouterProviderStatus(access.orgId);
    return NextResponse.json(status);
  } catch {
    return NextResponse.json({ error: 'model_provider_status_failed' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const access = await requireOrgRole(['org_admin']);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const body = await request.json().catch(() => null);
  const apiKey = String(body?.api_key || '').trim();
  if (!apiKey) {
    return NextResponse.json({ error: 'api_key is required' }, { status: 400 });
  }

  try {
    const result = await saveOpenRouterProviderKey(access.orgId, access.userId, apiKey);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'model_provider_save_failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  const access = await requireOrgRole(['org_admin']);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const result = await disableOpenRouterProviderKey(access.orgId);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'model_provider_disable_failed' }, { status: 500 });
  }
}
