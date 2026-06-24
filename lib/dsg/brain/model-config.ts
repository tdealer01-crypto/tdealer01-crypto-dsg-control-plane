/**
 * DSG Brain Model Configuration
 * Server-side only. Never exposes API key values.
 */

import type { HermesNousHosting, HermesNousModel } from './hermes-nous-provider';

export type DsgBrainProvider = 'anthropic' | 'nous-hermes';

export interface DsgBrainModelConfig {
  provider: DsgBrainProvider;
  model: string;
  configured: boolean;
  /** Only set when provider === 'nous-hermes' */
  nousHosting?: HermesNousHosting;
}

/**
 * Build DSG Brain model config from environment.
 *
 * Provider selection (checked in order):
 *   1. DSG_BRAIN_PROVIDER=nous-hermes → NousResearch Hermes via Together AI or OpenRouter
 *   2. TOGETHER_API_KEY present → auto-select nous-hermes / Together AI
 *   3. OPENROUTER_API_KEY present → auto-select nous-hermes / OpenRouter
 *   4. Default → anthropic (requires ANTHROPIC_API_KEY)
 *
 * Model selection:
 *   - DSG_BRAIN_MODEL or DSG_DADBOT_MODEL env var overrides default
 *   - Default Hermes model: NousResearch/Hermes-3-Llama-3.1-70B-FP8
 *   - Default Anthropic model: claude-haiku-4-5-20251001
 */
export function buildDsgBrainModelConfig(
  env: NodeJS.ProcessEnv = process.env,
): DsgBrainModelConfig {
  const explicitProvider = env.DSG_BRAIN_PROVIDER as DsgBrainProvider | undefined;

  const hasNousKey = Boolean(env.TOGETHER_API_KEY || env.OPENROUTER_API_KEY);
  const hasAnthropicKey = Boolean(env.ANTHROPIC_API_KEY);

  let provider: DsgBrainProvider;
  if (explicitProvider === 'nous-hermes' || (hasNousKey && explicitProvider !== 'anthropic')) {
    provider = 'nous-hermes';
  } else {
    provider = 'anthropic';
  }

  const nousHosting: HermesNousHosting | undefined =
    provider === 'nous-hermes'
      ? env.TOGETHER_API_KEY
        ? 'together'
        : 'openrouter'
      : undefined;

  const defaultModel: string =
    provider === 'nous-hermes'
      ? (env.TOGETHER_API_KEY
          ? 'NousResearch/Hermes-3-Llama-3.1-70B-FP8'
          : 'nousresearch/hermes-3-llama-3.1-70b')
      : (env.OPENROUTER_API_KEY ? 'openrouter/owl-alpha' : 'claude-haiku-4-5-20251001');

  const model = env.DSG_BRAIN_MODEL || env.DSG_DADBOT_MODEL || defaultModel;

  const configured =
    provider === 'nous-hermes' ? hasNousKey : hasAnthropicKey;

  return { provider, model, configured, nousHosting };
}

export function isValidDsgBrainModelConfig(
  config: unknown,
): config is DsgBrainModelConfig {
  if (typeof config !== 'object' || config === null) return false;
  const c = config as Record<string, unknown>;
  return (
    (c.provider === 'anthropic' || c.provider === 'nous-hermes') &&
    typeof c.model === 'string' &&
    typeof c.configured === 'boolean'
  );
}

/** Human-readable summary for health checks (never includes key values). */
export function describeModelConfig(config: DsgBrainModelConfig): string {
  if (config.provider === 'nous-hermes') {
    return `NousResearch Hermes (${config.model}) via ${config.nousHosting ?? 'unknown'} — ${config.configured ? 'configured' : 'NOT configured'}`;
  }
  return `Anthropic (${config.model}) — ${config.configured ? 'configured' : 'NOT configured'}`;
}
