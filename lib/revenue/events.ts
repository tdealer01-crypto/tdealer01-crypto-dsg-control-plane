import { getSupabaseAdmin } from '@/lib/supabase-server';

export type RevenueEventRecord = {
  id: string;
  createdAt: string;
  orgId: string;
  userId: string | null;
  eventType: string;
  planId: string | null;
  amount: number | null;
  currency: string;
  source: string;
  metadata: Record<string, unknown> | null;
};

export type RevenueEventInput = {
  orgId: string;
  userId?: string | null;
  eventType: string;
  planId?: string | null;
  amount?: number | null;
  currency?: string | null;
  source: string;
  metadata?: Record<string, unknown> | null;
};

type RevenueEventRow = {
  id: string;
  created_at: string;
  org_id: string;
  user_id: string | null;
  event_type: string;
  plan_id: string | null;
  amount: number | string | null;
  currency: string | null;
  source: string;
  metadata: Record<string, unknown> | null;
};

function toNumber(value: number | string | null | undefined): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function toRecord(row: RevenueEventRow): RevenueEventRecord {
  return {
    id: row.id,
    createdAt: row.created_at,
    orgId: row.org_id,
    userId: row.user_id,
    eventType: row.event_type,
    planId: row.plan_id,
    amount: toNumber(row.amount),
    currency: row.currency || 'USD',
    source: row.source,
    metadata: row.metadata,
  };
}

export async function insertRevenueEvent(event: RevenueEventInput): Promise<RevenueEventRecord> {
  const supabase = getSupabaseAdmin();
  const eventId = typeof event.metadata?.stripe_event_id === 'string'
    ? String(event.metadata.stripe_event_id)
    : null;

  if (eventId) {
    const duplicate = await (supabase as any)
      .from('revenue_events')
      .select('id, created_at, org_id, user_id, event_type, plan_id, amount, currency, source, metadata')
      .eq('org_id', event.orgId)
      .contains('metadata', { stripe_event_id: eventId })
      .maybeSingle();

    if (duplicate?.data) {
      return toRecord(duplicate.data as RevenueEventRow);
    }
  }

  const insertResult = await (supabase as any)
    .from('revenue_events')
    .insert({
      org_id: event.orgId,
      user_id: event.userId ?? null,
      event_type: event.eventType,
      plan_id: event.planId ?? null,
      amount: event.amount ?? null,
      currency: event.currency || 'USD',
      source: event.source,
      metadata: event.metadata ?? null,
    })
    .select('id, created_at, org_id, user_id, event_type, plan_id, amount, currency, source, metadata')
    .single();

  if (insertResult.error) {
    throw new Error(insertResult.error.message);
  }

  return toRecord(insertResult.data as RevenueEventRow);
}

export async function listRevenueEvents(
  orgId: string,
  options?: { limit?: number }
): Promise<RevenueEventRecord[]> {
  const supabase = getSupabaseAdmin();
  const limit = Math.min(Math.max(options?.limit ?? 50, 1), 500);

  const query = (supabase as any)
    .from('revenue_events')
    .select('id, created_at, org_id, user_id, event_type, plan_id, amount, currency, source, metadata')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(limit);

  const result = await query;

  if (result.error) {
    throw new Error(result.error.message);
  }

  return ((result.data || []) as RevenueEventRow[]).map(toRecord);
}
