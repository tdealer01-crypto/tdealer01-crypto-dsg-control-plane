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

/**
 * Prefer Supabase's modern backend-only secret API key and retain the legacy
 * service_role key as a compatibility fallback during migration.
 */
export function getSupabaseServerCredential(): string | null {
  const secretKey = process.env.SUPABASE_SECRET_KEY?.trim();
  if (secretKey) return secretKey;

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return serviceRoleKey || null;
}

export function hasSupabaseServerCredential(): boolean {
  return Boolean(getSupabaseServerCredential());
}

export function getSupabaseAdmin() {
  if (adminClient) {
    return adminClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serverCredential = getSupabaseServerCredential();

  if (!url || !serverCredential) {
    throw new Error('Missing Supabase server environment variables');
  }

  adminClient = createClient<Database>(url, serverCredential, {
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