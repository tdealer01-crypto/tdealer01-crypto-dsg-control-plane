import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { handleApiError } from '../../../../lib/security/api-error';
import { getRateLimitKey, applyRateLimit, buildRateLimitHeaders } from '@/lib/security/rate-limit';

export const dynamic = 'force-dynamic';

// GET /api/admin/sequences - List all sequences
export async function GET(request: Request) {
  try {
    // Rate limit: 15 requests per minute per IP (for sequences management)
    const rateLimitKey = getRateLimitKey(request, 'admin:sequences');
    const rateLimitResult = await applyRateLimit({
      key: rateLimitKey,
      limit: 15,
      windowMs: 60 * 1000, // 1 minute
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'rate_limited' },
        {
          status: 429,
          headers: buildRateLimitHeaders(rateLimitResult, 15),
        },
      );
    }

    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();

    if (!auth?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Check founder access
    const founderEmail = process.env.FOUNDER_EMAIL;
    if (founderEmail && auth.user.email !== founderEmail) {
      return NextResponse.json({ error: 'Founder access required' }, { status: 403 });
    }

    // Get sequences with steps and templates
    const typedSupabase = supabase as any;
    const { data: sequences } = await typedSupabase
      .from('email_sequences')
      .select(`
        *,
        email_sequence_steps(
          id,
          step_order,
          delay_days,
          email_templates(id, name, subject)
        )
      `)
      .order('created_at', { ascending: false });

    return NextResponse.json({ sequences });
  } catch (err) {
    return handleApiError(err, 'Failed to fetch sequences');
  }
}

// POST /api/admin/sequences - Create a new sequence
export async function POST(request: Request) {
  try {
    // Rate limit: 5 sequence creation requests per minute per IP
    const rateLimitKey = getRateLimitKey(request, 'admin:sequences:create');
    const rateLimitResult = await applyRateLimit({
      key: rateLimitKey,
      limit: 5,
      windowMs: 60 * 1000, // 1 minute
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'rate_limited' },
        {
          status: 429,
          headers: buildRateLimitHeaders(rateLimitResult, 5),
        },
      );
    }

    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();

    if (!auth?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const founderEmail = process.env.FOUNDER_EMAIL;
    if (founderEmail && auth.user.email !== founderEmail) {
      return NextResponse.json({ error: 'Founder access required' }, { status: 403 });
    }

    const { name, description, trigger_event, min_icp_score, target_platforms } = await request.json();

    if (!name || !trigger_event) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const typedSupabase = supabase as any;
    const { data: sequence, error } = await typedSupabase
      .from('email_sequences')
      .insert({
        name,
        description,
        trigger_event,
        min_icp_score: min_icp_score || 0,
        target_platforms: target_platforms || [],
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ sequence }, { status: 201 });
  } catch (err) {
    return handleApiError(err, 'Failed to create sequence');
  }
}
