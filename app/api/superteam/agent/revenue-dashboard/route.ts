import { NextRequest, NextResponse } from 'next/server';
import {
  getSuperteamSupabase,
  loadSuperteamAgent,
  superteamErrorStatus,
} from '@/lib/superteam/server';
import { handleApiError } from '@/lib/security/api-error';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId')?.trim();
    if (!agentId) return NextResponse.json({ error: 'agentId required' }, { status: 400 });

    const supabase = getSuperteamSupabase();
    const agent = await loadSuperteamAgent(supabase, agentId);
    if (!agent) return NextResponse.json({ error: 'SUPERTEAM_AGENT_NOT_FOUND' }, { status: 404 });

    const { data: submissions, error } = await supabase
      .from('agent_submissions')
      .select('*')
      .eq('agent_id', agentId)
      .order('submitted_at', { ascending: false })
      .limit(100);
    if (error) throw new Error(`SUPERTEAM_REVENUE_SOURCE_FAILED:${error.message}`);

    const rows = submissions ?? [];
    const requestedAskTotal = rows.reduce((sum: number, row: any) => {
      const ask = typeof row.ask === 'number' && Number.isFinite(row.ask) ? row.ask : 0;
      return sum + ask;
    }, 0);
    const statusCounts = rows.reduce<Record<string, number>>((counts, row: any) => {
      const status = typeof row.status === 'string' && row.status ? row.status : 'unknown';
      counts[status] = (counts[status] ?? 0) + 1;
      return counts;
    }, {});

    return NextResponse.json({
      success: true,
      source: 'supabase:agent_submissions',
      agent: {
        id: agent.id,
        name: agent.name,
        status: agent.status ?? null,
      },
      timestamp: new Date().toISOString(),
      submissions: {
        total: rows.length,
        byStatus: statusCounts,
        requestedAskTotal,
        requestedAskNote: 'Requested ask is not earned revenue.',
      },
      revenue: {
        totalEarned: null,
        currency: null,
        verified: false,
        reason: 'No verified payout/settlement source is wired to this endpoint.',
      },
      recentSubmissions: rows.slice(0, 20).map((row: any) => ({
        id: row.id,
        listingId: row.listing_id,
        link: row.link,
        status: row.status,
        requestedAsk: typeof row.ask === 'number' ? row.ask : null,
        submittedAt: row.submitted_at,
      })),
    });
  } catch (error) {
    return handleApiError('superteam/revenue-dashboard', error, { status: superteamErrorStatus(error) });
  }
}
