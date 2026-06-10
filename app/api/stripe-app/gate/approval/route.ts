import { NextRequest, NextResponse } from 'next/server';
import { buildCorsHeaders, buildPreflightResponse } from '@/lib/security/cors';

export const dynamic = 'force-dynamic';

export async function OPTIONS(request: NextRequest) {
  return buildPreflightResponse(request);
}

export async function POST(request: NextRequest) {
  const corsHeaders = buildCorsHeaders(request);

  try {
    const body = await request.json() as { approval_id?: string; action?: string };
    const { approval_id, action } = body;

    if (!approval_id || !action) {
      return NextResponse.json({ message: 'Missing approval_id or action' }, { status: 400, headers: corsHeaders });
    }

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({ message: 'Invalid action' }, { status: 400, headers: corsHeaders });
    }

    return NextResponse.json({
      ok: true,
      approval_id,
      action,
      status: action === 'approve' ? 'approved' : 'rejected',
    }, { headers: corsHeaders });
  } catch {
    return NextResponse.json({ message: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}
