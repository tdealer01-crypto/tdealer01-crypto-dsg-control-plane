import { NextResponse } from 'next/server';
import { requireRuntimeAccess } from '@/lib/authz-runtime';
import { logServerError, serverErrorResponse } from '@/lib/security/error-response';

export const dynamic = 'force-dynamic';

const PRIORITY_SCORE: Record<string, number> = { high: 0, medium: 1, low: 2 };

export async function GET(request: Request) {
  try {
    const access = await requireRuntimeAccess(request, 'executions_read');
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const baseUrl = new URL(request.url).origin;
    const headers = { Authorization: request.headers.get('Authorization') ?? '' };

    const [approvalsRes, tasksRes] = await Promise.allSettled([
      fetch(`${baseUrl}/api/approval-queue/pending?limit=50`, { headers }),
      fetch(`${baseUrl}/api/tasks?limit=50&status=PENDING`, { headers }),
    ]);

    const approvals =
      approvalsRes.status === 'fulfilled' && approvalsRes.value.ok
        ? ((await approvalsRes.value.json()) as { approvals?: unknown[] }).approvals ?? []
        : [];

    const tasks =
      tasksRes.status === 'fulfilled' && tasksRes.value.ok
        ? ((await tasksRes.value.json()) as { tasks?: unknown[] }).tasks ?? []
        : [];

    type Approval = {
      priority?: string;
      expiresAt?: string;
      [key: string]: unknown;
    };

    const sortedApprovals = [...(approvals as Approval[])].sort((a, b) => {
      const pa = PRIORITY_SCORE[a.priority ?? 'medium'] ?? 1;
      const pb = PRIORITY_SCORE[b.priority ?? 'medium'] ?? 1;
      if (pa !== pb) return pa - pb;
      const ta = a.expiresAt ? new Date(a.expiresAt).getTime() : Infinity;
      const tb = b.expiresAt ? new Date(b.expiresAt).getTime() : Infinity;
      return ta - tb;
    });

    const totalPending = sortedApprovals.length + (tasks as unknown[]).length;

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
