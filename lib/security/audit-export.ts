import { getSupabaseAdmin } from '../supabase-server';

export type AuditExportResult = {
  ok: true;
  rows: Array<Record<string, unknown>>;
} | {
  ok: false;
  reason: 'relation-missing' | 'query-error';
};

function isMissingRelationError(message?: string, code?: string | null) {
  const normalized = String(message || '').toLowerCase();
  return code === 'PGRST205' || normalized.includes('relation') || normalized.includes('does not exist');
}

export async function fetchAuditLogsForExport(orgId: string, limit: number): Promise<AuditExportResult> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('audit_logs')
    .select('id, execution_id, decision, reason, evidence, created_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    if (isMissingRelationError(error.message, (error as { code?: string | null }).code ?? null)) {
      return { ok: false, reason: 'relation-missing' };
    }

    return { ok: false, reason: 'query-error' };
  }

  return { ok: true, rows: (data || []) as Array<Record<string, unknown>> };
}
