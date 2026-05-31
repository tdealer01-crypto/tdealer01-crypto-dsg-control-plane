import { getSupabaseAdmin } from '../supabase-server';

// Batch4 security-settings audit feed.
//
// The original PR #114 imported exportAuditEventsAsJson / exportAuditEventsAsCsv
// / buildAuditExportQuery from lib/security/audit-export.ts. Current main
// reimplemented that shared lib and only exports fetchAuditLogsForExport, so
// this thin local helper restores the original event-feed shape WITHOUT editing
// the shared, superseded lib.
//
// It only reads tables that exist in main's generated types (sign_in_events,
// audit_logs). The original also folded in access_requests + guest_access_grants,
// but those are not present in main's database types, so they are intentionally
// omitted to avoid inventing schema / adding typecheck regressions. The feed
// degrades gracefully (empty list) when a relation is missing.

export type AuditEventFilters = {
  start_date?: string | null;
  end_date?: string | null;
  event_type?: string | null;
  email?: string | null;
};

export type AuditEvent = {
  event_type: string;
  created_at: string | null;
  email: string | null;
  payload: Record<string, unknown>;
};

export function buildAuditExportQuery(orgId: string, filters: AuditEventFilters) {
  return { orgId, ...filters };
}

async function collectEvents(orgId: string, filters: AuditEventFilters): Promise<AuditEvent[]> {
  const admin = getSupabaseAdmin();
  const events: AuditEvent[] = [];

  const signInQuery = (() => {
    let q = admin
      .from('sign_in_events')
      .select('id, email, event_type, source, success, created_at')
      .eq('org_id', orgId);
    if (filters.start_date) q = q.gte('created_at', filters.start_date);
    if (filters.end_date) q = q.lte('created_at', filters.end_date);
    return q.order('created_at', { ascending: false }).limit(2000);
  })();

  const auditLogQuery = (() => {
    let q = admin
      .from('audit_logs')
      .select('id, org_id, created_at, decision, reason')
      .eq('org_id', orgId);
    if (filters.start_date) q = q.gte('created_at', filters.start_date);
    if (filters.end_date) q = q.lte('created_at', filters.end_date);
    return q.order('created_at', { ascending: false }).limit(2000);
  })();

  const [signIn, auditLogs] = await Promise.all([signInQuery, auditLogQuery]);

  for (const row of signIn.data || []) {
    events.push({
      event_type: 'sign_in_event',
      created_at: row.created_at,
      email: row.email ?? null,
      payload: row as Record<string, unknown>,
    });
  }
  for (const row of auditLogs.data || []) {
    events.push({
      event_type: 'audit_log',
      created_at: row.created_at,
      email: null,
      payload: row as Record<string, unknown>,
    });
  }

  return events
    .filter(
      (e) =>
        (!filters.event_type || e.event_type === filters.event_type) &&
        (!filters.email || String(e.email || '').toLowerCase() === String(filters.email).toLowerCase()),
    )
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
}

export async function exportAuditEventsAsJson(orgId: string, filters: AuditEventFilters): Promise<AuditEvent[]> {
  return collectEvents(orgId, filters);
}

export async function exportAuditEventsAsCsv(orgId: string, filters: AuditEventFilters): Promise<string> {
  const events = await collectEvents(orgId, filters);
  const rows = ['event_type,created_at,email,payload'];
  for (const e of events) {
    rows.push(
      [e.event_type, e.created_at || '', e.email || '', JSON.stringify(e.payload).replaceAll('"', '""')]
        .map((v) => `"${String(v)}"`)
        .join(','),
    );
  }
  return rows.join('\n');
}
