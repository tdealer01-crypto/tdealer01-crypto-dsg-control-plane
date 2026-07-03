import { NextResponse } from 'next/server';
import { requireRuntimeAccess } from '@/lib/authz-runtime';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { logServerError, serverErrorResponse } from '@/lib/security/error-response';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const access = await requireRuntimeAccess(request, 'executions_read');
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const url = new URL(request.url);
    const status = url.searchParams.get('status') ?? 'all';
    const limit = Math.min(Number(url.searchParams.get('limit') ?? '20'), 100);
    const offset = Math.max(Number(url.searchParams.get('offset') ?? '0'), 0);

    const supabase = getSupabaseAdmin();

    let query = supabase
      .from('dsg_task_plans')
      .select('id, job_id, workspace_id, status, plan_hash, tasks, dependency_edges, created_at, created_by', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query;

    if (error) {
      logServerError(error, 'tasks-get');
      return serverErrorResponse();
    }

    const tasks = (data ?? []).map((row) => ({
      id: row.id,
      job_id: row.job_id,
      workspace_id: row.workspace_id,
      status: row.status,
      plan_hash: row.plan_hash,
      task_count: Array.isArray(row.tasks) ? row.tasks.length : 0,
      dependency_count: Array.isArray(row.dependency_edges) ? row.dependency_edges.length : 0,
      created_at: row.created_at,
      created_by: row.created_by,
    }));

    return NextResponse.json({ ok: true, total: count ?? 0, limit, offset, tasks });
  } catch (err) {
    logServerError(err, 'tasks-get');
    return serverErrorResponse();
  }
}
