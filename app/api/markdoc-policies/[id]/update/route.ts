import { NextRequest, NextResponse } from 'next/server';
import { requireOrgPermission } from '@/lib/auth/require-org-permission';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { createHash } from 'crypto';

export const dynamic = 'force-dynamic';

function computeHash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireOrgPermission('org.manage_policies');
  if (!access.ok) {
    const denied = access as any;
    return NextResponse.json({ error: denied.error }, { status: denied.status });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const { name, description, markdown_content, is_default } = body;

  if (markdown_content && typeof markdown_content !== 'string') {
    return NextResponse.json(
      { error: 'markdown_content must be a string' },
      { status: 400 }
    );
  }

  const admin = getSupabaseAdmin();
  const contentHash = markdown_content ? computeHash(markdown_content) : undefined;
  const policyHash = markdown_content ? computeHash(markdown_content) : undefined;

  try {
    const updateData: any = {};
    if (name) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description ? String(description).trim() : null;
    if (markdown_content) {
      updateData.markdown_content = markdown_content;
      updateData.content_hash = contentHash;
      updateData.policy_hash = policyHash;
    }
    if (is_default !== undefined) updateData.is_default = is_default;
    updateData.updated_by = access.userId || null;

    const { data: updated, error } = await (admin
      .from('policies_markdoc' as any)
      .update(updateData)
      .eq('id', id)
      .eq('org_id', access.orgId)
      .select('id, name, description, version, status, is_default, created_at, updated_at')
      .single() as any);

    if (error) {
      console.error('Update policy error:', error);
      return NextResponse.json({ error: 'Failed to update policy' }, { status: 500 });
    }

    if (!updated) {
      return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      policy: updated,
    });
  } catch (err) {
    console.error('Update policy exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireOrgPermission('org.manage_policies');
  if (!access.ok) {
    const denied = access as any;
    return NextResponse.json({ error: denied.error }, { status: denied.status });
  }

  const { id } = await params;
  const admin = getSupabaseAdmin();

  try {
    const { error } = await admin
      .from('policies_markdoc' as any)
      .delete()
      .eq('id', id)
      .eq('org_id', access.orgId);

    if (error) {
      console.error('Delete policy error:', error);
      return NextResponse.json({ error: 'Failed to delete policy' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Policy deleted',
    });
  } catch (err) {
    console.error('Delete policy exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
