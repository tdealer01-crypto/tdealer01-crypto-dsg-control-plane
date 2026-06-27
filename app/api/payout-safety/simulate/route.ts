import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { evaluatePayoutGate, type PayoutPolicy, type PayoutRequest } from '@/lib/dsg/payout/gate';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { policy?: PayoutPolicy; request: PayoutRequest };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Load policy from DB if not provided inline
  let policy = body.policy;
  if (!policy) {
    // biome-ignore lint/suspicious/noExplicitAny: dsg_payout_policies not yet in generated types
    const { data } = await (supabase as any)
      .from('dsg_payout_policies')
      .select('*')
      .eq('org_id', user.id)
      .maybeSingle();
    policy = data as PayoutPolicy;
  }

  if (!policy) {
    return NextResponse.json({ error: 'No policy configured' }, { status: 404 });
  }

  const result = evaluatePayoutGate(policy, body.request);

  return NextResponse.json({ result, simulated: true });
}
