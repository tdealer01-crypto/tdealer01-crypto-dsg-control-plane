import { NextRequest, NextResponse } from 'next/server';
import { requireOrgPermission } from '@/lib/auth/require-org-permission';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { createHash } from 'crypto';
import { captureEvent } from '@/lib/telemetry/capture-event';

export const dynamic = 'force-dynamic';

interface CreatePolicyRequest {
  name: string;
  description?: string;
  markdown_content: string;
  is_default?: boolean;
}

function computeHash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

/**
 * GET /api/markdoc-policies
 * List all Markdoc policies for organization
 */
export async function GET(request: NextRequest) {
  const access = await requireOrgPermission('org.view_evidence');
  if (!access.ok) {
    const denied = access as any;
    return NextResponse.json({ error: denied.error }, { status: denied.status });
  }

  const admin = getSupabaseAdmin();
  const { data: policies, error } = await (admin
    .from('policies_markdoc' as any)
    .select('id, name, description, version, status, is_default, created_at, updated_at')
    .eq('org_id', access.orgId)
    .eq('status', 'active')
    .order('created_at', { ascending: false }) as any);

  if (error) {
    console.error('List policies error:', error);
    return NextResponse.json({ error: 'Failed to list policies' }, { status: 500 });
  }

  return NextResponse.json({
    policies: policies || [],
    total: (policies || []).length,
  });
}

/**
 * POST /api/markdoc-policies
 * Create new Markdoc policy
 */
export async function POST(request: NextRequest) {
  const access = await requireOrgPermission('org.manage_policies');
  if (!access.ok) {
    const denied = access as any;
    return NextResponse.json({ error: denied.error }, { status: denied.status });
  }

  const body: CreatePolicyRequest = await request.json().catch(() => ({}));
  const { name, description, markdown_content, is_default } = body;

  // Validate
  if (!name || typeof name !== 'string' || name.length < 2) {
    return NextResponse.json(
      { error: 'name is required (2-255 chars)' },
      { status: 400 }
    );
  }

  if (!markdown_content || typeof markdown_content !== 'string') {
    return NextResponse.json(
      { error: 'markdown_content is required' },
      { status: 400 }
    );
  }

  const admin = getSupabaseAdmin();
  const contentHash = computeHash(markdown_content);
  const policyHash = computeHash(markdown_content);

  try {
    const { data: created, error } = await (admin
      .from('policies_markdoc' as any)
      .insert({
        org_id: access.orgId,
        name: name.trim(),
        description: description ? String(description).trim() : null,
        markdown_content,
        content_hash: contentHash,
        policy_hash: policyHash,
        status: 'active',
        is_default: is_default === true,
        version: 1,
        created_by: access.userId || null,
        updated_by: access.userId || null,
      })
      .select('id, name, description, version, status, is_default, created_at')
      .single() as any);

    if (error) {
      console.error('Create policy error:', error);
      if (error.message?.includes('unique')) {
        return NextResponse.json(
          { error: 'Policy name already exists in this organization' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: 'Failed to create policy' }, { status: 500 });
    }

    // Check if this is first policy for org
    const { count: existingPolicies } = await admin
      .from('policies_markdoc' as any)
      .select('id', { count: 'exact', head: true })
      .eq('org_id', access.orgId);

    const isFirstPolicy = (existingPolicies || 0) <= 1; // 1 because we just created it

    // Capture policy_created event
    await captureEvent('policy_created', {
      userId: access.userId,
      organizationId: access.orgId,
    }, {
      organization_id: access.orgId,
      workspace_id: null,
      policy_id: created.id,
      policy_name: name,
      policy_type: 'markdoc',
      is_first_policy: isFirstPolicy,
      created_by_user_id: access.userId,
    });

    return NextResponse.json(
      {
        success: true,
        policy_id: created.id,
        policy: created,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('Create policy exception:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
