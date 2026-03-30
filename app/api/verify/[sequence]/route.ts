import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { verifyLedgerSequence } from '../../../../lib/runtime/checkpoints';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: { sequence: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('org_id, is_active')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (profileError || !profile?.org_id || !profile.is_active) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const sequence = Number(params.sequence);
  if (!Number.isFinite(sequence) || sequence < 0) {
    return NextResponse.json({ ok: false, error: 'Invalid sequence' }, { status: 400 });
  }

  try {
    const verification = await verifyLedgerSequence(String(profile.org_id), sequence);
    return NextResponse.json({ ok: true, ...verification });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}
