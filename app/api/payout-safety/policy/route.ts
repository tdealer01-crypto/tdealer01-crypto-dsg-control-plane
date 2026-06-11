import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const DEFAULT_POLICY = {
  max_payout_amount: 50000,
  daily_limit: 100000,
  weekly_limit: 500000,
  monthly_limit: 2000000,
  max_payouts_per_day: 3,
  min_minutes_between_payouts: 120,
  allowed_currency: 'THB',
  allowed_destinations: [],
  new_destination_hold_hours: 24,
  low_risk_action: 'ALLOW',
  medium_risk_action: 'REVIEW',
  high_risk_action: 'REVIEW',
  critical_risk_action: 'BLOCK',
  approval_threshold_amount: 50000,
  two_person_approval_threshold: null,
  allowed_days: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
  allowed_time_start: '09:00',
  allowed_time_end: '18:00',
  automation_enabled: true,
  emergency_paused: false,
};

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('dsg_payout_policies')
    .select('*')
    .eq('org_id', user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ policy: data ?? { ...DEFAULT_POLICY, org_id: user.id } });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Remove read-only fields
  const { id: _id, created_at: _c, updated_at: _u, org_id: _o, ...patch } = body as Record<string, unknown>;

  const { data, error } = await supabase
    .from('dsg_payout_policies')
    .upsert({ ...patch, org_id: user.id }, { onConflict: 'org_id' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ policy: data });
}
