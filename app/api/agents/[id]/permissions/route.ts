import { NextRequest, NextResponse } from 'next/server';
import { requireOrgPermission } from '@/lib/auth/require-org-permission';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const VALID_PERMISSIONS = [
  'org.execute',
  'org.manage_agents',
  'org.manage_api_keys',
  'org.manage_policies',
  'org.view_reports',
  'org.view_evidence',
];

const DEFAULT_AGENT_PERMISSIONS = [
  'org.execute',
  'org.view_reports',
  'org.view_evidence',
];

function isValidUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function resolveAgentId(params: Promise<{ id?: string }>) {
  const { id } = await params;
  const agentId = String(id ?? '').trim();
  if (!agentId || agentId === 'undefined' || agentId === 'null' || !isValidUuid(agentId)) {
    return { ok: false as const, response: NextResponse.json({ error: 'Invalid agent id' }, { status: 400 }) };
  }
  return { ok: true as const, agentId };
}

/**
 * GET /api/agents/[id]/permissions
 * User-facing endpoint to get agent permissions.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id?: string }> }
) {
  void request;

  const access = await requireOrgPermission('org.manage_agents');
  if (!access.ok) {
    const denied = access as any;
    return NextResponse.json({ error: denied.error }, { status: denied.status });
  }

  const resolved = await resolveAgentId(params);
  if (!resolved.ok) return resolved.response;
  const { agentId } = resolved;

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
        {
          agent_id: agentId,
          org_id: access.orgId,
          permissions: DEFAULT_AGENT_PERMISSIONS,
          default_role: 'operator',
          status: 'fallback_default',
          warning: 'permissions_backend_unavailable',
        },
        { status: 200 },
      );
    }

    if (!data) {
      return NextResponse.json({
        agent_id: agentId,
        org_id: access.orgId,
        permissions: DEFAULT_AGENT_PERMISSIONS,
        default_role: 'operator',
        status: 'not_configured',
      });
    }

    return NextResponse.json({
      agent_id: agentId,
      org_id: access.orgId,
      permissions: Array.isArray((data as any).permissions) ? (data as any).permissions : DEFAULT_AGENT_PERMISSIONS,
      default_role: (data as any).default_role ?? 'operator',
      status: 'configured',
    });
  } catch (err) {
    console.error('Get permissions error:', err);
    return NextResponse.json(
      {
        agent_id: agentId,
        org_id: access.orgId,
        permissions: DEFAULT_AGENT_PERMISSIONS,
        default_role: 'operator',
        status: 'fallback_default',
        warning: 'permissions_backend_exception',
      },
      { status: 200 },
    );
  }
}

/**
 * PUT /api/agents/[id]/permissions
 * User-facing endpoint to update agent permissions.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id?: string }> }
) {
  const access = await requireOrgPermission('org.manage_agents');
  if (!access.ok) {
    const denied = access as any;
    return NextResponse.json({ error: denied.error }, { status: denied.status });
  }

  const resolved = await resolveAgentId(params);
  if (!resolved.ok) return resolved.response;
  const { agentId } = resolved;

  const body = await request.json().catch(() => ({}));
  const { permissions, default_role } = body;

  if (!permissions || !Array.isArray(permissions)) {
    return NextResponse.json(
      { error: 'Permissions array is required' },
      { status: 400 }
    );
  }

  const invalidPermissions = permissions.filter(
    (permission: string) => !VALID_PERMISSIONS.includes(permission)
  );
  if (invalidPermissions.length > 0) {
    return NextResponse.json(
      { error: `Invalid permissions: ${invalidPermissions.join(', ')}` },
      { status: 400 }
    );
  }

  const admin = getSupabaseAdmin();

  try {
    const upsertData: any = {
      org_id: access.orgId,
      agent_id: agentId,
      permissions,
      default_role: default_role || 'operator',
      updated_at: new Date().toISOString(),
    };

    if (access.actorType === 'user' && access.userId) {
      upsertData.created_by = access.userId;
    }

    const { data, error } = await (admin
      .from('agent_permissions' as any)
      .upsert(upsertData, { onConflict: 'org_id,agent_id' })
      .select('permissions, default_role')
      .single() as any);

    if (error) {
      console.error('Upsert permissions error:', error);
      return NextResponse.json(
        { error: 'Failed to update permissions', reason: 'permissions_backend_unavailable' },
        { status: 503 }
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
