import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const provided = request.headers.get('x-test-seed');
  const expected = process.env.TEST_SEED_KEY;

  if (!expected || provided !== expected) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const url = process.env.dsgone_SUPABASE_URL;
  const key = process.env.dsgone_SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return NextResponse.json({ error: 'missing-supabase-env' }, { status: 500 });
  }

  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const orgId = '00000000-0000-0000-0000-000000000001';
  const count = 20;
  const password = 'TestPass123!';
  const results: { email: string; ok: boolean; error?: string }[] = [];

  for (let i = 1; i <= count; i++) {
    const email = `test${String(i).padStart(2, '0')}@dsg.local`;
    const name = `Test User ${i}`;

    const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name },
    });

    if (authErr || !authUser?.user) {
      results.push({ email, ok: false, error: authErr?.message || 'create failed' });
      continue;
    }

    const { error: upsertErr } = await admin
      .from('users')
      .upsert(
        {
          id: authUser.user.id,
          email,
          full_name: name,
          org_id: orgId,
          is_active: true,
          role: 'OPERATOR',
        },
        { onConflict: 'id' },
      );

    results.push({ email, ok: !upsertErr, error: upsertErr?.message });
  }

  return NextResponse.json({ ok: true, results });
}
