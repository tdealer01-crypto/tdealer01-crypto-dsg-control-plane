import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let paused: boolean;
  try {
    const body = await request.json() as { paused: boolean };
    paused = Boolean(body.paused);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('dsg_payout_policies')
    .upsert({ org_id: user.id, emergency_paused: paused }, { onConflict: 'org_id' })
    .select('emergency_paused')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ emergency_paused: data.emergency_paused });
}
