import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
): Promise<NextResponse> {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const orgId = await getOrgId(supabase, user.id);
  if (!orgId) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

  // Verify the webhook belongs to this org
  const { data: existing } = await supabase
    .from('webhook_configs')
    .select('id')
    .eq('id', id)
    .eq('org_id', orgId)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: 'webhook not found' }, { status: 404 });
  }

  const { error: deleteError } = await supabase
    .from('webhook_configs')
    .delete()
    .eq('id', id)
    .eq('org_id', orgId);

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

  return NextResponse.json({ deleted: { id } });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const orgId = await getOrgId(supabase, user.id);
  if (!orgId) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

  // Verify ownership
  const { data: existing } = await supabase
    .from('webhook_configs')
    .select('id, url, events, active, created_at')
    .eq('id', id)
    .eq('org_id', orgId)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: 'webhook not found' }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const patch: { active?: boolean; events?: string[] } = {};
  if (typeof body.active === 'boolean') patch.active = body.active;
  if (Array.isArray(body.events)) patch.events = body.events as string[];

  const { data: updated, error: updateError } = await supabase
    .from('webhook_configs')
    .update(patch)
    .eq('id', id)
    .eq('org_id', orgId)
    .select('id, url, events, active, created_at')
    .single();

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({
    webhook: {
      id: updated.id,
      url: updated.url,
      events: updated.events,
      status: updated.active ? 'ACTIVE' : 'DISABLED',
      createdAt: updated.created_at,
    },
  });
}
