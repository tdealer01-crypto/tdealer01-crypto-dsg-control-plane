import { NextRequest, NextResponse } from 'next/server';
import { SuperteamAgentClient } from '@/lib/superteam/agent-client';
import { createClient } from '@/lib/supabase/server';
import { testMemoryStore } from '@/lib/superteam/test-store';

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

    let apiKey: string | null = null;
    let agentName = 'test-agent';

    // Try to get from Supabase first
    try {
      const supabase = await createClient();
      const { data: agent } = await (supabase
        .from('dsg_agents' as any)
        .select('api_key, name')
        .eq('id', agentId)
        .single() as any);

      if (agent) {
        apiKey = agent.api_key;
        agentName = agent.name;
      }
    } catch (e) {
      console.warn('Supabase unavailable, checking memory store');
    }

    // Fallback to memory store
    if (!apiKey) {
      const memAgent = testMemoryStore.getAgent(agentId);
      if (memAgent) {
        apiKey = memAgent.apiKey;
        agentName = memAgent.name;
      }
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Agent not found', agentId },
        { status: 404 }
      );
    }

    // Create client with stored API key
    const client = new SuperteamAgentClient(apiKey, agentName);

    // Fetch agent-eligible listings from Superteam
    const listings = await client.getListings({
      take,
      type,
    });

    // Try to store discovery log (with fallback)
    try {
      const supabase = await createClient();
      const discoverLog = listings.map((listing) => ({
        id: `discovery-${agentId}-${listing.id}-${Date.now()}`,
        agent_id: agentId,
        listing_id: listing.id,
        listing_title: listing.title,
        listing_type: listing.type,
        reward: listing.reward,
        discovered_at: new Date().toISOString(),
      }));

      await (supabase.from('agent_discovery_log' as any).insert(discoverLog) as any);
      console.log(`✅ Discovery log stored for agent ${agentId}`);
    } catch (e) {
      console.warn('Could not log discovery to DB:', String(e).slice(0, 100));
    }

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
