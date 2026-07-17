/**
 * Lead Discovery API
 * GET /api/leads/discover
 * Discovers and scores potential customers
 */

import { NextResponse } from 'next/server';
import { runLeadDiscovery } from '../../../../lib/leads/discovery';
import { scoreAllLeads, getTopLeads } from '../../../../lib/leads/scoring';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'discover';
    const limit = parseInt(searchParams.get('limit') || '10');
    const minScore = parseInt(searchParams.get('minScore') || '60');

    if (action === 'discover') {
      // Run full discovery and scoring
      const { discovered, saved } = await runLeadDiscovery();

      // Score all leads
      const scored = await scoreAllLeads();

      return NextResponse.json(
        {
          ok: true,
          discovered,
          saved,
          scored,
          message: `Discovered ${discovered} leads, saved ${saved}, scored ${scored}`,
        },
        { status: 200 }
      );
    }

    if (action === 'score') {
      // Re-score all leads
      const scored = await scoreAllLeads();
      return NextResponse.json(
        {
          ok: true,
          scored,
          message: `Scored ${scored} leads`,
        },
        { status: 200 }
      );
    }

    if (action === 'top') {
      // Get top leads
      const leads = await getTopLeads(limit, minScore);
      return NextResponse.json(
        {
          ok: true,
          leads,
          count: leads.length,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { error: 'Invalid action parameter' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Lead discovery error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Discovery failed',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/leads/discover
 * Manual trigger for discovery
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { action?: string };
    const action = body.action || 'discover';

    if (action === 'discover') {
      const { discovered, saved } = await runLeadDiscovery();
      const scored = await scoreAllLeads();

      return NextResponse.json(
        {
          ok: true,
          discovered,
          saved,
          scored,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Lead discovery POST error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Discovery failed',
      },
      { status: 500 }
    );
  }
}
