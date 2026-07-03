import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logApiError, internalErrorMessage } from '@/lib/security/api-error';
import { applyRateLimit, buildRateLimitHeaders, getRateLimitKey } from '@/lib/security/rate-limit';

export const dynamic = 'force-dynamic';

interface Params {
  id: string;
}

// GET /api/support/tickets/[id]/messages — get ticket messages
export async function GET(request: Request, { params }: { params: Promise<Params> }) {
  const { id } = await params;

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

    // Verify ticket belongs to user's org
    const { data: ticket } = await (supabase as any)
      .from('repair_tickets')
      .select('org_id')
      .eq('id', id)
      .single();

    if (!ticket || ticket.org_id !== userProfile.org_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get messages
    const { data: messages, error: fetchError } = await (supabase as any)
      .from('ticket_messages')
      .select(`
        id,
        ticket_id,
        sender_id,
        message,
        created_at,
        users!sender_id (email)
      `)
      .eq('ticket_id', id)
      .eq('is_internal_note', false)
      .order('created_at', { ascending: true });

    if (fetchError) throw fetchError;

    // Map sender info
    const messagesWithNames = (messages || []).map((msg: any) => ({
      ...msg,
      sender_name: msg.users?.email || 'Support',
    }));

    return NextResponse.json({ ok: true, messages: messagesWithNames });
  } catch (err) {
    logApiError('api/support/tickets/[id]/messages GET', err, {});
    return NextResponse.json({ error: internalErrorMessage() }, { status: 500 });
  }
}

// POST /api/support/tickets/[id]/messages — post a message
export async function POST(request: Request, { params }: { params: Promise<Params> }) {
  const { id } = await params;

  const rateLimit = await applyRateLimit({
    key: getRateLimitKey(request, `ticket-message-${id}`),
    limit: 20,
    windowMs: 3600000, // 1 hour
  });
  const headers = buildRateLimitHeaders(rateLimit, 20);

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

    // Verify ticket and org access
    const { data: ticket } = await (supabase as any)
      .from('repair_tickets')
      .select('org_id, status')
      .eq('id', id)
      .single();

    if (!ticket || ticket.org_id !== userProfile.org_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers });
    }

    if (ticket.status === 'closed') {
      return NextResponse.json(
        { error: 'Cannot post to closed tickets' },
        { status: 400, headers }
      );
    }

    const body = await request.json();
    const { message } = body;

    if (!message?.trim()) {
      return NextResponse.json(
        { error: 'Message cannot be empty' },
        { status: 400, headers }
      );
    }

    if (message.trim().length > 5000) {
      return NextResponse.json(
        { error: 'Message too long' },
        { status: 400, headers }
      );
    }

    // Create message
    const { data: newMessage, error: insertError } = await (supabase as any)
      .from('ticket_messages')
      .insert({
        ticket_id: id,
        sender_id: userProfile.id,
        message: message.trim(),
        is_internal_note: false,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json(
      { ok: true, message: newMessage },
      { status: 201, headers }
    );
  } catch (err) {
    logApiError('api/support/tickets/[id]/messages POST', err, {});
    return NextResponse.json(
      { error: internalErrorMessage() },
      { status: 500, headers }
    );
  }
}
