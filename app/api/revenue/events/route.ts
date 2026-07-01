import { NextResponse } from 'next/server';
import { requireInternalService } from '@/lib/auth/internal-service';
import { requireActiveProfile } from '@/lib/auth/require-active-profile';
import { listRevenueEvents, insertRevenueEvent } from '@/lib/revenue/events';
import { handleApiError } from '@/lib/security/api-error';
import { readJsonBody } from '@/lib/security/request-json';

export const dynamic = 'force-dynamic';

type RevenueEventRequest = {
  type:
    | 'delivery_proof_upgrade'
    | 'api_quota_upgrade'
    | 'mcp_subscription'
    | 'skills_purchase'
    | 'stripe_checkout'
    | 'stripe_webhook'
    | 'delivery_proof_scan'
    | 'api_execution'
    | 'mcp_request'
    | 'subscription_canceled'
    | 'invoice_payment_succeeded';
  orgId?: string;
  userId?: string;
  planId?: string;
  amount?: number;
  currency?: string;
  source?: string;
  metadata?: Record<string, unknown>;
};

async function resolveReadAccess(request: Request): Promise<
  | { ok: true; orgId: string }
  | { ok: false; status: number; error: string }
> {
  const authHeader = request.headers.get('authorization');

  if (authHeader?.startsWith('Bearer ')) {
    const internal = requireInternalService(request);
    if (internal.ok) {
      return { ok: true, orgId: internal.orgId };
    }
    return internal;
  }

  const profile = await requireActiveProfile();
  if (!profile.ok) {
    return profile;
  }

  return { ok: true, orgId: profile.orgId };
}

export async function POST(request: Request) {
  try {
    const auth = requireInternalService(request);
    if (auth.ok === false) {
      return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
    }

    const parsed = await readJsonBody<RevenueEventRequest>(request, { maxBytes: 8_192 });
    if (!parsed.ok) {
      return NextResponse.json({ ok: false, error: parsed.error }, { status: parsed.status });
    }

    const event = parsed.value;
    if (!event?.type) {
      return NextResponse.json({ ok: false, error: 'type is required' }, { status: 400 });
    }

    const saved = await insertRevenueEvent({
      orgId: auth.orgId,
      userId: event.userId ?? null,
      eventType: event.type,
      planId: event.planId ?? null,
      amount: typeof event.amount === 'number' ? event.amount : null,
      currency: event.currency || 'USD',
      source: event.source || auth.service || 'internal-service',
      metadata: event.metadata ?? null,
    });

    return NextResponse.json({
      ok: true,
      eventId: saved.id,
      queued: false,
      message: 'Event persisted to revenue_events',
    });
  } catch (error) {
    return handleApiError('api/revenue/events:POST', error);
  }
}

export async function GET(request: Request) {
  try {
    const access = await resolveReadAccess(request);
    if (access.ok === false) {
      return NextResponse.json({ ok: false, error: access.error }, { status: access.status });
    }

    const url = new URL(request.url);
    const format = url.searchParams.get('format') || 'json';
    const limit = Number(url.searchParams.get('limit') || 50);
    const events = await listRevenueEvents(access.orgId, { limit: Number.isFinite(limit) ? limit : 50 });

    if (format === 'csv') {
      const csv = [
        'createdAt,eventType,orgId,userId,planId,amount,currency,source',
        ...events.map((event) =>
          [
            event.createdAt,
            event.eventType,
            event.orgId,
            event.userId || '',
            event.planId || '',
            event.amount ?? '',
            event.currency,
            event.source,
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

    return NextResponse.json({
      ok: true,
      count: events.length,
      events,
    });
  } catch (error) {
    return handleApiError('api/revenue/events:GET', error);
  }
}
