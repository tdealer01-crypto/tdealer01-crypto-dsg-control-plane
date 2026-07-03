/**
 * Gateway Sessions API
 * GET  /api/gateway/sessions - List sessions
 * POST /api/gateway/sessions - Create session
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const agent_id = request.nextUrl.searchParams.get('agent_id');
    const channel = request.nextUrl.searchParams.get('channel');
    const status = request.nextUrl.searchParams.get('status') || 'active';

    if (!agent_id) {
      return NextResponse.json(
        { error: 'agent_id parameter required' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      data: [],
      agent_id,
      channel,
      status,
    });
  } catch (error) {
    console.error('Failed to fetch sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agent_id, channel, channel_user_id, workspace_id } = body;

    if (!agent_id || !channel || !channel_user_id) {
      return NextResponse.json(
        { error: 'Missing required fields: agent_id, channel, channel_user_id' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        session_id: 'sess_' + Date.now(),
        agent_id,
        channel,
        channel_user_id,
        workspace_id,
        status: 'active',
        created_at: new Date().toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create session:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}
