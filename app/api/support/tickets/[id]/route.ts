import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logApiError, internalErrorMessage } from '@/lib/security/api-error';

export const dynamic = 'force-dynamic';

interface Params {
  id: string;
}

// GET /api/support/tickets/[id] — get ticket details
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

    // Get ticket with org check
    const { data: ticket, error: fetchError } = await (supabase as any)
      .from('repair_tickets')
      .select('*')
      .eq('id', id)
      .eq('org_id', userProfile.org_id)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, ticket });
  } catch (err) {
    logApiError('api/support/tickets/[id] GET', err, {});
    return NextResponse.json({ error: internalErrorMessage() }, { status: 500 });
  }
}

// PATCH /api/support/tickets/[id] — update ticket status
export async function PATCH(request: Request, { params }: { params: Promise<Params> }) {
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

    const body = await request.json();
    const { status } = body;

    if (!['pending', 'in_progress', 'resolved', 'closed'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    // Update ticket
    const { data: ticket, error: updateError } = await (supabase as any)
      .from('repair_tickets')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('org_id', userProfile.org_id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, ticket });
  } catch (err) {
    logApiError('api/support/tickets/[id] PATCH', err, {});
    return NextResponse.json({ error: internalErrorMessage() }, { status: 500 });
  }
}
