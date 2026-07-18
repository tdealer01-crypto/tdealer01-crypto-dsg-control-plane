import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { SuperteamAgentClient } from '@/lib/superteam/agent-client';
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

    // Prefer real SUPERTEAM_API_KEY if available
    if (process.env.SUPERTEAM_API_KEY) {
      apiKey = process.env.SUPERTEAM_API_KEY;
      agentName = 'superteam-agent-live';
      console.log('Using real Superteam API key from environment');
    } else {
      // Try to get from Supabase
      try {
        const supabase = createServiceClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { data: agent, error } = await supabase
          .from('dsg_agents')
          .select('api_key, name')
          .eq('id', agentId)
          .single();

        if (error) {
          console.warn(`Agent lookup error: ${error.message}`);
        } else if (agent) {
          apiKey = agent.api_key;
          agentName = agent.name;
        }
      } catch (e) {
        console.warn(`Supabase unavailable, checking memory store: ${String(e).slice(0, 100)}`);
      }
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
      const supabase = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const discoverLog = listings.map((listing) => ({
        id: `discovery-${agentId}-${listing.id}-${Date.now()}`,
        agent_id: agentId,
        listing_id: listing.id,
        listing_title: listing.title,
        listing_type: listing.type,
        reward: listing.reward,
        discovered_at: new Date().toISOString(),
      }));

      const { error } = await supabase.from('agent_discovery_log').insert(discoverLog);

      if (error) {
        console.warn(`Discovery log insert error: ${error.message}`);
      } else {
        console.log(`✅ Discovery log stored for agent ${agentId}`);
      }
    } catch (e) {
      console.warn(`Could not log discovery to DB: ${String(e).slice(0, 100)}`);
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
