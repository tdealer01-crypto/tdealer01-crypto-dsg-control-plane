import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { handleApiError } from '@/lib/security/api-error';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = getSupabaseAdmin();

    // Get user's org
    const { data: userOrg } = await admin
      .from('users')
      .select('org_id')
      .eq('id', user.id)
      .maybeSingle();

    if (!userOrg) {
      return NextResponse.json({ error: 'User org not found' }, { status: 404 });
    }

    try {
      // Query support tickets (defensive - may not exist if migration pending)
      const { data: tickets, error: ticketsError } = await (admin
        .from('support_tickets' as any)
        .select('id, status, sla_due_at')
        .eq('org_id', userOrg.org_id) as any);

      if (ticketsError || !tickets) {
        // Table doesn't exist yet (migration pending) - return empty stats
        return NextResponse.json({
          stats: {
            total: 0,
            pending: 0,
            in_progress: 0,
            sla_at_risk: 0,
          },
        });
      }

      // Calculate stats
      const total = tickets.length;
      const pending = tickets.filter((t: any) => t.status === 'pending').length;
      const in_progress = tickets.filter(
        (t: any) => t.status === 'in_progress'
      ).length;

      // Check for SLA at risk (due in next 2 hours)
      const now = new Date();
      const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      const sla_at_risk = tickets.filter((t: any) => {
        if (!t.sla_due_at) return false;
        const dueDate = new Date(t.sla_due_at);
        return dueDate <= twoHoursLater && dueDate > now;
      }).length;

      return NextResponse.json({
        stats: {
          total,
          pending,
          in_progress,
          sla_at_risk,
        },
      });
    } catch {
      // Graceful fallback if table doesn't exist
      return NextResponse.json({
        stats: {
          total: 0,
          pending: 0,
          in_progress: 0,
          sla_at_risk: 0,
        },
      });
    }
  } catch (error) {
    return handleApiError(error, 'Failed to fetch support stats');
  }
}
