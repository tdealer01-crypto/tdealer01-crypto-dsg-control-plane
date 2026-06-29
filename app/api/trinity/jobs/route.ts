import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Placeholder: In production, fetch from:
    // 1. GitHub Issues with 'bounty' label
    // 2. Solana bounty programs
    // 3. Custom job registry

    const discoveredJobs = [
      {
        id: 'job-001',
        title: 'Audit UniswapV4 Hooks Implementation',
        reward: 5.0,
        category: 'smart-contract-audit',
        source: 'Github Issues',
        deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'job-002',
        title: 'Build React Dashboard for Analytics',
        reward: 3.5,
        category: 'frontend-dev',
        source: 'Internal Projects',
        deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'job-003',
        title: 'Implement WebSocket Real-time Updates',
        reward: 4.0,
        category: 'backend-api',
        source: 'Solana Bounties',
        deadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'job-004',
        title: 'Write Security Best Practices Docs',
        reward: 2.0,
        category: 'documentation',
        source: 'Github Issues',
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'job-005',
        title: 'Create E2E Test Suite for Auth Flow',
        reward: 3.0,
        category: 'testing',
        source: 'Internal Projects',
        deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];

    return NextResponse.json(
      {
        ok: true,
        jobs: discoveredJobs,
        count: discoveredJobs.length,
        lastUpdated: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Failed to discover jobs:', error);
    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to discover jobs',
      },
      { status: 500 }
    );
  }
}
