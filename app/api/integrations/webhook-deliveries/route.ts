import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { resolveIntegrationFromApiKey } from '@/lib/integrations';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Extract Bearer token
    const authHeader = request.headers.get('authorization') ?? '';
    const apiKey = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing Bearer token' }, { status: 401 });
    }

    // Extract query params
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agent_id')?.trim();
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200);
    const offset = parseInt(searchParams.get('offset') ?? '0', 10);
    const status = searchParams.get('status')?.trim();

    if (!agentId) {
      return NextResponse.json({ error: 'agent_id query parameter required' }, { status: 400 });
    }

    // Validate integration
    const integration = await resolveIntegrationFromApiKey({ agentId, apiKey });
    if (!integration) {
      return NextResponse.json({ error: 'Invalid agent_id or API key' }, { status: 401 });
    }

    const admin = getSupabaseAdmin();

    // Get the webhook profile ID
    const { data: profile, error: profileError } = await (admin as any)
      .from('integration_profiles')
      .select('id')
      .eq('agent_id', agentId)
      .maybeSingle();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Integration profile not found' }, { status: 404 });
    }

    const webhookId = profile.id;

    // Build query
    let query = (admin as any)
      .from('integration_webhook_deliveries')
      .select('id, event, status, response_code, duration_ms, attempt, error_message, request_payload, response_payload, created_at')
      .eq('webhook_id', webhookId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: deliveries, error } = await query;

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch deliveries' }, { status: 500 });
    }

    // Get total count
    let countQuery = (admin as any)
      .from('integration_webhook_deliveries')
      .select('id', { count: 'exact', head: true })
      .eq('webhook_id', webhookId);

    if (status) {
      countQuery = countQuery.eq('status', status);
    }

    const { count } = await countQuery;

    return NextResponse.json({
      ok: true,
      deliveries: deliveries ?? [],
      pagination: {
        limit,
        offset,
        total: count ?? 0,
      },
    });
  } catch (error) {
    console.error('[integration-webhook-deliveries] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}