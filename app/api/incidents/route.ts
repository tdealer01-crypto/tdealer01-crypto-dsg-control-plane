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

// Fallback in-memory store (used when Supabase env not configured)
const INCIDENTS_STORE: Incident[] = [
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

async function getSupabaseClient() {
  try {
    const mod = await import('../../../lib/supabase-server');
    if (mod?.getSupabaseAdmin) {
      return mod.getSupabaseAdmin();
    }
  } catch {
    // Supabase not available
  }
  return null;
}

function validateIncident(body: unknown): { ok: boolean; error?: string; data?: Partial<Incident> } {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Request body must be an object' };
  }
  const b = body as Record<string, unknown>;
  if (!b.severity || typeof b.severity !== 'string') {
    return { ok: false, error: 'severity is required (P1|P2|P3|P4)' };
  }
  const validSeverities = ['P1', 'P2', 'P3', 'P4'];
  if (!validSeverities.includes(b.severity)) {
    return { ok: false, error: `severity must be one of: ${validSeverities.join(', ')}` };
  }
  if (!b.title || typeof b.title !== 'string') {
    return { ok: false, error: 'title is required' };
  }
  return {
    ok: true,
    data: {
      severity: b.severity as Incident['severity'],
      title: b.title,
      description: (b.description as string) || '',
      status: (b.status as Incident['status']) || 'open',
    },
  };
}

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

    // Try Supabase first
    const supabase = await getSupabaseClient();
    if (supabase) {
      try {
        let query = supabase.from('incidents').select('*');
        if (severity) query = query.eq('severity', severity);
        if (status) query = query.eq('status', status);
        query = query.order('created_at', { ascending: false });

        const { data, error } = await query;
        if (error) throw error;

        return NextResponse.json({
          ok: true,
          count: data?.length || 0,
          items: data || [],
          source: 'supabase',
        });
      } catch (dbErr) {
        logApiError('api/incidents', dbErr, { stage: 'supabase_fallback' });
        // Fall through to in-memory
      }
    }

    // Fallback: in-memory store
    let filtered = [...INCIDENTS_STORE];
    if (severity) filtered = filtered.filter(i => i.severity === severity);
    if (status) filtered = filtered.filter(i => i.status === status);
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({
      ok: true,
      count: filtered.length,
      items: filtered,
      source: 'in-memory',
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
    const validation = validateIncident(body);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const newIncident: Incident = {
      id: `INC-${new Date().getFullYear()}-${String(INCIDENTS_STORE.length + 1).padStart(3, '0')}`,
      severity: validation.data!.severity!,
      title: validation.data!.title!,
      description: validation.data!.description || '',
      status: 'open',
      created_at: new Date().toISOString(),
      org_id: access.orgId,
    };

    // Try Supabase first
    const supabase = await getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('incidents')
          .insert({
            severity: newIncident.severity,
            title: newIncident.title,
            description: newIncident.description,
            status: 'open',
            org_id: access.orgId,
          })
          .select()
          .single();

        if (error) throw error;

        return NextResponse.json({
          ok: true,
          incident: data,
          source: 'supabase',
        }, { status: 201 });
      } catch (dbErr) {
        logApiError('api/incidents', dbErr, { stage: 'supabase_insert_fallback' });
        // Fall through to in-memory
      }
    }

    // Fallback: in-memory store
    INCIDENTS_STORE.push(newIncident);
    return NextResponse.json({
      ok: true,
      incident: newIncident,
      source: 'in-memory',
    }, { status: 201 });
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
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Request body must be an object' }, { status: 400 });
    }

    const b = body as Record<string, unknown>;
    if (!b.id || typeof b.id !== 'string') {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const validStatuses = ['open', 'investigating', 'contained', 'resolved'];
    if (!b.status || !validStatuses.includes(b.status as string)) {
      return NextResponse.json(
        { error: `status must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const updateData: Partial<Incident> = {
      status: b.status as Incident['status'],
    };
    if (b.status === 'resolved') {
      updateData.resolved_at = new Date().toISOString();
    }

    // Try Supabase first
    const supabase = await getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('incidents')
          .update({
            status: updateData.status,
            resolved_at: updateData.resolved_at || null,
          })
          .eq('id', b.id)
          .select()
          .single();

        if (error) throw error;

        return NextResponse.json({
          ok: true,
          incident: data,
          source: 'supabase',
        });
      } catch (dbErr) {
        logApiError('api/incidents', dbErr, { stage: 'supabase_update_fallback' });
        // Fall through to in-memory
      }
    }

    // Fallback: in-memory store
    const incident = INCIDENTS_STORE.find(i => i.id === b.id);
    if (!incident) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    }

    incident.status = updateData.status!;
    if (updateData.resolved_at) {
      incident.resolved_at = updateData.resolved_at;
    }

    return NextResponse.json({
      ok: true,
      incident,
      source: 'in-memory',
    });
  } catch (error) {
    logApiError('api/incidents', error, { stage: 'update' });
    return NextResponse.json({ error: internalErrorMessage() }, { status: 500 });
  }
}
