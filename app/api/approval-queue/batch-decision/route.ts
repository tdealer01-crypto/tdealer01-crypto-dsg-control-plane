import { NextResponse } from 'next/server';
import { requireRuntimeAccess } from '@/lib/authz-runtime';
import { validateApprovalDecision } from '@/lib/validation/approval-validation';
import { logServerError, serverErrorResponse } from '@/lib/security/error-response';

export const dynamic = 'force-dynamic';

const ALLOWED_DECISIONS = ['approved', 'rejected'] as const;
type Decision = typeof ALLOWED_DECISIONS[number];

// Only allow safe characters in IDs to prevent path traversal
const SAFE_ID_RE = /^[a-zA-Z0-9_-]{1,255}$/;

interface BatchDecisionBody {
  ids: string[];
  decision: Decision;
  reason?: string;
}

function isBatchDecisionBody(body: unknown): body is BatchDecisionBody {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  return (
    Array.isArray(b.ids) &&
    b.ids.length > 0 &&
    b.ids.every((id) => typeof id === 'string' && SAFE_ID_RE.test(id)) &&
    ALLOWED_DECISIONS.includes(b.decision as Decision) &&
    (b.reason === undefined || typeof b.reason === 'string')
  );
}

async function processSingleDecision(
  id: string,
  decision: Decision,
  reason?: string,
): Promise<{ ok: boolean; error?: string }> {
  const validation = validateApprovalDecision({ decision, reason });
  if (!validation.valid) {
    return { ok: false, error: validation.errors.map((e) => e.message).join('; ') };
  }

  const decisionAt = new Date().toISOString();

  // In production:
  // 1. Verify request ID exists and is in 'pending' status in DB
  // 2. Verify caller has permission to approve (org admin or approval role)
  // 3. Update approval_requests status + approved_by + approval_reason
  // 4. If approved: trigger execution/merge workflow
  // 5. Send notification to requester
  // 6. Log decision to audit trail

  console.log('[batch-decision] Decision recorded', { id, decision, hasReason: !!reason, decisionAt });
  return { ok: true };
}

export async function POST(request: Request) {
  try {
    const access = await requireRuntimeAccess(request, 'executions_read');
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON', code: 'INVALID_JSON' }, { status: 400 });
    }

    if (!isBatchDecisionBody(body)) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: 'ids must be a non-empty array of safe strings, decision must be approved|rejected',
        },
        { status: 400 },
      );
    }

    if (body.ids.length > 50) {
      return NextResponse.json(
        { error: 'Too many IDs', code: 'BATCH_TOO_LARGE', max: 50 },
        { status: 400 },
      );
    }

    const results = await Promise.allSettled(
      body.ids.map((id) => processSingleDecision(id, body.decision, body.reason)),
    );

    const failed: { id: string; error: string }[] = [];
    let processed = 0;

    results.forEach((result, i) => {
      if (result.status === 'fulfilled' && result.value.ok) {
        processed++;
      } else {
        failed.push({
          id: body.ids[i],
          error:
            result.status === 'rejected'
              ? String(result.reason)
              : (result.value as { ok: boolean; error?: string }).error ?? 'Unknown error',
        });
      }
    });

    return NextResponse.json({ ok: true, processed, failed });
  } catch (err) {
    logServerError(err, 'batch-decision');
    return serverErrorResponse();
  }
}
