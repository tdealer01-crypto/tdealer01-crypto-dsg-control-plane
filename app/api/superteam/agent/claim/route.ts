import { NextRequest, NextResponse } from 'next/server';
import { getSuperteamSupabase, superteamErrorStatus } from '@/lib/superteam/server';

export const dynamic = 'force-dynamic';

interface ClaimRequest {
  claimCode: string;
  humanId: string;
  humanEmail?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ClaimRequest;
    const claimCode = body.claimCode?.trim();
    const humanId = body.humanId?.trim();
    const humanEmail = body.humanEmail?.trim() || null;

    if (!claimCode || !humanId) {
      return NextResponse.json({ error: 'claimCode and humanId required' }, { status: 400 });
    }

    const supabase = getSuperteamSupabase();
    const { data: agent, error: lookupError } = await supabase
      .from('dsg_agents')
      .select('id,name,username,claim_code,status')
      .eq('claim_code', claimCode)
      .maybeSingle();

    if (lookupError) throw new Error(`SUPERTEAM_AGENT_LOOKUP_FAILED:${lookupError.message}`);
    if (!agent) return NextResponse.json({ error: 'Invalid claim code' }, { status: 404 });

    const claimedAt = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('dsg_agents')
      .update({
        human_id: humanId,
        human_email: humanEmail,
        claimed_at: claimedAt,
        status: 'claimed',
      })
      .eq('id', agent.id);

    if (updateError) throw new Error(`SUPERTEAM_CLAIM_PERSIST_FAILED:${updateError.message}`);

    const { data: submissions, error: submissionError } = await supabase
      .from('agent_submissions')
      .select('id,listing_id,status,submitted_at')
      .eq('agent_id', agent.id)
      .order('submitted_at', { ascending: false });

    if (submissionError) throw new Error(`SUPERTEAM_SUBMISSION_LOOKUP_FAILED:${submissionError.message}`);

    if ((submissions?.length ?? 0) > 0) {
      const { error: linkError } = await supabase
        .from('agent_submissions')
        .update({ human_id: humanId })
        .eq('agent_id', agent.id);
      if (linkError) throw new Error(`SUPERTEAM_SUBMISSION_LINK_FAILED:${linkError.message}`);
    }

    return NextResponse.json({
      success: true,
      persisted: true,
      agent: {
        id: agent.id,
        name: agent.name,
        username: agent.username,
        status: 'claimed',
        claimedAt,
        submissionCount: submissions?.length ?? 0,
      },
      submissions: submissions ?? [],
    });
  } catch (error) {
    console.error('[superteam/claim] failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message.split(':')[0] : 'SUPERTEAM_CLAIM_FAILED' },
      { status: superteamErrorStatus(error) },
    );
  }
}
