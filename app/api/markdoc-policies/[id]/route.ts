import { NextRequest, NextResponse } from 'next/server';
import { requireOrgPermission } from '@/lib/auth/require-org-permission';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import Markdoc from '@markdoc/markdoc';
import config from '@/markdoc.config';

export const dynamic = 'force-dynamic';

/**
 * GET /api/markdoc-policies/[id]
 * Get policy markdown content (no rendering)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireOrgPermission('org.view_evidence');
  if (!access.ok) {
    const denied = access as any;
    return NextResponse.json({ error: denied.error }, { status: denied.status });
  }

  const { id } = await params;
  const admin = getSupabaseAdmin();

  const { data: policy, error } = await (admin
    .from('policies_markdoc' as any)
    .select('id, name, description, markdown_content, version, status, content_hash, policy_hash, created_at, updated_at')
    .eq('org_id', access.orgId)
    .eq('id', id)
    .maybeSingle() as any);

  if (error) {
    console.error('Get policy error:', error);
    return NextResponse.json({ error: 'Failed to fetch policy' }, { status: 500 });
  }

  if (!policy) {
    return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
  }

  return NextResponse.json({
    policy: {
      id: policy.id,
      name: policy.name,
      description: policy.description,
      version: policy.version,
      status: policy.status,
      content_hash: policy.content_hash,
      policy_hash: policy.policy_hash,
      created_at: policy.created_at,
      updated_at: policy.updated_at,
    },
    markdown_content: policy.markdown_content,
  });
}

/**
 * GET /api/markdoc-policies/[id]/render
 * Render policy markdown to HTML/JSON
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireOrgPermission('org.view_evidence');
  if (!access.ok) {
    const denied = access as any;
    return NextResponse.json({ error: denied.error }, { status: denied.status });
  }

  const { id } = await params;
  const admin = getSupabaseAdmin();

  const { data: policy, error } = await (admin
    .from('policies_markdoc' as any)
    .select('markdown_content, name, version, policy_hash')
    .eq('org_id', access.orgId)
    .eq('id', id)
    .maybeSingle() as any);

  if (error) {
    console.error('Get policy error:', error);
    return NextResponse.json({ error: 'Failed to fetch policy' }, { status: 500 });
  }

  if (!policy) {
    return NextResponse.json({ error: 'Policy not found' }, { status: 404 });
  }

  try {
    // Parse and render Markdoc
    const ast = Markdoc.parse(policy.markdown_content);
    const transformed = Markdoc.transform(ast, {
      config,
      variables: {
        policyId: id,
        policyName: policy.name,
        policyVersion: policy.version,
        policyHash: policy.policy_hash,
      },
    });

    return NextResponse.json({
      success: true,
      policy_id: id,
      policy_name: policy.name,
      policy_version: policy.version,
      policy_hash: policy.policy_hash,
      ast_nodes: ast.children.length,
      content: JSON.stringify(transformed),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Render policy error:', err);
    return NextResponse.json(
      {
        error: 'Failed to render policy',
        details: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
