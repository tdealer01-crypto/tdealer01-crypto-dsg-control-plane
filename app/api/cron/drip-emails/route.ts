// Daily cron: send trial drip emails at D7 (mid-point) and D13 (expiry warning)
// Vercel cron calls this with Authorization: Bearer CRON_SECRET
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';
import { sendTrialMidpoint, sendTrialExpiry } from '../../../../lib/email/sales';

export const dynamic = 'force-dynamic';

function daysBetween(a: Date, b: Date) {
  return Math.floor((b.getTime() - a.getTime()) / 86_400_000);
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const supabase = getSupabaseAdmin();
  const now = new Date();

  // Fetch all active trial subscriptions
  const { data: trials, error } = await supabase
    .from('billing_subscriptions')
    .select('stripe_subscription_id, customer_email, plan_key, trial_start, trial_end')
    .eq('status', 'trialing')
    .not('trial_start', 'is', null)
    .not('customer_email', 'is', null);

  if (error || !trials) {
    return NextResponse.json({ error: error?.message || 'query failed' }, { status: 500 });
  }

  let sent = 0;

  for (const sub of trials) {
    if (!sub.customer_email || !sub.trial_start || !sub.trial_end) continue;

    const trialStart = new Date(sub.trial_start);
    const trialEnd = new Date(sub.trial_end);
    const daysIn = daysBetween(trialStart, now);
    const daysLeft = daysBetween(now, trialEnd);

    const planKey = sub.plan_key || 'pro';
    const email = sub.customer_email;
    const subId = sub.stripe_subscription_id;

    // D7: send mid-point email (only once)
    if (daysIn >= 7 && daysIn < 8) {
      const eventId = `drip-d7-${subId}`;
      const { data: existing } = await supabase
        .from('billing_events')
        .select('stripe_event_id')
        .eq('stripe_event_id', eventId)
        .maybeSingle();

      if (!existing) {
        await sendTrialMidpoint({ email, planKey, daysLeft: Math.max(0, daysLeft) });
        void supabase.from('billing_events').insert({
          stripe_event_id: eventId,
          event_type: 'drip_email_d7',
          stripe_customer_id: null,
          stripe_subscription_id: subId,
          payload: { email, planKey, daysLeft } as unknown as import('../../../../lib/database.types').Json,
          processed_at: now.toISOString(),
        }).then(() => null, () => null);
        sent++;
      }
    }

    // D13: send expiry warning (1 day before end)
    if (daysLeft >= 0 && daysLeft <= 1) {
      const eventId = `drip-d13-${subId}`;
      const { data: existing } = await supabase
        .from('billing_events')
        .select('stripe_event_id')
        .eq('stripe_event_id', eventId)
        .maybeSingle();

      if (!existing) {
        await sendTrialExpiry({ email, planKey, daysLeft: Math.max(0, daysLeft) });
        void supabase.from('billing_events').insert({
          stripe_event_id: eventId,
          event_type: 'drip_email_d13',
          stripe_customer_id: null,
          stripe_subscription_id: subId,
          payload: { email, planKey, daysLeft } as unknown as import('../../../../lib/database.types').Json,
          processed_at: now.toISOString(),
        }).then(() => null, () => null);
        sent++;
      }
    }
  }

  return NextResponse.json({ ok: true, processed: trials.length, sent });
}
