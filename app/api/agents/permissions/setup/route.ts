import { NextRequest, NextResponse } from 'next/server';
import { requireInternalService } from '@/lib/auth/internal-service';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/agents/permissions/setup
 *
 * Internal endpoint to grant default permissions to an agent.
 * Requires INTERNAL_SERVICE_TOKEN + x-agent-id header.
 *
 * Default permissions:
 * - org.manage_agents
 * - org.manage_api_keys
 * - org.execute
 * - org.view_reports
 * - org.view_evidence
 */
export async function POST(request: NextRequest) {
  const internalAccess = requireInternalService(request);
  if (!internalAccess.ok) {
    const failure = internalAccess as any;
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status }
    );
  }

  if (!internalAccess.agentId) {
    return NextResponse.json(
      { error: 'Agent ID required in x-agent-id header' },
      { status: 400 }
    );
  }

  const admin = getSupabaseAdmin();

  // Default permissions for agents
  const defaultPermissions = [
    'org.manage_agents',
    'org.manage_api_keys',
    'org.execute',
    'org.view_reports',
    'org.view_evidence',
  ];

  try {
    // Upsert agent permissions
    const { data, error } = await (admin
      .from('agent_permissions' as any)
      .upsert({
        org_id: internalAccess.orgId,
        agent_id: internalAccess.agentId,
        permissions: defaultPermissions,
        default_role: 'operator',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'org_id,agent_id' })
      .select('org_id, agent_id, permissions, default_role')
      .single()) as any;

    if (error) {
      console.error('Setup agent permissions error:', error);
      return NextResponse.json(
        { error: 'Failed to setup permissions' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      agent_id: internalAccess.agentId,
      org_id: internalAccess.orgId,
      permissions: (data as any)?.permissions || defaultPermissions,
      default_role: (data as any)?.default_role || 'operator',
      message: 'Agent permissions configured',
    });
  } catch (err) {
    console.error('Setup error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/agents/permissions/setup?agent_id=...
 * Internal endpoint to check current agent permissions
 */
export async function GET(request: NextRequest) {
  const internalAccess = requireInternalService(request);
  if (!internalAccess.ok) {
    const failure = internalAccess as any;
    return NextResponse.json(
      { error: failure.error },
      { status: failure.status }
    );
  }

  const queryAgentId = request.nextUrl.searchParams.get('agent_id');
  if (!queryAgentId && !internalAccess.agentId) {
    return NextResponse.json(
      { error: 'Agent ID required' },
      { status: 400 }
    );
  }

  const targetAgentId = queryAgentId || internalAccess.agentId;
  const admin = getSupabaseAdmin();

  try {
    const { data, error } = await (admin
      .from('agent_permissions' as any)
      .select('permissions, default_role')
      .eq('org_id', internalAccess.orgId)
      .eq('agent_id', targetAgentId)
      .maybeSingle() as any);

    if (error) {
      console.error('Query error:', error);
      return NextResponse.json(
        { error: 'Failed to query permissions' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json({
        agent_id: targetAgentId,
        org_id: internalAccess.orgId,
        permissions: null,
        default_role: 'operator',
        status: 'not_configured',
      });
    }

    return NextResponse.json({
      agent_id: targetAgentId,
      org_id: internalAccess.orgId,
      permissions: (data as any).permissions,
      default_role: (data as any).default_role,
      status: 'configured',
    });
  } catch (err) {
    console.error('Get error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
