import { NextRequest, NextResponse } from 'next/server';
import { DataSyncMonitor } from '@/lib/dsg/data-sync-monitor';
import { requireVerifiedDsgActor } from '@/lib/dsg/server/context';

export const dynamic = 'force-dynamic';

/**
 * GET /api/dsg/v1/monitoring/data-sync
 *
 * Monitor data sync health across unified Supabase instance
 * Requires: job:read permission
 */
export async function GET(req: NextRequest) {
  try {
    const actor = await requireVerifiedDsgActor(req.headers, 'job:read');

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      );
    }

    const monitor = new DataSyncMonitor(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      actor.workspaceId
    );

    const query = req.nextUrl.searchParams.get('check');

    // Generate comprehensive report
    if (query === 'full' || !query) {
      const report = await monitor.generateSyncReport();
      const consistency = await monitor.checkCrossRepoConsistency();

      return NextResponse.json({
        ok: true,
        data: {
          sync_report: report,
          cross_repo_consistency: consistency,
          actor: {
            actorId: actor.actorId,
            workspaceId: actor.workspaceId,
          },
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Check specific aspect
    if (query === 'metrics') {
      const metrics = await monitor.monitorCriticalTables();
      return NextResponse.json({ ok: true, data: metrics });
    }

    if (query === 'divergence') {
      const divergences = await monitor.detectDivergence();
      return NextResponse.json({
        ok: true,
        data: {
          divergences,
          count: divergences.length,
        },
      });
    }

    if (query === 'cross-repo') {
      const consistency = await monitor.checkCrossRepoConsistency();
      return NextResponse.json({ ok: true, data: consistency });
    }

    return NextResponse.json(
      { error: `Unknown check: ${query}. Use: full, metrics, divergence, cross-repo` },
      { status: 400 }
    );
  } catch (err) {
    console.error('Data sync monitoring error:', err);
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/dsg/v1/monitoring/data-sync
 *
 * Trigger data reconciliation and sync repair
 * Requires: approval:write permission
 */
export async function POST(req: NextRequest) {
  try {
    const actor = await requireVerifiedDsgActor(req.headers, 'approval:write');

    const body = await req.json();
    const action = body.action;

    if (!action) {
      return NextResponse.json(
        { error: 'action required' },
        { status: 400 }
      );
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      );
    }

    const monitor = new DataSyncMonitor(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      actor.workspaceId
    );

    if (action === 'report') {
      const report = await monitor.generateSyncReport();
      return NextResponse.json({
        ok: true,
        data: report,
        actor: {
          actorId: actor.actorId,
          workspaceId: actor.workspaceId,
        },
      });
    }

    if (action === 'reconcile') {
      const divergences = await monitor.detectDivergence();

      if (divergences.length === 0) {
        return NextResponse.json({
          ok: true,
          message: 'No divergences detected - data is consistent',
          data: {
            divergences: [],
          },
        });
      }

      // Log reconciliation attempt
      console.log(`[DATA-SYNC] Reconciliation triggered for workspace ${actor.workspaceId}`);
      console.log(`[DATA-SYNC] Found ${divergences.length} divergences:`, divergences);

      return NextResponse.json({
        ok: true,
        message: 'Reconciliation check completed',
        data: {
          divergences_found: divergences.length,
          divergences,
          action_required: divergences.length > 0,
          next_step: divergences.length > 0
            ? 'Review divergences and apply manual reconciliation via Supabase dashboard'
            : 'No action required',
        },
      });
    }

    return NextResponse.json(
      { error: `Unknown action: ${action}. Use: report, reconcile` },
      { status: 400 }
    );
  } catch (err) {
    console.error('Data sync POST error:', err);
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}
