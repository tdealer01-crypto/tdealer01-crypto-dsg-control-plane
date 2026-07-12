import { NextRequest, NextResponse } from 'next/server';
import { requireOrgPermission } from '@/lib/auth/require-org-permission';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { captureEvent } from '@/lib/telemetry/capture-event';
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

    // Capture policy_updated event
    const changeType = markdown_content ? 'constraint_modified' : (name || description !== undefined ? 'policy_metadata_changed' : 'other');
    void captureEvent('policy_updated', {
      userId: access.userId || 'unknown',
      organizationId: access.orgId,
    }, {
      organization_id: access.orgId,
      policy_id: id,
      policy_version: `v${updated.version || 1}`,
      change_type: changeType,
      updated_by_user_id: access.userId || 'unknown',
    }).catch((error) => {
      console.error('[policy-update] Failed to capture event:', error);
    });

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
    // Fetch policy info before deletion for telemetry
    const { data: policyData } = await admin
      .from('policies_markdoc' as any)
      .select('id, created_at')
      .eq('id', id)
      .eq('org_id', access.orgId)
      .single() as any;

    const { error } = await admin
      .from('policies_markdoc' as any)
      .delete()
      .eq('id', id)
      .eq('org_id', access.orgId);

    if (error) {
      console.error('Delete policy error:', error);
      return NextResponse.json({ error: 'Failed to delete policy' }, { status: 500 });
    }

    // Capture policy_archived event
    const activeDurationDays = policyData && typeof policyData === 'object' && 'created_at' in policyData && policyData.created_at
      ? Math.floor((Date.now() - new Date(policyData.created_at as string).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    void captureEvent('policy_archived', {
      userId: access.userId || 'unknown',
      organizationId: access.orgId,
    }, {
      organization_id: access.orgId,
      policy_id: id,
      archived_by_user_id: access.userId || 'unknown',
      active_duration_days: activeDurationDays,
      total_executions: 0, // Would need additional query for actual execution count
    }).catch((error) => {
      console.error('[policy-delete] Failed to capture event:', error);
    });

    return NextResponse.json({
      success: true,
      message: 'Policy deleted',
    });
  } catch (err) {
    console.error('Delete policy exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
