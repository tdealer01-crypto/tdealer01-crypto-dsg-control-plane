/**
 * NVIDIA NGC Catalog Integration
 *
 * Provides access to NVIDIA GPU Cloud (NGC) hosted models
 * Reference: https://catalog.ngc.nvidia.com/
 *
 * Supported categories:
 * - Large Language Models (LLMs)
 * - Vision Models
 * - Speech Models
 * - NLP Models
 */

export interface NGCModel {
  id: string;
  name: string;
  displayName: string;
  category: 'llm' | 'vision' | 'speech' | 'nlp';
  provider: 'nvidia' | 'third-party';
  endpoint: string;
  maxTokens?: number;
  temperature?: { min: number; max: number; default: number };
  costPerMillion?: number;
  recommended?: boolean;
}

// NVIDIA NGC officially hosted models
export const NGC_MODELS: Record<string, NGCModel> = {
  // LLMs
  'nemotron-3-ultra-550b': {
    id: 'nvidia/nemotron-3-ultra-550b-a55b',
    name: 'Nemotron 3 Ultra 550B',
    displayName: 'Nemotron 3 Ultra (550B params)',
    category: 'llm',
    provider: 'nvidia',
    endpoint: 'https://integrate.api.nvidia.com/v1/chat/completions',
    maxTokens: 4096,
    temperature: { min: 0, max: 2, default: 0.7 },
    costPerMillion: 25,
    recommended: true,
  },
  'nemotron-3-8b': {
    id: 'nvidia/nemotron-3-8b-instruct',
    name: 'Nemotron 3 8B',
    displayName: 'Nemotron 3 8B Instruct',
    category: 'llm',
    provider: 'nvidia',
    endpoint: 'https://integrate.api.nvidia.com/v1/chat/completions',
    maxTokens: 4096,
    temperature: { min: 0, max: 2, default: 0.7 },
    costPerMillion: 5,
  },
  'llama-2-70b': {
    id: 'nvidia/llama-2-70b-instruct',
    name: 'Llama 2 70B',
    displayName: 'Llama 2 70B Instruct (via NGC)',
    category: 'llm',
    provider: 'third-party',
    endpoint: 'https://integrate.api.nvidia.com/v1/chat/completions',
    maxTokens: 4096,
    temperature: { min: 0, max: 2, default: 0.7 },
    costPerMillion: 10,
  },
  'mistral-7b': {
    id: 'nvidia/mistral-7b-instruct-v0.2',
    name: 'Mistral 7B',
    displayName: 'Mistral 7B Instruct v0.2 (via NGC)',
    category: 'llm',
    provider: 'third-party',
    endpoint: 'https://integrate.api.nvidia.com/v1/chat/completions',
    maxTokens: 32768,
    temperature: { min: 0, max: 2, default: 0.7 },
    costPerMillion: 5,
  },

  // Vision Models
  'neva-22b': {
    id: 'nvidia/neva-22b',
    name: 'Neva 22B',
    displayName: 'NEVA 22B Vision-Language Model',
    category: 'vision',
    provider: 'nvidia',
    endpoint: 'https://integrate.api.nvidia.com/v1/chat/completions',
    maxTokens: 1024,
    temperature: { min: 0, max: 1, default: 0.5 },
    costPerMillion: 15,
  },

  // Speech Models
  'parakeet-ctc-1.1b': {
    id: 'nvidia/parakeet-ctc-1.1b',
    name: 'Parakeet CTC 1.1B',
    displayName: 'Parakeet CTC Speech Recognition 1.1B',
    category: 'speech',
    provider: 'nvidia',
    endpoint: 'https://integrate.api.nvidia.com/v1/asr/transcribe',
    temperature: { min: 0, max: 1, default: 0 },
    costPerMillion: 5,
  },
};

/**
 * Get NGC model by ID
 */
export function getNGCModel(modelId: string): NGCModel | null {
  return NGC_MODELS[modelId] || null;
}

/**
 * Get recommended NGC models for category
 */
export function getRecommendedNGCModels(category: NGCModel['category']): NGCModel[] {
  return Object.values(NGC_MODELS)
    .filter((m) => m.category === category && m.recommended)
    .sort((a, b) => (b.costPerMillion || 0) - (a.costPerMillion || 0));
}

/**
 * Get all NGC models for category
 */
export function getNGCModelsByCategory(category: NGCModel['category']): NGCModel[] {
  return Object.values(NGC_MODELS)
    .filter((m) => m.category === category)
    .sort((a, b) => (a.costPerMillion || 0) - (b.costPerMillion || 0));
}

/**
 * NGC model selector for environment configuration
 *
 * Priority:
 * 1. Explicit NVIDIA_NGC_MODEL env var
 * 2. NVIDIA_MODEL_CHAT env var (fallback)
 * 3. Default recommended LLM
 */
export function selectNGCModel(modelId?: string): NGCModel {
  const envModel = modelId || process.env.NVIDIA_NGC_MODEL || process.env.NVIDIA_MODEL_CHAT;

  if (envModel) {
    const model = getNGCModel(envModel.split('/').pop() || envModel);
    if (model) return model;
  }

  // Default to Nemotron 3 Ultra (most capable)
  return NGC_MODELS['nemotron-3-ultra-550b'];
}

/**
 * Build NGC API request payload
 */
export function buildNGCRequest(
  modelId: string,
  messages: Array<{ role: string; content: string }>,
  options?: {
    maxTokens?: number;
    temperature?: number;
    topP?: number;
  },
) {
  const model = getNGCModel(modelId) || selectNGCModel();

  return {
    model: model.id,
    messages,
    max_tokens: options?.maxTokens || model.maxTokens || 500,
    temperature: options?.temperature || model.temperature?.default || 0.7,
    top_p: options?.topP || 1,
  };
}

/**
 * Validate NGC API credentials
 */
export function validateNGCCredentials(): { valid: boolean; error?: string } {
  const apiKey = process.env.NVIDIA_API_KEY;

  if (!apiKey) {
    return {
      valid: false,
      error: 'NVIDIA_API_KEY not set',
    };
  }

  if (!apiKey.startsWith('nvapi-') && apiKey.length < 32) {
    return {
      valid: false,
      error: 'Invalid NVIDIA API key format (expected nvapi-* or 32+ chars)',
    };
  }

  return { valid: true };
}

/**
 * Get NGC model documentation URL
 */
export function getNGCModelDocUrl(modelId: string): string {
  const model = getNGCModel(modelId);
  if (!model) return 'https://catalog.ngc.nvidia.com';

  const slug = model.id.split('/')[1]?.replace(/-/g, '_');
  return `https://catalog.ngc.nvidia.com/orgs/nvidia/models/${slug}`;
}
