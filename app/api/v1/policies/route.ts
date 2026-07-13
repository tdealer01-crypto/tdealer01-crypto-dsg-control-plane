import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/packages/ai-firstify-plugin/src/lib/supabase-client';
import { handleApiError } from '@/lib/security/api-error';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const orgId = request.headers.get('x-org-id');
    if (!orgId) {
      return NextResponse.json(
        { error: 'x-org-id header is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('ai_policies')
      .select('*')
      .eq('org_id', orgId);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch policies' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return handleApiError('app/api/v1/policies/route.ts', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const orgId = request.headers.get('x-org-id');
    if (!orgId) {
      return NextResponse.json(
        { error: 'x-org-id header is required' },
        { status: 400 }
      );
    }

    const body = await request.json();

    if (!body.name || !body.rules || body.rules.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: name, rules' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('ai_policies')
      .insert({
        org_id: orgId,
        name: body.name,
        description: body.description || null,
        policy_type: body.policy_type || 'governance',
        rules: body.rules,
        risk_level: body.risk_level || 'medium',
        enabled: body.enabled !== false,
        version: 1,
        created_by: null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to create policy' },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return handleApiError('app/api/v1/policies/route.ts', error);
  }
}
