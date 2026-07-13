import type { PluginConfig } from './types';

export function getConfig(): PluginConfig {
  const apiBase = process.env.DSG_API_BASE;
  const apiKey = process.env.DSG_API_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  const redisUrl = process.env.REDIS_URL;

  if (!apiBase) {
    throw new Error('DSG_API_BASE environment variable is required');
  }

  if (!apiKey) {
    throw new Error('DSG_API_KEY environment variable is required');
  }

  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL environment variable is required');
  }

  if (!supabaseAnonKey) {
    throw new Error('SUPABASE_ANON_KEY environment variable is required');
  }

  return {
    apiBase,
    apiKey,
    supabaseUrl,
    supabaseAnonKey,
    redisUrl,
  };
}
