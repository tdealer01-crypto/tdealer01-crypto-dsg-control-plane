import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireOrgPermission } from '@/lib/auth/require-org-permission';
import { createHash, randomBytes } from 'crypto';

export const dynamic = 'force-dynamic';

async function getOrgId(supabase: Awaited<ReturnType<typeof createClient>>, authUserId: string): Promise<string | null> {
  const { data } = await supabase
    .from('users')
    .select('org_id')
    .eq('auth_user_id', authUserId)
    .single();
  return data?.org_id ?? null;
}

export async function GET(): Promise<NextResponse> {
  const access = await requireOrgPermission('org.manage_webhooks');
  if (access.ok !== true) return NextResponse.json({ error: access.error }, { status: access.status });

  const supabase = await createClient();
  const orgId = access.orgId;

  // Fetch webhook configs
  const { data: configs, error } = await supabase
    .from('webhook_configs')
    .select('id, url, events, active, created_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: 'db_error', detail: 'webhook_configs table may not be migrated yet' }, { status: 500 });

  // Fetch recent deliveries for each webhook
  const webhookIds = (configs ?? []).map((c) => c.id);
  let deliveriesMap: Record<string, { status: string; created_at: string }[]> = {};

  if (webhookIds.length > 0) {
    const { data: deliveries } = await supabase
      .from('webhook_deliveries')
      .select('webhook_id, status, created_at')
      .in('webhook_id', webhookIds)
      .order('created_at', { ascending: false })
      .limit(100);

    for (const d of deliveries ?? []) {
      if (!deliveriesMap[d.webhook_id]) deliveriesMap[d.webhook_id] = [];
      deliveriesMap[d.webhook_id].push({ status: d.status, created_at: d.created_at });
    }
  }

  const webhooks = (configs ?? []).map((c) => {
    const recentDeliveries = deliveriesMap[c.id] ?? [];
    const hasFailed = recentDeliveries.slice(0, 5).some((d) => d.status === 'failed');
    return {
      id: c.id,
      url: c.url,
      events: c.events,
      status: !c.active ? 'DISABLED' : hasFailed ? 'FAILING' : 'ACTIVE',
      createdAt: c.created_at,
    };
  });

  return NextResponse.json({ webhooks, total: webhooks.length });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const access = await requireOrgPermission('org.manage_webhooks');
  if (access.ok !== true) return NextResponse.json({ error: access.error }, { status: access.status });

  const supabase = await createClient();
  const orgId = access.orgId;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.url || typeof body.url !== 'string' || !body.url.startsWith('https://')) {
    return NextResponse.json(
      { error: 'url must be a valid https:// endpoint' },
      { status: 400 },
    );
  }

  if (!Array.isArray(body.events) || body.events.length === 0) {
    return NextResponse.json(
      { error: 'events must be a non-empty array' },
      { status: 400 },
    );
  }

  // Generate signing secret — store only the hash
  const rawSecret = 'whsec_' + randomBytes(16).toString('hex');
  const secretHash = createHash('sha256').update(rawSecret).digest('hex');

  const { data: newWebhook, error: insertError } = await supabase
    .from('webhook_configs')
    .insert({
      org_id: orgId,
      url: body.url as string,
      secret_hash: secretHash,
      events: body.events as string[],
      active: true,
    })
    .select()
    .single();

  if (insertError) return NextResponse.json({ error: 'db_error', detail: 'webhook_configs table may not be migrated yet' }, { status: 500 });

  return NextResponse.json(
    {
      webhook: {
        id: newWebhook.id,
        url: newWebhook.url,
        events: newWebhook.events,
        status: 'ACTIVE',
        createdAt: newWebhook.created_at,
      },
      secret: rawSecret,
    },
    { status: 201 }
  );
}
