import { getSupabaseAdmin } from '../supabase-server';

export function buildAuditExportQuery(orgId: string, filters: { start_date?: string | null; end_date?: string | null; event_type?: string | null; email?: string | null }) {
  return { orgId, ...filters };
}

async function collectEvents(orgId: string, filters: any) {
  const admin = getSupabaseAdmin();
  const events: any[] = [];
  const applyDate = (q: any, col = 'created_at') => {
    let out = q.eq('org_id', orgId);
    if (filters.start_date) out = out.gte(col, filters.start_date);
    if (filters.end_date) out = out.lte(col, filters.end_date);
    return out;
  };
  const [signIn, requests, grants, auditLogs] = await Promise.all([
    applyDate(admin.from('sign_in_events').select('*')).limit(2000),
    applyDate(admin.from('access_requests').select('*')).limit(2000),
    applyDate(admin.from('guest_access_grants').select('*')).limit(2000),
    applyDate(admin.from('audit_logs').select('id,org_id,created_at,decision,reason')).limit(2000),
  ]);
  for (const row of signIn.data || []) events.push({ event_type: 'sign_in_event', created_at: row.created_at, email: row.email, payload: row });
  for (const row of requests.data || []) events.push({ event_type: 'access_request', created_at: row.created_at, email: row.email, payload: row });
  for (const row of grants.data || []) events.push({ event_type: 'guest_access_grant', created_at: row.created_at, email: row.email, payload: row });
  for (const row of auditLogs.data || []) events.push({ event_type: 'audit_log', created_at: row.created_at, email: null, payload: row });
  return events.filter((e) => (!filters.event_type || e.event_type === filters.event_type) && (!filters.email || String(e.email || '').toLowerCase() === String(filters.email).toLowerCase())).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
}

export async function exportAuditEventsAsJson(orgId: string, filters: any) { return collectEvents(orgId, filters); }

export async function exportAuditEventsAsCsv(orgId: string, filters: any) {
  const events = await collectEvents(orgId, filters);
  const rows = ['event_type,created_at,email,payload'];
  for (const e of events) rows.push([e.event_type, e.created_at, e.email || '', JSON.stringify(e.payload).replaceAll('"', '""')].map((v) => `"${String(v)}"`).join(','));
  return rows.join('\n');
}
