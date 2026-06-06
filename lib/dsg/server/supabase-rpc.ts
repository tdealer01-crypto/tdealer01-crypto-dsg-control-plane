/**
 * DSG server-side Supabase REST/RPC helpers.
 *
 * Thin, dependency-free wrappers over Supabase PostgREST. Used by DSG API
 * route handlers and server-side libraries. Server-only: relies on the
 * service-role key by default and must never run in client components.
 *
 * Secrets are never logged or returned in error messages.
 */

export type DsgSupabaseRpcConfig = {
  /** Supabase project base URL (no trailing slash). */
  url: string;
  /** apikey used for PostgREST/RPC requests (service-role on the server). */
  key: string;
};

/**
 * Parse a Bearer token from an `Authorization` header.
 * Returns the raw token (no `Bearer ` prefix) or null when absent/malformed.
 */
export function getBearerToken(headers: Headers): string | null {
  const raw = headers.get('authorization') ?? headers.get('Authorization');
  if (!raw) return null;
  const match = /^Bearer\s+(.+)$/i.exec(raw.trim());
  if (!match) return null;
  const token = match[1].trim();
  return token.length > 0 ? token : null;
}

/**
 * Resolve the Supabase RPC config for server-side calls.
 *
 * The URL comes from NEXT_PUBLIC_SUPABASE_URL. The key is the service-role
 * key (privileged server access). An optional caller access token is accepted
 * for callers that wish to act on behalf of a user; it is surfaced via the
 * returned config's `key` only when a service-role key is not configured, so
 * that least-privilege still applies. Secrets are never logged.
 */
export function getDsgSupabaseRpcConfig(userAccessToken?: string): DsgSupabaseRpcConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Prefer service-role on the server. Fall back to the supplied user token,
  // then the public anon key, so reads still work in less-privileged contexts.
  const key = serviceRoleKey ?? userAccessToken ?? anonKey;
  if (!key) {
    throw new Error('Missing Supabase server credentials');
  }

  return { url: url.replace(/\/+$/, ''), key };
}

function buildHeaders(config: DsgSupabaseRpcConfig, extra?: Record<string, string>): HeadersInit {
  return {
    apikey: config.key,
    Authorization: `Bearer ${config.key}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...extra,
  };
}

/**
 * Read rows from a PostgREST table.
 *
 * `query` is a flat map of PostgREST query params, e.g.
 * `{ select: 'id,name', id: 'eq.123', limit: '1' }`.
 */
export async function readDsgRest<T>(
  config: DsgSupabaseRpcConfig,
  table: string,
  query: Record<string, string>,
): Promise<T> {
  const target = new URL(`${config.url}/rest/v1/${table}`);
  for (const [k, v] of Object.entries(query)) {
    target.searchParams.set(k, v);
  }

  const res = await fetch(target, {
    method: 'GET',
    headers: buildHeaders(config),
    cache: 'no-store',
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Supabase REST read failed for ${table} (${res.status}): ${detail}`);
  }

  return (await res.json()) as T;
}

/**
 * Invoke a PostgREST RPC (database function).
 */
export async function callDsgRpc<T = unknown>(
  config: DsgSupabaseRpcConfig,
  fnName: string,
  params: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(`${config.url}/rest/v1/rpc/${fnName}`, {
    method: 'POST',
    headers: buildHeaders(config),
    body: JSON.stringify(params ?? {}),
    cache: 'no-store',
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Supabase RPC ${fnName} failed (${res.status}): ${detail}`);
  }

  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}
