/**
 * Gateway Messages API
 * GET  /api/gateway/messages - Get session messages
 * POST /api/gateway/messages - Send message through gateway
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session_id = request.nextUrl.searchParams.get('session_id');
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50');

    if (!session_id) {
      return NextResponse.json(
        { error: 'session_id parameter required' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      data: [],
      session_id,
    });
  } catch (error) {
    console.error('Failed to fetch messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { session_id, content, agent_id } = body;

    if (!session_id || !content || !agent_id) {
      return NextResponse.json(
        { error: 'Missing required fields: session_id, content, agent_id' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        message_id: 'msg_' + Date.now(),
        session_id,
        content,
        status: 'sent',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to send message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
