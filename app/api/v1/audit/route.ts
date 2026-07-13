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

    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50');
    const offset = parseInt(request.nextUrl.searchParams.get('offset') || '0');

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('ai_audit_logs')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch audit logs' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return handleApiError('app/api/v1/audit/route.ts', error);
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

    if (!body.eventType || !body.resourceType || !body.action) {
      return NextResponse.json(
        { error: 'Missing required fields: eventType, resourceType, action' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('ai_audit_logs')
      .insert({
        org_id: orgId,
        event_type: body.eventType,
        resource_type: body.resourceType,
        resource_id: body.resourceId || '',
        action: body.action,
        user_id: body.userId,
        actor_type: body.actorType || 'user',
        actor_id: body.actorId || body.userId,
        decision: body.decision,
        decision_reason: body.decisionReason,
        proof_reference: body.proofReference,
        policy_id: body.policyId,
        request_metadata: body.requestMetadata || {},
        execution_details: body.executionDetails || {},
        ip_address: body.ipAddress,
        compliance_tags: body.complianceTags || [],
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to create audit log' },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return handleApiError('app/api/v1/audit/route.ts', error);
  }
}
