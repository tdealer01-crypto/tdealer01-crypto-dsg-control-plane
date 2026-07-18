/**
 * Lead Discovery Cron Job
 * Vercel Scheduled Function: Runs daily to discover and score leads
 * GET /api/cron/lead-discovery
 */

import { NextResponse } from 'next/server';
import { runLeadDiscovery } from '../../../../lib/leads/discovery';
import { scoreAllLeads, getTopLeads } from '../../../../lib/leads/scoring';
import { sendOutreachToTopLeads } from '../../../../lib/leads/outreach';
import { logApiError, internalErrorMessage } from '../../../../lib/security/api-error';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('Starting lead discovery cron job...');

    // Step 1: Discover new leads
    console.log('Step 1: Discovering leads...');
    const { discovered, saved } = await runLeadDiscovery();
    console.log(`  Discovered ${discovered}, saved ${saved} new leads`);

    // Step 2: Score all leads
    console.log('Step 2: Scoring leads...');
    const scored = await scoreAllLeads();
    console.log(`  Scored ${scored} leads`);

    // Step 3: Get top leads for outreach
    console.log('Step 3: Getting top leads...');
    const topLeads = await getTopLeads(15, 70);
    console.log(`  Found ${topLeads.length} leads with score ≥ 70`);

    // Step 4: Send outreach to new high-quality leads
    console.log('Step 4: Sending outreach...');
    const outreachResults = await sendOutreachToTopLeads(10, 75);
    const successCount = outreachResults.filter((r) => r.success).length;
    console.log(`  Sent ${successCount} outreach emails`);

    const result = {
      ok: true,
      timestamp: new Date().toISOString(),
      stats: {
        discovered,
        saved,
        scored,
        topLeads: topLeads.length,
        outreachSent: successCount,
        outreachFailed: outreachResults.length - successCount,
      },
      topLeads: topLeads.slice(0, 5), // Return top 5 for reference
    };

    console.log('Lead discovery cron completed:', result);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    logApiError('api/cron/lead-discovery', error);

    return NextResponse.json(
      {
        error: internalErrorMessage(),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
