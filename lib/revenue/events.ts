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

function eventIdempotencyKey(
  metadata: Record<string, unknown> | null | undefined,
): string | null {
  if (typeof metadata?.idempotency_key === 'string' && metadata.idempotency_key) {
    return metadata.idempotency_key;
  }

  if (typeof metadata?.stripe_event_id === 'string' && metadata.stripe_event_id) {
    return `stripe:${metadata.stripe_event_id}`;
  }

  return null;
}

const EVENT_SELECT =
  'id, created_at, org_id, user_id, event_type, plan_id, amount, currency, source, metadata';

export async function insertRevenueEvent(event: RevenueEventInput): Promise<RevenueEventRecord> {
  const supabase = getSupabaseAdmin() as any;
  const idempotencyKey = eventIdempotencyKey(event.metadata);
  const payload = {
    org_id: event.orgId,
    user_id: event.userId ?? null,
    event_type: event.eventType,
    plan_id: event.planId ?? null,
    amount: event.amount ?? null,
    currency: event.currency || 'USD',
    source: event.source,
    metadata: event.metadata ?? null,
    idempotency_key: idempotencyKey,
  };

  if (idempotencyKey) {
    const upsertResult = await supabase
      .from('revenue_events')
      .upsert(payload, {
        onConflict: 'org_id,idempotency_key',
        ignoreDuplicates: true,
      })
      .select(EVENT_SELECT)
      .maybeSingle();

    if (upsertResult.error) {
      throw new Error(upsertResult.error.message);
    }

    if (upsertResult.data) {
      return toRecord(upsertResult.data as RevenueEventRow);
    }

    const existing = await supabase
      .from('revenue_events')
      .select(EVENT_SELECT)
      .eq('org_id', event.orgId)
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();

    if (existing.error || !existing.data) {
      throw new Error(existing.error?.message || 'failed_to_resolve_revenue_event');
    }

    return toRecord(existing.data as RevenueEventRow);
  }

  const insertResult = await supabase
    .from('revenue_events')
    .insert(payload)
    .select(EVENT_SELECT)
    .single();

  if (insertResult.error) {
    throw new Error(insertResult.error.message);
  }

  return toRecord(insertResult.data as RevenueEventRow);
}

export async function listRevenueEvents(
  orgId: string,
  options?: { limit?: number },
): Promise<RevenueEventRecord[]> {
  const supabase = getSupabaseAdmin() as any;
  const limit = Math.min(Math.max(options?.limit ?? 50, 1), 500);

  const query = supabase
    .from('revenue_events')
    .select(EVENT_SELECT)
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(limit);

  const result = await query;

  if (result.error) {
    throw new Error(result.error.message);
  }

  return ((result.data || []) as RevenueEventRow[]).map(toRecord);
}
