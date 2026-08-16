import { NextRequest, NextResponse } from 'next/server';
import { SuperteamAgentClient } from '@/lib/superteam/agent-client';
import {
  getSuperteamSupabase,
  requireSuperteamAgentCredential,
  superteamErrorStatus,
} from '@/lib/superteam/server';
import { handleApiError } from '@/lib/security/api-error';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId')?.trim();
    const rawTake = Number(searchParams.get('take') ?? 20);
    const type = searchParams.get('type') as 'bounty' | 'project' | 'hackathon' | null;

    if (!agentId) return NextResponse.json({ error: 'agentId required' }, { status: 400 });
    if (!Number.isInteger(rawTake) || rawTake < 1 || rawTake > 100) {
      return NextResponse.json({ error: 'take must be an integer from 1 to 100' }, { status: 400 });
    }
    if (type && !['bounty', 'project', 'hackathon'].includes(type)) {
      return NextResponse.json({ error: 'invalid listing type' }, { status: 400 });
    }

    const supabase = getSuperteamSupabase();
    const { agent, apiKey } = await requireSuperteamAgentCredential(supabase, agentId);
    const client = new SuperteamAgentClient(apiKey, agent.name);
    const listings = await client.getListings({ take: rawTake, type: type ?? undefined });

    let auditPersisted = false;
    if (listings.length > 0) {
      const discoveredAt = new Date().toISOString();
      const rows = listings.map((listing) => ({
        id: `discovery-${agentId}-${listing.id}-${crypto.randomUUID()}`,
        agent_id: agentId,
        listing_id: listing.id,
        listing_title: listing.title,
        listing_type: listing.type,
        reward: listing.reward,
        discovered_at: discoveredAt,
      }));
      const { error } = await supabase.from('agent_discovery_log').insert(rows);
      if (error) {
        console.error('[superteam/discover] audit persistence failed:', error.message);
      } else {
        auditPersisted = true;
      }
    } else {
      auditPersisted = true;
    }

    return NextResponse.json({
      success: true,
      source: 'superteam_api',
      agentId,
      count: listings.length,
      auditPersisted,
      listings: listings.map((listing) => ({
        id: listing.id,
        slug: listing.slug,
        title: listing.title,
        description: listing.description,
        type: listing.type,
        reward: listing.reward,
        rewardToken: listing.rewardToken,
        deadline: listing.deadline,
        skills: listing.skills,
        agentAccess: listing.agentAccess,
      })),
    });
  } catch (error) {
    return handleApiError('superteam/discover', error, { status: superteamErrorStatus(error) });
  }
}
