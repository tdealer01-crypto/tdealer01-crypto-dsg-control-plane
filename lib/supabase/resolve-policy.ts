import { getSupabaseAdmin } from '../supabase-server';

export function isMissingRelationError(error: unknown) {
  const message = String((error as { message?: unknown })?.message || '').toLowerCase();
  return message.includes('does not exist') || message.includes('undefined table') || message.includes('relation');
}

export async function resolvePolicyId(orgId: string, requestedPolicyId?: string | null) {
  const supabase = getSupabaseAdmin();

  if (requestedPolicyId) {
    const { data: runtimePolicy, error: runtimeError } = await supabase
      .from('runtime_policies')
      .select('id')
      .eq('org_id', orgId)
      .eq('id', requestedPolicyId)
      .maybeSingle();

    if (!runtimeError && runtimePolicy?.id) return String(runtimePolicy.id);
    if (runtimeError && !isMissingRelationError(runtimeError)) throw runtimeError;

    const { data: legacyPolicy, error: legacyError } = await supabase
      .from('policies')
      .select('id')
      .eq('id', requestedPolicyId)
      .maybeSingle();

    if (legacyError) throw legacyError;
    if (legacyPolicy?.id) return String(legacyPolicy.id);

    return null;
  }

  const { data: runtimeLatest, error: runtimeLatestError } = await supabase
    .from('runtime_policies')
    .select('id')
    .eq('org_id', orgId)
    .in('status', ['active', 'approved', 'draft', 'proposed'])
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!runtimeLatestError && runtimeLatest?.id) return String(runtimeLatest.id);
  if (runtimeLatestError && !isMissingRelationError(runtimeLatestError)) throw runtimeLatestError;

  const { data: legacyAny, error: legacyAnyError } = await supabase
    .from('policies')
    .select('id')
    .in('status', ['active', 'draft'])
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (legacyAnyError) throw legacyAnyError;
  return legacyAny?.id ? String(legacyAny.id) : null;
}

export async function resolveQuickstartPolicyId(orgId: string) {
  const admin = getSupabaseAdmin();

  const { data: runtimePolicy, error: runtimeError } = await admin
    .from('runtime_policies')
    .select('id')
    .eq('org_id', orgId)
    .in('status', ['active', 'approved', 'draft', 'proposed'])
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!runtimeError && runtimePolicy?.id) {
    return String(runtimePolicy.id);
  }

  if (runtimeError && !isMissingRelationError(runtimeError)) {
    throw runtimeError;
  }

  const { data: globalPolicy, error: legacyGlobalError } = await admin
    .from('policies')
    .select('id')
    .eq('id', 'policy_default')
    .maybeSingle();

  if (!legacyGlobalError && globalPolicy?.id) {
    return String(globalPolicy.id);
  }

  const { data: anyPolicy, error: legacyAnyError } = await admin
    .from('policies')
    .select('id')
    .in('status', ['active', 'draft'])
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (legacyAnyError) {
    throw legacyAnyError;
  }

  return anyPolicy?.id ? String(anyPolicy.id) : null;
}
