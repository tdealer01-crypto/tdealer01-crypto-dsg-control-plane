import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { requireOrgRole } from '../../../../lib/authz';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';
import { normalizeDomain } from '../../../../lib/auth/domain-governance';

export async function GET() {
  const access = await requireOrgRole(['org_admin']);
  if (!access.ok) return NextResponse.json({ error: 'Forbidden' }, { status: access.status });
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from('org_domains').select('*').eq('org_id', access.orgId).order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data || [] });
}

export async function POST(req: NextRequest) {
  const access = await requireOrgRole(['org_admin']);
  if (!access.ok) return NextResponse.json({ error: 'Forbidden' }, { status: access.status });
  const body = await req.json().catch(() => ({}));
  const domain = normalizeDomain(body.domain);
  if (!domain) return NextResponse.json({ error: 'Domain is required' }, { status: 400 });
  const admin = getSupabaseAdmin();
  const token = `dsg-verify-${randomUUID()}`;
  const payload = { org_id: access.orgId, domain, status: body.status || 'approved', claim_mode: body.claim_mode || 'manual', auto_join_mode: body.auto_join_mode || 'disabled', verification_method: 'dns_txt', verification_token: token, notes: body.notes || null };
  const { data, error } = await admin.from('org_domains').insert(payload).select('*').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data, verification_step: 'Human verification required. Publish token via DNS and complete ops review.' }, { status: 201 });
}
