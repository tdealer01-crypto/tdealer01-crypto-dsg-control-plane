import { NextResponse } from 'next/server';

const buildActivity = [
  { day: 'Mon', builds: 18 },
  { day: 'Tue', builds: 27 },
  { day: 'Wed', builds: 34 },
  { day: 'Thu', builds: 22 },
  { day: 'Fri', builds: 41 },
  { day: 'Sat', builds: 15 },
  { day: 'Sun', builds: 9 },
];

const recentBuilds = [
  { id: 'bld_001', appName: 'Inventory Tracker',  status: 'COMPLETE',    duration: '1m 42s', tokens: 38400,  date: '2026-05-15 14:32' },
  { id: 'bld_002', appName: 'Customer Portal',    status: 'IN_PROGRESS', duration: null,     tokens: 12100,  date: '2026-05-15 14:29' },
  { id: 'bld_003', appName: 'Expense Reporter',   status: 'COMPLETE',    duration: '2m 08s', tokens: 51700,  date: '2026-05-15 14:11' },
  { id: 'bld_004', appName: 'HR Onboarding App',  status: 'FAILED',      duration: '0m 54s', tokens: 9300,   date: '2026-05-15 13:55' },
  { id: 'bld_005', appName: 'Pricing Calculator', status: 'COMPLETE',    duration: '0m 38s', tokens: 22500,  date: '2026-05-15 13:40' },
  { id: 'bld_006', appName: 'Booking System',     status: 'QUEUED',      duration: null,     tokens: 0,      date: '2026-05-15 13:38' },
  { id: 'bld_007', appName: 'Feedback Dashboard', status: 'COMPLETE',    duration: '1m 17s', tokens: 33200,  date: '2026-05-15 13:20' },
  { id: 'bld_008', appName: 'Audit Log Viewer',   status: 'COMPLETE',    duration: '0m 55s', tokens: 18800,  date: '2026-05-15 12:58' },
  { id: 'bld_009', appName: 'Team Task Manager',  status: 'COMPLETE',    duration: '2m 34s', tokens: 67100,  date: '2026-05-15 12:30' },
  { id: 'bld_010', appName: 'API Key Manager',    status: 'FAILED',      duration: '1m 02s', tokens: 14900,  date: '2026-05-15 12:14' },
];

const providerUsage = [
  { name: 'Gemini',    pct: 48 },
  { name: 'OpenAI',   pct: 34 },
  { name: 'Anthropic', pct: 18 },
];

const stats = {
  '7d':  { totalApps: 166, appsTrend: 12.4,  tokensUsed: 4820000,  costEstimate: '$9.64',  activeBuilds: 7,  successRate: 94.2, successTrend: 1.8  },
  '30d': { totalApps: 532, appsTrend: 8.1,   tokensUsed: 15300000, costEstimate: '$30.60', activeBuilds: 12, successRate: 92.7, successTrend: -0.4 },
  '90d': { totalApps: 1630, appsTrend: 21.3, tokensUsed: 48900000, costEstimate: '$97.80', activeBuilds: 12, successRate: 91.5, successTrend: 2.1  },
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const range = (searchParams.get('range') ?? '7d') as keyof typeof stats;
  const validRange = range in stats ? range : '7d';

  return NextResponse.json({
    ok: true,
    data: {
      stats: stats[validRange],
      buildActivity,
      recentBuilds,
      providerUsage,
      updatedEvery: '5 minutes',
    },
  });
}
