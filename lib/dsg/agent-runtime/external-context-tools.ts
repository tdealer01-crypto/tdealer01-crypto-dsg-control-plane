import { queryKatzilla } from '@/lib/dsg/connectors/katzilla';

export type ExternalContextItem = {
  tool: 'search_engine' | 'katzilla_search' | 'katzilla_fda_recalls';
  status: 'used' | 'skipped' | 'unavailable' | 'failed';
  sourceUrl?: string;
  reason?: string;
  data?: unknown;
  evidence?: string[];
};

export type ExternalContextResult = { items: ExternalContextItem[]; promptText: string };

function compact(value: string, max = 5000) { return value.replace(/\s+/g, ' ').trim().slice(0, max); }
function boolEnv(name: string) { return process.env[name]?.trim().toLowerCase() === 'true'; }
function firstEnv(names: string[]) { for (const name of names) { const value = process.env[name]?.trim(); if (value) return value; } return undefined; }
function shouldUseSearchEngine() { return !boolEnv('DSG_AGENT_SEARCH_DISABLED'); }
function shouldUseKatzillaRecalls(message: string) { return /katzilla|fda|recall|recalls|เรียกคืน|สินค้าเรียกคืน|อาหาร|ยา|medical|device|product safety/i.test(message); }
function safeJson(value: unknown) { try { return JSON.stringify(value, null, 2).slice(0, 7000); } catch { return '[UNSERIALIZABLE_EXTERNAL_CONTEXT]'; } }

async function fetchJson(url: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, cache: 'no-store' });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`${response.status}:${typeof data?.message === 'string' ? data.message : response.statusText}`);
  return data;
}

async function loadKatzillaFdaRecalls(message: string): Promise<ExternalContextItem> {
  if (!shouldUseKatzillaRecalls(message)) return { tool: 'katzilla_fda_recalls', status: 'skipped', reason: 'MESSAGE_DID_NOT_REQUEST_FDA_RECALL_CONTEXT' };
  const path = firstEnv(['KATZILLA_FDA_RECALLS_PATH']) || '/v1/fda/recalls';
  try {
    const result = await queryKatzilla({ path, params: { _limit: 3 } });
    return { tool: 'katzilla_fda_recalls', status: result.ok ? 'used' : 'failed', sourceUrl: result.url, data: result, reason: result.ok ? undefined : `KATZILLA_HTTP_${result.status}`, evidence: ['katzilla_connector', 'x_api_key_auth', 'fda_recalls_response'] };
  } catch (error) {
    return { tool: 'katzilla_fda_recalls', status: 'failed', sourceUrl: `${firstEnv(['KATZILLA_API_BASE']) || 'https://api.katzilla.dev'}${path}`, reason: error instanceof Error ? error.message : 'KATZILLA_FDA_RECALLS_FAILED', evidence: ['katzilla_connector_failed'] };
  }
}

function buildSearchUrl(baseUrl: string, query: string) {
  const url = new URL(baseUrl);
  if (!url.searchParams.has('q') && !url.searchParams.has('query')) url.searchParams.set('q', query);
  if (!url.searchParams.has('limit') && !url.searchParams.has('_limit')) url.searchParams.set('limit', '5');
  return url.toString();
}

async function loadDirectSearchEngine(message: string): Promise<ExternalContextItem | null> {
  const baseUrl = firstEnv(['DSG_SEARCH_ENGINE_URL', 'SEARCH_ENGINE_URL', 'SEARCH_API_URL', 'WEB_SEARCH_URL']);
  if (!baseUrl) return null;
  const apiKey = firstEnv(['DSG_SEARCH_ENGINE_API_KEY', 'SEARCH_ENGINE_API_KEY', 'SEARCH_API_KEY', 'BRAVE_SEARCH_API_KEY', 'SERPAPI_API_KEY']);
  const authMode = firstEnv(['DSG_SEARCH_ENGINE_AUTH_MODE', 'SEARCH_ENGINE_AUTH_MODE']) || 'bearer';
  const headers: Record<string, string> = { accept: 'application/json' };
  if (apiKey && authMode === 'x-api-key') headers['x-api-key'] = apiKey;
  else if (apiKey && authMode === 'brave') headers['x-subscription-token'] = apiKey;
  else if (apiKey) headers.authorization = `Bearer ${apiKey}`;
  const sourceUrl = buildSearchUrl(baseUrl, compact(message, 280));
  try { return { tool: 'search_engine', status: 'used', sourceUrl, data: await fetchJson(sourceUrl, { headers }), evidence: ['http_status_ok', 'search_engine_response'] }; }
  catch (error) { return { tool: 'search_engine', status: 'failed', sourceUrl, reason: error instanceof Error ? error.message : 'SEARCH_ENGINE_FAILED', evidence: ['http_request_failed'] }; }
}

async function loadKatzillaSearchEngine(message: string): Promise<ExternalContextItem> {
  const path = firstEnv(['KATZILLA_SEARCH_PATH']) || '/v1/search';
  const queryParam = firstEnv(['KATZILLA_SEARCH_QUERY_PARAM']) || 'q';
  const limitParam = firstEnv(['KATZILLA_SEARCH_LIMIT_PARAM']) || '_limit';
  try {
    const result = await queryKatzilla({ path, params: { [queryParam]: compact(message, 280), [limitParam]: 5 } });
    return { tool: 'katzilla_search', status: result.ok ? 'used' : 'failed', sourceUrl: result.url, data: result, reason: result.ok ? undefined : `KATZILLA_HTTP_${result.status}`, evidence: ['katzilla_connector', 'x_api_key_auth', 'search_response'] };
  } catch (error) {
    return { tool: 'katzilla_search', status: 'unavailable', sourceUrl: `${firstEnv(['KATZILLA_API_BASE']) || 'https://api.katzilla.dev'}${path}`, reason: error instanceof Error ? error.message : 'KATZILLA_SEARCH_NOT_CONFIGURED_OR_FAILED', evidence: ['katzilla_search_connector_failed'] };
  }
}

async function loadSearchEngine(message: string): Promise<ExternalContextItem> {
  if (!shouldUseSearchEngine()) return { tool: 'search_engine', status: 'skipped', reason: 'DSG_AGENT_SEARCH_DISABLED=true' };
  const direct = await loadDirectSearchEngine(message);
  if (direct?.status === 'used') return direct;
  const katzilla = await loadKatzillaSearchEngine(message);
  if (katzilla.status === 'used') return katzilla;
  if (direct) return { ...direct, reason: `${direct.reason || 'DIRECT_SEARCH_FAILED'}; Katzilla fallback: ${katzilla.reason || katzilla.status}`, evidence: [...(direct.evidence || []), ...(katzilla.evidence || [])] };
  return { tool: 'search_engine', status: 'unavailable', reason: `SEARCH_ENGINE_NOT_CONFIGURED: set DSG_SEARCH_ENGINE_URL/SEARCH_ENGINE_URL or KATZILLA_SEARCH_PATH with KATZILLA_API_KEY. Katzilla fallback: ${katzilla.reason || katzilla.status}`, evidence: ['missing_direct_search_url', ...(katzilla.evidence || [])] };
}

export async function loadExternalAgentContext(message: string): Promise<ExternalContextResult> {
  if (boolEnv('DSG_AGENT_EXTERNAL_TOOLS_DISABLED')) {
    const items: ExternalContextItem[] = [{ tool: 'search_engine', status: 'skipped', reason: 'DSG_AGENT_EXTERNAL_TOOLS_DISABLED=true' }];
    return { items, promptText: buildExternalContextPrompt(items) };
  }
  const items = await Promise.all([loadSearchEngine(message), loadKatzillaFdaRecalls(message)]);
  return { items, promptText: buildExternalContextPrompt(items) };
}

export function buildExternalContextPrompt(items: ExternalContextItem[]) {
  const usedOrFailed = items.filter((item) => item.status !== 'skipped');
  if (!usedOrFailed.length) return 'External API tools: not used for this message.';
  return ['External API tool context:', 'Search context is always attempted unless disabled. Use tool results when relevant. Do not invent search/API results. If search failed or is unavailable, block build decisions that require external evidence.', ...usedOrFailed.map((item) => [`tool: ${item.tool}`, `status: ${item.status}`, item.sourceUrl ? `sourceUrl: ${item.sourceUrl}` : undefined, item.reason ? `reason: ${item.reason}` : undefined, item.evidence?.length ? `evidence: ${item.evidence.join(', ')}` : undefined, item.data !== undefined ? `data: ${safeJson(item.data)}` : undefined].filter(Boolean).join('\n'))].join('\n\n');
}
