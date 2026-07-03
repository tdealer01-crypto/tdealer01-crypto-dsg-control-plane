/**
 * OpenRouter Free Models Detector & Fallback
 *
 * Automatically detects available free models on OpenRouter and provides
 * fallback mechanism when primary model is unavailable (429, 404, etc).
 *
 * Free models are cached for 1 hour to avoid excessive API calls.
 */

interface OpenRouterModel {
  id: string;
  name: string;
  description: string;
  pricing: {
    prompt: number;
    completion: number;
  };
  context_length: number;
  architecture?: {
    modality: string;
    tokenizer: string;
    instruct_type: string;
  };
}

interface FreeModelsCache {
  models: string[];
  timestamp: number;
  ttlMs: number;
}

// Cache for free models (1 hour TTL)
let freeModelsCache: FreeModelsCache | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000;

/**
 * Fetch list of models from OpenRouter API.
 * Never exposes API key in response.
 */
async function fetchOpenRouterModels(): Promise<OpenRouterModel[]> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not configured');
  }

  const response = await fetch('https://openrouter.ai/api/v1/models', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://tdealer01-crypto-dsg-control-plane.vercel.app',
      'X-Title': 'DSG ONE ProofGate',
    },
  });

  if (!response.ok) {
    throw new Error(`OpenRouter models API error: ${response.status}`);
  }

  const data = (await response.json()) as { data: OpenRouterModel[] };
  return data.data || [];
}

/**
 * Detect free models from OpenRouter.
 * A model is free if both prompt and completion pricing are 0.
 */
export async function detectFreeModels(): Promise<string[]> {
  // Check cache first
  if (freeModelsCache && Date.now() - freeModelsCache.timestamp < freeModelsCache.ttlMs) {
    console.log('[DSG] Using cached free models list', { cached: freeModelsCache.models.length });
    return freeModelsCache.models;
  }

  try {
    const models = await fetchOpenRouterModels();
    const freeModels = models
      .filter((m) => m.pricing.prompt === 0 && m.pricing.completion === 0)
      .map((m) => m.id);

    console.log('[DSG] Detected free models on OpenRouter', {
      count: freeModels.length,
      models: freeModels.slice(0, 5), // log first 5
    });

    // Cache result
    freeModelsCache = {
      models: freeModels,
      timestamp: Date.now(),
      ttlMs: CACHE_TTL_MS,
    };

    return freeModels;
  } catch (err) {
    console.error('[DSG] Failed to detect free models', { error: String(err) });
    // Fallback to known free models if API call fails
    return ['mistral-7b-instruct:free', 'neural-chat-7b-v3:free'];
  }
}

/**
 * Get ordered list of models to try.
 * Primary model first, then fallback to free models.
 */
export async function getModelFallbackList(primaryModel: string): Promise<string[]> {
  const freeModels = await detectFreeModels();

  // Start with primary model
  const models = [primaryModel];

  // Add free models as fallback (deduplicated)
  for (const free of freeModels) {
    if (!models.includes(free)) {
      models.push(free);
    }
  }

  // Add known fallback models as last resort
  const knownFallbacks = [
    'mistral-7b-instruct:free',
    'neural-chat-7b-v3:free',
    'openrouter/auto',
  ];
  for (const fb of knownFallbacks) {
    if (!models.includes(fb)) {
      models.push(fb);
    }
  }

  return models;
}

/**
 * Parse OpenRouter error to determine if we should retry with fallback.
 */
export function shouldFallbackOnError(statusCode: number, errorText: string): boolean {
  // 429: Rate limited / quota exceeded
  if (statusCode === 429) return true;

  // 404: Model not found / deprecated
  if (statusCode === 404) return true;

  // 503: Service unavailable
  if (statusCode === 503) return true;

  // 400 with specific errors
  if (statusCode === 400) {
    const lower = errorText.toLowerCase();
    // Check for model-specific errors
    if (lower.includes('not found') || lower.includes('unsupported')) {
      return true;
    }
  }

  return false;
}

/**
 * Clear cache (useful for testing or forced refresh).
 */
export function clearFreeModelsCache(): void {
  freeModelsCache = null;
  console.log('[DSG] Free models cache cleared');
}

/**
 * Get cache info for debugging.
 */
export function getCacheInfo(): { cached: boolean; models: number; ageMs: number } {
  if (!freeModelsCache) {
    return { cached: false, models: 0, ageMs: 0 };
  }
  return {
    cached: true,
    models: freeModelsCache.models.length,
    ageMs: Date.now() - freeModelsCache.timestamp,
  };
}
