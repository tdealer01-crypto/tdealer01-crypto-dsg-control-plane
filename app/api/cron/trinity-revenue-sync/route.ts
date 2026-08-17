import { NextResponse } from 'next/server';
import { syncTrinityRevenue, checkTrinityRevenueHealth } from '@/lib/trinity/revenue-sync';
import { requireCronAuth } from '@/lib/security/cron-auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  // Use the shared cron guard rather than comparing the header directly: it is
  // timing-safe and also accepts CRON_SECRET_SHA256 and the per-job
  // CRON_TRINITY_REVENUE_SYNC_SECRET forms that other cron routes support.
  const cron = requireCronAuth(request, 'trinity-revenue-sync');
  if (cron.ok !== true) return cron.response;

  const { searchParams } = new URL(request.url);
  const period = (searchParams.get('period') as '1h' | '24h' | '7d') || '24h';

  try {
    // Check health before syncing
    const health = await checkTrinityRevenueHealth();
    if (!health.healthy) {
      console.warn('[trinity-sync] Health check failed:', health);
      return NextResponse.json(
        {
          ok: false,
          error: health.message,
          health,
        },
        { status: 503 }
      );
    }

    // Perform revenue sync
    const result = await syncTrinityRevenue(period);
    const status = result.ok ? 200 : 500;

    return NextResponse.json(
      {
        ok: result.ok,
        period: result.period,
        recordsCreated: result.recordsCreated,
        totalCost: result.totalCost,
        agentCount: result.agentCount,
        errorCount: result.errors.length,
        errors: result.errors.length > 0 ? result.errors : undefined,
      },
      { status }
    );
  } catch (error) {
    console.error('[trinity-sync] Cron failed:', error);
    return NextResponse.json(
      {
        ok: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
