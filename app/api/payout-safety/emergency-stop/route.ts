import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { handleApiError } from '@/lib/security/api-error';

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

  // biome-ignore lint/suspicious/noExplicitAny: dsg_payout_policies not yet in generated types
  const { data, error } = await (supabase as any)
    .from('dsg_payout_policies')
    .upsert({ org_id: user.id, emergency_paused: paused }, { onConflict: 'org_id' })
    .select('emergency_paused')
    .single();

  if (error) return handleApiError('api/payout-safety/emergency-stop', error);

  return NextResponse.json({ emergency_paused: (data as { emergency_paused: boolean }).emergency_paused });
}
