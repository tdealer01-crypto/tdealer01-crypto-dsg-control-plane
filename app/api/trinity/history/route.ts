import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Placeholder: In production, fetch from Supabase
    // SELECT id, job_title, status, execution_time, created_at, plan_hash
    // FROM trinity_executions ORDER BY created_at DESC LIMIT 50

    const executionHistory = [
      {
        id: 'exec-001',
        job_title: 'Smart Contract Security Audit',
        status: 'success' as const,
        execution_time: 2847,
        created_at: new Date(Date.now() - 3600000).toISOString(),
        plan_hash: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9',
      },
      {
        id: 'exec-002',
        job_title: 'Backend API Development',
        status: 'success' as const,
        execution_time: 5123,
        created_at: new Date(Date.now() - 7200000).toISOString(),
        plan_hash: 'b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0',
      },
      {
        id: 'exec-003',
        job_title: 'Frontend React Components',
        status: 'failed' as const,
        execution_time: 3456,
        created_at: new Date(Date.now() - 10800000).toISOString(),
        plan_hash: 'c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1',
      },
    ];

    return NextResponse.json(
      {
        ok: true,
        history: executionHistory,
        count: executionHistory.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Failed to load execution history:', error);
    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to load execution history',
      },
      { status: 500 }
    );
  }
}
