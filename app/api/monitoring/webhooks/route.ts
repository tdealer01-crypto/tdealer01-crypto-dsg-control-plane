/**
 * GET  /api/monitoring/webhooks - List webhooks for org
 * POST /api/monitoring/webhooks - Create webhook
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const searchParams = request.nextUrl.searchParams;
    const enabled = searchParams.get('enabled');

    let query = supabase
      .from('monitoring_webhooks')
      .select('*', { count: 'exact' });

    if (enabled !== null) {
      query = query.eq('enabled', enabled === 'true');
    }

    const { data, count, error } = await query
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch webhooks:', error);
      return NextResponse.json(
        { error: 'Failed to fetch webhooks' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: data || [],
      total: count || 0,
    });
  } catch (error) {
    console.error('Error fetching webhooks:', error);
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

    const { org_id, url, channel, secret } = body;

    if (!org_id || !url || !channel) {
      return NextResponse.json(
        { error: 'Missing required fields: org_id, url, channel' },
        { status: 400 }
      );
    }

    if (!['slack', 'discord', 'generic'].includes(channel)) {
      return NextResponse.json(
        { error: 'Invalid channel. Must be one of: slack, discord, generic' },
        { status: 400 }
      );
    }

    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('monitoring_webhooks')
      .insert([
        {
          webhook_id: randomUUID(),
          org_id,
          url,
          channel,
          secret: secret || null,
          enabled: true,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Failed to create webhook:', error);
      return NextResponse.json(
        { error: 'Failed to create webhook' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Error creating webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
