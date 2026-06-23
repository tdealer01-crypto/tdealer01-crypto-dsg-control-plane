import { NextRequest, NextResponse } from 'next/server';
import { requireRuntimeAccess } from '../../../lib/authz-runtime';
import { internalErrorMessage, logApiError } from '../../../lib/security/api-error';

export const dynamic = 'force-dynamic';

interface Incident {
  id: string;
  severity: 'P1' | 'P2' | 'P3' | 'P4';
  title: string;
  description: string;
  status: 'open' | 'investigating' | 'contained' | 'resolved';
  created_at: string;
  resolved_at?: string;
  org_id?: string;
}

// In-memory store for demo; production should use Supabase
const INCIDENTS: Incident[] = [
  {
    id: 'INC-2026-001',
    severity: 'P2',
    title: 'Stripe webhook signature mismatch',
    description: 'Webhook signature verification failed intermittently between 14:00-14:30 UTC',
    status: 'resolved',
    created_at: '2026-06-20T14:10:00Z',
    resolved_at: '2026-06-20T14:45:00Z',
  },
  {
    id: 'INC-2026-002',
    severity: 'P3',
    title: 'Audit export slow response',
    description: '/api/audit/export latency > 5s for large datasets (>1000 events)',
    status: 'investigating',
    created_at: '2026-06-22T09:30:00Z',
  },
];

/**
 * GET /api/incidents — List incidents (requires monitor or admin access)
 */
export async function GET(request: NextRequest) {
  try {
    const access = await requireRuntimeAccess(request, 'monitor');
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const url = new URL(request.url);
    const severity = url.searchParams.get('severity');
    const status = url.searchParams.get('status');

    let filtered = INCIDENTS;
    if (severity) {
      filtered = filtered.filter(i => i.severity === severity);
    }
    if (status) {
      filtered = filtered.filter(i => i.status === status);
    }

    return NextResponse.json({
      ok: true,
      count: filtered.length,
      items: filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    });
  } catch (error) {
    logApiError('api/incidents', error, { stage: 'list' });
    return NextResponse.json({ error: internalErrorMessage() }, { status: 500 });
  }
}

/**
 * POST /api/incidents — Create new incident (requires admin access)
 */
export async function POST(request: NextRequest) {
  try {
    const access = await requireRuntimeAccess(request, 'admin');
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await request.json().catch(() => null);
    if (!body || !body.severity || !body.title) {
      return NextResponse.json(
        { error: 'severity and title are required' },
        { status: 400 }
      );
    }

    const validSeverities = ['P1', 'P2', 'P3', 'P4'];
    if (!validSeverities.includes(body.severity)) {
      return NextResponse.json(
        { error: `severity must be one of: ${validSeverities.join(', ')}` },
        { status: 400 }
      );
    }

    const incident: Incident = {
      id: `INC-2026-${String(INCIDENTS.length + 1).padStart(3, '0')}`,
      severity: body.severity,
      title: body.title,
      description: body.description || '',
      status: 'open',
      created_at: new Date().toISOString(),
      org_id: access.orgId,
    };

    INCIDENTS.push(incident);

    return NextResponse.json({ ok: true, incident }, { status: 201 });
  } catch (error) {
    logApiError('api/incidents', error, { stage: 'create' });
    return NextResponse.json({ error: internalErrorMessage() }, { status: 500 });
  }
}

/**
 * PATCH /api/incidents — Update incident status (requires admin access)
 */
export async function PATCH(request: NextRequest) {
  try {
    const access = await requireRuntimeAccess(request, 'admin');
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await request.json().catch(() => null);
    if (!body || !body.id || !body.status) {
      return NextResponse.json(
        { error: 'id and status are required' },
        { status: 400 }
      );
    }

    const validStatuses = ['open', 'investigating', 'contained', 'resolved'];
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json(
        { error: `status must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const incident = INCIDENTS.find(i => i.id === body.id);
    if (!incident) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }

    incident.status = body.status;
    if (body.status === 'resolved') {
      incident.resolved_at = new Date().toISOString();
    }

    return NextResponse.json({ ok: true, incident });
  } catch (error) {
    logApiError('api/incidents', error, { stage: 'update' });
    return NextResponse.json({ error: internalErrorMessage() }, { status: 500 });
  }
}
