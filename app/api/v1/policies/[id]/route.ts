import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/packages/ai-firstify-plugin/src/lib/supabase-client';
import { handleApiError } from '@/lib/security/api-error';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const orgId = request.headers.get('x-org-id');
    if (!orgId) {
      return NextResponse.json(
        { error: 'x-org-id header is required' },
        { status: 400 }
      );
    }

    const { id } = await params;
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('ai_policies')
      .select('*')
      .eq('id', id)
      .eq('org_id', orgId)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Policy not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return handleApiError('app/api/v1/policies/[id]/route.ts', error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const orgId = request.headers.get('x-org-id');
    if (!orgId) {
      return NextResponse.json(
        { error: 'x-org-id header is required' },
        { status: 400 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('ai_policies')
      .update(body)
      .eq('id', id)
      .eq('org_id', orgId)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update policy' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return handleApiError('app/api/v1/policies/[id]/route.ts', error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const orgId = request.headers.get('x-org-id');
    if (!orgId) {
      return NextResponse.json(
        { error: 'x-org-id header is required' },
        { status: 400 }
      );
    }

    const { id } = await params;
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('ai_policies')
      .delete()
      .eq('id', id)
      .eq('org_id', orgId);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to delete policy' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError('app/api/v1/policies/[id]/route.ts', error);
  }
}
