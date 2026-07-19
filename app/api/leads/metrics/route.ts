// Lead metrics — returns conversion funnel, metrics, and high-priority lead stats
// Used by admin dashboard to track lead pipeline health

import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { getConversionMetrics, getConversionFunnel, getHighConversionPotential } from '../../../../lib/leads/conversion-tracking';
import { getHighPriorityLeads } from '../../../../lib/leads/scoring';
import { handleApiError } from '../../../../lib/security/api-error';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();

    if (!auth?.user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    // Check if user is founder (admin)
    const founderEmail = process.env.FOUNDER_EMAIL;
    if (founderEmail && auth.user.email !== founderEmail) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const url = new URL(request.url);
    const daysBack = parseInt(url.searchParams.get('days') || '30');

    // Fetch all metrics in parallel
    const [
      conversionMetrics,
      conversionFunnel,
      highPriorityLeads,
      highConversionPotential,
    ] = await Promise.all([
      getConversionMetrics(),
      getConversionFunnel(daysBack),
      getHighPriorityLeads(20),
      getHighConversionPotential(20),
    ]);

    return NextResponse.json({
      ok: true,
      metrics: conversionMetrics,
      funnel: conversionFunnel,
      high_priority_leads: highPriorityLeads,
      high_conversion_potential: highConversionPotential,
      period_days: daysBack,
    });
  } catch (err) {
    return handleApiError(err, { status: 500 });
  }
}
