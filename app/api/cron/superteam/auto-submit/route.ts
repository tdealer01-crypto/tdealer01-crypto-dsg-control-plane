import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Cron job: Auto-submit Superteam bounties every 6 hours
 * Runs on schedule to generate continuous revenue
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const cronSecret = request.headers.get('authorization');
  if (cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const agentId = 'agent_1784384630740_e7ac817';
    const maxSubmit = 5;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    console.log(`[CRON] Starting Superteam auto-submit at ${new Date().toISOString()}`);

    // Call the auto-submit endpoint
    const response = await fetch(`${appUrl}/api/superteam/agent/auto-submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agentId,
        maxSubmit,
      }),
    });

    const data = await response.json() as any;

    if (!response.ok) {
      console.error(`[CRON] Auto-submit failed:`, data);
      return NextResponse.json(
        {
          success: false,
          error: data.error || 'Auto-submit failed',
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }

    // Log success
    console.log(`[CRON] ✅ Auto-submit complete`);
    console.log(`[CRON] Discovered: ${data.discovered} bounties`);
    console.log(`[CRON] Eligible: ${data.eligible} bounties`);
    console.log(`[CRON] Submitted: ${data.submitted} bounties`);
    console.log(`[CRON] Projected Revenue: ${data.projectedRevenue} ${data.projectedToken}`);

    return NextResponse.json({
      success: true,
      agent: agentId,
      discovered: data.discovered,
      eligible: data.eligible,
      submitted: data.submitted,
      projectedRevenue: data.projectedRevenue,
      projectedToken: data.projectedToken,
      submissions: data.submissions,
      timestamp: new Date().toISOString(),
      nextRun: 'In 6 hours',
    });
  } catch (error) {
    console.error('[CRON] Auto-submit error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Cron job failed',
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
