import { NextResponse } from 'next/server';
import { requireOrgRole } from '../../../lib/authz';
import { getSupabaseAdmin } from '../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

type MemoryPayload = Record<string, unknown>;

function normalizeKey(value: unknown, fallback = 'default') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function isObjectPayload(value: unknown): value is MemoryPayload {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isMissingMemoryTable(error: { code?: string | null; message?: string }) {
  if (error.code === 'PGRST205' || error.code === '42P01') return true;
  const message = String(error.message || '').toLowerCase();
  return message.includes('dsg_ui_memory') && (message.includes('schema cache') || message.includes('does not exist'));
}

export async function GET(request: Request) {
  const access = await requireOrgRole(['operator', 'org_admin', 'reviewer', 'runtime_auditor']);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const url = new URL(request.url);
  const pageKey = normalizeKey(url.searchParams.get('pageKey'), '');
  const memoryKey = normalizeKey(url.searchParams.get('memoryKey'));
  if (!pageKey) return NextResponse.json({ error: 'pageKey is required' }, { status: 400 });

  const admin = getSupabaseAdmin();
  const result = await admin
    .from('dsg_ui_memory')
    .select('page_key, memory_key, payload, updated_at')
    .eq('org_id', access.orgId)
    .eq('user_id', access.userId)
    .eq('page_key', pageKey)
    .eq('memory_key', memoryKey)
    .maybeSingle();

  if (result.error) {
    if (isMissingMemoryTable(result.error)) {
      return NextResponse.json({ ok: false, missingMigration: true, payload: {}, updatedAt: null }, { status: 200 });
    }
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    payload: result.data?.payload ?? {},
    updatedAt: result.data?.updated_at ?? null,
  });
}

export async function POST(request: Request) {
  const access = await requireOrgRole(['operator', 'org_admin']);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const pageKey = normalizeKey(body.pageKey, '');
  const memoryKey = normalizeKey(body.memoryKey);
  const payload = body.payload;

  if (!pageKey) return NextResponse.json({ error: 'pageKey is required' }, { status: 400 });
  if (!isObjectPayload(payload)) return NextResponse.json({ error: 'payload must be a JSON object' }, { status: 400 });

  const admin = getSupabaseAdmin();
  const result = await admin
    .from('dsg_ui_memory')
    .upsert({
      org_id: access.orgId,
      user_id: access.userId,
      page_key: pageKey,
      memory_key: memoryKey,
      payload,
    }, { onConflict: 'org_id,user_id,page_key,memory_key' })
    .select('updated_at')
    .single();

  if (result.error) {
    if (isMissingMemoryTable(result.error)) {
      return NextResponse.json({ error: 'dsg_ui_memory migration is not applied' }, { status: 503 });
    }
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, updatedAt: result.data.updated_at });
}

export async function DELETE(request: Request) {
  const access = await requireOrgRole(['operator', 'org_admin']);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const url = new URL(request.url);
  const pageKey = normalizeKey(url.searchParams.get('pageKey'), '');
  const memoryKey = normalizeKey(url.searchParams.get('memoryKey'));
  if (!pageKey) return NextResponse.json({ error: 'pageKey is required' }, { status: 400 });

  const admin = getSupabaseAdmin();
  const result = await admin
    .from('dsg_ui_memory')
    .delete()
    .eq('org_id', access.orgId)
    .eq('user_id', access.userId)
    .eq('page_key', pageKey)
    .eq('memory_key', memoryKey);

  if (result.error) {
    if (isMissingMemoryTable(result.error)) {
      return NextResponse.json({ ok: true, missingMigration: true });
    }
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
