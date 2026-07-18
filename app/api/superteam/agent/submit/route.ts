import { NextRequest, NextResponse } from 'next/server';
import { SuperteamAgentClient, Submission } from '@/lib/superteam/agent-client';
import { createClient } from '@/lib/supabase/server';
import { testMemoryStore } from '@/lib/superteam/test-store';

export const dynamic = 'force-dynamic';

interface SubmitRequest {
  agentId: string;
  listingId: string;
  link: string;
  otherInfo: string;
  telegram?: string;
  ask?: number;
  eligibilityAnswers?: Array<{ question: string; answer: string }>;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SubmitRequest;
    const {
      agentId,
      listingId,
      link,
      otherInfo,
      telegram,
      ask,
      eligibilityAnswers,
    } = body;

    if (!agentId || !listingId || !link || !otherInfo) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get agent from Supabase or memory store
    let agent: any = null;
    try {
      const supabase = await createClient();
      const { data: dbAgent } = await (supabase
        .from('dsg_agents' as any)
        .select('api_key, name, claim_code')
        .eq('id', agentId)
        .single() as any);
      if (dbAgent) {
        agent = dbAgent;
      }
    } catch (e) {
      console.warn('Supabase unavailable for agent lookup');
    }

    // Fallback to memory store
    if (!agent) {
      const memAgent = testMemoryStore.getAgent(agentId);
      if (memAgent) {
        agent = {
          api_key: memAgent.apiKey,
          name: memAgent.name,
          claim_code: memAgent.claimCode,
        };
      }
    }

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    // Create Superteam client
    const client = new SuperteamAgentClient(agent.api_key, agent.name);

    // Prepare submission
    const submission: Submission = {
      listingId,
      link,
      otherInfo,
      telegram: telegram || undefined,
      ask: ask || null,
      eligibilityAnswers:
        eligibilityAnswers && eligibilityAnswers.length > 0
          ? eligibilityAnswers
          : undefined,
    };

    // Submit to Superteam
    const result = await client.submitListing(submission);

    // Log submission
    const submissionId = `submit-${agentId}-${listingId}-${Date.now()}`;

    // Try to store in Supabase (with fallback)
    try {
      const supabase = await createClient();
      await (supabase.from('agent_submissions' as any).insert({
        id: submissionId,
        agent_id: agentId,
        listing_id: listingId,
        listing_title: listingId,
        link,
        other_info: otherInfo,
        status: 'submitted',
        superteam_response: result,
        telegram,
        ask,
        submitted_at: new Date().toISOString(),
      }) as any);
      console.log(`✅ Submission logged to Supabase: ${submissionId}`);
    } catch (dbError) {
      console.warn(
        `⚠️ Supabase unavailable for submission, using memory store: ${String(dbError).slice(0, 100)}`
      );
      testMemoryStore.addSubmission({
        id: submissionId,
        agentId,
        listingId,
        link,
        otherInfo,
        createdAt: Date.now(),
      });
    }

    return NextResponse.json({
      success: true,
      submissionId,
      claimCode: agent.claim_code,
      message:
        'Submitted to Superteam. Human operator can claim with claim code.',
      result,
    });
  } catch (error) {
    console.error('Submission error:', error);
    return NextResponse.json(
      {
        error: 'Submission failed',
        details: String(error),
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');

    if (!agentId) {
      return NextResponse.json(
        { error: 'agentId required' },
        { status: 400 }
      );
    }

    let submissions = null;

    // Try Supabase first
    try {
      const supabase = await createClient();
      const { data: dbSubmissions, error } = await (supabase
        .from('agent_submissions' as any)
        .select('*')
        .eq('agent_id', agentId)
        .order('submitted_at', { ascending: false }) as any);

      if (!error && dbSubmissions) {
        submissions = dbSubmissions;
      }
    } catch (e) {
      console.warn('Supabase unavailable for submissions fetch');
    }

    // Fallback to memory store
    if (!submissions) {
      submissions = testMemoryStore.getSubmissions(agentId).map((s) => ({
        id: s.id,
        agent_id: s.agentId,
        listing_id: s.listingId,
        link: s.link,
        other_info: s.otherInfo,
        submitted_at: new Date(s.createdAt).toISOString(),
      }));
    }

    return NextResponse.json({
      success: true,
      submissions,
    });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch submissions',
        details: String(error),
      },
      { status: 500 }
    );
  }
}
