import { NextRequest, NextResponse } from 'next/server';
import { requireOrgRole } from '@/lib/authz';
import { getWebhook, updateWebhook, deleteWebhook } from '@/lib/hermes/managed-agents/store';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await requireOrgRole(['operator', 'org_admin', 'reviewer']);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const { id } = await params;
  try {
    const webhook = await getWebhook(access.orgId, id);
    if (!webhook) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(webhook);
  } catch {
    return NextResponse.json({ error: 'Failed to get webhook' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await requireOrgRole(['operator', 'org_admin']);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  let patchUrl: string | undefined;
  if (body.url != null) {
    patchUrl = String(body.url);
    try {
      const parsed = new URL(patchUrl);
      if (parsed.protocol !== 'https:') throw new Error('not https');
    } catch {
      return NextResponse.json({ error: 'url must be a valid https:// URL' }, { status: 400 });
    }
  }

  try {
    const updated = await updateWebhook(access.orgId, id, {
      url: patchUrl,
      events: Array.isArray(body.events) ? (body.events as any) : undefined,
      metadata: typeof body.metadata === 'object' && body.metadata ? (body.metadata as Record<string, unknown>) : undefined,
    });
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Failed to update webhook' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await requireOrgRole(['org_admin']);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const { id } = await params;
  try {
    await deleteWebhook(access.orgId, id);
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: 'Failed to delete webhook' }, { status: 500 });
  }
}
