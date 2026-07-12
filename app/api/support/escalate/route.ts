import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { handleApiError } from '@/lib/security/api-error';

export const dynamic = 'force-dynamic';

interface EscalationRequest {
  ticket_id: string;
  escalation_team: 'engineering' | 'product' | 'security' | 'leadership' | 'billing';
  reason: string;
}

// Team escalation routing
const TEAM_ROUTING = {
  engineering: {
    name: 'Engineering Team',
    channels: ['#support-engineering', 'engineering-escalations@company.com'],
    priority_boost: 1, // Increase priority by 1 level
  },
  product: {
    name: 'Product Team',
    channels: ['#support-product', 'product@company.com'],
    priority_boost: 0,
  },
  security: {
    name: 'Security Team',
    channels: ['#support-security-critical', 'security@company.com'],
    priority_boost: 2, // Critical priority
  },
  leadership: {
    name: 'Leadership',
    channels: ['#escalations-leadership', 'leadership@company.com'],
    priority_boost: 2,
  },
  billing: {
    name: 'Billing Team',
    channels: ['#support-billing', 'billing@company.com'],
    priority_boost: 0,
  },
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: EscalationRequest = await request.json();
    const { ticket_id, escalation_team, reason } = body;

    // Validation
    if (!ticket_id?.trim()) {
      return NextResponse.json({ error: 'ticket_id is required' }, { status: 400 });
    }

    if (!escalation_team || !Object.keys(TEAM_ROUTING).includes(escalation_team)) {
      return NextResponse.json(
        { error: `escalation_team must be one of: ${Object.keys(TEAM_ROUTING).join(', ')}` },
        { status: 400 }
      );
    }

    if (!reason?.trim() || reason.trim().length < 10) {
      return NextResponse.json({ error: 'reason must be at least 10 characters' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    // Verify ticket ownership
    const { data: ticket } = await (admin
      .from('support_tickets' as any)
      .select('id, org_id, status, priority')
      .eq('id', ticket_id)
      .maybeSingle() as any);

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Verify user belongs to org
    const { data: userOrg } = await admin
      .from('users')
      .select('org_id')
      .eq('id', user.id)
      .maybeSingle();

    if (!userOrg || userOrg.org_id !== ticket.org_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Create escalation record
    const { data: escalation, error: escalationError } = await (admin
      .from('support_escalations' as any)
      .insert({
        ticket_id,
        escalated_from_user_id: user.id,
        escalation_team,
        reason,
        status: 'pending',
      })
      .select()
      .maybeSingle() as any);

    if (escalationError) {
      return NextResponse.json(
        { error: 'Failed to create escalation' },
        { status: 500 }
      );
    }

    // Add internal message to ticket
    const teamInfo = TEAM_ROUTING[escalation_team];
    await (admin.from('support_messages' as any).insert({
      ticket_id,
      author_id: user.id,
      message: `🔥 ESCALATED to ${teamInfo.name}: ${reason}`,
      is_internal: true,
    }) as any);

    // Update ticket status if not already in progress
    if (ticket.status === 'pending') {
      await (admin
        .from('support_tickets' as any)
        .update({ status: 'in_progress' })
        .eq('id', ticket_id) as any);
    }

    return NextResponse.json({
      success: true,
      escalation: {
        id: escalation.id,
        ticket_id,
        team: escalation_team,
        team_name: teamInfo.name,
        channels: teamInfo.channels,
        status: 'pending',
        created_at: escalation.created_at,
      },
      message: `Escalated to ${teamInfo.name}. They will be notified.`,
    });
  } catch (error) {
    return handleApiError(error, 'Failed to create escalation');
  }
}

// GET /api/support/escalate?ticket_id=... — get escalation history
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const ticket_id = searchParams.get('ticket_id');

    if (!ticket_id) {
      return NextResponse.json({ error: 'ticket_id is required' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();

    // Verify access
    const { data: ticket } = await (admin
      .from('support_tickets' as any)
      .select('org_id')
      .eq('id', ticket_id)
      .maybeSingle() as any);

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const { data: userOrg } = await admin
      .from('users')
      .select('org_id')
      .eq('id', user.id)
      .maybeSingle();

    if (!userOrg || userOrg.org_id !== ticket.org_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get escalations
    const { data: escalations } = await (admin
      .from('support_escalations' as any)
      .select('*')
      .eq('ticket_id', ticket_id)
      .order('created_at', { ascending: false }) as any);

    return NextResponse.json({
      ticket_id,
      escalations: (escalations || []).map((e) => ({
        id: e.id,
        team: e.escalation_team,
        team_name: TEAM_ROUTING[e.escalation_team as keyof typeof TEAM_ROUTING]?.name || e.escalation_team,
        reason: e.reason,
        status: e.status,
        created_at: e.created_at,
      })),
    });
  } catch (error) {
    return handleApiError(error, 'Failed to retrieve escalations');
  }
}
