// Manual trigger for marketing agent — POST from dashboard
// Same logic as cron but callable on-demand by founder

import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  // Auth: must be signed in as founder
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const founderEmail = process.env.FOUNDER_EMAIL;
  if (founderEmail && user.email !== founderEmail) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Delegate to the cron handler with CRON_SECRET bypass
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
  const secret = process.env.CRON_SECRET ?? '';

  const res = await fetch(`${appUrl}/api/cron/marketing-agent`, {
    headers: { authorization: `Bearer ${secret}` },
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
