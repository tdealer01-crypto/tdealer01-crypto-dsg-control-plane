import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    const supabase = createClient();

    // Find agent by claim code
    const { data: agent, error: fetchError } = await supabase
      .from('dsg_agents')
      .select('*')
      .eq('claim_code', claimCode)
      .single();

    if (fetchError || !agent) {
      return NextResponse.json(
        { error: 'Invalid claim code' },
        { status: 404 }
      );
    }

    // Link human to agent
    await supabase
      .from('dsg_agents')
      .update({
        human_id: humanId,
        human_email: humanEmail,
        claimed_at: new Date().toISOString(),
        status: 'claimed',
      })
      .eq('id', agent.id);

    // Get agent submissions
    const { data: submissions } = await supabase
      .from('agent_submissions')
      .select('*')
      .eq('agent_id', agent.id);

    // Update submissions to link to human
    if (submissions && submissions.length > 0) {
      await supabase
        .from('agent_submissions')
        .update({ human_id: humanId })
        .eq('agent_id', agent.id);
    }

    return NextResponse.json({
      success: true,
      message: `Agent "${agent.name}" claimed by ${humanId}`,
      agent: {
        id: agent.id,
        name: agent.name,
        username: agent.username,
        submissionCount: submissions?.length || 0,
      },
      submissions: submissions?.map((s) => ({
        id: s.id,
        listingId: s.listing_id,
        status: s.status,
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
