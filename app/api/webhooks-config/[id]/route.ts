import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireOrgPermission } from '@/lib/auth/require-org-permission';

export const dynamic = 'force-dynamic';

async function getOrgId(supabase: Awaited<ReturnType<typeof createClient>>, authUserId: string): Promise<string | null> {
  const { data } = await supabase
    .from('users')
    .select('org_id')
    .eq('auth_user_id', authUserId)
    .single();
  return data?.org_id ?? null;
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await requireOrgPermission('org.manage_webhooks');
  if (access.ok !== true) return NextResponse.json({ error: access.error }, { status: access.status });

  const supabase = await createClient();
  const orgId = access.orgId;

  const { id } = await params;
  const { error } = await supabase
    .from('webhook_configs')
    .delete()
    .eq('id', id)
    .eq('org_id', orgId);

  if (error) return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  return NextResponse.json({ deleted: id });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await requireOrgPermission('org.manage_webhooks');
  if (access.ok !== true) return NextResponse.json({ error: access.error }, { status: access.status });

  const supabase = await createClient();
  const orgId = access.orgId;

  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if ('active' in body) patch.active = Boolean(body.active);
  if ('events' in body && Array.isArray(body.events)) patch.events = body.events;
  if ('url' in body && typeof body.url === 'string' && body.url.startsWith('https://')) patch.url = body.url;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const { data: updated, error } = await supabase
    .from('webhook_configs')
    .update(patch)
    .eq('id', id)
    .eq('org_id', orgId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  return NextResponse.json({ webhook: updated });
}
