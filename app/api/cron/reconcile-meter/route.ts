/**
 * GET /api/cron/reconcile-meter
 *
 * Runs meter outbox reconciliation and returns a report.
 * Protected by CRON_SECRET. Triggered by Vercel cron or external scheduler.
 */
import { NextResponse } from 'next/server';
import { reconcileMeterOutbox, requeueStuckRows } from '../../../../lib/billing/reconciliation';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function authorizeCron(request: Request): NextResponse | null {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

export async function GET(request: Request) {
  const authError = authorizeCron(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const windowHours = Math.min(Number(searchParams.get('hours') ?? '24'), 168); // max 1 week
  const limit = Math.min(Number(searchParams.get('limit') ?? '500'), 1000);
  const requeue = searchParams.get('requeue') === 'true';

  try {
    const [report, requeueResult] = await Promise.all([
      reconcileMeterOutbox(windowHours, limit),
      requeue ? requeueStuckRows(windowHours) : Promise.resolve(null),
    ]);

    const hasProblems = report.missing > 0 || report.failed > 0 || report.stuck > 0;
    const status = hasProblems ? 207 : 200; // 207 = multi-status (partial success)

    return NextResponse.json({
      ok: !hasProblems,
      report: {
        windowStart: report.windowStart,
        windowEnd: report.windowEnd,
        scanned: report.scanned,
        matched: report.matched,
        missing: report.missing,
        stuck: report.stuck,
        failed: report.failed,
        generatedAt: report.generatedAt,
      },
      requeue: requeueResult,
      // Only include problem rows to keep payload small
      problems: report.rows.filter(
        (r) => r.reconciliationStatus !== 'match'
      ).slice(0, 50),
    }, { status });
  } catch (error) {
    console.error('[reconcile-meter] cron failed:', error);
    return NextResponse.json(
      { ok: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
