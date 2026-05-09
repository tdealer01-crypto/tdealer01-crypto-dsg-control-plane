export type ExternalContextItem = {
  tool: 'search_engine' | 'katzilla_fda_recalls';
  status: 'used' | 'skipped' | 'unavailable' | 'failed';
  sourceUrl?: string;
  reason?: string;
  data?: unknown;
  evidence?: string[];
};

export type ExternalContextResult = {
  items: ExternalContextItem[];
  promptText: string;
};

function compact(value: string, max = 5000) {
  return value.replace(/\s+/g, ' ').trim().slice(0, max);
}

function boolEnv(name: string) {
  return process.env[name]?.trim().toLowerCase() === 'true';
}

function firstEnv(names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

function shouldUseSearchEngine(message: string) {
  return /search|ค้นหา|เซิร์ช|เซิด|web|latest|ล่าสุด|news|ข่าว|source|แหล่งข้อมูล|google|internet|อินเทอร์เน็ต/i.test(message);
}

function shouldUseKatzillaRecalls(message: string) {
  return /katzilla|fda|recall|recalls|เรียกคืน|สินค้าเรียกคืน|อาหาร|ยา|medical|device|product safety/i.test(message);
}

function safeJson(value: unknown) {
  try {
    return JSON.stringify(value, null, 2).slice(0, 7000);
  } catch {
    return '[UNSERIALIZABLE_EXTERNAL_CONTEXT]';
  }
}

async function fetchJson(url: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, cache: 'no-store' });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message = typeof data?.message === 'string' ? data.message : response.statusText;
    throw new Error(`${response.status}:${message}`);
  }
  return data;
}

async function loadKatzillaFdaRecalls(message: string): Promise<ExternalContextItem> {
  if (!shouldUseKatzillaRecalls(message)) {
    return { tool: 'katzilla_fda_recalls', status: 'skipped', reason: 'MESSAGE_DID_NOT_REQUEST_FDA_RECALL_CONTEXT' };
  }

  const baseUrl = firstEnv(['KATZILLA_FDA_RECALLS_URL']) || 'https://api.katzilla.dev/v1/fda/recalls?_limit=3';
  const apiKey = firstEnv(['KATZILLA_API_KEY', 'KATZILLA_TOKEN', 'FDA_RECALLS_API_KEY']);
  const headers: Record<string, string> = { accept: 'application/json' };
  if (apiKey) headers.authorization = `Bearer ${apiKey}`;

  try {
    const data = await fetchJson(baseUrl, { headers });
    return {
      tool: 'katzilla_fda_recalls',
      status: 'used',
      sourceUrl: baseUrl,
      data,
      evidence: ['http_status_ok', 'katzilla_fda_recalls_response'],
    };
  } catch (error) {
    return {
      tool: 'katzilla_fda_recalls',
      status: 'failed',
      sourceUrl: baseUrl,
      reason: error instanceof Error ? error.message : 'KATZILLA_FDA_RECALLS_FAILED',
      evidence: ['http_request_failed'],
    };
  }
}

function buildSearchUrl(baseUrl: string, query: string) {
  const url = new URL(baseUrl);
  if (!url.searchParams.has('q') && !url.searchParams.has('query')) {
    url.searchParams.set('q', query);
  }
  if (!url.searchParams.has('limit') && !url.searchParams.has('_limit')) {
    url.searchParams.set('limit', '5');
  }
  return url.toString();
}

async function loadSearchEngine(message: string): Promise<ExternalContextItem> {
  if (!shouldUseSearchEngine(message)) {
    return { tool: 'search_engine', status: 'skipped', reason: 'MESSAGE_DID_NOT_REQUEST_SEARCH_CONTEXT' };
  }

  const baseUrl = firstEnv(['DSG_SEARCH_ENGINE_URL', 'SEARCH_ENGINE_URL', 'SEARCH_API_URL', 'WEB_SEARCH_URL']);
  if (!baseUrl) {
    return {
      tool: 'search_engine',
      status: 'unavailable',
      reason: 'SEARCH_ENGINE_NOT_CONFIGURED: set DSG_SEARCH_ENGINE_URL or SEARCH_ENGINE_URL',
      evidence: ['missing_search_engine_url_env'],
    };
  }

  const apiKey = firstEnv(['DSG_SEARCH_ENGINE_API_KEY', 'SEARCH_ENGINE_API_KEY', 'SEARCH_API_KEY', 'BRAVE_SEARCH_API_KEY', 'SERPAPI_API_KEY']);
  const authMode = firstEnv(['DSG_SEARCH_ENGINE_AUTH_MODE', 'SEARCH_ENGINE_AUTH_MODE']) || 'bearer';
  const headers: Record<string, string> = { accept: 'application/json' };
  if (apiKey && authMode === 'x-api-key') headers['x-api-key'] = apiKey;
  else if (apiKey && authMode === 'brave') headers['x-subscription-token'] = apiKey;
  else if (apiKey) headers.authorization = `Bearer ${apiKey}`;

  const sourceUrl = buildSearchUrl(baseUrl, compact(message, 280));
  try {
    const data = await fetchJson(sourceUrl, { headers });
    return {
      tool: 'search_engine',
      status: 'used',
      sourceUrl,
      data,
      evidence: ['http_status_ok', 'search_engine_response'],
    };
  } catch (error) {
    return {
      tool: 'search_engine',
      status: 'failed',
      sourceUrl,
      reason: error instanceof Error ? error.message : 'SEARCH_ENGINE_FAILED',
      evidence: ['http_request_failed'],
    };
  }
}

export async function loadExternalAgentContext(message: string): Promise<ExternalContextResult> {
  if (boolEnv('DSG_AGENT_EXTERNAL_TOOLS_DISABLED')) {
    const items: ExternalContextItem[] = [{ tool: 'search_engine', status: 'skipped', reason: 'DSG_AGENT_EXTERNAL_TOOLS_DISABLED=true' }];
    return { items, promptText: buildExternalContextPrompt(items) };
  }

  const items = await Promise.all([
    loadSearchEngine(message),
    loadKatzillaFdaRecalls(message),
  ]);

  return { items, promptText: buildExternalContextPrompt(items) };
}

export function buildExternalContextPrompt(items: ExternalContextItem[]) {
  const usedOrFailed = items.filter((item) => item.status !== 'skipped');
  if (!usedOrFailed.length) {
    return 'External API tools: not used for this message.';
  }

  return [
    'External API tool context:',
    'Use only as fresh external context. Do not invent API results. If a tool failed or is unavailable, say so clearly.',
    ...usedOrFailed.map((item) => [
      `tool: ${item.tool}`,
      `status: ${item.status}`,
      item.sourceUrl ? `sourceUrl: ${item.sourceUrl}` : undefined,
      item.reason ? `reason: ${item.reason}` : undefined,
      item.evidence?.length ? `evidence: ${item.evidence.join(', ')}` : undefined,
      item.data !== undefined ? `data: ${safeJson(item.data)}` : undefined,
    ].filter(Boolean).join('\n')),
  ].join('\n\n');
}
