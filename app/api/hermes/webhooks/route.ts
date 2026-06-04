import { NextRequest, NextResponse } from 'next/server';
import { requireOrgRole } from '@/lib/authz';
import { createWebhook, listWebhooks } from '@/lib/hermes/managed-agents/store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const access = await requireOrgRole(['operator', 'org_admin', 'reviewer']);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const sp = req.nextUrl.searchParams;
  try {
    const page = await listWebhooks(access.orgId, {
      include_archived: sp.get('include_archived') === 'true',
      limit: sp.get('limit') ? Number(sp.get('limit')) : undefined,
      after: sp.get('after') ?? undefined,
    });
    return NextResponse.json(page);
  } catch {
    return NextResponse.json({ error: 'Failed to list webhooks' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const access = await requireOrgRole(['operator', 'org_admin']);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.url || !Array.isArray(body.events) || body.events.length === 0) {
    return NextResponse.json({ error: 'url and events are required' }, { status: 400 });
  }

  const rawUrl = String(body.url);
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:') throw new Error('not https');
  } catch {
    return NextResponse.json({ error: 'url must be a valid https:// URL' }, { status: 400 });
  }

  try {
    const webhook = await createWebhook(access.orgId, {
      url: rawUrl,
      events: body.events as any,
      metadata: typeof body.metadata === 'object' && body.metadata ? (body.metadata as Record<string, unknown>) : undefined,
    });
    return NextResponse.json(webhook, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create webhook' }, { status: 500 });
  }
}
