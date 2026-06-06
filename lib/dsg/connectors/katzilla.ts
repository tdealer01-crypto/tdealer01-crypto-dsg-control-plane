export type KatzillaQueryInput = {
  path: string;
  params?: Record<string, string | number | boolean | null | undefined>;
};

export type KatzillaQueryResult = {
  ok: boolean;
  status: number;
  url: string;
  data: unknown;
  truth: 'external_data_pending_verification';
  retrievedAt: string;
};

const DEFAULT_BASE_URL = 'https://api.katzilla.dev';
const DEFAULT_AGENTS_PATH = '/agents';
const ALLOWED_PATH_PATTERN = /^\/(agents|v1\/[a-z0-9/_-]+)$/i;

function getBaseUrl(): string {
  return (process.env.KATZILLA_API_BASE || DEFAULT_BASE_URL).replace(/\/$/, '');
}

function getApiKey(): string {
  return process.env.KATZILLA_API_KEY || '';
}

export function getKatzillaStatus() {
  return {
    configured: Boolean(getApiKey()),
    baseUrl: getBaseUrl(),
    agentsPath: process.env.KATZILLA_AGENTS_PATH || DEFAULT_AGENTS_PATH,
  };
}

function assertAllowedPath(rawPath: string): string {
  const value = String(rawPath || '').trim();
  if (!value.startsWith('/')) throw new Error('KATZILLA_PATH_MUST_START_WITH_SLASH');
  const withoutQuery = value.split('?')[0];
  if (!ALLOWED_PATH_PATTERN.test(withoutQuery)) throw new Error('KATZILLA_PATH_NOT_ALLOWLISTED');
  return value;
}

function buildKatzillaUrl(input: KatzillaQueryInput): string {
  const root = new URL(getBaseUrl());
  const url = new URL(assertAllowedPath(input.path), root);
  if (url.origin !== root.origin) throw new Error('KATZILLA_ORIGIN_MISMATCH');

  for (const [key, value] of Object.entries(input.params || {})) {
    if (value === undefined || value === null) continue;
    url.searchParams.set(key, String(value));
  }

  return url.toString();
}

async function parseKatzillaResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

export async function queryKatzilla(input: KatzillaQueryInput): Promise<KatzillaQueryResult> {
  const key = getApiKey();
  if (!key) throw new Error('KATZILLA_API_KEY_REQUIRED');

  const url = buildKatzillaUrl(input);
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-API-Key': key,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  return {
    ok: response.ok,
    status: response.status,
    url,
    data: await parseKatzillaResponse(response),
    truth: 'external_data_pending_verification',
    retrievedAt: new Date().toISOString(),
  };
}

export async function listKatzillaAgents(): Promise<KatzillaQueryResult> {
  return queryKatzilla({ path: process.env.KATZILLA_AGENTS_PATH || DEFAULT_AGENTS_PATH });
}
