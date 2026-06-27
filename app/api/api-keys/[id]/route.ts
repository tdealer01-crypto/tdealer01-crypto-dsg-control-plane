import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireOrgPermission } from '@/lib/auth/require-org-permission';

export const dynamic = 'force-dynamic';

interface ErrorResponse {
  error: string;
}

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
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;

  if (!id) {
    const err: ErrorResponse = { error: 'Key ID is required' };
    return NextResponse.json(err, { status: 400 });
  }

  const access = await requireOrgPermission('org.manage_api_keys');
  if (access.ok !== true) return NextResponse.json({ error: access.error }, { status: access.status });

  const supabase = await createClient();
  const orgId = access.orgId;

  // Find the key scoped to this org
  const { data: existing, error: fetchError } = await supabase
    .from('api_keys')
    .select('id, status')
    .eq('id', id)
    .eq('org_id', orgId)
    .maybeSingle();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

  if (!existing) {
    const err: ErrorResponse = { error: `API key '${id}' not found` };
    return NextResponse.json(err, { status: 404 });
  }

  // Update status to REVOKED
  const { error: updateError } = await supabase
    .from('api_keys')
    .update({ status: 'REVOKED' })
    .eq('id', id)
    .eq('org_id', orgId);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({
    id,
    status: 'REVOKED',
    revokedAt: new Date().toISOString(),
  });
}
