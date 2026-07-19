// Update ICP Scores — daily cron that calculates and updates ICP scores for leads
// that don't yet have scores. Runs independently to separate lead discovery from scoring.

import { NextResponse } from 'next/server';
import { requireCronAuth } from '../../../../lib/security/cron-auth';
import { updateLeadICPScores } from '../../../../lib/leads/scoring';

export const dynamic = 'force-dynamic';

const BATCH_SIZE = 100;

export async function GET(request: Request) {
  const auth = requireCronAuth(request, 'update-icp-scores');
  if (!auth.ok) return auth.response;

  try {
    const { updated, failed } = await updateLeadICPScores(BATCH_SIZE);

    return NextResponse.json(
      {
        ok: true,
        icp_scores_updated: updated,
        icp_scores_failed: failed,
      },
      { headers: auth.headers }
    );
  } catch (err) {
    console.error('[ICP Scores Cron] Error:', err);
    return NextResponse.json(
      { error: 'scoring failed', message: err instanceof Error ? err.message : 'unknown error' },
      { status: 500, headers: auth.headers }
    );
  }
}
