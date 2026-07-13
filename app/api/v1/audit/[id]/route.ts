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
      .from('ai_audit_logs')
      .select('*')
      .eq('id', id)
      .eq('org_id', orgId)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Audit log not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return handleApiError('app/api/v1/audit/[id]/route.ts', error);
  }
}
