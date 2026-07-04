import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { buildHealthReport } from '../../../lib/health/report';
import { getDeploymentReadiness } from '../../../lib/deployment/readiness';

export const dynamic = 'force-dynamic';

/**
 * Cron health check handler for ProductHunt launch monitoring
 * Runs every 6 hours (cron schedule: 0-23/6, UTC)
 * Verifies API health and readiness before June 10 launch
 */
export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || process.env.DSG_CRON_SECRET;

  // Verify cron secret if environment variable is set
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.warn(`[${timestamp}] Unauthorized cron health check attempt`);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Call the underlying health/readiness logic directly instead of an
    // HTTP round-trip to this same server's own /api/health and
    // /api/readiness routes — that self-fetch pattern added avoidable
    // latency and contended for the server's own request-handling capacity.
    const [healthResult, readinessResult] = await Promise.all([
      buildHealthReport(),
      getDeploymentReadiness(),
    ]);

    const healthOk = healthResult.status === 200;
    const readinessOk = readinessResult.ok;
    const overallStatus = healthOk && readinessOk ? 'healthy' : 'degraded';

    const logEntry = {
      timestamp,
      environment: process.env.NODE_ENV || 'production',
      status: overallStatus,
      health: {
        ok: healthOk,
        status: healthResult.status,
      },
      readiness: {
        ok: readinessOk,
        status: readinessOk ? 200 : 503,
      },
      launchWindow: {
        targetDate: '2026-06-10T00:00:00Z',
        daysUntilLaunch: Math.ceil(
          (new Date('2026-06-10').getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        ),
      },
    };

    // Log to console (Vercel captures this in logs)
    console.log('[DSG-HEALTH-CHECK]', JSON.stringify(logEntry));

    // Alert if degraded
    if (overallStatus === 'degraded') {
      console.error('[DSG-HEALTH-ALERT]', `API degradation detected: health=${healthOk}, readiness=${readinessOk}`);

      // In production, this would trigger Sentry/Slack alerts
      if (process.env.SENTRY_DSN) {
        console.error('[SENTRY]', 'API health check failed during ProductHunt launch window');
      }
    }

    return NextResponse.json(logEntry, { status: healthOk && readinessOk ? 200 : 503 });
  } catch (caught) {
    const errorMsg = caught instanceof Error ? caught.message : String(caught);

    console.error('[DSG-HEALTH-ERROR]', {
      timestamp,
      error: errorMsg,
      stack: caught instanceof Error ? caught.stack : undefined,
    });

    return NextResponse.json(
      {
        timestamp,
        status: 'error',
        error: 'Health check failed',
      },
      { status: 500 }
    );
  }
}
