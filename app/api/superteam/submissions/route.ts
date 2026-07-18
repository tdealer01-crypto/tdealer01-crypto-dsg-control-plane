import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { superteamClient } from '@/lib/superteam/client';

export const dynamic = 'force-dynamic';

interface SubmissionRequest {
  bountyId: string;
  content: string;
  userId: string;
}

interface TrinityReviewResponse {
  decision: 'APPROVE' | 'REVIEW' | 'BLOCK';
  score: number;
  reasoning: string;
  agent: string;
}

async function triggerTrinityReview(
  submissionId: string,
  bountyId: string,
  content: string
): Promise<Record<string, TrinityReviewResponse>> {
  const agents = ['Mind', 'Hand', 'Eye', 'Nerve', 'Spine'];
  const reviews: Record<string, TrinityReviewResponse> = {};

  try {
    // Call Trinity chat API with multi-agent review prompt
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/dashboard/trinity/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Review this bounty submission:
ID: ${submissionId}
Bounty: ${bountyId}
Content: ${content}

Evaluate: Quality, completeness, compliance with bounty requirements.
Response format: JSON with decision (APPROVE/REVIEW/BLOCK), score (0-100), reasoning.`,
        agent: 'All',
        context: {
          submissionId,
          bountyId,
          reviewType: 'bounty',
        },
      }),
    });

    if (response.ok) {
      const data = await response.json();
      // Parse Trinity responses into reviews
      for (const agent of agents) {
        reviews[agent] = {
          decision: data.decision || 'REVIEW',
          score: data.score || 50,
          reasoning: data.reasoning || data.response,
          agent,
        };
      }
    }
  } catch (error) {
    console.error('Trinity review error:', error);
  }

  return reviews;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SubmissionRequest;
    const { bountyId, content, userId } = body;

    if (!bountyId || !content || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = createClient();
    const submissionId = `sub-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    // Create submission
    const { data: submission, error: insertError } = await supabase
      .from('bounty_submissions')
      .insert({
        id: submissionId,
        bounty_id: bountyId,
        user_id: userId,
        content,
        submission_status: 'pending',
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: 'Failed to create submission', details: insertError },
        { status: 500 }
      );
    }

    // Trigger Trinity multi-agent review (async)
    const trinityReviews = await triggerTrinityReview(
      submissionId,
      bountyId,
      content
    );

    // Store Trinity reviews
    if (Object.keys(trinityReviews).length > 0) {
      const reviews = Object.entries(trinityReviews).map(([agent, review]) => ({
        id: `review-${submissionId}-${agent}-${Date.now()}`,
        submission_id: submissionId,
        agent_name: agent,
        review_result: review,
      }));

      await supabase.from('trinity_bounty_reviews').insert(reviews);

      // Determine gate status based on reviews
      const approveCount = Object.values(trinityReviews).filter(
        (r) => r.decision === 'APPROVE'
      ).length;

      let gateStatus = 'pending';
      if (approveCount >= 4) {
        gateStatus = 'approved';
      } else if (approveCount >= 2) {
        gateStatus = 'review';
      } else {
        gateStatus = 'blocked';
      }

      // Update submission with gate status
      await supabase
        .from('bounty_submissions')
        .update({
          dsg_gate_status: gateStatus,
          trinity_agent_review: trinityReviews,
          updated_at: new Date().toISOString(),
        })
        .eq('id', submissionId);
    }

    return NextResponse.json({
      success: true,
      submissionId,
      submission: {
        ...submission,
        trinityReviews,
      },
    });
  } catch (error) {
    console.error('Error creating submission:', error);
    return NextResponse.json(
      { error: 'Failed to create submission', details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bountyId = searchParams.get('bountyId');
    const userId = searchParams.get('userId');

    const supabase = createClient();
    let query = supabase.from('bounty_submissions').select('*');

    if (bountyId) query = query.eq('bounty_id', bountyId);
    if (userId) query = query.eq('user_id', userId);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch submissions', details: error },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, submissions: data });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch submissions', details: String(error) },
      { status: 500 }
    );
  }
}
