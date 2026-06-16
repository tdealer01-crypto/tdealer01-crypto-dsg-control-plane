import { NextRequest, NextResponse } from 'next/server';
import { requireOrgPermission } from '@/lib/auth/require-org-permission';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/agents/[id]/permissions
 * User-facing endpoint to get agent permissions
 * Requires org.manage_agents permission
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireOrgPermission('org.manage_agents');
  if (!access.ok) {
    const denied = access as any;
    return NextResponse.json({ error: denied.error }, { status: denied.status });
  }

  const { id: agentId } = await params;
  const admin = getSupabaseAdmin();

  try {
    const { data, error } = await (admin
      .from('agent_permissions' as any)
      .select('permissions, default_role')
      .eq('org_id', access.orgId)
      .eq('agent_id', agentId)
      .maybeSingle() as any);

    if (error) {
      console.error('Query permissions error:', error);
      return NextResponse.json(
        { error: 'Failed to query permissions' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json({
        agent_id: agentId,
        org_id: access.orgId,
        permissions: null,
        default_role: 'operator',
        status: 'not_configured',
      });
    }

    return NextResponse.json({
      agent_id: agentId,
      org_id: access.orgId,
      permissions: (data as any).permissions,
      default_role: (data as any).default_role,
      status: 'configured',
    });
  } catch (err) {
    console.error('Get permissions error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/agents/[id]/permissions
 * User-facing endpoint to update agent permissions
 * Requires org.manage_agents permission
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireOrgPermission('org.manage_agents');
  if (!access.ok) {
    const denied = access as any;
    return NextResponse.json({ error: denied.error }, { status: denied.status });
  }

  const { id: agentId } = await params;
  const body = await request.json().catch(() => ({}));
  const { permissions, default_role } = body;

  if (!permissions || !Array.isArray(permissions)) {
    return NextResponse.json(
      { error: 'Permissions array is required' },
      { status: 400 }
    );
  }

  // Validate permission values
  const validPermissions = [
    'org.execute',
    'org.manage_agents',
    'org.manage_api_keys',
    'org.manage_policies',
    'org.view_reports',
    'org.view_evidence',
  ];

  const invalidPermissions = permissions.filter(
    (p: string) => !validPermissions.includes(p)
  );
  if (invalidPermissions.length > 0) {
    return NextResponse.json(
      { error: `Invalid permissions: ${invalidPermissions.join(', ')}` },
      { status: 400 }
    );
  }

  const admin = getSupabaseAdmin();

  try {
    const updateData: any = {
      permissions,
      updated_at: new Date().toISOString(),
    };

    if (default_role) {
      updateData.default_role = default_role;
    }

    const { data, error } = await (admin
      .from('agent_permissions' as any)
      .update(updateData)
      .eq('org_id', access.orgId)
      .eq('agent_id', agentId)
      .select('permissions, default_role')
      .single() as any);

    if (error) {
      console.error('Update permissions error:', error);
      return NextResponse.json(
        { error: 'Failed to update permissions' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      agent_id: agentId,
      org_id: access.orgId,
      permissions: (data as any).permissions,
      default_role: (data as any).default_role,
    });
  } catch (err) {
    console.error('Update error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
