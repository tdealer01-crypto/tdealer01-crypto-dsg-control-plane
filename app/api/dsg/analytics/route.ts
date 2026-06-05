import { NextResponse } from 'next/server';
import { requireVerifiedDsgActor } from '@/lib/dsg/server/context';
import { getDsgSupabaseRpcConfig, readDsgRest } from '@/lib/dsg/server/supabase-rpc';

type AppBuildRow = {
  id: string;
  status: string;
  lines_added: number;
  lines_removed: number;
  created_at: string;
};

type DayGroup = Record<string, number>;

function getDayLabel(date: Date): string {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
}

function buildActivityChart(rows: AppBuildRow[]): { day: string; builds: number }[] {
  // Last 7 calendar days (today inclusive)
  const now = new Date();
  const days: { label: string; dateStr: string }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days.push({
      label: getDayLabel(d),
      dateStr: d.toISOString().slice(0, 10),
    });
  }

  const counts: DayGroup = {};
  for (const row of rows) {
    const dateStr = row.created_at.slice(0, 10);
    counts[dateStr] = (counts[dateStr] ?? 0) + 1;
  }

  return days.map(({ label, dateStr }) => ({ day: label, builds: counts[dateStr] ?? 0 }));
}

function buildStats(rows: AppBuildRow[], rangeLabel: string) {
  const total = rows.length;
  const succeeded = rows.filter((r) => r.status === 'deployed').length;
  const active = rows.filter((r) => r.status === 'building').length;
  const successRate = total > 0 ? Math.round((succeeded / total) * 1000) / 10 : 0;
  // Approximate token cost: 500 tokens per line changed @ $0.000002/token
  const totalLines = rows.reduce((s, r) => s + r.lines_added + r.lines_removed, 0);
  const tokensUsed = totalLines * 500;
  const costEstimate = `$${((tokensUsed * 0.000002)).toFixed(2)}`;

  return {
    totalApps: total,
    appsTrend: 0,        // trend requires historical comparison — left as 0 until a second period is available
    tokensUsed,
    costEstimate,
    activeBuilds: active,
    successRate,
    successTrend: 0,
  };
}

export async function GET(request: Request) {
  try {
    const actor = await requireVerifiedDsgActor(request.headers, 'job:read');
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') ?? '7d';
    const validRange = ['7d', '30d', '90d'].includes(range) ? range : '7d';
    const days = validRange === '7d' ? 7 : validRange === '30d' ? 30 : 90;

    const since = new Date();
    since.setDate(since.getDate() - days);

    const config = getDsgSupabaseRpcConfig();

    const rows = await readDsgRest<AppBuildRow[]>(config, 'dsg_app_builds', {
      user_id: `eq.${actor.actorId}`,
      created_at: `gte.${since.toISOString()}`,
      select: 'id,status,lines_added,lines_removed,created_at',
      order: 'created_at.asc',
    });

    // Recent builds for the table (last 10, most recent first)
    const recentRows = [...rows].reverse().slice(0, 10);
    const recentBuilds = recentRows.map((r) => ({
      id: r.id,
      appName: '',   // app_name not selected for perf; extend select if needed
      status: r.status.toUpperCase(),
      date: r.created_at.slice(0, 16).replace('T', ' '),
    }));

    return NextResponse.json({
      ok: true,
      data: {
        stats: buildStats(rows, validRange),
        buildActivity: buildActivityChart(rows),
        recentBuilds,
        updatedEvery: '5 minutes',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'ANALYTICS_FETCH_FAILED';
    const status = message === 'DSG_AUTH_REQUIRED' || message === 'DSG_PERMISSION_DENIED' ? 403 : 500;
    return NextResponse.json({ ok: false, error: { code: message } }, { status });
  }
}
