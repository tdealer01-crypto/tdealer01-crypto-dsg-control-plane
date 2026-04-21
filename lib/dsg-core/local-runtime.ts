type SupabaseLike = {
  from: (table: string) => {
    select: (columns: string) => any;
  };
};

type LocalLedgerItem = {
  id: string;
  decision: string | null;
  reason: string | null;
  created_at: string | null;
  metadata: {
    execution_id?: string;
    audit_id?: string;
    [key: string]: unknown;
  };
  evidence: Record<string, unknown>;
};

export async function getLocalRuntimeLedger(
  supabase: SupabaseLike,
  orgId: string,
  limit = 20
): Promise<{ ok: true; items: LocalLedgerItem[] } | { ok: false; items: []; error: string }> {
  const clampedLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);

  const { data, error } = await supabase
    .from('audit_logs')
    .select('id,execution_id,decision,reason,evidence,created_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(clampedLimit);

  if (error) {
    return { ok: false, items: [], error: error.message };
  }

  const items = (Array.isArray(data) ? data : []).map((row: any) => ({
    id: String(row.id),
    decision: row.decision ?? null,
    reason: row.reason ?? null,
    created_at: row.created_at ?? null,
    metadata: {
      execution_id: row.execution_id ?? undefined,
      audit_id: row.id ?? undefined,
      ...(row?.evidence && typeof row.evidence === 'object' ? row.evidence : {}),
    },
    evidence: row?.evidence && typeof row.evidence === 'object' ? row.evidence : {},
  }));

  return { ok: true, items };
}
