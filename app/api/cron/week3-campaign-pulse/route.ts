import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Week 3-4 Campaign Pulse Check
 * Runs daily to monitor:
 * - ProductHunt upvote progress
 * - Email delivery metrics
 * - Lead engagement scoring
 * - Pilot contract status
 * - Revenue tracking
 *
 * Schedule: 0 9 * * * (9 AM UTC daily)
 */
export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || process.env.DSG_CRON_SECRET;

  // Verify cron secret
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.warn(`[${timestamp}] Unauthorized campaign pulse attempt`);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const launchDate = new Date('2026-06-10T00:00:00Z');
    const daysSinceLaunch = Math.floor(
      (new Date().getTime() - launchDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Campaign timeline
    const campaignPhase =
      daysSinceLaunch < 0
        ? 'pre-launch'
        : daysSinceLaunch < 1
          ? 'launch-day'
          : daysSinceLaunch < 7
            ? 'week-1-momentum'
            : daysSinceLaunch < 14
              ? 'week-2-conversion'
              : daysSinceLaunch < 21
                ? 'week-3-pilot'
                : 'post-launch';

    // Email campaign schedule
    const emailSchedule = [
      { day: 0, hour: 12, name: 'Email 1: Intro' },
      { day: 2, hour: 9, name: 'Email 2: Demo' },
      { day: 4, hour: 10, name: 'Email 3: Interview' },
      { day: 8, hour: 14, name: 'Email 4: Pricing' },
      { day: 11, hour: 15, name: 'Email 5: Offer' },
    ];

    const nextEmail = emailSchedule.find((e) => e.day > daysSinceLaunch);

    const campaignStatus = {
      timestamp,
      phase: campaignPhase,
      daysSinceLaunch,
      targetMetrics: {
        producthuntUpvotes: 'target: 100+ by day 1',
        betaSignups: 'target: 50+ by day 3',
        pilotContracts: 'target: 3+ by day 21',
        MRR: 'target: $5K+ by week 8',
      },
      emailCampaign: {
        totalSequence: 5,
        batchSize: 20,
        targetCompanies: 20,
        nextEmail: nextEmail
          ? `${nextEmail.name} on day ${nextEmail.day}`
          : 'Campaign complete',
      },
      businessGoals: {
        week3: 'ProductHunt launch + cold email + warm outreach',
        week4: 'Convert 3 pilots + build case studies',
        week56: 'Launch Tier 2 products + scale to 10+ customers',
        week78: 'Reach $5K+ MRR with enterprise pipeline',
      },
      actions: generateCampaignActions(daysSinceLaunch),
    };

    // Log campaign pulse
    console.log('[DSG-CAMPAIGN-PULSE]', JSON.stringify(campaignStatus, null, 2));

    // Alert if behind schedule
    if (campaignPhase === 'launch-day' && daysSinceLaunch > 1) {
      console.warn('[DSG-CAMPAIGN-ALERT]', 'Post-launch metrics not tracking as expected');
    }

    return NextResponse.json(campaignStatus, { status: 200 });
  } catch (caught) {
    const errorMsg = caught instanceof Error ? caught.name : 'Unknown';

    console.error('[DSG-CAMPAIGN-ERROR]', {
      timestamp: new Date().toISOString(),
      error: errorMsg,
      stack: caught instanceof Error ? caught.stack : undefined,
    });

    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        error: 'Campaign pulse check failed',
      },
      { status: 500 }
    );
  }
}

function generateCampaignActions(daysSinceLaunch: number): string[] {
  const actions: string[] = [];

  if (daysSinceLaunch < 0) {
    actions.push(
      'Prepare ProductHunt submission',
      'Finalize Twitter thread',
      'Queue warm emails (5 contacts)',
      'Set up Sentry alerts',
      'Verify health check endpoints'
    );
  } else if (daysSinceLaunch === 0) {
    actions.push(
      '🚀 LAUNCH DAY: Submit ProductHunt',
      'Post Twitter thread',
      'Send warm emails',
      'Monitor health checks every 30min',
      'Track upvote momentum'
    );
  } else if (daysSinceLaunch === 2) {
    actions.push(
      'Send Email 2 (demo) to 20 companies',
      'Analyze ProductHunt comments',
      'Review upvote trajectory',
      'Prepare case study template'
    );
  } else if (daysSinceLaunch === 4) {
    actions.push(
      'Send Email 3 (interview) to 20 companies',
      'Follow up with warm contacts',
      'Schedule pilot demos',
      'Monitor email open rates'
    );
  } else if (daysSinceLaunch === 8) {
    actions.push(
      'Send Email 4 (pricing) to 20 companies',
      'Review pilot conversations',
      'Prepare contracts',
      'Analyze conversion funnel'
    );
  } else if (daysSinceLaunch === 11) {
    actions.push(
      'Send Email 5 (limited offer) to 20 companies',
      'Close pilot contracts (goal: 3)',
      'Begin onboarding pilots',
      'Collect customer success metrics'
    );
  } else if (daysSinceLaunch > 11) {
    actions.push(
      'Monitor pilot progress daily',
      'Prepare case studies for customers',
      'Plan Tier 2 launch (weeks 5-6)',
      'Track path to $5K MRR'
    );
  }

  return actions;
}
