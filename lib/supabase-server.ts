import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

let adminClient: ReturnType<typeof createClient<Database>> | null = null;

const SUPABASE_TIMEOUT_MS = 5_000;

function withTimeoutFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SUPABASE_TIMEOUT_MS);

  return fetch(input, {
    ...init,
    signal: init?.signal ?? controller.signal,
  }).finally(() => clearTimeout(timeout));
}

export function getSupabaseAdmin() {
  if (adminClient) {
    return adminClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error('Missing Supabase server environment variables');
  }

  adminClient = createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        'x-application-name': 'dsg-control-plane',
      },
      fetch: withTimeoutFetch,
    },
  });

  return adminClient;
}
