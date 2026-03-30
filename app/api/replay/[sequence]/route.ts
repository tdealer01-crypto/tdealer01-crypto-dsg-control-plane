import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';
import { replayToSequence } from '../../../../lib/runtime/checkpoints';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: { sequence: string } }) {
  const sequence = Number(params.sequence);
  if (!Number.isFinite(sequence) || sequence < 0) {
    return NextResponse.json({ ok: false, error: 'Invalid sequence' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('users')
    .select('org_id, is_active')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (!profile?.org_id || !profile.is_active) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const admin = getSupabaseAdmin();
  const replay = await replayToSequence({ supabase: admin, orgId: profile.org_id, sequence });

  if (!replay.ok) {
    return NextResponse.json({ ok: false, error: replay.error }, { status: 404 });
  }

  return NextResponse.json({ ok: true, target_sequence: sequence, replay: replay.checkpoint });
}
