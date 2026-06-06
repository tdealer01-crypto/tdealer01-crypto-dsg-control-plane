/**
 * OpenAI adapter status (server-side).
 *
 * Reports whether the server-side OpenAI-compatible adapter is configured,
 * based purely on the presence of environment variables. It never reads,
 * logs, or returns the API key value itself.
 */

export type OpenAIAdapterStatus = {
  /** True when an API key is present in the environment. */
  configured: boolean;
  /** Optional custom base URL (e.g. for an OpenAI-compatible proxy), when set. */
  baseUrl?: string;
  /** Model id the adapter would default to. */
  defaultModel: string;
  /** Honest boundary describing what this status does and does not prove. */
  truthBoundary: string;
};

function firstEnv(names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

/**
 * Return the current OpenAI adapter configuration status.
 *
 * Configured means an API key exists in the environment. It does NOT prove the
 * key is valid, that the upstream endpoint is reachable, or that a request
 * would succeed — only that the adapter is wired up to attempt a call.
 */
export function getOpenAIAdapterStatus(): OpenAIAdapterStatus {
  const apiKey = firstEnv(['OPENAI_API_KEY']);
  const baseUrl = firstEnv(['OPENAI_BASE_URL', 'OPENAI_API_BASE']);
  const defaultModel = firstEnv(['OPENAI_DEFAULT_MODEL']) || 'gpt-4o-mini';
  const configured = Boolean(apiKey);

  return {
    configured,
    baseUrl,
    defaultModel,
    truthBoundary: configured
      ? 'OPENAI_API_KEY is present. Adapter is connector-ready, but key validity and upstream reachability are not verified by this status.'
      : 'OPENAI_API_KEY is not configured. The OpenAI adapter is connector-required and cannot generate text until a key is set server-side.',
  };
}
