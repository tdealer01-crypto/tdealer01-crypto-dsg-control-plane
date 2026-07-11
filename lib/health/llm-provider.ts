/**
 * LLM Provider Health Check for Hermes Agent
 *
 * Detects and validates configured LLM backends:
 *   - OpenRouter (OPENROUTER_API_KEY)
 *   - Together AI (TOGETHER_API_KEY)
 *   - Anthropic (ANTHROPIC_API_KEY)
 *
 * Used by health endpoint and diagnostic tools.
 */

export type LLMProviderStatus = 'configured' | 'missing' | 'unknown';

export interface LLMProviderCheck {
  provider: 'openrouter' | 'together' | 'anthropic' | 'none';
  status: LLMProviderStatus;
  configured: boolean;
  model?: string;
  detail: string;
}

/**
 * Check which LLM backends are configured in current environment.
 * Returns primary provider and status of all known backends.
 */
export function checkLLMProviders(): {
  primary: LLMProviderCheck;
  all: Record<string, LLMProviderCheck>;
} {
  const hasOpenRouter = Boolean(process.env.OPENROUTER_API_KEY);
  const hasTogether = Boolean(process.env.TOGETHER_API_KEY);
  const hasAnthropic = Boolean(process.env.ANTHROPIC_API_KEY);

  // Determine primary provider based on env var priority
  let primaryProvider: LLMProviderCheck;

  if (hasOpenRouter) {
    primaryProvider = {
      provider: 'openrouter',
      status: 'configured',
      configured: true,
      model: process.env.DSG_BRAIN_MODEL || 'nousresearch/hermes-3-llama-3.1-70b',
      detail: 'OpenRouter (NousResearch Hermes models)',
    };
  } else if (hasTogether) {
    primaryProvider = {
      provider: 'together',
      status: 'configured',
      configured: true,
      model: process.env.DSG_BRAIN_MODEL || 'NousResearch/Hermes-3-Llama-3.1-70B-FP8',
      detail: 'Together AI (NousResearch Hermes models)',
    };
  } else if (hasAnthropic) {
    primaryProvider = {
      provider: 'anthropic',
      status: 'configured',
      configured: true,
      model: process.env.DSG_BRAIN_MODEL || 'claude-haiku-4-5-20251001',
      detail: 'Anthropic Claude',
    };
  } else {
    primaryProvider = {
      provider: 'none',
      status: 'missing',
      configured: false,
      detail: 'No LLM provider configured (set OPENROUTER_API_KEY, TOGETHER_API_KEY, or ANTHROPIC_API_KEY)',
    };
  }

  const all: Record<string, LLMProviderCheck> = {
    openrouter: {
      provider: 'openrouter',
      status: hasOpenRouter ? 'configured' : 'missing',
      configured: hasOpenRouter,
      detail: hasOpenRouter
        ? '✓ OPENROUTER_API_KEY is set'
        : '✗ OPENROUTER_API_KEY not set — Hermes Agent conversational mode unavailable',
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
