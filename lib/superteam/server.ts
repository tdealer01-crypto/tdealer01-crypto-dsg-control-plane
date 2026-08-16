import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type SuperteamAgentRecord = {
  id: string;
  name: string;
  api_key: string | null;
  claim_code?: string | null;
  username?: string | null;
  status?: string | null;
};

export function getSuperteamSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceRoleKey) {
    throw new Error('SUPERTEAM_DATABASE_NOT_CONFIGURED');
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function loadSuperteamAgent(
  supabase: SupabaseClient,
  agentId: string,
): Promise<SuperteamAgentRecord | null> {
  const { data, error } = await supabase
    .from('dsg_agents')
    .select('id,name,api_key,claim_code,username,status')
    .eq('id', agentId)
    .maybeSingle();

  if (error) {
    throw new Error(`SUPERTEAM_AGENT_LOOKUP_FAILED:${error.message}`);
  }

  return data as SuperteamAgentRecord | null;
}

export async function requireSuperteamAgentCredential(
  supabase: SupabaseClient,
  agentId: string,
): Promise<{ agent: SuperteamAgentRecord; apiKey: string }> {
  const agent = await loadSuperteamAgent(supabase, agentId);
  if (!agent) throw new Error('SUPERTEAM_AGENT_NOT_FOUND');

  const apiKey = process.env.SUPERTEAM_API_KEY?.trim() || agent.api_key?.trim();
  if (!apiKey) throw new Error('SUPERTEAM_API_KEY_NOT_CONFIGURED');

  return { agent, apiKey };
}

export function superteamErrorStatus(error: unknown): number {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('NOT_FOUND')) return 404;
  if (message.includes('NOT_CONFIGURED')) return 503;
  if (message.includes('LOOKUP_FAILED') || message.includes('DATABASE')) return 503;
  return 500;
}
