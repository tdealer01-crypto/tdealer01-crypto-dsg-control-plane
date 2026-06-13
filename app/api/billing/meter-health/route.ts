/**
 * GET /api/billing/meter-health
 *
 * Returns real-time billing meter health for admin dashboard.
 * Returns per-org stats and dead-letter events.
 */
import { NextRequest, NextResponse } from 'next/server';
import { reconcileMeterOutbox, getOrgBillingStats } from '../../../../lib/billing/reconciliation';
import { isMeteredBillingConfigured } from '../../../../lib/billing/metered';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Admin-only: check for service key or admin role
  const authHeader = request.headers.get('authorization');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const cronSecret = process.env.CRON_SECRET;

  const isAuthorized =
    (serviceKey && authHeader === `Bearer ${serviceKey}`) ||
    (cronSecret && authHeader === `Bearer ${cronSecret}`);

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('org_id');
  const windowHours = Math.min(Number(searchParams.get('hours') ?? '24'), 168);

  try {
    // Overall health
    const report = await reconcileMeterOutbox(windowHours, 500);

    // Per-org stats if requested
    const orgStats = orgId
      ? await getOrgBillingStats(orgId, Math.ceil(windowHours / 24))
      : null;

    return NextResponse.json({
      configured: isMeteredBillingConfigured(),
      health: {
        windowStart: report.windowStart,
        windowEnd: report.windowEnd,
        scanned: report.scanned,
        matched: report.matched,
        missing: report.missing,
        stuck: report.stuck,
        failed: report.failed,
        deliveryRatePct: report.scanned > 0
          ? Math.round((report.matched / report.scanned) * 100)
          : 100,
        generatedAt: report.generatedAt,
      },
      orgStats,
      deadLetters: report.rows
        .filter((r) =>
          r.reconciliationStatus === 'failed' ||
          r.reconciliationStatus === 'missing' ||
          (r.reconciliationStatus === 'pending' && (r.stuckMinutes ?? 0) > 30)
        )
        .slice(0, 20), // Top 20 dead letters
    });
  } catch (error) {
    console.error('[billing/meter-health] failed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
