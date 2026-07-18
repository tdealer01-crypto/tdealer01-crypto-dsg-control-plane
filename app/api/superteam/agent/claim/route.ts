import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { testMemoryStore } from '@/lib/superteam/test-store';

export const dynamic = 'force-dynamic';

interface ClaimRequest {
  claimCode: string;
  humanId: string;
  humanEmail?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ClaimRequest;
    const { claimCode, humanId, humanEmail } = body;

    if (!claimCode || !humanId) {
      return NextResponse.json(
        { error: 'claimCode and humanId required' },
        { status: 400 }
      );
    }

    // Find agent by claim code
    let agent: any = null;
    try {
      const supabase = createClient();
      const { data: dbAgent, error: fetchError } = await supabase
        .from('dsg_agents')
        .select('*')
        .eq('claim_code', claimCode)
        .single();

      if (!fetchError && dbAgent) {
        agent = dbAgent;
      }
    } catch (e) {
      console.warn('Supabase unavailable for agent lookup');
    }

    // Fallback to memory store
    if (!agent) {
      const allAgents = testMemoryStore['agents'] || new Map();
      for (const [_, a] of allAgents) {
        if (a.claimCode === claimCode) {
          agent = {
            id: a.id,
            name: a.name,
            username: a.username,
            claim_code: a.claimCode,
          };
          break;
        }
      }
    }

    if (!agent) {
      return NextResponse.json(
        { error: 'Invalid claim code' },
        { status: 404 }
      );
    }

    // Link human to agent
    try {
      const supabase = createClient();
      await supabase
        .from('dsg_agents')
        .update({
          human_id: humanId,
          human_email: humanEmail,
          claimed_at: new Date().toISOString(),
          status: 'claimed',
        })
        .eq('id', agent.id);
      console.log(`✅ Agent claimed in Supabase: ${agent.id}`);
    } catch (dbError) {
      console.warn(
        `⚠️ Supabase unavailable for claim, using memory store: ${String(dbError).slice(0, 100)}`
      );
    }

    // Get agent submissions
    let submissions: any[] = [];
    try {
      const supabase = createClient();
      const { data: dbSubmissions } = await supabase
        .from('agent_submissions')
        .select('*')
        .eq('agent_id', agent.id);
      if (dbSubmissions) {
        submissions = dbSubmissions;
      }
    } catch (e) {
      console.warn('Supabase unavailable for submissions fetch');
    }

    // Fallback to memory store submissions
    if (submissions.length === 0) {
      submissions = testMemoryStore.getSubmissions(agent.id).map((s) => ({
        id: s.id,
        agent_id: s.agentId,
        listing_id: s.listingId,
        link: s.link,
        other_info: s.otherInfo,
        submitted_at: new Date(s.createdAt).toISOString(),
        status: 'submitted',
      }));
    }

    // Update submissions to link to human
    if (submissions && submissions.length > 0) {
      try {
        const supabase = createClient();
        await supabase
          .from('agent_submissions')
          .update({ human_id: humanId })
          .eq('agent_id', agent.id);
      } catch (e) {
        console.warn('Could not update submissions in DB, using memory only');
      }
    }

    return NextResponse.json({
      success: true,
      message: `Agent "${agent.name}" claimed by ${humanId}`,
      agent: {
        id: agent.id,
        name: agent.name,
        username: agent.username || 'agent',
        submissionCount: submissions?.length || 0,
      },
      submissions: submissions?.map((s) => ({
        id: s.id,
        listingId: s.listing_id || s.link,
        status: s.status || 'submitted',
        submittedAt: s.submitted_at,
      })) || [],
    });
  } catch (error) {
    console.error('Claim error:', error);
    return NextResponse.json(
      {
        error: 'Claim failed',
        details: String(error),
      },
      { status: 500 }
    );
  }
}
