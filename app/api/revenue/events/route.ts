/**
 * POST /api/revenue/events
 * 
 * Logs payment and monetization events for revenue tracking.
 * Used to track conversions from free → paid for various revenue streams:
 * - Delivery Proof scan upgrades
 * - API quota gate upgrades
 * - MCP subscription activations
 * - Skills bundle purchases
 * 
 * Event schema:
 * {
 *   type: 'delivery_proof_upgrade' | 'api_quota_upgrade' | 'mcp_subscription' | 'skills_purchase' | 'stripe_checkout',
 *   orgId: string,
 *   userId?: string,
 *   planId?: string,
 *   amount?: number,
 *   currency?: string,
 *   source: string (e.g. '/delivery-proof', '/api/execute', '/dashboard/billing'),
 *   metadata?: Record<string, any>
 * }
 */

import { NextResponse } from 'next/server';
import { readJsonBody } from '@/lib/security/request-json';
import { handleApiError } from '@/lib/security/api-error';
import { requireInternalService } from '@/lib/auth/internal-service';

export const dynamic = 'force-dynamic';

interface RevenueEvent {
  type: 'delivery_proof_upgrade' | 'api_quota_upgrade' | 'mcp_subscription' | 'skills_purchase' | 'stripe_checkout' | 'stripe_webhook';
  orgId?: string;
  userId?: string;
  planId?: string;
  amount?: number;
  currency?: string;
  source?: string;
  metadata?: Record<string, unknown>;
  timestamp?: string;
}

/**
 * Simple in-memory event buffer (Phase 1)
 * Phase 2: Persist to Supabase revenue_events table
 */
const eventBuffer: RevenueEvent[] = [];

export async function POST(request: Request) {
  try {
    const auth = requireInternalService(request);
    if (!auth.ok) {
      return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
    }

    const parsed = await readJsonBody<RevenueEvent>(request, { maxBytes: 2_048 });

    if (!parsed.ok) {
      return NextResponse.json({ ok: false, error: parsed.error }, { status: parsed.status });
    }

    const event = parsed.value;

    if (!event || !event.type) {
      return NextResponse.json(
        { ok: false, error: 'type is required' },
        { status: 400 }
      );
    }

    // Add timestamp if not provided
    const eventWithTimestamp = {
      ...event,
      orgId: event.orgId || auth.orgId,
      timestamp: event.timestamp || new Date().toISOString(),
    };

    // Buffer event in memory (Phase 1)
    eventBuffer.push(eventWithTimestamp);

    // TODO: Phase 2 - Persist to Supabase
    // const supabase = await createClient();
    // await supabase.from('revenue_events').insert(eventWithTimestamp);

    // Log to console for debugging
    console.log('📊 Revenue Event:', {
      type: event.type,
      source: event.source || 'unknown',
      orgId: eventWithTimestamp.orgId || 'anonymous',
      amount: event.amount ? `$${event.amount}` : 'free',
      timestamp: eventWithTimestamp.timestamp,
    });

    return NextResponse.json({
      ok: true,
      eventId: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      queued: true,
      message: 'Event logged for revenue tracking (Phase 1: in-memory buffer)',
    });
  } catch (error) {
    return handleApiError('api/revenue/events:POST', error);
  }
}

/**
 * GET /api/revenue/events
 * Returns buffered events (Phase 1 only)
 * 
 * Phase 2: Replace with Supabase query for historical events
 */
export async function GET(request: Request) {
  try {
    const auth = requireInternalService(request);
    if (!auth.ok) {
      return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
    }

    const url = new URL(request.url);
    const format = url.searchParams.get('format') || 'json';

    if (format === 'csv') {
      // Return CSV format for export
      const csv = [
        'timestamp,type,orgId,userId,planId,amount,currency,source',
        ...eventBuffer.map((e) =>
          [
            e.timestamp,
            e.type,
            e.orgId || '',
            e.userId || '',
            e.planId || '',
            e.amount || '',
            e.currency || '',
            e.source || '',
          ].join(',')
        ),
      ].join('\n');

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="revenue-events.csv"',
        },
      });
    }

    // JSON format
    return NextResponse.json({
      ok: true,
      count: eventBuffer.length,
      events: eventBuffer,
      note: 'Phase 1: Events buffered in memory only. Phase 2 will persist to Supabase.',
    });
  } catch (error) {
    return handleApiError('api/revenue/events:GET', error);
  }
}
