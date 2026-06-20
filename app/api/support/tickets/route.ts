import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logApiError, internalErrorMessage } from '@/lib/security/api-error';
import { applyRateLimit, buildRateLimitHeaders, getRateLimitKey } from '@/lib/security/rate-limit';

export const dynamic = 'force-dynamic';

// POST /api/support/tickets — create a new support ticket
export async function POST(request: Request) {
  const rateLimit = await applyRateLimit({
    key: getRateLimitKey(request, 'ticket-create'),
    limit: 5,
    windowMs: 3600000, // 1 hour
  });
  const headers = buildRateLimitHeaders(rateLimit, 5);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers }
    );
  }

  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers });
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('id, org_id')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (!userProfile?.org_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers });
    }

    const body = await request.json();
    const { title, description, priority = 'normal' } = body;

    // Validation
    const errors: Record<string, string> = {};
    
    if (!title?.trim()) {
      errors.title = 'Title is required';
    } else if (title.trim().length < 5) {
      errors.title = 'Title must be at least 5 characters';
    }

    if (!description?.trim()) {
      errors.description = 'Description is required';
    } else if (description.trim().length < 10) {
      errors.description = 'Description must be at least 10 characters';
    }

    if (!['low', 'normal', 'high', 'urgent'].includes(priority)) {
      errors.priority = 'Invalid priority level';
    }

    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', errors },
        { status: 400, headers }
      );
    }

    // Create ticket
    const { data: ticket, error: insertError } = await (supabase as any)
      .from('repair_tickets')
      .insert({
        org_id: userProfile.org_id,
        customer_id: userProfile.id,
        title: title.trim(),
        description: description.trim(),
        priority,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json(
      { ok: true, ticket, message: 'Ticket created successfully' },
      { status: 201, headers }
    );
  } catch (err) {
    logApiError('api/support/tickets POST', err, {});
    return NextResponse.json(
      { error: internalErrorMessage() },
      { status: 500, headers }
    );
  }
}

// GET /api/support/tickets — list tickets for current user
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('id, org_id')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (!userProfile?.org_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get tickets for the org
    const { data: tickets, error: fetchError } = await (supabase as any)
      .from('repair_tickets')
      .select('*')
      .eq('org_id', userProfile.org_id)
      .or(`customer_id.eq.${userProfile.id},assigned_to.eq.${userProfile.id}`)
      .order('created_at', { ascending: false });

    if (fetchError) throw fetchError;

    return NextResponse.json({ ok: true, tickets });
  } catch (err) {
    logApiError('api/support/tickets GET', err, {});
    return NextResponse.json({ error: internalErrorMessage() }, { status: 500 });
  }
}
