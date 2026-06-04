import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Cron health check handler for ProductHunt launch monitoring
 * Runs every 6 hours: 0 */6 * * * (UTC)
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
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_APP_URL || 'https://tdealer01-crypto-dsg-control-plane.vercel.app';

    // Check /api/health endpoint
    const healthResponse = await fetch(`${baseUrl}/api/health`, {
      headers: { 'User-Agent': 'DSG-HealthCheck-Cron' },
    });

    // Check /api/readiness endpoint
    const readinessResponse = await fetch(`${baseUrl}/api/readiness`, {
      headers: { 'User-Agent': 'DSG-HealthCheck-Cron' },
    });

    const healthOk = healthResponse.ok;
    const readinessOk = readinessResponse.ok;
    const overallStatus = healthOk && readinessOk ? 'healthy' : 'degraded';

    const logEntry = {
      timestamp,
      environment: process.env.NODE_ENV || 'production',
      status: overallStatus,
      health: {
        ok: healthOk,
        status: healthResponse.status,
      },
      readiness: {
        ok: readinessOk,
        status: readinessResponse.status,
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
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);

    console.error('[DSG-HEALTH-ERROR]', {
      timestamp,
      error: errorMsg,
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        timestamp,
        status: 'error',
        error: 'Health check failed',
        message: errorMsg,
      },
      { status: 500 }
    );
  }
}
