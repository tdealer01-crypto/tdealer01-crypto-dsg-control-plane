/**
 * LLM Provider Health Check for Hermes Agent
 *
 * Detects and validates configured LLM backends:
 *   - OpenRouter (OPENROUTER_API_KEY) — primary provider
 *   - Together AI (TOGETHER_API_KEY)
 *   - Anthropic (ANTHROPIC_API_KEY)
 *   - NVIDIA/Nemotron (NVIDIA_API_KEY) — fallback provider
 *
 * Used by health endpoint and diagnostic tools.
 */

export type LLMProviderStatus = 'configured' | 'missing' | 'unknown';

export interface LLMProviderCheck {
  provider: 'openrouter' | 'together' | 'anthropic' | 'nvidia' | 'none';
  status: LLMProviderStatus;
  configured: boolean;
  model?: string;
  detail: string;
}

/**
 * Check which LLM backends are configured in current environment.
 * Returns primary provider and status of all known backends.
 * Priority: OpenRouter (primary) → Together → Anthropic → NVIDIA (fallback)
 */
export function checkLLMProviders(): {
  primary: LLMProviderCheck;
  all: Record<string, LLMProviderCheck>;
} {
  const hasOpenRouter = Boolean(process.env.OPENROUTER_API_KEY);
  const hasTogether = Boolean(process.env.TOGETHER_API_KEY);
  const hasAnthropic = Boolean(process.env.ANTHROPIC_API_KEY);
  const hasNvidia = Boolean(process.env.NVIDIA_API_KEY);

  // Determine primary provider based on env var priority
  // OpenRouter is primary (highest priority), NVIDIA is fallback (lowest priority)
  let primaryProvider: LLMProviderCheck;

  if (hasOpenRouter) {
    primaryProvider = {
      provider: 'openrouter',
      status: 'configured',
      configured: true,
      model: process.env.OPENROUTER_MODEL_CHAT || 'openai/gpt-oss-120b:free',
      detail: 'OpenRouter (primary provider)',
    };
  } else if (hasTogether) {
    primaryProvider = {
      provider: 'together',
      status: 'configured',
      configured: true,
      model: process.env.DSG_BRAIN_MODEL || 'NousResearch/Hermes-3-Llama-3.1-70B-FP8',
      detail: 'Together AI',
    };
  } else if (hasAnthropic) {
    primaryProvider = {
      provider: 'anthropic',
      status: 'configured',
      configured: true,
      model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001',
      detail: 'Anthropic Claude',
    };
  } else if (hasNvidia) {
    primaryProvider = {
      provider: 'nvidia',
      status: 'configured',
      configured: true,
      model: process.env.NVIDIA_MODEL_CHAT || 'nvidia/nemotron-3-ultra-550b-a55b',
      detail: 'NVIDIA Nemotron (fallback provider)',
    };
  } else {
    primaryProvider = {
      provider: 'none',
      status: 'missing',
      configured: false,
      detail: 'No LLM provider configured (set OPENROUTER_API_KEY, TOGETHER_API_KEY, ANTHROPIC_API_KEY, or NVIDIA_API_KEY)',
    };
  }

  const all: Record<string, LLMProviderCheck> = {
    openrouter: {
      provider: 'openrouter',
      status: hasOpenRouter ? 'configured' : 'missing',
      configured: hasOpenRouter,
      detail: hasOpenRouter
        ? '✓ OPENROUTER_API_KEY is set (primary provider)'
        : '✗ OPENROUTER_API_KEY not set',
    },
    together: {
      provider: 'together',
      status: hasTogether ? 'configured' : 'missing',
      configured: hasTogether,
      detail: hasTogether
        ? '✓ TOGETHER_API_KEY is set'
        : '✗ TOGETHER_API_KEY not set',
    },
    anthropic: {
      provider: 'anthropic',
      status: hasAnthropic ? 'configured' : 'missing',
      configured: hasAnthropic,
      detail: hasAnthropic
        ? '✓ ANTHROPIC_API_KEY is set'
        : '✗ ANTHROPIC_API_KEY not set',
    },
    nvidia: {
      provider: 'nvidia',
      status: hasNvidia ? 'configured' : 'missing',
      configured: hasNvidia,
      detail: hasNvidia
        ? '✓ NVIDIA_API_KEY is set (fallback provider)'
        : '✗ NVIDIA_API_KEY not set',
    },
  };

  return { primary: primaryProvider, all };
}

/**
 * Get human-readable summary of LLM provider readiness.
 */
export function describeLLMProviderStatus(): string {
  const { primary } = checkLLMProviders();
  if (primary.configured) {
    return `LLM backend ready: ${primary.detail} (${primary.model})`;
  }
  return `⚠️ LLM backend unavailable: ${primary.detail}`;
}
