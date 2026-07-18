import { NextRequest, NextResponse } from 'next/server';
import { SuperteamAgentClient, Submission } from '@/lib/superteam/agent-client';
import { createClient } from '@/lib/supabase/server';

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

    // Get agent
    const supabase = createClient();
    const { data: agent, error: fetchError } = await supabase
      .from('dsg_agents')
      .select('api_key, name, claim_code')
      .eq('id', agentId)
      .single();

    if (fetchError || !agent) {
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
    await supabase.from('agent_submissions').insert({
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
    });

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

    const supabase = createClient();
    const { data: submissions, error } = await supabase
      .from('agent_submissions')
      .select('*')
      .eq('agent_id', agentId)
      .order('submitted_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch submissions', details: error },
        { status: 500 }
      );
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
