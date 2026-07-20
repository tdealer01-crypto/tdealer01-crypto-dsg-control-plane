// Reddit lead discovery — daily cron that discovers and scores leads from Reddit
// discussions in relevant subreddits about AI, automation, and related topics. Caps at 20 new leads/run.

import { NextResponse } from 'next/server';
import { requireCronAuth } from '../../../../lib/security/cron-auth';
import { discoverRedditLeads, saveDiscoveredLeads } from '../../../../lib/leads/discovery';
import { updateLeadICPScores } from '../../../../lib/leads/scoring';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = requireCronAuth(request, 'reddit-leads');
  if (!auth.ok) return auth.response;

  try {
    // Discover leads from Reddit
    const leads = await discoverRedditLeads();

    if (leads.length === 0) {
      return NextResponse.json(
        {
          ok: true,
          message: 'No leads discovered from Reddit',
          leads_found: 0,
          leads_saved: 0,
        },
        { headers: auth.headers }
      );
    }

    // Save discovered leads to database
    const { saved, skipped } = await saveDiscoveredLeads(leads);

    // Update ICP scores for new leads
    const { updated: scoringUpdated } = await updateLeadICPScores(saved);

    return NextResponse.json(
      {
        ok: true,
        leads_found: leads.length,
        leads_saved: saved,
        leads_skipped: skipped,
        icp_scores_updated: scoringUpdated,
      },
      { headers: auth.headers }
    );
  } catch (err) {
    console.error('[Reddit Leads Cron] Error:', err);
    return NextResponse.json(
      { error: 'discovery failed' },
      { status: 500, headers: auth.headers }
    );
  }
}
