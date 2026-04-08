import { createHash } from 'crypto';
import { getSupabaseAdmin } from './supabase-server';

export async function resolveAgentFromApiKey(agentId: string, apiKey: string) {
  const supabase = getSupabaseAdmin();
  const apiKeyHash = createHash('sha256').update(apiKey).digest('hex');

  const { data, error } = await supabase
    .from('agents')
    .select('id, org_id, policy_id, status, monthly_limit')
    .eq('id', agentId)
    .eq('api_key_hash', apiKeyHash)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data;
}
