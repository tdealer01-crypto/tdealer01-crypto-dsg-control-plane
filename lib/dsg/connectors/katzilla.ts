/**
 * Katzilla external connector.
 *
 * Real HTTP connector to a Katzilla-compatible API. Configuration comes from
 * environment variables:
 *   - KATZILLA_API_BASE (or KATZILLA_API_URL) — base URL, default https://api.katzilla.dev
 *   - KATZILLA_API_KEY — sent as the `x-api-key` header
 *
 * When unconfigured (no API key), helpers fail gracefully and return a typed
 * disabled/empty result instead of fabricating data. Server-side only; the API
 * key is never logged or returned in responses.
 */

const DEFAULT_BASE = 'https://api.katzilla.dev';

export type KatzillaStatus = {
  configured: boolean;
  baseUrl: string;
  reason?: string;
};

export type KatzillaQueryResult = {
  ok: boolean;
  url: string;
  status: number;
  data: unknown;
  error?: string;
};

export type KatzillaAgent = {
  id: string;
  name?: string;
  status?: string;
  [key: string]: unknown;
};

export type KatzillaAgentsResult = {
  ok: boolean;
  status: number;
  agents: KatzillaAgent[];
  error?: string;
};

function firstEnv(names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

function getBaseUrl(): string {
  return (firstEnv(['KATZILLA_API_BASE', 'KATZILLA_API_URL']) || DEFAULT_BASE).replace(/\/+$/, '');
}

function getApiKey(): string | undefined {
  return firstEnv(['KATZILLA_API_KEY']);
}

/**
 * Report whether the Katzilla connector is configured. Does not expose the key.
 */
export function getKatzillaStatus(): KatzillaStatus {
  const baseUrl = getBaseUrl();
  const configured = Boolean(getApiKey());
  return {
    configured,
    baseUrl,
    reason: configured ? undefined : 'KATZILLA_API_KEY not configured',
  };
}

function buildUrl(path: string, params?: Record<string, string | number | boolean>): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${getBaseUrl()}${normalizedPath}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

/**
 * Issue an authenticated GET to a Katzilla endpoint.
 *
 * Returns a typed result describing ok/status/url/data. Network/parse errors
 * surface as `{ ok: false, ... }` rather than throwing, except for the
 * unconfigured case which throws so callers can map it to "unavailable".
 */
export async function queryKatzilla(input: {
  path: string;
  params?: Record<string, string | number | boolean>;
}): Promise<KatzillaQueryResult> {
  const apiKey = getApiKey();
  const url = buildUrl(input.path, input.params);

  if (!apiKey) {
    throw new Error('KATZILLA_API_KEY not configured');
  }

  let status = 0;
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'x-api-key': apiKey, accept: 'application/json' },
      cache: 'no-store',
    });
    status = response.status;
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    return {
      ok: response.ok,
      url,
      status,
      data,
      error: response.ok ? undefined : `KATZILLA_HTTP_${status}`,
    };
  } catch (error) {
    return {
      ok: false,
      url,
      status,
      data: null,
      error: error instanceof Error ? error.message : 'KATZILLA_QUERY_FAILED',
    };
  }
}

/**
 * List agents registered in Katzilla. Returns a typed empty list when
 * unconfigured or on error.
 */
export async function listKatzillaAgents(): Promise<KatzillaAgentsResult> {
  const status = getKatzillaStatus();
  if (!status.configured) {
    return { ok: false, status: 503, agents: [], error: 'KATZILLA_API_KEY_REQUIRED' };
  }

  const path = firstEnv(['KATZILLA_AGENTS_PATH']) || '/v1/agents';
  const result = await queryKatzilla({ path });
  if (!result.ok) {
    return {
      ok: false,
      status: result.status || 502,
      agents: [],
      error: result.error ?? 'KATZILLA_AGENTS_FAILED',
    };
  }

  const data = result.data as unknown;
  let agents: KatzillaAgent[] = [];
  if (Array.isArray(data)) {
    agents = data as KatzillaAgent[];
  } else if (data && typeof data === 'object' && Array.isArray((data as { agents?: unknown }).agents)) {
    agents = (data as { agents: KatzillaAgent[] }).agents;
  } else if (data && typeof data === 'object' && Array.isArray((data as { data?: unknown }).data)) {
    agents = (data as { data: KatzillaAgent[] }).data;
  }

  return { ok: true, status: result.status || 200, agents };
}
