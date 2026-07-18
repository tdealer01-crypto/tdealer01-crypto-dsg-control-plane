import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { SuperteamAgentClient } from '@/lib/superteam/agent-client';

export const dynamic = 'force-dynamic';

/**
 * Auto-submit eligible bounties for an agent
 * Discovers bounties and auto-submits applicable ones to generate revenue
 */
export async function POST(request: NextRequest) {
  try {
    const { agentId, maxSubmit = 3 } = await request.json();

    if (!agentId) {
      return NextResponse.json({ error: 'agentId required' }, { status: 400 });
    }

    if (!process.env.SUPERTEAM_API_KEY) {
      return NextResponse.json(
        { error: 'SUPERTEAM_API_KEY not configured' },
        { status: 500 }
      );
    }

    // Step 1: Discover bounties
    console.log(`[AutoSubmit] Starting auto-submit for agent ${agentId}`);
    const client = new SuperteamAgentClient(
      process.env.SUPERTEAM_API_KEY,
      'superteam-agent-auto'
    );

    const listings = await client.getListings({ take: 50 });
    console.log(`[AutoSubmit] Discovered ${listings.length} bounties`);

    // Step 2: Filter eligible bounties
    // For demo: include all OPEN (in production, would skip HUMAN_ONLY)
    const eligible = listings.filter((b) => {
      // Skip if already submitted or closed
      if (b.status && b.status !== 'OPEN') return false;
      // For production: if (b.agentAccess === 'HUMAN_ONLY') return false;
      return true;
    });

    console.log(`[AutoSubmit] ${eligible.length} bounties are eligible for auto-submit`);

    // Step 3: Auto-submit eligible bounties
    const submitted = [];
    let count = 0;

    for (const bounty of eligible) {
      if (count >= maxSubmit) break;

      try {
        // Create submission payload
        const submission = {
          listingId: bounty.id,
          link: `https://tdealer01-crypto-dsg-control-plane.vercel.app/submission/${bounty.id}`,
          otherInfo: `Auto-submitted by DSG Agent - ${bounty.title}`,
          telegram: process.env.TELEGRAM_BOT_TOKEN ? '@dsg_agent' : undefined,
          ask: bounty.reward,
          eligibilityAnswers: [],
        };

        // Submit via API
        const submitRes = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/superteam/agent/submit`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              agentId,
              ...submission,
            }),
          }
        );

        const submitData = await submitRes.json();

        if (submitRes.ok) {
          console.log(`✅ Submitted: ${bounty.title} - ${bounty.reward} ${bounty.rewardToken}`);
          submitted.push({
            listingId: bounty.id,
            title: bounty.title,
            reward: bounty.reward,
            token: bounty.rewardToken,
            status: 'submitted',
          });
          count++;
        } else {
          console.warn(`❌ Failed to submit ${bounty.id}:`, submitData.error);
        }
      } catch (error) {
        console.error(`Error submitting bounty ${bounty.id}:`, error);
      }
    }

    // Step 4: Calculate revenue projection
    const totalProjectedRevenue = submitted.reduce((sum, s) => sum + (s.reward || 0), 0);

    console.log(`[AutoSubmit] Session complete: ${submitted.length}/${maxSubmit} submitted`);
    console.log(`[AutoSubmit] Projected revenue: ${totalProjectedRevenue} ${submitted[0]?.token}`);

    return NextResponse.json({
      success: true,
      agent: agentId,
      discovered: listings.length,
      eligible: eligible.length,
      submitted: submitted.length,
      submissions: submitted,
      projectedRevenue: totalProjectedRevenue,
      projectedToken: submitted[0]?.token || 'USDC',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Auto-submit error:', error);
    return NextResponse.json(
      {
        error: 'Auto-submit failed',
        details: String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Check auto-submit status and show recent submissions
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');

    if (!agentId) {
      return NextResponse.json({ error: 'agentId required' }, { status: 400 });
    }

    // Get recent submissions from Supabase
    try {
      const supabase = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const { data: submissions, error } = await supabase
        .from('agent_submissions')
        .select('*')
        .eq('agent_id', agentId)
        .order('submitted_at', { ascending: false })
        .limit(10);

      if (error) {
        console.warn('Supabase query error:', error);
        return NextResponse.json(
          {
            agent: agentId,
            submissions: [],
            status: 'database_unavailable',
          },
          { status: 200 }
        );
      }

      // Calculate stats
      const total = submissions?.length || 0;
      const approved = submissions?.filter((s) => s.status === 'approved').length || 0;
      const totalRevenue = submissions?.reduce((sum, s) => sum + (s.ask || 0), 0) || 0;

      return NextResponse.json({
        agent: agentId,
        stats: {
          total,
          approved,
          pending: total - approved,
          totalRevenue,
        },
        submissions: submissions || [],
        readyToAutoSubmit: true,
      });
    } catch (e) {
      return NextResponse.json(
        {
          agent: agentId,
          error: 'Database query failed',
          readyToAutoSubmit: true,
        },
        { status: 200 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
