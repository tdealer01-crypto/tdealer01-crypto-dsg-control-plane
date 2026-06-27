/**
 * POST /api/dsg/hermes/review-gate
 *
 * Operator review gate decision endpoint.
 * Processes human approval/rejection/delegation of high-risk agent actions.
 *
 * Request body:
 *   - decisionId: string (unique identifier for the decision being reviewed)
 *   - decision: 'APPROVED' | 'BLOCKED' | 'DELEGATED' (review outcome)
 *   - reason?: string (optional explanation of the decision)
 *
 * Response:
 *   - decision: string (the recorded decision)
 *   - reason?: string (explanation if provided)
 *   - timestamp: string (ISO timestamp of the decision)
 */

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { handleApiError } from '@/lib/security/api-error';

export const dynamic = 'force-dynamic';

type ReviewGateRequest = {
  decisionId: string;
  decision: 'APPROVED' | 'BLOCKED' | 'DELEGATED';
  reason?: string;
  delegateTo?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ReviewGateRequest;

    // Validate required fields
    if (!body.decisionId || typeof body.decisionId !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid decisionId' }, { status: 400 });
    }

    if (!body.decision || !['APPROVED', 'BLOCKED', 'DELEGATED'].includes(body.decision)) {
      return NextResponse.json({ error: 'Invalid decision. Must be APPROVED, BLOCKED, or DELEGATED' }, { status: 400 });
    }

    // Initialize Supabase client
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          },
        },
      },
    );

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Insert review gate record
    const { data, error } = await supabase.from('agi_review_gates').insert([
      {
        decision_id: body.decisionId,
        reviewer_id: user.id,
        status: body.decision,
        reason: body.reason || null,
        metadata: {
          delegateTo: body.delegateTo || null,
          userAgent: request.headers.get('user-agent'),
        },
        resolved_at: new Date().toISOString(),
      },
    ]);

    if (error) {
      console.error('Review gate insert error:', error);
      return NextResponse.json({ error: 'Failed to record review decision' }, { status: 500 });
    }

    const timestamp = new Date().toISOString();

    return NextResponse.json({
      decision: body.decision,
      reason: body.reason,
      timestamp,
      decisionId: body.decisionId,
    });
  } catch (error) {
    return handleApiError('/api/dsg/hermes/review-gate', error);
  }
}
