import { NextResponse } from 'next/server';
import { requireRuntimeAccess } from '@/lib/authz-runtime';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { logServerError, serverErrorResponse } from '@/lib/security/error-response';

export const dynamic = 'force-dynamic';

const PRIORITY_SCORE: Record<string, number> = { high: 0, medium: 1, low: 2 };

export async function GET(request: Request) {
  try {
    const access = await requireRuntimeAccess(request, 'executions_read');
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const supabase = getSupabaseAdmin();
    const orgId = access.orgId;

    const [approvalsResult, tasksResult] = await Promise.allSettled([
      supabase
        .from('runtime_approval_requests')
        .select('id, agent_id, status, request_payload, created_at, expires_at')
        .eq('org_id', orgId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('dsg_task_plans')
        .select('id, job_id, status, tasks, created_at')
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

    const approvals =
      approvalsResult.status === 'fulfilled' && !approvalsResult.value.error
        ? (approvalsResult.value.data ?? []).map((row) => {
            const payload = row.request_payload as Record<string, unknown> | null;
            return {
              id: row.id,
              agentId: row.agent_id,
              action: (payload?.action as string) || 'unknown action',
              status: row.status || 'pending',
              priority: ((payload?.priority as string) || 'medium') as 'low' | 'medium' | 'high',
              createdAt: row.created_at,
              expiresAt: row.expires_at,
            };
          })
        : [];

    const tasks =
      tasksResult.status === 'fulfilled' && !tasksResult.value.error
        ? (tasksResult.value.data ?? []).map((row) => ({
            id: row.id,
            job_id: row.job_id,
            status: row.status,
            task_count: Array.isArray(row.tasks) ? row.tasks.length : 0,
            created_at: row.created_at,
          }))
        : [];

    const sortedApprovals = [...approvals].sort((a, b) => {
      const pa = PRIORITY_SCORE[a.priority ?? 'medium'] ?? 1;
      const pb = PRIORITY_SCORE[b.priority ?? 'medium'] ?? 1;
      if (pa !== pb) return pa - pb;
      const ta = a.expiresAt ? new Date(a.expiresAt).getTime() : Infinity;
      const tb = b.expiresAt ? new Date(b.expiresAt).getTime() : Infinity;
      return ta - tb;
    });

    const totalPending = sortedApprovals.length + tasks.length;

    const avgSlaMs =
      sortedApprovals.length > 0
        ? Math.round(
            sortedApprovals.reduce((sum, a) => {
              const remaining = a.expiresAt
                ? Math.max(0, new Date(a.expiresAt).getTime() - Date.now())
                : 0;
              return sum + remaining;
            }, 0) / sortedApprovals.length,
          )
        : null;

    return NextResponse.json({
      ok: true,
      totalPending,
      avgSlaRemainingMs: avgSlaMs,
      approvals: sortedApprovals,
      tasks,
    });
  } catch (err) {
    logServerError(err, 'work-queue-get');
    return serverErrorResponse();
  }
}
