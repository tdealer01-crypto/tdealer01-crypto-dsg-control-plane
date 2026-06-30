import { NextResponse } from 'next/server';
import { requireRuntimeAccess } from '@/lib/authz-runtime';
import { logServerError, serverErrorResponse } from '@/lib/security/error-response';

export const dynamic = 'force-dynamic';

const ALLOWED_DECISIONS = ['approved', 'rejected'] as const;
type Decision = typeof ALLOWED_DECISIONS[number];

// Only allow safe characters in IDs to prevent path traversal/SSRF via URL construction
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
          details: 'ids must be a non-empty array of strings, decision must be approved|rejected',
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

    // Use a server-configured base URL to prevent SSRF from request-derived origin
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    const authHeader = request.headers.get('Authorization') ?? '';

    const results = await Promise.allSettled(
      body.ids.map((id) =>
        fetch(`${appUrl}/api/approval-queue/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: authHeader },
          body: JSON.stringify({ decision: body.decision, reason: body.reason }),
        }),
      ),
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
              : `HTTP ${(result.value as Response).status}`,
        });
      }
    });

    return NextResponse.json({ ok: true, processed, failed });
  } catch (err) {
    logServerError(err, 'batch-decision');
    return serverErrorResponse();
  }
}
