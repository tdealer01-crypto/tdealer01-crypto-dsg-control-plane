import { NextRequest, NextResponse } from 'next/server';
import { SuperteamAgentClient } from '@/lib/superteam/agent-client';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');
    const take = parseInt(searchParams.get('take') || '20');
    const type = searchParams.get('type') as
      | 'bounty'
      | 'project'
      | 'hackathon'
      | undefined;

    if (!agentId) {
      return NextResponse.json(
        { error: 'agentId required' },
        { status: 400 }
      );
    }

    // Get agent API key from DB
    const supabase = createClient();
    const { data: agent, error: fetchError } = await supabase
      .from('dsg_agents')
      .select('api_key, name')
      .eq('id', agentId)
      .single();

    if (fetchError || !agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    // Create client with stored API key
    const client = new SuperteamAgentClient(agent.api_key, agent.name);

    // Fetch agent-eligible listings
    const listings = await client.getListings({
      take,
      type,
    });

    // Store discovered listings
    const discoverLog = listings.map((listing) => ({
      id: `discovery-${agentId}-${listing.id}-${Date.now()}`,
      agent_id: agentId,
      listing_id: listing.id,
      listing_title: listing.title,
      listing_type: listing.type,
      reward: listing.reward,
      discovered_at: new Date().toISOString(),
    }));

    await supabase.from('agent_discovery_log').insert(discoverLog);

    return NextResponse.json({
      success: true,
      count: listings.length,
      listings: listings.map((l) => ({
        id: l.id,
        slug: l.slug,
        title: l.title,
        description: l.description,
        type: l.type,
        reward: l.reward,
        rewardToken: l.rewardToken,
        deadline: l.deadline,
        skills: l.skills,
        agentAccess: l.agentAccess,
      })),
    });
  } catch (error) {
    console.error('Discovery error:', error);
    return NextResponse.json(
      {
        error: 'Failed to discover listings',
        details: String(error),
      },
      { status: 500 }
    );
  }
}
