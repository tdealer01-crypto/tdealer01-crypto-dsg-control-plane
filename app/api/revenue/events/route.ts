// app/api/revenue/events/route.ts
// Handle revenue events

import { NextRequest, NextResponse } from 'next/server';
import { requireInternalService } from '@/lib/auth/internal-service';
import { requireActiveProfile } from '@/lib/auth/require-active-profile';
import { insertRevenueEvent, listRevenueEvents } from '@/lib/revenue/events';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Require internal service authentication
    const auth = requireInternalService(request);
    if (auth.ok === false) {
      return NextResponse.json(
        { ok: false, error: auth.error },
        { status: auth.status }
      );
    }

    // Parse payload
    const body = await request.json();

    // Insert revenue event
    const event = await insertRevenueEvent({
      orgId: auth.orgId,
      eventType: body.type,
      source: body.source,
      amount: body.amount,
      metadata: body.metadata,
    });

    return NextResponse.json(
      {
        ok: true,
        eventId: event.id,
        queued: false,
        message: 'Event persisted to revenue_events',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[POST /api/revenue/events] Error:', error instanceof Error ? error.stack : error);
    return NextResponse.json(
      { ok: false, error: 'Failed to record revenue event' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Require active profile (dashboard user)
    const auth = await requireActiveProfile();
    if (!auth.ok) {
      return NextResponse.json(
        { ok: false, error: auth.error },
        { status: auth.status }
      );
    }

    // Get limit from query params
    const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '10'), 100);

    // List events for this org
    const events = await listRevenueEvents(auth.orgId, { limit });

    return NextResponse.json(
      {
        ok: true,
        count: events.length,
        events,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[GET /api/revenue/events] Error:', error instanceof Error ? error.stack : error);
    return NextResponse.json(
      { ok: false, error: 'Failed to retrieve revenue events' },
      { status: 500 }
    );
  }
}
