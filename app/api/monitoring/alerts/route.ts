/**
 * GET  /api/monitoring/alerts - List alerts for org
 * POST /api/monitoring/alerts - Create alert (internal)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const agentId = searchParams.get('agent_id');
    const status = searchParams.get('status');
    const severity = searchParams.get('severity');

    // Build query
    let query = supabase
      .from('monitoring_alerts')
      .select('*', { count: 'exact' });

    // Apply filters
    if (agentId) {
      query = query.eq('agent_id', agentId);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (severity) {
      query = query.eq('severity', severity);
    }

    // Order and paginate
    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Failed to fetch alerts:', error);
      return NextResponse.json(
        { error: 'Failed to fetch alerts' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: data || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (offset + limit) < (count || 0),
      },
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const { org_id, agent_id, alert_type, severity, title, message, metadata } = body;

    if (!org_id || !agent_id || !alert_type || !severity) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('monitoring_alerts')
      .insert([
        {
          org_id,
          agent_id,
          alert_type,
          severity,
          status: 'new',
          title: title || alert_type,
          message,
          metadata,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Failed to create alert:', error);
      return NextResponse.json(
        { error: 'Failed to create alert' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Error creating alert:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
