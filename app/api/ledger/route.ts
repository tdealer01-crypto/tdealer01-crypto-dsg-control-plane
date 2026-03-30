import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';
import { getSupabaseAdmin } from '../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
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

    const url = new URL(request.url);
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || '20'), 1), 100);

    const admin = getSupabaseAdmin();

    const [{ data: entries, error: entriesError }, { data: checkpoints, error: checkpointsError }] =
      await Promise.all([
        admin
          .from('ledger_entries')
          .select(`
            id,
            request_id,
            approval_hash,
            sequence,
            epoch,
            action,
            input_hash,
            decision,
            reason,
            prev_state_hash,
            next_state_hash,
            effect_id,
            logical_ts,
            prev_entry_hash,
            entry_hash,
            metadata,
            created_at
          `)
          .eq('org_id', profile.org_id)
          .order('sequence', { ascending: false })
          .limit(limit),

        admin
          .from('state_checkpoints')
          .select('sequence, epoch, state_hash, entry_hash, created_at')
          .eq('org_id', profile.org_id)
          .order('sequence', { ascending: false })
          .limit(10),
      ]);

    if (entriesError) {
      return NextResponse.json({ ok: false, error: entriesError.message }, { status: 500 });
    }

    if (checkpointsError) {
      return NextResponse.json({ ok: false, error: checkpointsError.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      items: entries || [],
      checkpoints: checkpoints || [],
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}
