import { NextResponse } from 'next/server';
import { requireVerifiedDsgActor } from '@/lib/dsg/server/context';
import { getDsgSupabaseRpcConfig, readDsgRest } from '@/lib/dsg/server/supabase-rpc';

export type BuildStatus = 'DEPLOYED' | 'BUILDING' | 'FAILED' | 'DRAFT';

export type BuildEntry = {
  id: string;
  appName: string;
  status: BuildStatus;
  timestamp: string;
  summary: string;
  addedLines: number;
  removedLines: number;
};

type AppBuildRow = {
  id: string;
  app_name: string;
  status: string;
  description: string | null;
  lines_added: number;
  lines_removed: number;
  created_at: string;
};

function mapBuild(row: AppBuildRow): BuildEntry {
  return {
    id: row.id,
    appName: row.app_name,
    status: row.status.toUpperCase() as BuildStatus,
    timestamp: row.created_at,
    summary: row.description ?? '',
    addedLines: row.lines_added,
    removedLines: row.lines_removed,
  };
}

export async function GET(req: Request) {
  try {
    const actor = await requireVerifiedDsgActor(req.headers, 'job:read');
    const { searchParams } = new URL(req.url);
    const search = (searchParams.get('search') ?? '').toLowerCase();
    const status = searchParams.get('status') ?? 'ALL';
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const perPage = 10;

    const config = getDsgSupabaseRpcConfig();

    // Build PostgREST query params — filter server-side where possible
    const params: Record<string, string> = {
      user_id: `eq.${actor.actorId}`,
      select: 'id,app_name,status,description,lines_added,lines_removed,created_at',
      order: 'created_at.desc',
    };

    if (status !== 'ALL') {
      params.status = `eq.${status.toLowerCase()}`;
    }

    // Fetch all matching rows (search filtering done client-side; rows are small)
    const rows = await readDsgRest<AppBuildRow[]>(config, 'dsg_app_builds', params);

    let items = rows.map(mapBuild);
    if (search) {
      items = items.filter(
        (b) =>
          b.appName.toLowerCase().includes(search) ||
          b.summary.toLowerCase().includes(search),
      );
    }

    const total = items.length;
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const paged = items.slice((page - 1) * perPage, page * perPage);

    return NextResponse.json({ ok: true, data: { items: paged, total, page, totalPages } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'HISTORY_FETCH_FAILED';
    const status = message === 'DSG_AUTH_REQUIRED' || message === 'DSG_PERMISSION_DENIED' ? 403 : 500;
    return NextResponse.json({ ok: false, error: { code: message } }, { status });
  }
}
