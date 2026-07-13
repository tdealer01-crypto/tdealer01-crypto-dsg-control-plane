import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

let supabaseClient: ReturnType<typeof createClient<Database>> | null = null;

export function initializeSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing required Supabase environment variables: SUPABASE_URL and SUPABASE_ANON_KEY'
    );
  }

  supabaseClient = createClient<Database>(supabaseUrl, supabaseKey);
  return supabaseClient;
}

export function getSupabaseClient() {
  if (!supabaseClient) {
    return initializeSupabaseClient();
  }
  return supabaseClient;
}

export function getSupabaseAdminClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Missing required Supabase admin environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
    );
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey);
}
