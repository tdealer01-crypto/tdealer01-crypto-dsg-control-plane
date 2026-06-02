import { NextResponse } from 'next/server';
import { requireOrgRole } from '../../../../lib/authz';
import { getDefiConfig, upsertDefiConfig } from '../../../../lib/defi/supabase-defi';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ALLOWED_KEYS = new Set([
  'YIELD_OPTIMIZER_ENABLED',
  'KUB_WALLET_ADDRESS',
  'KUB_LIQUID_STAKE_ADDRESS',
  'KUB_LEND_ADDRESS',
  'KUBSWAP_ROUTER_ADDRESS',
  'KKUB_ADDRESS',
  'KUB_USDT_ADDRESS',
]);

export async function GET() {
  const access = await requireOrgRole(['org_admin']);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const config = await getDefiConfig();
  return NextResponse.json({ ok: true, config });
}

export async function PUT(request: Request) {
  const access = await requireOrgRole(['org_admin']);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  const safe: Record<string, string> = {};
  for (const [k, v] of Object.entries(body)) {
    if (ALLOWED_KEYS.has(k) && typeof v === 'string') safe[k] = v.trim();
  }

  if (Object.keys(safe).length === 0) {
    return NextResponse.json({ error: 'no valid keys provided' }, { status: 400 });
  }

  await upsertDefiConfig(safe);
  return NextResponse.json({ ok: true, updated: Object.keys(safe) });
}
