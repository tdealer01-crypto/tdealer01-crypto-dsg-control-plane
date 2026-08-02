import { ProxyAgent, fetch as undiciFetch, type Dispatcher } from "undici";
import { RESOURCE_CORPUS_URL, CACHE_TTL_MS } from "../constants.js";
import type { ColosseumCorpus } from "../types.js";

let cachedCorpus: ColosseumCorpus | null = null;
let cachedAt = 0;

/**
 * Node's native fetch does not honor HTTPS_PROXY/https_proxy the way curl
 * or most HTTP clients do. Build a proxy-aware dispatcher when one of those
 * env vars is set, so this server also works for builders behind a
 * corporate/sandbox proxy. Falls back to the default dispatcher otherwise.
 */
function getDispatcher(): Dispatcher | undefined {
  const proxyUrl =
    process.env.HTTPS_PROXY ||
    process.env.https_proxy ||
    process.env.HTTP_PROXY ||
    process.env.http_proxy;
  return proxyUrl ? new ProxyAgent(proxyUrl) : undefined;
}

/**
 * Fetches the live Colosseum resource corpus, using an in-memory cache so
 * repeated tool calls within a session don't refetch on every invocation.
 * The corpus is public JSON with no authentication required.
 */
export async function getCorpus(forceRefresh = false): Promise<ColosseumCorpus> {
  const isStale = Date.now() - cachedAt > CACHE_TTL_MS;

  if (!forceRefresh && cachedCorpus && !isStale) {
    return cachedCorpus;
  }

  let response: Awaited<ReturnType<typeof undiciFetch>>;
  try {
    response = await undiciFetch(RESOURCE_CORPUS_URL, {
      signal: AbortSignal.timeout(15000),
      dispatcher: getDispatcher(),
    });
  } catch (error) {
    if (cachedCorpus) {
      // Serve stale data rather than fail outright if we have something.
      return cachedCorpus;
    }
    throw new Error(
      `Failed to reach the live Colosseum resource corpus at ${RESOURCE_CORPUS_URL}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  if (!response.ok) {
    if (cachedCorpus) {
      return cachedCorpus;
    }
    throw new Error(
      `Colosseum resource corpus request failed with status ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as ColosseumCorpus;
  cachedCorpus = data;
  cachedAt = Date.now();
  return data;
}

/**
 * Maps each resource section id to the top-level path it belongs to
 * (e.g. "foundations" or "build-paths"), derived from resourceGroups
 * rather than hardcoded, so it stays correct if the corpus adds new paths.
 */
export function buildResourcePathIndex(
  corpus: ColosseumCorpus
): Map<string, { pathId: string; pathTitle: string }> {
  const index = new Map<string, { pathId: string; pathTitle: string }>();
  for (const group of corpus.resourceGroups) {
    for (const section of group.sections) {
      index.set(section.id, { pathId: group.id, pathTitle: group.title });
    }
  }
  return index;
}
