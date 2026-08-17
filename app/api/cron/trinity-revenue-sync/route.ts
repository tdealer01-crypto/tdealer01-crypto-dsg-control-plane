import { NextResponse } from 'next/server';
import { syncTrinityRevenue, checkTrinityRevenueHealth } from '@/lib/trinity/revenue-sync';

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
